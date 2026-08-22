import { Context, Next } from 'hono';
import { UserRole } from '../types';

export function requireRole(allowedRoles: UserRole[]) {
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

    // Role within the workspace context (or fallback to user.role)
    const effectiveRole = (workspace?.roleInWorkspace || user.role) as UserRole;

    if (!allowedRoles.includes(effectiveRole)) {
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
