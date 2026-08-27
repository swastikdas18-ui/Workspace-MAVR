import { User, Workspace, Team, Project, Task, DocumentItem, CrmRecord, SystemLog, Invoice } from '../types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_WORKSPACE: Workspace = {
  id: '',
  name: 'Workspace',
  slug: '',
  owner_id: '',
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
