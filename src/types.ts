export type PlatformRole = 'founder' | 'platform_admin' | 'support' | 'none';
export type UserRole = 'admin' | 'employee' | 'intern' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  platformRole?: PlatformRole;
  avatar?: string;
  title?: string;
  teamId?: string;
  created_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: 'free' | 'starter' | 'business' | 'scale' | 'enterprise' | 'pro';
  created_at: string;
  logo?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  workspace_id: string;
  lead_id: string;
  color: string;
  member_count: number;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: 'lead' | 'member';
  joined_at: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  title: string;
  description: string;
  created_by: string;
  status: ProjectStatus;
  progress: number; // 0 - 100
  start_date: string;
  due_date: string;
  budget?: string;
  member_ids: string[];
  tags: string[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'contributor' | 'viewer';
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_role?: UserRole;
  content: string;
  created_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: 'employee' | 'intern';
  token: string;
  invited_by: string;
  team_id?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string; // user id
  assignedTo?: string;
  assignee?: User | { id: string; name: string; email?: string; role?: string; avatar?: string | null } | null;
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  project_id: string;
  due_date: string;
  created_at: string;
  tags?: string[];
  is_learning_task?: boolean; // For interns
  comments_count?: number;
}

export type DocumentVisibility = 'public' | 'team' | 'private' | 'learning';

export interface DocumentItem {
  id: string;
  title: string;
  file_url: string;
  file_type: 'pdf' | 'doc' | 'sheet' | 'slide' | 'code' | 'guide';
  file_size: string;
  owner_id: string;
  visibility: DocumentVisibility;
  category: 'Policy' | 'Design' | 'Technical' | 'Marketing' | 'Onboarding' | 'General';
  created_at: string;
  download_count: number;
}

export type CrmStatus = 'new_lead' | 'contacted' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';

export interface CrmRecord {
  id: string;
  customer_name: string;
  company: string;
  email: string;
  phone: string;
  deal_value: number;
  status: CrmStatus;
  owner_id: string; // assigned employee/admin
  created_at: string;
  last_contacted: string;
  notes?: string;
}

export interface SystemLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: 'AUTH' | 'PROJECTS' | 'TASKS' | 'DOCS' | 'CRM' | 'TEAMS' | 'BILLING' | 'SETTINGS';
  ip_address: string;
  status: 'success' | 'warning' | 'denied';
  timestamp: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdf_url: string;
  plan_name: string;
}

// ============================================================================
// PHASE 13: EXTENDED SYSTEM TYPES
// ============================================================================

export interface WikiPageItem {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string;
  coverImage?: string | null;
  slug: string;
  contentJson: Record<string, any>;
  visibility: DocumentVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WikiCommentItem {
  id: string;
  pageId: string;
  userId: string;
  userName: string;
  blockId?: string;
  comment: string;
  resolved: boolean;
  createdAt: string;
}

export interface TaskTimeEntryItem {
  id: string;
  workspaceId: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes: number;
  billable: boolean;
  hourlyRate: number;
  notes?: string;
  createdAt: string;
}

export interface DeliverableApprovalItem {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId?: string;
  documentId?: string;
  title: string;
  description?: string;
  fileUrl?: string;
  guestId: string;
  status: 'pending' | 'approved' | 'changes_requested';
  feedback?: string;
  signatureHash?: string;
  signedAt?: string | null;
  createdAt: string;
}

export interface CalendarEventItemType {
  id: string;
  workspaceId: string;
  crmRecordId?: string | null;
  projectId?: string | null;
  title: string;
  description?: string;
  meetingUrl?: string;
  startTime: string;
  endTime: string;
  attendees: Array<{ email: string; name?: string; status?: string }>;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface EmailLogItemType {
  id: string;
  workspaceId: string;
  crmRecordId?: string | null;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
}
