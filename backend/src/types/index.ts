export type PlatformRole = 'founder' | 'platform_admin' | 'support' | 'none';
export type WorkspaceRole = 'admin' | 'employee' | 'intern';
export type UserRole = 'founder' | 'platform_admin' | 'admin' | 'employee' | 'intern' | 'guest';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  platformRole: PlatformRole;
  title?: string | null;
  avatar?: string | null;
  teamId?: string | null;
  createdAt: Date | string;
}

export interface SafeWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  logo?: string | null;
  createdAt: Date | string;
  roleInWorkspace?: UserRole;
  memberCount?: number;
}

export interface AuthSessionResponse {
  user: SafeUser;
  workspace: SafeWorkspace | null;
  token: string;
  expiresAt: string;
}

export interface ApiErrorResponse {
  error: {
    code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR';
    message: string;
    details?: any;
  };
}

export type PermissionKey =
  | 'workspace:view'
  | 'workspace:manage'
  | 'projects:view_all'
  | 'projects:view_assigned'
  | 'projects:create'
  | 'projects:edit'
  | 'projects:delete'
  | 'projects:update_progress'
  | 'tasks:view_all'
  | 'tasks:view_assigned'
  | 'tasks:create'
  | 'tasks:update_status'
  | 'tasks:edit'
  | 'tasks:delete'
  | 'documents:view_all'
  | 'documents:view_shared'
  | 'documents:view_learning'
  | 'documents:create_org'
  | 'documents:create_personal'
  | 'documents:delete'
  | 'crm:view_all'
  | 'crm:view_assigned'
  | 'crm:manage_pipeline'
  | 'crm:create_record'
  | 'crm:delete_record'
  | 'teams:manage'
  | 'teams:view'
  | 'analytics:view'
  | 'billing:manage'
  | 'settings:manage';
