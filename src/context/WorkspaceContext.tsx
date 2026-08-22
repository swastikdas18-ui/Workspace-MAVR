import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, UserRole, Workspace, Team, Project, Task, DocumentItem, CrmRecord, SystemLog, Invoice 
} from '../types';
import { 
  INITIAL_USERS, INITIAL_WORKSPACE, INITIAL_TEAMS, INITIAL_PROJECTS, 
  INITIAL_TASKS, INITIAL_DOCUMENTS, INITIAL_CRM_RECORDS, INITIAL_SYSTEM_LOGS, INITIAL_INVOICES 
} from '../lib/mockData';
import { ROLE_PERMISSIONS, RolePermissions } from '../lib/auth';
import { api } from '../lib/api';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface WorkspaceContextType {
  currentUser: User;
  users: User[];
  currentWorkspace: Workspace;
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  documents: DocumentItem[];
  crmRecords: CrmRecord[];
  systemLogs: SystemLog[];
  invoices: Invoice[];
  permissions: RolePermissions;
  currentRole: UserRole;
  activeTab: string;
  isLandingPage: boolean;
  searchQuery: string;
  toasts: ToastMessage[];
  
  // Actions
  setAuthUser: (user: User, workspace?: Partial<Workspace>) => void;
  logout: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  setIsLandingPage: (isLanding: boolean) => void;
  setSearchQuery: (query: string) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Projects
  createProject: (project: Omit<Project, 'id' | 'created_by' | 'progress'>) => boolean;
  updateProject: (id: string, updates: Partial<Project>) => boolean;
  deleteProject: (id: string) => boolean;
  
  // Tasks
  createTask: (task: Omit<Task, 'id' | 'created_at'>) => boolean;
  updateTaskStatus: (id: string, status: Task['status']) => boolean;
  updateTask: (id: string, updates: Partial<Task>) => boolean;
  deleteTask: (id: string) => boolean;
  
  // Documents
  uploadDocument: (doc: Omit<DocumentItem, 'id' | 'created_at' | 'download_count' | 'owner_id'>) => boolean;
  deleteDocument: (id: string) => boolean;
  incrementDocDownload: (id: string) => void;
  
  // CRM
  createCrmRecord: (record: Omit<CrmRecord, 'id' | 'created_at' | 'last_contacted' | 'owner_id'>) => boolean;
  updateCrmRecord: (id: string, updates: Partial<CrmRecord>) => boolean;
  deleteCrmRecord: (id: string) => boolean;
  
  // Teams
  createTeam: (team: Omit<Team, 'id' | 'member_count' | 'workspace_id'>) => boolean;
  inviteMember: (email: string, role: UserRole, teamId: string) => boolean;
  
  // Settings & Workspace
  updateWorkspace: (updates: Partial<Workspace>) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ws_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  
  const [currentUser, setCurrentUser] = useState<User>(() => users[0]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(() => {
    const saved = localStorage.getItem('ws_workspace');
    return saved ? JSON.parse(saved) : INITIAL_WORKSPACE;
  });
  
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('ws_teams');
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });
  
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('ws_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ws_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('ws_documents');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });
  
  const [crmRecords, setCrmRecords] = useState<CrmRecord[]>(() => {
    const saved = localStorage.getItem('ws_crm');
    return saved ? JSON.parse(saved) : INITIAL_CRM_RECORDS;
  });
  
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('ws_logs');
    return saved ? JSON.parse(saved) : INITIAL_SYSTEM_LOGS;
  });
  
  const [invoices] = useState<Invoice[]>(INITIAL_INVOICES);
  
  const [isLandingPage, setIsLandingPage] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync session with backend API on mount
  useEffect(() => {
    async function loadBackendSession() {
      try {
        const session = await api.getSession();
        if (session?.user) {
          setCurrentUser(session.user as User);
          if (session.workspace) {
            setCurrentWorkspace((prev) => ({
              ...prev,
              id: session.workspace.id,
              name: session.workspace.name,
              slug: session.workspace.slug,
              owner_id: session.workspace.ownerId,
              plan: session.workspace.plan,
            }));
          }
          setIsLandingPage(false);
        } else {
          setIsLandingPage(true);
        }
      } catch (err) {
        console.warn('[Workspace OS] Session bootstrap note:', err);
        setIsLandingPage(true);
      }
    }
    loadBackendSession();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('ws_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('ws_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ws_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('ws_crm', JSON.stringify(crmRecords));
  }, [crmRecords]);

  useEffect(() => {
    localStorage.setItem('ws_logs', JSON.stringify(systemLogs));
  }, [systemLogs]);

  useEffect(() => {
    localStorage.setItem('ws_teams', JSON.stringify(teams));
  }, [teams]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const logAction = (action: string, module: SystemLog['module'], status: 'success' | 'warning' | 'denied' = 'success') => {
    const newLog: SystemLog = {
      id: 'log-' + Date.now(),
      user_id: currentUser.id,
      user_name: currentUser.name,
      action,
      module,
      ip_address: '127.0.0.1 (Session Client)',
      status,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setSystemLogs((prev) => [newLog, ...prev]);
  };

  const currentRole = currentUser.role;
  const permissions = ROLE_PERMISSIONS[currentRole];

  const setAuthUser = (user: User, workspace?: Partial<Workspace>) => {
    setCurrentUser(user);
    if (workspace) {
      setCurrentWorkspace((prev) => ({
        ...prev,
        ...workspace,
        name: workspace.name || prev.name,
        id: workspace.id || prev.id,
      }));
    }
    setIsLandingPage(false);
    setActiveTab('dashboard');
    logAction(`User logged in with role [${user.role.toUpperCase()}]`, 'AUTH');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('[Workspace OS] Logout notification note:', err);
    }
    setIsLandingPage(true);
    setActiveTab('dashboard');
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out from the workspace session.',
    });
    logAction(`User signed out from active session`, 'AUTH');
  };

  // Projects Actions
  const createProject = (data: Omit<Project, 'id' | 'created_by' | 'progress'>): boolean => {
    if (!permissions.projects.create) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can create new projects.' });
      logAction('Attempted unauthorized project creation', 'PROJECTS', 'denied');
      return false;
    }
    const newProj: Project = {
      ...data,
      id: 'proj-' + Date.now(),
      created_by: currentUser.id,
      progress: 0,
    };
    setProjects((prev) => [newProj, ...prev]);
    addToast({ type: 'success', title: 'Project Created', message: `"${newProj.title}" added to Workspace.` });
    logAction(`Created project "${newProj.title}"`, 'PROJECTS');
    return true;
  };

  const updateProject = (id: string, updates: Partial<Project>): boolean => {
    if (currentRole === 'intern') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Interns cannot modify project properties.' });
      logAction('Unauthorized project modification attempt', 'PROJECTS', 'denied');
      return false;
    }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    addToast({ type: 'success', title: 'Project Updated', message: 'Project status and parameters saved.' });
    logAction(`Updated project ${id}`, 'PROJECTS');
    return true;
  };

  const deleteProject = (id: string): boolean => {
    if (!permissions.projects.delete) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can delete projects.' });
      logAction(`Unauthorized deletion attempt for project ${id}`, 'PROJECTS', 'denied');
      return false;
    }
    const target = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    addToast({ type: 'info', title: 'Project Deleted', message: `Project "${target?.title}" removed.` });
    logAction(`Deleted project ${id}`, 'PROJECTS', 'warning');
    return true;
  };

  // Tasks Actions
  const createTask = (data: Omit<Task, 'id' | 'created_at'>): boolean => {
    if (!permissions.tasks.create) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Your role cannot create new tasks.' });
      logAction('Unauthorized task creation attempt', 'TASKS', 'denied');
      return false;
    }
    const newTask: Task = {
      ...data,
      id: 'task-' + Date.now(),
      created_at: new Date().toISOString().substring(0, 10),
      comments_count: 0
    };
    setTasks((prev) => [newTask, ...prev]);
    addToast({ type: 'success', title: 'Task Created', message: `"${newTask.title}" added.` });
    logAction(`Created task "${newTask.title}"`, 'TASKS');
    return true;
  };

  const updateTaskStatus = (id: string, status: Task['status']): boolean => {
    if (!permissions.tasks.updateStatus) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Cannot update task status.' });
      return false;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    addToast({ type: 'info', title: 'Status Updated', message: `Task moved to ${status.replace('_', ' ').toUpperCase()}` });
    logAction(`Changed task ${id} status to ${status}`, 'TASKS');
    return true;
  };

  const updateTask = (id: string, updates: Partial<Task>): boolean => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    addToast({ type: 'success', title: 'Task Saved', message: 'Task details updated.' });
    logAction(`Updated task ${id}`, 'TASKS');
    return true;
  };

  const deleteTask = (id: string): boolean => {
    if (!permissions.tasks.delete) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can delete tasks.' });
      logAction(`Attempted to delete task ${id}`, 'TASKS', 'denied');
      return false;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    addToast({ type: 'info', title: 'Task Deleted', message: 'Task removed from board.' });
    logAction(`Deleted task ${id}`, 'TASKS', 'warning');
    return true;
  };

  // Documents Actions
  const uploadDocument = (doc: Omit<DocumentItem, 'id' | 'created_at' | 'download_count' | 'owner_id'>): boolean => {
    if (doc.visibility !== 'private' && !permissions.documents.createOrgDoc && !permissions.documents.createPersonalDoc) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Role not permitted to create documents.' });
      logAction('Unauthorized document upload attempt', 'DOCS', 'denied');
      return false;
    }
    const newDoc: DocumentItem = {
      ...doc,
      id: 'doc-' + Date.now(),
      created_at: new Date().toISOString().substring(0, 10),
      download_count: 0,
      owner_id: currentUser.id
    };
    setDocuments((prev) => [newDoc, ...prev]);
    addToast({ type: 'success', title: 'Document Uploaded', message: `"${newDoc.title}" is now available.` });
    logAction(`Uploaded document "${newDoc.title}"`, 'DOCS');
    return true;
  };

  const deleteDocument = (id: string): boolean => {
    const target = documents.find((d) => d.id === id);
    if (!target) return false;
    
    if (currentRole === 'intern') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Interns cannot delete documents.' });
      logAction(`Intern attempted to delete doc ${id}`, 'DOCS', 'denied');
      return false;
    }
    if (currentRole === 'employee' && target.owner_id !== currentUser.id) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Employees can only delete personal documents.' });
      logAction(`Employee attempted to delete non-owned doc ${id}`, 'DOCS', 'denied');
      return false;
    }
    
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    addToast({ type: 'info', title: 'Document Deleted', message: `"${target.title}" was removed.` });
    logAction(`Deleted document "${target.title}"`, 'DOCS', 'warning');
    return true;
  };

  const incrementDocDownload = (id: string) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, download_count: d.download_count + 1 } : d)));
    const target = documents.find((d) => d.id === id);
    addToast({ type: 'success', title: 'Download Ready', message: `Downloaded "${target?.title || 'file'}"` });
    logAction(`Downloaded document ${id}`, 'DOCS');
  };

  // CRM Actions
  const createCrmRecord = (record: Omit<CrmRecord, 'id' | 'created_at' | 'last_contacted' | 'owner_id'>): boolean => {
    if (!permissions.crm.createRecord) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only authorized roles can create CRM leads.' });
      logAction('Unauthorized CRM record creation', 'CRM', 'denied');
      return false;
    }
    const newRecord: CrmRecord = {
      ...record,
      id: 'crm-' + Date.now(),
      created_at: new Date().toISOString().substring(0, 10),
      last_contacted: new Date().toISOString().substring(0, 10),
      owner_id: currentUser.id
    };
    setCrmRecords((prev) => [newRecord, ...prev]);
    addToast({ type: 'success', title: 'Lead Added', message: `"${newRecord.customer_name}" registered.` });
    logAction(`Created CRM record "${newRecord.customer_name}"`, 'CRM');
    return true;
  };

  const updateCrmRecord = (id: string, updates: Partial<CrmRecord>): boolean => {
    if (currentRole === 'intern') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Interns do not have CRM access.' });
      return false;
    }
    setCrmRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates, last_contacted: new Date().toISOString().substring(0, 10) } : r)));
    addToast({ type: 'success', title: 'CRM Updated', message: 'Client record saved.' });
    logAction(`Updated CRM record ${id}`, 'CRM');
    return true;
  };

  const deleteCrmRecord = (id: string): boolean => {
    if (!permissions.crm.deleteRecord) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can delete CRM client records.' });
      logAction(`Unauthorized CRM deletion ${id}`, 'CRM', 'denied');
      return false;
    }
    setCrmRecords((prev) => prev.filter((r) => r.id !== id));
    addToast({ type: 'info', title: 'Lead Removed', message: 'CRM record purged.' });
    logAction(`Deleted CRM record ${id}`, 'CRM', 'warning');
    return true;
  };

  // Teams Actions
  const createTeam = (team: Omit<Team, 'id' | 'member_count' | 'workspace_id'>): boolean => {
    if (!permissions.teams.manageTeams) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can create teams.' });
      logAction('Unauthorized team creation', 'TEAMS', 'denied');
      return false;
    }
    const newTeam: Team = {
      ...team,
      id: 'team-' + Date.now(),
      workspace_id: currentWorkspace.id,
      member_count: 1
    };
    setTeams((prev) => [...prev, newTeam]);
    addToast({ type: 'success', title: 'Team Created', message: `Team "${newTeam.name}" initialized.` });
    logAction(`Created team "${newTeam.name}"`, 'TEAMS');
    return true;
  };

  const inviteMember = (email: string, role: UserRole, teamId: string): boolean => {
    if (!permissions.teams.inviteMembers) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can invite new members.' });
      logAction(`Unauthorized member invite attempt for ${email}`, 'TEAMS', 'denied');
      return false;
    }
    const newUser: User = {
      id: 'user-' + Date.now(),
      name: email.split('@')[0].replace('.', ' '),
      email,
      role,
      title: role === 'admin' ? 'Co-Administrator' : role === 'employee' ? 'Team Member' : 'Intern',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      teamId,
      created_at: new Date().toISOString()
    };
    setUsers((prev) => [...prev, newUser]);
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, member_count: t.member_count + 1 } : t)));
    addToast({ type: 'success', title: 'Invitation Sent', message: `Added ${email} as ${role.toUpperCase()}` });
    logAction(`Invited new user ${email} with role [${role.toUpperCase()}]`, 'TEAMS');
    return true;
  };

  const updateWorkspace = (updates: Partial<Workspace>): boolean => {
    if (!permissions.workspace.manage) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can update workspace configuration.' });
      logAction('Unauthorized workspace update attempt', 'SETTINGS', 'denied');
      return false;
    }
    setCurrentWorkspace((prev) => ({ ...prev, ...updates }));
    addToast({ type: 'success', title: 'Workspace Saved', message: 'Workspace details updated.' });
    logAction(`Updated workspace settings`, 'SETTINGS');
    return true;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentUser,
        users,
        currentWorkspace,
        teams,
        projects,
        tasks,
        documents,
        crmRecords,
        systemLogs,
        invoices,
        permissions,
        currentRole,
        activeTab,
        isLandingPage,
        searchQuery,
        toasts,
        setAuthUser,
        logout,
        setActiveTab,
        setIsLandingPage,
        setSearchQuery,
        addToast,
        removeToast,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        uploadDocument,
        deleteDocument,
        incrementDocDownload,
        createCrmRecord,
        updateCrmRecord,
        deleteCrmRecord,
        createTeam,
        inviteMember,
        updateWorkspace
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
