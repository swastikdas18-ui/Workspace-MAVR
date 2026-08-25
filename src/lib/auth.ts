import { UserRole } from '../types';

export interface RolePermissions {
  workspace: {
    view: boolean;
    manage: boolean;
  };
  projects: {
    viewAll: boolean;
    viewAssigned: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    comment: boolean;
    updateProgress: boolean;
  };
  tasks: {
    viewAll: boolean;
    viewAssigned: boolean;
    create: boolean;
    updateStatus: boolean;
    delete: boolean;
    assign: boolean;
  };
  documents: {
    viewAll: boolean;
    viewShared: boolean;
    viewLearning: boolean;
    createOrgDoc: boolean;
    createPersonalDoc: boolean;
    delete: boolean;
    download: boolean;
  };
  crm: {
    viewAll: boolean;
    viewAssigned: boolean;
    managePipeline: boolean;
    editNotes: boolean;
    createRecord: boolean;
    deleteRecord: boolean;
  };
  teams: {
    viewAll: boolean;
    viewMyTeam: boolean;
    manageTeams: boolean;
    inviteMembers: boolean;
  };
  analytics: {
    view: boolean;
    exportReports: boolean;
  };
  billing: {
    view: boolean;
    manage: boolean;
  };
  settings: {
    manage: boolean;
    adminTools: boolean;
  };
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    workspace: { view: true, manage: true },
    projects: { viewAll: true, viewAssigned: true, create: true, edit: true, delete: true, comment: true, updateProgress: true },
    tasks: { viewAll: true, viewAssigned: true, create: true, updateStatus: true, delete: true, assign: true },
    documents: { viewAll: true, viewShared: true, viewLearning: true, createOrgDoc: true, createPersonalDoc: true, delete: true, download: true },
    crm: { viewAll: true, viewAssigned: true, managePipeline: true, editNotes: true, createRecord: true, deleteRecord: true },
    teams: { viewAll: true, viewMyTeam: true, manageTeams: true, inviteMembers: true },
    analytics: { view: true, exportReports: true },
    billing: { view: true, manage: true },
    settings: { manage: true, adminTools: true }
  },
  employee: {
    workspace: { view: true, manage: false },
    projects: { viewAll: false, viewAssigned: true, create: false, edit: false, delete: false, comment: true, updateProgress: true },
    tasks: { viewAll: false, viewAssigned: true, create: false, updateStatus: true, delete: false, assign: false },
    documents: { viewAll: false, viewShared: true, viewLearning: true, createOrgDoc: false, createPersonalDoc: false, delete: false, download: true },
    crm: { viewAll: false, viewAssigned: true, managePipeline: false, editNotes: true, createRecord: false, deleteRecord: false },
    teams: { viewAll: false, viewMyTeam: true, manageTeams: false, inviteMembers: false },
    analytics: { view: false, exportReports: false },
    billing: { view: false, manage: false },
    settings: { manage: false, adminTools: false }
  },
  intern: {
    workspace: { view: false, manage: false },
    projects: { viewAll: false, viewAssigned: false, create: false, edit: false, delete: false, comment: false, updateProgress: false },
    tasks: { viewAll: false, viewAssigned: true, create: false, updateStatus: true, delete: false, assign: false },
    documents: { viewAll: false, viewShared: false, viewLearning: true, createOrgDoc: false, createPersonalDoc: false, delete: false, download: true },
    crm: { viewAll: false, viewAssigned: false, managePipeline: false, editNotes: false, createRecord: false, deleteRecord: false },
    teams: { viewAll: false, viewMyTeam: false, manageTeams: false, inviteMembers: false },
    analytics: { view: false, exportReports: false },
    billing: { view: false, manage: false },
    settings: { manage: false, adminTools: false }
  },
  guest: {
    workspace: { view: false, manage: false },
    projects: { viewAll: false, viewAssigned: false, create: false, edit: false, delete: false, comment: false, updateProgress: false },
    tasks: { viewAll: false, viewAssigned: false, create: false, updateStatus: false, delete: false, assign: false },
    documents: { viewAll: false, viewShared: false, viewLearning: false, createOrgDoc: false, createPersonalDoc: false, delete: false, download: true },
    crm: { viewAll: false, viewAssigned: false, managePipeline: false, editNotes: false, createRecord: false, deleteRecord: false },
    teams: { viewAll: false, viewMyTeam: false, manageTeams: false, inviteMembers: false },
    analytics: { view: false, exportReports: false },
    billing: { view: false, manage: false },
    settings: { manage: false, adminTools: false }
  }
};

export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'employee':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'intern':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'guest':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Full access to organization workspace, financial billing, teams, CRM, and system administration.';
    case 'employee':
      return 'Focused operational access to assigned projects, tasks, shared documents, and customer records.';
    case 'intern':
      return 'Restricted learning mode to complete assigned tasks and access onboarding documents.';
    case 'guest':
      return 'External client portal access to review and sign off on project deliverables.';
  }
}
