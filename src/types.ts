export type UserRole = 'admin' | 'employee' | 'intern';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  title: string;
  teamId?: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
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
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string; // user id
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
