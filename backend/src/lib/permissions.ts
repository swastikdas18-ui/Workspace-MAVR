import { UserRole } from '../types';

export type Action =
  | 'workspace:read'
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:manage'
  | 'members:read'
  | 'members:invite'
  | 'members:manage'
  | 'projects:read'
  | 'projects:create'
  | 'projects:update'
  | 'projects:delete'
  | 'tasks:read'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:updateStatus'
  | 'tasks:delete'
  | 'tasks:comment'
  | 'teams:read'
  | 'teams:create'
  | 'teams:update'
  | 'teams:delete'
  | 'documents:read'
  | 'documents:createOrg'
  | 'documents:createPersonal'
  | 'documents:delete'
  | 'documents:download'
  | 'crm:read'
  | 'crm:create'
  | 'crm:update'
  | 'crm:delete'
  | 'crm:editNotes'
  | 'billing:read'
  | 'billing:manage'
  | 'analytics:read'
  | 'admin:tools';

export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return 'employee';
  const lower = role.toLowerCase().trim();
  if (lower === 'admin') return 'admin';
  if (lower === 'intern') return 'intern';
  return 'employee';
}

export function can(
  role: UserRole | string,
  action: Action,
  resource?: any,
  context?: { userId?: string; workspaceId?: string }
): boolean {
  const normalizedRole = normalizeRole(role);

  // 1. ADMIN - Full System Access
  if (normalizedRole === 'admin') {
    return true;
  }

  // 2. EMPLOYEE - Operational execution within assigned scope
  if (normalizedRole === 'employee') {
    switch (action) {
      case 'workspace:read':
      case 'members:read':
        return true;

      // Projects: can view workspace projects, can update if member or owner. Cannot create or delete
      case 'projects:read':
        return true;
      case 'projects:create':
      case 'projects:delete':
        return false;
      case 'projects:update':
        if (resource && context?.userId) {
          const memberIds = resource.member_ids || resource.memberIds || [];
          const isCreator = resource.created_by === context.userId || resource.createdBy === context.userId;
          return isCreator || memberIds.includes(context.userId);
        }
        return true;

      // Tasks: can read, update assigned, and comment. Cannot create or delete organization resources
      case 'tasks:read':
      case 'tasks:comment':
        return true;
      case 'tasks:create':
      case 'tasks:delete':
        return false;
      case 'tasks:update':
      case 'tasks:updateStatus':
        if (resource && context?.userId) {
          const assignee = resource.assigned_to || resource.assignedTo;
          const creator = resource.created_by || resource.createdBy;
          const isAssigned = assignee === context.userId;
          const isCreator = creator === context.userId;
          const projectMembers = resource.projectMemberIds || resource.project_member_ids || [];
          const isProjectOwner = resource.projectOwnerId === context.userId || resource.project_owner_id === context.userId;
          return isAssigned || isCreator || isProjectOwner || projectMembers.includes(context.userId);
        }
        return true;

      // Teams: can read directory, cannot create or manage teams or invite members
      case 'teams:read':
        return true;
      case 'teams:create':
      case 'teams:update':
      case 'teams:delete':
      case 'members:invite':
      case 'members:manage':
      case 'workspace:manage':
      case 'workspace:update':
      case 'workspace:delete':
        return false;

      // Documents: can read public/team/learning docs, download. Cannot upload org docs without explicit permission. Can delete ONLY owned docs
      case 'documents:read':
      case 'documents:download':
        return true;
      case 'documents:createPersonal':
      case 'documents:createOrg':
        return false;
      case 'documents:delete':
        if (resource && context?.userId) {
          const ownerId = resource.owner_id || resource.ownerId;
          return ownerId === context.userId;
        }
        return true;

      // CRM: can read and update assigned leads. Cannot create or delete leads
      case 'crm:read':
      case 'crm:editNotes':
        return true;
      case 'crm:create':
      case 'crm:delete':
        return false;
      case 'crm:update':
        if (resource && context?.userId) {
          const ownerId = resource.owner_id || resource.ownerId;
          return ownerId === context.userId;
        }
        return true;

      // Protected modules strictly forbidden for employees
      case 'billing:read':
      case 'billing:manage':
      case 'analytics:read':
      case 'admin:tools':
        return false;

      default:
        return false;
    }
  }

  // 3. INTERN - Strict Learning Sandbox
  if (normalizedRole === 'intern') {
    switch (action) {
      case 'workspace:read':
        return true;

      // Tasks: restricted to viewing assigned tasks and updating assigned task status
      case 'tasks:read':
      case 'tasks:comment':
        return true;
      case 'tasks:updateStatus':
        if (resource && context?.userId) {
          const assignee = resource.assigned_to || resource.assignedTo;
          return assignee === context.userId;
        }
        return true;
      case 'tasks:create':
      case 'tasks:update':
      case 'tasks:delete':
        return false;

      // Documents: restricted to public and learning docs only. Cannot upload or delete
      case 'documents:read':
        if (resource) {
          return resource.visibility === 'public' || resource.visibility === 'learning';
        }
        return true;
      case 'documents:download':
        return true;
      case 'documents:createOrg':
      case 'documents:createPersonal':
      case 'documents:delete':
        return false;

      // All other modules strictly denied
      case 'projects:read':
      case 'projects:create':
      case 'projects:update':
      case 'projects:delete':
      case 'teams:read':
      case 'teams:create':
      case 'teams:update':
      case 'teams:delete':
      case 'members:read':
      case 'members:invite':
      case 'members:manage':
      case 'crm:read':
      case 'crm:create':
      case 'crm:update':
      case 'crm:delete':
      case 'crm:editNotes':
      case 'billing:read':
      case 'billing:manage':
      case 'analytics:read':
      case 'admin:tools':
      case 'workspace:manage':
      case 'workspace:update':
      case 'workspace:delete':
        return false;

      default:
        return false;
    }
  }

  return false;
}
