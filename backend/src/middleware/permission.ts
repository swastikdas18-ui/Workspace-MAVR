import { Context, Next } from 'hono';
import { PermissionKey, UserRole } from '../types';

export const ROLE_PERMISSION_MAP: Record<UserRole, Set<PermissionKey>> = {
  admin: new Set([
    'workspace:view',
    'workspace:manage',
    'projects:view_all',
    'projects:view_assigned',
    'projects:create',
    'projects:edit',
    'projects:delete',
    'projects:update_progress',
    'tasks:view_all',
    'tasks:view_assigned',
    'tasks:create',
    'tasks:update_status',
    'tasks:edit',
    'tasks:delete',
    'documents:view_all',
    'documents:view_shared',
    'documents:view_learning',
    'documents:create_org',
    'documents:create_personal',
    'documents:delete',
    'crm:view_all',
    'crm:view_assigned',
    'crm:manage_pipeline',
    'crm:create_record',
    'crm:delete_record',
    'teams:manage',
    'teams:view',
    'analytics:view',
    'billing:manage',
    'settings:manage',
  ]),
  platform_admin: new Set([
    'workspace:view',
    'workspace:manage',
    'projects:view_all',
    'projects:view_assigned',
    'projects:create',
    'projects:edit',
    'projects:delete',
    'projects:update_progress',
    'tasks:view_all',
    'tasks:view_assigned',
    'tasks:create',
    'tasks:update_status',
    'tasks:edit',
    'tasks:delete',
    'documents:view_all',
    'documents:view_shared',
    'documents:view_learning',
    'documents:create_org',
    'documents:create_personal',
    'documents:delete',
    'crm:view_all',
    'crm:view_assigned',
    'crm:manage_pipeline',
    'crm:create_record',
    'crm:delete_record',
    'teams:manage',
    'teams:view',
    'analytics:view',
    'billing:manage',
    'settings:manage',
  ]),
  employee: new Set([
    'workspace:view',
    'projects:view_assigned',
    'projects:update_progress',
    'tasks:view_assigned',
    'tasks:update_status',
    'tasks:edit',
    'documents:view_shared',
    'documents:view_learning',
    'crm:view_assigned',
    'teams:view',
  ]),
  intern: new Set([
    'tasks:view_assigned',
    'tasks:update_status',
    'documents:view_learning',
  ]),
};

export type ResourceScopeCheck = (c: Context) => Promise<boolean> | boolean;

export function requirePermission(permission: PermissionKey, resourceChecker?: ResourceScopeCheck) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
        401
      );
    }

    const userPermissions = ROLE_PERMISSION_MAP[user.role];
    if (!userPermissions || !userPermissions.has(permission)) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `Permission '${permission}' denied for role '${user.role}'.`,
          },
        },
        403
      );
    }

    // If a resource-level check is required (e.g. assigned tasks or projects)
    if (resourceChecker) {
      const isResourceAllowed = await resourceChecker(c);
      if (!isResourceAllowed) {
        return c.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Resource scope violation: you do not have permission to access or modify this specific resource.',
            },
          },
          403
        );
      }
    }

    await next();
  };
}
