import { User, Workspace, Team, Project, Task, DocumentItem, CrmRecord, SystemLog, Invoice } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Administrator',
    email: 'admin@workspace.os',
    role: 'admin',
    avatar: '',
    title: 'Organization Administrator',
    created_at: new Date().toISOString(),
  }
];

export const INITIAL_WORKSPACE: Workspace = {
  id: 'ws-main',
  name: 'Workspace OS',
  slug: 'workspace-os',
  owner_id: 'user-admin',
  plan: 'pro',
  created_at: new Date().toISOString(),
};

export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_DOCUMENTS: DocumentItem[] = [];
export const INITIAL_CRM_RECORDS: CrmRecord[] = [];
export const INITIAL_SYSTEM_LOGS: SystemLog[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
