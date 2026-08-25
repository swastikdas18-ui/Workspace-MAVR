import { Context, Next } from 'hono';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';
import { PlatformRole } from '../types';
import { getFounderEmails, getPlatformAdminEmails, getSupportEmails } from '../config/env';

/**
 * PLATFORM RBAC & FOUNDER ISOLATION (Phase 20A)
 *
 * Enforces strict separation between Workspace-level roles (Admin, Employee, Intern)
 * and Platform-level roles (Founder, Platform Admin, Support, None).
 *
 * Workspace Admins manage ONLY their own tenant workspace.
 * Cross-workspace, financial, and operational platform data is restricted exclusively
 * to verified platform roles.
 */

function unauthorized(c: Context) {
  return c.json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required for this platform resource.',
      },
    },
    401
  );
}

async function platformForbidden(
  c: Context,
  message: string,
  requiredRole: 'founder' | 'platform_admin' | 'support',
  details?: Record<string, unknown>
) {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const meta = requestSecurityMeta(c);

  // Security audit log for unauthorized platform privilege escalation attempt
  await logSecurityEvent('access.denied', {
    actorId: user?.id || null,
    workspaceId: workspace?.id || null,
    resourceId: 'founder_console',
    ...meta,
    details: {
      resourcePath: `${c.req.method} ${c.req.path}`,
      requiredRole,
      userPlatformRole: user?.platformRole || 'none',
      userRole: user?.role,
      ...details,
    },
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

function resolvePlatformRole(user: any): PlatformRole {
  if (user?.platformRole && user.platformRole !== 'none') {
    return user.platformRole;
  }
  const email = user?.email?.toLowerCase().trim();
  if (email) {
    if (getFounderEmails().includes(email)) return 'founder';
    if (getPlatformAdminEmails().includes(email)) return 'platform_admin';
    if (getSupportEmails().includes(email)) return 'support';
  }
  if (user?.role === 'platform_admin') return 'founder'; // backwards compatible fallback
  return 'none';
}

/**
 * REQUIRE FOUNDER:
 * Full access across Founder Console, global MRR/ARR, revenue analytics,
 * backup restoration, and system-wide configurations.
 *
 * Workspace Admins, Employees, Interns, Support, and non-founders are FORBIDDEN.
 */
export function requireFounder() {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return unauthorized(c);
    }

    const platformRole = resolvePlatformRole(user);

    if (platformRole !== 'founder') {
      return platformForbidden(
        c,
        'Access restricted to Platform Founders only. Workspace Admins are forbidden from platform management.',
        'founder',
        { actualPlatformRole: platformRole }
      );
    }

    await next();
  };
}

/**
 * REQUIRE PLATFORM ADMIN:
 * Operational management across tenants, platform health, observability,
 * and customer management. (No financial/billing configuration overrides).
 *
 * Allows: Founder, Platform Admin.
 * Blocks: Support, Workspace Admin, Employee, Intern, None.
 */
export function requirePlatformAdmin() {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return unauthorized(c);
    }

    const platformRole = resolvePlatformRole(user);

    if (platformRole !== 'founder' && platformRole !== 'platform_admin') {
      return platformForbidden(
        c,
        'Platform Administrator privileges required. Access denied.',
        'platform_admin',
        { actualPlatformRole: platformRole }
      );
    }

    await next();
  };
}

/**
 * REQUIRE SUPPORT:
 * Read-only customer diagnostics and deliverability monitoring.
 *
 * Allows: Founder, Platform Admin, Support.
 * Blocks: Workspace Admin, Employee, Intern, None.
 */
export function requireSupport() {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return unauthorized(c);
    }

    const platformRole = resolvePlatformRole(user);

    if (
      platformRole !== 'founder' &&
      platformRole !== 'platform_admin' &&
      platformRole !== 'support'
    ) {
      return platformForbidden(
        c,
        'Platform Support privileges required. Access denied.',
        'support',
        { actualPlatformRole: platformRole }
      );
    }

    await next();
  };
}
