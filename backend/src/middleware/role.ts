import { Context, Next } from 'hono';
import { UserRole } from '../types';

export function requireRole(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required before checking role authorization.',
          },
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Role '${user.role}' does not have sufficient permissions for this operation. Required: [${allowedRoles.join(', ')}]`,
          },
        },
        403
      );
    }

    await next();
  };
}
