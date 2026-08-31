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
  team_id?: string;
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
  role?: UserRole;
  member_count?: number;
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
  started_at?: string;
  submitted_for_review_at?: string;
  submitted_by?: string;
  completed_at?: string;
  approved_by?: string;
  review_feedback?: string;
  member_ids: string[];
  team_ids?: string[];
  teams?: any[];
  members?: any[];
  tags: string[];
  created_at?: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  progress: number;
  note?: string;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'contributor' | 'viewer';
}

export interface ProjectTeam {
  id: string;
  project_id: string;
  team_id: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'completed';
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
  role: 'admin' | 'employee' | 'intern' | string;
  token: string;
  invited_by: string;
  team_id?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  status?: 'pending' | 'sent' | 'opened' | 'accepted' | 'expired';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  story_points?: number;
  storyPoints?: number;
  estimated_hours?: number | null;
  estimatedHours?: number | null;
  actual_hours?: number;
  actualHours?: number;
  assigned_to: string; // user id
  assignedTo?: string;
  assignee?: User | { id: string; name: string; email?: string; role?: string; avatar?: string | null } | null;
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  project_id: string;
  projectId?: string;
  team_id?: string | null;
  teamId?: string | null;
  due_date: string;
  dueDate?: string;
  started_at?: string | null;
  startedAt?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  reviewed_by?: string | null;
  reviewedBy?: string | null;
  reviewed_at?: string | null;
  reviewedAt?: string | null;
  is_blocked?: boolean;
  isBlocked?: boolean;
  blocked_reason?: string | null;
  blockedReason?: string | null;
  created_at: string;
  createdAt?: string;
  tags?: string[];
  is_learning_task?: boolean; // For interns
  comments_count?: number;
  activity_count?: number;
}

export type DocumentVisibility = 'public' | 'team' | 'private' | 'learning';

export interface DocumentItem {
  id: string;
  title: string;
  file_url: string;
  download_url?: string;
  storage_key?: string;
  storage_provider?: string;
  file_type: 'pdf' | 'doc' | 'sheet' | 'slide' | 'code' | 'guide' | string;
  mime_type?: string;
  file_size: string;
  file_size_bytes?: number;
  owner_id: string;
  visibility: DocumentVisibility;
  category: 'Policy' | 'Design' | 'Technical' | 'Marketing' | 'Onboarding' | 'General' | string;
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
