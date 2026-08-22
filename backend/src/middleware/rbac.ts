import { Context, Next } from 'hono';
import { can, Action, normalizeRole } from '../lib/permissions';
import { UserRole } from '../types';

export function requirePermission(action: Action) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!user) {
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

    const effectiveRole = normalizeRole(workspace?.roleInWorkspace || user.role);

    if (!can(effectiveRole, action, undefined, { userId: user.id, workspaceId: workspace?.id })) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Role [${effectiveRole.toUpperCase()}] is not permitted for action [${action}].`,
          },
        },
        403
      );
    }

    await next();
  };
}

export function requireRole(allowedRoles: (UserRole | string)[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!user) {
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

    const effectiveRole = normalizeRole(workspace?.roleInWorkspace || user.role);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

    if (!normalizedAllowed.includes(effectiveRole)) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Role [${effectiveRole.toUpperCase()}] is not permitted to perform this action.`,
          },
        },
        403
      );
    }

    await next();
  };
}
