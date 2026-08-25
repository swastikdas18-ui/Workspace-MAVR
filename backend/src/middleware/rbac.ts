import { Context, Next } from 'hono';
import { can, Action, normalizeRole } from '../lib/permissions';
import { UserRole } from '../types';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';

/**
 * WORKSPACE ROLE ISOLATION (Phase 17 — Fix #7)
 *
 * Authorization MUST be based on the caller's workspace membership role
 * (resolved server-side from the workspace_members store during session
 * resolution) — never on a global user.role snapshot.
 */

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

    // Membership role first; fall back to global role ONLY when the session
    // has no active workspace context.
    const effectiveRole = normalizeRole(workspace?.roleInWorkspace ?? user.role);

    if (!can(effectiveRole, action, undefined, { userId: user.id, workspaceId: workspace?.id })) {
      return forbidden(
        c,
        `Access denied. Role [${effectiveRole.toUpperCase()}] is not permitted for action [${action}].`,
        { requiredAction: action, effectiveRole }
      );
    }

    await next();
  };
}

/**
 * Role check anchored to WORKSPACE MEMBERSHIP. When a session carries an
 * active workspace, only the membership role is honored — a global
 * `user.role` can never escalate privileges inside someone else's
 * workspace.
 */
export function requireWorkspaceRole(allowedRoles: (UserRole | string)[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!user) {
      return unauthorized(c);
    }

    if (!workspace?.roleInWorkspace) {
      return forbidden(c, 'No active workspace membership. Access denied.', {
        requiredRoles: allowedRoles,
        reason: 'missing_workspace_membership',
      });
    }

    const effectiveRole = normalizeRole(workspace.roleInWorkspace);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

    if (!normalizedAllowed.includes(effectiveRole)) {
      return forbidden(
        c,
        `Access denied. Workspace role [${effectiveRole.toUpperCase()}] is not permitted to perform this action.`,
        { requiredRoles: allowedRoles, effectiveRole }
      );
    }

    await next();
  };
}

/**
 * PLATFORM ADMIN GATE (Phase 17 — Fix #4)
 *
 * Cross-workspace / company-wide resources (MRR, ARR, all customers,
 * all subscriptions, global analytics) are restricted to users holding the
 * `platform_admin` role. Regular workspace admins receive 403.
 *
 * The role is resolved server-side from the authenticated session's user
 * record — client-supplied roles are never trusted.
 */
export function requirePlatformAdmin() {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return unauthorized(c);
    }

    if (user.role !== 'platform_admin') {
      return forbidden(c, 'Platform administrator privileges required.', {
        requiredRole: 'platform_admin',
        actualRole: user.role,
      });
    }

    await next();
  };
}

/**
 * Legacy helper retained for existing routes. Prefers the workspace
 * membership role; the global role is consulted only when the session has
 * no workspace context (workspace-independent endpoints).
 *
 * SECURITY NOTE: new cross-workspace or privileged routes should use
 * `requireWorkspaceRole()` or `requirePlatformAdmin()` instead.
 */
export function requireRole(allowedRoles: (UserRole | string)[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!user) {
      return unauthorized(c);
    }

    const effectiveRole = normalizeRole(workspace?.roleInWorkspace ?? user.role);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

    if (!normalizedAllowed.includes(effectiveRole)) {
      return forbidden(
        c,
        `Access denied. Role [${effectiveRole.toUpperCase()}] is not permitted to perform this action.`,
        { requiredRoles: allowedRoles, effectiveRole }
      );
    }

    await next();
  };
}
