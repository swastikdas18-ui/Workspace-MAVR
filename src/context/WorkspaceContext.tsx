import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, UserRole, Workspace, Team, Project, Task, DocumentItem, CrmRecord, SystemLog, Invoice, TaskComment, WorkspaceInvite 
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
  invites: WorkspaceInvite[];
  permissions: RolePermissions;
  currentRole: UserRole;
  activeTab: string;
  isLandingPage: boolean;
  isAuthBootstrapping: boolean;
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
  refreshWorkspaceData: () => Promise<void>;
  
  // Projects
  createProject: (project: Omit<Project, 'id' | 'created_by' | 'progress'>) => Promise<boolean>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  
  // Tasks
  createTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<boolean>;
  updateTaskStatus: (id: string, status: Task['status']) => Promise<boolean>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  
  // Task Comments
  getTaskComments: (taskId: string) => Promise<TaskComment[]>;
  addTaskComment: (taskId: string, content: string) => Promise<TaskComment | null>;
  
  // Documents
  uploadDocument: (doc: Omit<DocumentItem, 'id' | 'created_at' | 'download_count' | 'owner_id'>) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  incrementDocDownload: (id: string) => Promise<void>;
  
  // CRM
  createCrmRecord: (record: Omit<CrmRecord, 'id' | 'created_at' | 'last_contacted' | 'owner_id'>) => boolean;
  updateCrmRecord: (id: string, updates: Partial<CrmRecord>) => boolean;
  deleteCrmRecord: (id: string) => boolean;
  
  // Teams & Invites
  createTeam: (team: Omit<Team, 'id' | 'member_count' | 'workspace_id'>) => Promise<boolean>;
  inviteMember: (email: string, role: UserRole, teamId?: string) => Promise<WorkspaceInvite | null>;
  loadInvites: () => Promise<void>;
  
  // Settings & Workspace
  updateWorkspace: (updates: Partial<Workspace>) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(INITIAL_WORKSPACE);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [crmRecords, setCrmRecords] = useState<CrmRecord[]>(INITIAL_CRM_RECORDS);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(INITIAL_SYSTEM_LOGS);
  const [invoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  
  const [isLandingPage, setIsLandingPage] = useState<boolean>(true);
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
      user_id: currentUser?.id || 'anonymous',
      user_name: currentUser?.name || 'Anonymous User',
      action,
      module,
      ip_address: '127.0.0.1 (Session Client)',
      status,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setSystemLogs((prev) => [newLog, ...prev]);
  };

  // Centralized backend data fetching
  const refreshWorkspaceData = useCallback(async () => {
    try {
      const [projectsRes, tasksRes, teamsRes, docsRes, membersRes, crmRes] = await Promise.allSettled([
        api.getProjects(),
        api.getTasks(),
        api.getTeams(),
        api.getDocuments(),
        api.getWorkspaceMembers(),
        api.getCrmLeads(),
      ]);

      if (projectsRes.status === 'fulfilled' && projectsRes.value?.projects) {
        setProjects(projectsRes.value.projects);
      }
      if (tasksRes.status === 'fulfilled' && tasksRes.value?.tasks) {
        setTasks(tasksRes.value.tasks);
      }
      if (teamsRes.status === 'fulfilled' && teamsRes.value?.teams) {
        setTeams(teamsRes.value.teams);
      }
      if (docsRes.status === 'fulfilled' && docsRes.value?.documents) {
        setDocuments(docsRes.value.documents);
      }
      if (crmRes.status === 'fulfilled' && crmRes.value?.leads) {
        setCrmRecords(crmRes.value.leads);
      }
      if (membersRes.status === 'fulfilled' && membersRes.value?.members) {
        const fetchedUsers = membersRes.value.members.map((m: any) => ({
          ...m.member,
          role: m.role || m.member.role,
        }));
        if (fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
        }
      }
    } catch (err) {
      console.warn('[Workspace OS] Background data refresh:', err);
    }
  }, []);

  // Sync session with backend API on mount
  useEffect(() => {
    async function loadBackendSession() {
      try {
        const session = await api.getSession();
        if (session?.user) {
          setCurrentUser(session.user as User);
          if (session.workspace) {
            setCurrentWorkspace({
              id: session.workspace.id,
              name: session.workspace.name,
              slug: session.workspace.slug,
              owner_id: session.workspace.ownerId,
              plan: session.workspace.plan,
              created_at: session.workspace.createdAt || new Date().toISOString(),
            });
          }
          setIsLandingPage(false);
          await refreshWorkspaceData();
        } else {
          setIsLandingPage(true);
        }
      } catch (err) {
        console.warn('[Workspace OS] Session bootstrap note:', err);
        setIsLandingPage(true);
      } finally {
        setIsAuthBootstrapping(false);
      }
    }
    loadBackendSession();
  }, [refreshWorkspaceData]);

  const currentRole = currentUser?.role || 'employee';
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
    refreshWorkspaceData();
    logAction(`User authenticated with role [${user.role.toUpperCase()}]`, 'AUTH');
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
  const createProject = async (data: Omit<Project, 'id' | 'created_by' | 'progress'>): Promise<boolean> => {
    if (!permissions.projects.create) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can create new projects.' });
      logAction('Attempted unauthorized project creation', 'PROJECTS', 'denied');
      return false;
    }
    try {
      const res = await api.createProject({
        title: data.title,
        description: data.description,
        status: data.status,
        startDate: data.start_date,
        dueDate: data.due_date,
        budget: data.budget,
        memberIds: data.member_ids,
        tags: data.tags,
      });
      if (res.project) {
        setProjects((prev) => [res.project, ...prev]);
        addToast({ type: 'success', title: 'Project Created', message: `"${res.project.title}" saved to PostgreSQL.` });
        logAction(`Created project "${res.project.title}"`, 'PROJECTS');
        return true;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to create project.' });
    }
    return false;
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<boolean> => {
    if (currentRole === 'intern') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Interns cannot modify project properties.' });
      logAction('Unauthorized project modification attempt', 'PROJECTS', 'denied');
      return false;
    }
    try {
      const res = await api.updateProject(id, updates);
      if (res.project) {
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
        addToast({ type: 'success', title: 'Project Updated', message: 'Project status and parameters saved.' });
        logAction(`Updated project ${id}`, 'PROJECTS');
        return true;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update project.' });
    }
    return false;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    if (!permissions.projects.delete) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can delete projects.' });
      logAction(`Unauthorized deletion attempt for project ${id}`, 'PROJECTS', 'denied');
      return false;
    }
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      addToast({ type: 'info', title: 'Project Deleted', message: 'Project removed from database.' });
      logAction(`Deleted project ${id}`, 'PROJECTS', 'warning');
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete project.' });
    }
    return false;
  };

  // Tasks Actions
  const createTask = async (data: Omit<Task, 'id' | 'created_at'>): Promise<boolean> => {
    if (!permissions.tasks.create) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Your role cannot create new tasks.' });
      logAction('Unauthorized task creation attempt', 'TASKS', 'denied');
      return false;
    }
    try {
      const res = await api.createTask({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assignedTo: data.assigned_to,
        projectId: data.project_id,
        dueDate: data.due_date,
        isLearningTask: data.is_learning_task,
      });
      if (res.task) {
        setTasks((prev) => [res.task, ...prev]);
        addToast({ type: 'success', title: 'Task Created', message: `"${res.task.title}" saved to PostgreSQL.` });
        logAction(`Created task "${res.task.title}"`, 'TASKS');
        return true;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to create task.' });
    }
    return false;
  };

  const updateTaskStatus = async (id: string, status: Task['status']): Promise<boolean> => {
    if (!permissions.tasks.updateStatus) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Cannot update task status.' });
      return false;
    }
    try {
      const res = await api.updateTask(id, { status });
      if (res.task) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
        addToast({ type: 'info', title: 'Status Updated', message: `Task moved to ${status.replace('_', ' ').toUpperCase()}` });
        logAction(`Changed task ${id} status to ${status}`, 'TASKS');
        return true;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update status.' });
    }
    return false;
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<boolean> => {
    try {
      const res = await api.updateTask(id, updates);
      if (res.task) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...res.task } : t)));
        addToast({ type: 'success', title: 'Task Saved', message: 'Task details updated.' });
        logAction(`Updated task ${id}`, 'TASKS');
        return true;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update task.' });
    }
    return false;
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    if (!permissions.tasks.delete) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can delete tasks.' });
      logAction(`Attempted to delete task ${id}`, 'TASKS', 'denied');
      return false;
    }
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      addToast({ type: 'info', title: 'Task Deleted', message: 'Task removed from PostgreSQL.' });
      logAction(`Deleted task ${id}`, 'TASKS', 'warning');
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete task.' });
    }
    return false;
  };

  // Task Comments
  const getTaskComments = async (taskId: string): Promise<TaskComment[]> => {
    try {
      const res = await api.getTaskComments(taskId);
      return res.comments || [];
    } catch (err) {
      console.warn('Failed to load task comments:', err);
      return [];
    }
  };

  const addTaskComment = async (taskId: string, content: string): Promise<TaskComment | null> => {
    try {
      const res = await api.addTaskComment(taskId, content);
      if (res.comment) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, comments_count: (t.comments_count || 0) + 1 } : t))
        );
        addToast({ type: 'success', title: 'Comment Posted', message: 'Feedback added to task stream.' });
        return res.comment;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to add comment.' });
    }
    return null;
  };

  // Documents Actions
  const uploadDocument = async (doc: Omit<DocumentItem, 'id' | 'created_at' | 'download_count' | 'owner_id'>): Promise<boolean> => {
    if (doc.visibility !== 'private' && !permissions.documents.createOrgDoc && !permissions.documents.createPersonalDoc) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Role not permitted to create documents.' });
      logAction('Unauthorized document upload attempt', 'DOCS', 'denied');
      return false;
    }
    try {
      const res = await api.createDocument({
        title: doc.title,
        fileUrl: doc.file_url,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        visibility: doc.visibility,
        category: doc.category,
      });
      if (res.document) {
        setDocuments((prev) => [res.document, ...prev]);
        addToast({ type: 'success', title: 'Document Uploaded', message: `"${res.document.title}" stored in database.` });
        logAction(`Uploaded document "${res.document.title}"`, 'DOCS');
        return true;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to upload document.' });
    }
    return false;
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
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
    
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      addToast({ type: 'info', title: 'Document Deleted', message: `"${target.title}" was removed.` });
      logAction(`Deleted document "${target.title}"`, 'DOCS', 'warning');
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete document.' });
    }
    return false;
  };

  const incrementDocDownload = async (id: string) => {
    try {
      const res = await api.downloadDocument(id);
      if (res && res.downloadCount !== undefined) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, download_count: res.downloadCount } : d))
        );
      }
      const target = documents.find((d) => d.id === id);
      // Trigger client file download
      const content = `# ${target?.title || 'Workspace Document'}\n\nCategory: ${target?.category || 'General'}\nVisibility: ${target?.visibility || 'team'}\nFile Size: ${target?.file_size || '1.2 MB'}\n\nDownloaded from Workspace OS Document Vault.\nTimestamp: ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(target?.title || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({ type: 'success', title: 'Download Complete', message: `Downloaded "${target?.title || 'file'}"` });
      logAction(`Downloaded document ${id}`, 'DOCS');
    } catch (err: any) {
      console.warn('Increment download note:', err);
      addToast({ type: 'error', title: 'Download Error', message: err.message || 'Failed to download document.' });
    }
  };

  // CRM Actions
  const createCrmRecord = (record: Omit<CrmRecord, 'id' | 'created_at' | 'last_contacted' | 'owner_id'>): boolean => {
    if (!permissions.crm.createRecord) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only authorized roles can create CRM leads.' });
      logAction('Unauthorized CRM record creation', 'CRM', 'denied');
      return false;
    }
    const tempId = 'crm-' + Date.now();
    const newRecord: CrmRecord = {
      ...record,
      id: tempId,
      created_at: new Date().toISOString().substring(0, 10),
      last_contacted: new Date().toISOString().substring(0, 10),
      owner_id: currentUser.id
    };
    setCrmRecords((prev) => [newRecord, ...prev]);
    addToast({ type: 'success', title: 'Lead Added', message: `"${newRecord.customer_name}" registered.` });
    logAction(`Created CRM record "${newRecord.customer_name}"`, 'CRM');

    // Async persist to backend API
    api.createCrmLead({
      customerName: record.customer_name,
      company: record.company,
      email: record.email,
      phone: record.phone,
      dealValue: record.deal_value,
      status: record.status,
      notes: record.notes,
    }).then((res) => {
      if (res?.lead) {
        setCrmRecords((prev) => prev.map((r) => r.id === tempId ? res.lead : r));
      }
    }).catch((err) => {
      console.warn('Failed to persist CRM lead:', err);
    });

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

    // Async persist update
    api.updateCrmLead(id, {
      customerName: updates.customer_name,
      company: updates.company,
      email: updates.email,
      phone: updates.phone,
      dealValue: updates.deal_value,
      status: updates.status,
      notes: updates.notes,
    }).catch((err) => {
      console.warn('Failed to persist CRM update:', err);
    });

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

    api.deleteCrmLead(id).catch((err) => {
      console.warn('Failed to persist CRM deletion:', err);
    });

    return true;
  };

  // Teams & Invites Actions
  const createTeam = async (team: Omit<Team, 'id' | 'member_count' | 'workspace_id'>): Promise<boolean> => {
    if (!permissions.teams.manageTeams) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can create teams.' });
      logAction('Unauthorized team creation', 'TEAMS', 'denied');
      return false;
    }
    try {
      const res = await api.createTeam(team);
      if (res.team) {
        setTeams((prev) => [...prev, res.team]);
        addToast({ type: 'success', title: 'Team Created', message: `Team "${res.team.name}" initialized.` });
        logAction(`Created team "${res.team.name}"`, 'TEAMS');
        return true;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to create team.' });
    }
    return false;
  };

  const inviteMember = async (email: string, role: UserRole, teamId?: string): Promise<WorkspaceInvite | null> => {
    if (!permissions.teams.inviteMembers) {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Admins can invite new members.' });
      logAction(`Unauthorized member invite attempt for ${email}`, 'TEAMS', 'denied');
      return null;
    }

    const assignedRole = role === 'intern' ? 'intern' : 'employee'; // Never admin

    try {
      const res = await api.createInvite({
        email,
        role: assignedRole,
        teamId: teamId || undefined,
      });

      if (res.invite) {
        setInvites((prev) => [res.invite, ...prev]);
        addToast({
          type: 'success',
          title: 'Invitation Generated',
          message: `Invite generated for ${email} with role [${assignedRole.toUpperCase()}].`,
        });
        logAction(`Created workspace invite for ${email} as [${assignedRole.toUpperCase()}]`, 'TEAMS');
        return res.invite;
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to generate invitation.' });
    }
    return null;
  };

  const loadInvites = async () => {
    if (currentRole !== 'admin') return;
    try {
      const res = await api.getInvites();
      if (res.invites) {
        setInvites(res.invites);
      }
    } catch (err) {
      console.warn('Failed to load invites:', err);
    }
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
        invites,
        permissions,
        currentRole,
        activeTab,
        isLandingPage,
        isAuthBootstrapping,
        searchQuery,
        toasts,
        setAuthUser,
        logout,
        setActiveTab,
        setIsLandingPage,
        setSearchQuery,
        addToast,
        removeToast,
        refreshWorkspaceData,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        getTaskComments,
        addTaskComment,
        uploadDocument,
        deleteDocument,
        incrementDocDownload,
        createCrmRecord,
        updateCrmRecord,
        deleteCrmRecord,
        createTeam,
        inviteMember,
        loadInvites,
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
