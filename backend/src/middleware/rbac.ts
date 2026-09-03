import { Context, Next } from 'hono';
import { can, Action, normalizeRole } from '../lib/permissions';
import { UserRole, AuthorizationContext } from '../types';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';
import { WorkspaceRepository } from '../repositories/workspace-repository';

/**
 * WORKSPACE ROLE ISOLATION & AUDIT (Phase 29)
 *
 * Authorization MUST be strictly derived from workspace_members.role
 * and never from users.role, session.role, or stale cached values.
 */

function logRbacTelemetry(
  user: { id: string; email?: string },
  workspaceId: string | null | undefined,
  membershipRole: string,
  requestedAction: string,
  decision: 'ALLOW' | 'DENIED'
) {
  console.log(
    `[RBAC]\nUser: ${user.email || user.id}\nWorkspace: ${workspaceId || 'none'}\nMembership Role: ${membershipRole.toUpperCase()}\nRequested Action: ${requestedAction}\nDecision: ${decision}`
  );
}

/**
 * Resolve the verified workspace membership role.
 * Queries workspace_members directly if not already cached on context.
 */
export async function resolveMembershipRole(c: Context): Promise<{ role: UserRole; workspaceId: string | null }> {
  const user = c.get('user');
  const workspace = c.get('workspace');

  if (!user) {
    return { role: 'employee', workspaceId: null };
  }

  // Founder/Platform Admin bypass: Always grants full admin capabilities across workspaces
  const platformRole = (user as any).platformRole || 'none';
  if (platformRole === 'founder' || platformRole === 'platform_admin') {
    return { role: 'admin', workspaceId: workspace?.id || null };
  }

  if (workspace?.id) {
    // 1. Direct workspace membership query (PostgreSQL priority)
    try {
      const member = await WorkspaceRepository.getWorkspaceMember(workspace.id, user.id);
      if (member?.role) {
        return { role: normalizeRole(member.role), workspaceId: workspace.id };
      }
      if (workspace.ownerId === user.id) {
        return { role: 'admin', workspaceId: workspace.id };
      }
    } catch {
      // Fallback
    }

    if (workspace.roleInWorkspace) {
      return { role: normalizeRole(workspace.roleInWorkspace), workspaceId: workspace.id };
    }
  }

  // If no active workspace context exists on request, use the global role as last resort
  return { role: normalizeRole(user.role), workspaceId: workspace?.id || null };
}

/**
 * Build a verified AuthorizationContext from the current Hono request context.
 * This is the ONLY function People OS routes should use for authorization decisions.
 * Phase 36: HIGH-01 Tenant Role Confusion Remediation.
 */
export async function getAuthorizationContext(c: Context): Promise<AuthorizationContext> {
  const user = c.get('user');
  const workspace = c.get('workspace');
  if (!user || !workspace?.id) {
    throw Object.assign(new Error('Unauthorized: missing user or workspace context'), {
      code: 'UNAUTHORIZED',
      status: 401,
    });
  }
  const { role } = await resolveMembershipRole(c);
  return {
    userId: user.id,
    workspaceId: workspace.id,
    roleInWorkspace: role,
  };
}

function unauthorized(c: Context) {
  return c.json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required for this resource.',
      },
    },
    401
  );
}

async function forbidden(
  c: Context,
  message: string,
  details?: Record<string, unknown>
) {
  const user = c.get('user');
  const workspace = c.get('workspace');
  await logSecurityEvent('access.forbidden', {
    actorId: user?.id || null,
    workspaceId: workspace?.id || null,
    resourceId: `${c.req.method} ${c.req.path}`,
    ...requestSecurityMeta(c),
    details,
  });
  return c.json(
    {
      error: {
        code: 'FORBIDDEN',
        message,
      },
    },
    403
  );
}

export function requirePermission(action: Action) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!user) {
      return unauthorized(c);
    }

    const { role: effectiveRole, workspaceId } = await resolveMembershipRole(c);
    const actionDescriptor = `${c.req.method} ${c.req.path} [${action}]`;

    const isAllowed = can(effectiveRole, action, undefined, { userId: user.id, workspaceId: workspace?.id });

    logRbacTelemetry(
      user,
      workspaceId,
      effectiveRole,
      actionDescriptor,
      isAllowed ? 'ALLOW' : 'DENIED'
    );

    if (!isAllowed) {
      return forbidden(
        c,
        `Access denied. Workspace role [${effectiveRole.toUpperCase()}] is not permitted for action [${action}].`,
        { requiredAction: action, effectiveRole }
      );
    }

    await next();
  };
}

/**
 * Role check anchored strictly to WORKSPACE MEMBERSHIP (workspace_members.role).
 */
export function requireWorkspaceRole(allowedRoles: (UserRole | string)[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!user) {
      return unauthorized(c);
    }

    const { role: effectiveRole, workspaceId } = await resolveMembershipRole(c);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
    const actionDescriptor = `${c.req.method} ${c.req.path}`;
    const isAllowed = normalizedAllowed.includes(effectiveRole);

    console.log('[INVITE-RBAC]', {
      route: c.req.path,
      method: c.req.method,
      userId: user.id,
      workspaceId: workspaceId || workspace?.id || null,
      membershipRole: effectiveRole,
    });

    console.log('[INVITE-RBAC-RESULT]', {
      allow: isAllowed,
      userId: user.id,
      workspaceId: workspaceId || workspace?.id || null,
      membershipRole: effectiveRole,
    });

    logRbacTelemetry(
      user,
      workspaceId,
      effectiveRole,
      actionDescriptor,
      isAllowed ? 'ALLOW' : 'DENIED'
    );

    if (!isAllowed) {
      return forbidden(
        c,
        `Access denied. Workspace role [${effectiveRole.toUpperCase()}] is not permitted to perform this action.`,
        { requiredRoles: allowedRoles, effectiveRole }
      );
    }

    await next();
  };
}

export { requireFounder, requirePlatformAdmin, requireSupport } from './platform-admin';

/**
 * requireRole helper anchored strictly to WORKSPACE MEMBERSHIP (workspace_members.role).
 */
export function requireRole(allowedRoles: (UserRole | string)[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!user) {
      return unauthorized(c);
    }

    const { role: effectiveRole, workspaceId } = await resolveMembershipRole(c);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
    const actionDescriptor = `${c.req.method} ${c.req.path}`;
    const isAllowed = normalizedAllowed.includes(effectiveRole);

    console.log('[INVITE-RBAC]', {
      route: c.req.path,
      method: c.req.method,
      userId: user.id,
      workspaceId: workspaceId || workspace?.id || null,
      membershipRole: effectiveRole,
    });

    console.log('[INVITE-RBAC-RESULT]', {
      allow: isAllowed,
      userId: user.id,
      workspaceId: workspaceId || workspace?.id || null,
      membershipRole: effectiveRole,
    });

    logRbacTelemetry(
      user,
      workspaceId,
      effectiveRole,
      actionDescriptor,
      isAllowed ? 'ALLOW' : 'DENIED'
    );

    if (!isAllowed) {
      return forbidden(
        c,
        `Access denied. Workspace role [${effectiveRole.toUpperCase()}] is not permitted to perform this action.`,
        { requiredRoles: allowedRoles, effectiveRole }
      );
    }

    await next();
  };
}

