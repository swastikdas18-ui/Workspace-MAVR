/**
 * Workspace OS - Centralized Backend API Client
 * Connects frontend state and authentication directly to backend & PostgreSQL.
 */

export const DEFAULT_API_URL = 'https://workspace-mavr.onrender.com';

export const API_BASE_URL: string =
  ((import.meta?.env?.VITE_API_URL || import.meta?.env?.VITE_BACKEND_URL || DEFAULT_API_URL) as string).replace(/\/$/, '');

/**
 * Centrally construct authoritative WebSocket URLs targeting the backend server origin.
 */
export function getWebSocketUrl(token?: string, workspaceId?: string): string {
  const backend =
    (import.meta?.env?.VITE_API_URL as string | undefined) ||
    (import.meta?.env?.VITE_BACKEND_URL as string | undefined) ||
    DEFAULT_API_URL;

  let wsBase = backend;
  if (wsBase.startsWith('https://')) {
    wsBase = wsBase.replace(/^https:\/\//, 'wss://');
  } else if (wsBase.startsWith('http://')) {
    wsBase = wsBase.replace(/^http:\/\//, 'ws://');
  } else {
    wsBase = 'wss://workspace-mavr.onrender.com';
  }

  const queryParams = new URLSearchParams();
  if (token) queryParams.set('token', token);
  if (workspaceId) queryParams.set('workspaceId', workspaceId);
  const qs = queryParams.toString();

  return `${wsBase.replace(/\/$/, '')}/ws${qs ? `?${qs}` : ''}`;
}

/**
 * Centrally construct frontend URLs (for shareable invite links, auth callbacks, etc.).
 */
export function getFrontendUrl(path: string = ''): string {
  const frontend =
    (import.meta?.env?.VITE_FRONTEND_URL as string | undefined) ||
    (import.meta?.env?.VITE_APP_URL as string | undefined) ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${frontend.replace(/\/$/, '')}${cleanPath}`;
}

const TOKEN_KEY = 'ws_session_token';

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * SECURITY (Phase 17): session tokens now live in httpOnly cookies set by the
 * backend. The SPA never receives or stores the raw token; it only echoes the
 * readable `ws_csrf` cookie via the X-CSRF-Token header (double-submit).
 */
function readCsrfCookie(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Legacy migration hook: clears any pre-Phase-17 localStorage token. */
export function setStoredSessionToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to store session token:', err);
  }
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const storedToken = getStoredSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(storedToken ? {
      'Authorization': `Bearer ${storedToken}`,
      'x-session-token': storedToken,
    } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrfToken = readCsrfCookie();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${API_BASE_URL}${normalizedPath}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    // Dual transport: cookie-based session transport (ws_session) + Authorization Bearer header
    credentials: 'include',
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json?.error?.detail ? `${json?.error?.message} (${json?.error?.detail})` : (json?.error?.message || `HTTP error ${response.status}`);
    const errorObj = new Error(errorMsg);
    (errorObj as any).code = json?.error?.code || 'API_ERROR';
    (errorObj as any).status = response.status;
    (errorObj as any).detail = json?.error?.detail;
    throw errorObj;
  }

  return json as T;
}

export const api = {
  // Auth API
  async register(data: { name: string; email: string; password: string; workspaceName?: string; workspaceId?: string; role?: string }) {
    const res = await fetchApi<{ user: any; workspace: any; expiresAt: string; csrfToken?: string; token?: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    if (res?.token) {
      setStoredSessionToken(res.token);
    }
    return res;
  },

  async login(credentials: { email: string; password: string }) {
    const res = await fetchApi<{ user: any; workspace: any; expiresAt: string; csrfToken?: string; token?: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );
    if (res?.token) {
      setStoredSessionToken(res.token);
    }
    return res;
  },

  async logout() {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredSessionToken(null);
    }
  },

  async getSession() {
    try {
      const res = await fetchApi<{ user: any; workspace: any; expiresAt: string; csrfToken?: string; token?: string }>(
        '/api/auth/session'
      );
      if (res?.token) {
        setStoredSessionToken(res.token);
      }
      return res;
    } catch {
      return null;
    }
  },

  // Workspace API
  async getWorkspaces() {
    return await fetchApi<{ workspaces: any[] }>('/api/workspaces/all');
  },

  async getCurrentWorkspace() {
    return await fetchApi<{ workspace: any; role?: string }>('/api/workspace/current');
  },

  async getWorkspace(workspaceId?: string) {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    return await fetchApi<{ workspace: any }>(`/api/workspace${query}`);
  },

  async switchWorkspace(workspaceId: string) {
    return await fetchApi<{ success: boolean; workspace: any }>('/api/workspace/switch', {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    });
  },

  async createWorkspace(data: { name: string; slug?: string; plan?: string }) {
    return await fetchApi<{ workspace: any }>('/api/workspace', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getWorkspaceMembers() {
    return await fetchApi<{ members: Array<{ member: any; role: string; joinedAt: string }> }>(
      '/api/workspace/members'
    );
  },

  // Invites API
  async createInvite(data: { email: string; role: 'admin' | 'employee' | 'intern' | string; teamId?: string }) {
    return await fetchApi<{ invite: any }>('/api/invites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInvites() {
    return await fetchApi<{ invites: any[] }>('/api/invites');
  },

  async previewInvite(token: string) {
    return await fetchApi<{ invite: any; workspace: any }>(`/api/invites/preview/${token}`);
  },

  async acceptInvite(data: { token: string; name: string; password: string }) {
    return await fetchApi<{
      success: boolean;
      accepted: boolean;
      requiresLogin: boolean;
      email: string;
      user: any;
      workspace: any;
    }>('/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async cancelInvite(id: string) {
    return await fetchApi<{ success: boolean; message: string }>(`/api/invites/${id}`, {
      method: 'DELETE',
    });
  },

  // Projects API
  async getProjects() {
    return await fetchApi<{ projects: any[] }>('/api/projects');
  },

  async createProject(data: any) {
    console.log('[API createProject payload]', data);
    return await fetchApi<{ project: any }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: any) {
    return await fetchApi<{ project: any }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async startProject(id: string) {
    return await fetchApi<{ project: any }>(`/api/projects/${id}/start`, {
      method: 'POST',
    });
  },

  async updateProjectProgress(id: string, progress: number, note?: string) {
    return await fetchApi<{ update: any; project: any }>(`/api/projects/${id}/progress`, {
      method: 'POST',
      body: JSON.stringify({ progress, note }),
    });
  },

  async submitProjectReview(id: string) {
    return await fetchApi<{ project: any }>(`/api/projects/${id}/submit-review`, {
      method: 'POST',
    });
  },

  async approveProjectReview(id: string) {
    return await fetchApi<{ project: any }>(`/api/projects/${id}/approve`, {
      method: 'POST',
    });
  },

  async requestProjectChanges(id: string, feedback: string) {
    return await fetchApi<{ project: any }>(`/api/projects/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  },

  async getProjectUpdates(id: string) {
    return await fetchApi<{ updates: any[] }>(`/api/projects/${id}/updates`);
  },

  // Tasks API (Phase 2 Task Execution Engine)
  async getTasks(filters?: {
    projectId?: string;
    teamId?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    isBlocked?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', filters.projectId);
    if (filters?.teamId) params.set('teamId', filters.teamId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);
    if (filters?.isBlocked !== undefined) params.set('isBlocked', String(filters.isBlocked));
    const query = params.toString() ? `?${params.toString()}` : '';
    return await fetchApi<{ tasks: any[] }>(`/api/tasks${query}`);
  },

  async getTask(id: string) {
    return await fetchApi<{ task: any }>(`/api/tasks/${id}`);
  },

  async createTask(data: any) {
    return await fetchApi<{ task: any }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(id: string, data: any) {
    return await fetchApi<{ task: any }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteTask(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async startTask(id: string) {
    return await fetchApi<{ task: any; message: string }>(`/api/tasks/${id}/start`, {
      method: 'POST',
    });
  },

  async submitTaskReview(id: string, notes?: string) {
    return await fetchApi<{ task: any; message: string }>(`/api/tasks/${id}/submit-review`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async approveTask(id: string, feedback?: string) {
    return await fetchApi<{ task: any; message: string }>(`/api/tasks/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  },

  async requestTaskChanges(id: string, feedback: string) {
    return await fetchApi<{ task: any; message: string }>(`/api/tasks/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  },

  async blockTask(id: string, reason: string) {
    return await fetchApi<{ task: any; message: string }>(`/api/tasks/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async unblockTask(id: string) {
    return await fetchApi<{ task: any; message: string }>(`/api/tasks/${id}/unblock`, {
      method: 'POST',
    });
  },

  async getTaskActivity(id: string) {
    return await fetchApi<{ activity: any[] }>(`/api/tasks/${id}/activity`);
  },

  // Task Comments API
  async getTaskComments(taskId: string) {
    return await fetchApi<{ comments: any[] }>(`/api/tasks/${taskId}/comments`);
  },

  async addTaskComment(taskId: string, content: string) {
    return await fetchApi<{ comment: any }>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Phase 2.1 & 2.2: Chat -> Action Engine & Task Discussion
  async createTaskFromMessage(data: {
    messageId: string;
    title?: string;
    description?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
    projectId?: string;
  }) {
    return await fetchApi<{
      task: any;
      messageTask: any;
      sourceMessageId: string;
      sourceConversationId: string;
      sourceWorkspaceId: string;
    }>('/api/tasks/from-message', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTaskDiscussion(taskId: string) {
    return await fetchApi<{
      task: any;
      conversation: any | null;
      sourceMessage: any | null;
      messages: any[];
      linkedConversationId: string | null;
      linkedMessageId: string | null;
    }>(`/api/tasks/${taskId}/discussion`);
  },

  async postTaskDiscussion(taskId: string, content: string) {
    return await fetchApi<{ message: any; task: any }>(`/api/tasks/${taskId}/discussion`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Teams API
  async getTeams() {
    return await fetchApi<{ teams: any[] }>('/api/teams');
  },

  async createTeam(data: any) {
    return await fetchApi<{ team: any }>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTeamMembers(teamId: string) {
    return await fetchApi<{ members: any[] }>(`/api/teams/${teamId}/members`);
  },

  async addTeamMember(teamId: string, userId: string, role = 'member') {
    return await fetchApi<{ success: boolean; member: any; team: any }>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  async addTeamMembers(teamId: string, userIds: string[]) {
    return await fetchApi<{ members: any[]; team: any }>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },

  async removeTeamMember(teamId: string, userId: string) {
    return await fetchApi<{ success: boolean; team: any }>(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async moveTeamMember(fromTeamId: string, toTeamId: string, userId: string) {
    return await fetchApi<{ success: boolean; fromTeam: any; toTeam: any }>(`/api/teams/${fromTeamId}/members/move`, {
      method: 'POST',
      body: JSON.stringify({ toTeamId, userId }),
    });
  },

  async setTeamLead(teamId: string, leadId: string) {
    return await fetchApi<{ success: boolean; team: any }>(`/api/teams/${teamId}/lead`, {
      method: 'PATCH',
      body: JSON.stringify({ leadId }),
    });
  },

  // Documents API
  async getDocuments() {
    return await fetchApi<{ documents: any[] }>('/api/documents');
  },

  async createDocument(data: any) {
    return await fetchApi<{ document: any }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadDocumentFile(formData: FormData) {
    const storedToken = getStoredSessionToken();
    const headers: Record<string, string> = {
      ...(storedToken ? {
        'Authorization': `Bearer ${storedToken}`,
        'x-session-token': storedToken,
      } : {}),
    };
    const csrfToken = readCsrfCookie();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = json?.error?.message || `HTTP error ${response.status}`;
      const errorObj = new Error(errorMsg);
      (errorObj as any).code = json?.error?.code || 'API_ERROR';
      (errorObj as any).status = response.status;
      throw errorObj;
    }
    return json as { document: any };
  },

  async deleteDocument(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async downloadDocument(id: string) {
    return await fetchApi<{ success: boolean; downloadCount: number; downloadUrl: string; signedUrl: string; title: string; fileType: string }>(
      `/api/documents/${id}/download`,
      {
        method: 'POST',
      }
    );
  },

  // CRM API
  async getCrmLeads() {
    return await fetchApi<{ leads: any[] }>('/api/crm');
  },

  async createCrmLead(data: any) {
    return await fetchApi<{ lead: any }>('/api/crm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCrmLead(id: string, data: any) {
    return await fetchApi<{ lead: any }>(`/api/crm/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCrmLead(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/crm/${id}`, {
      method: 'DELETE',
    });
  },

  // Presence & Real-Time API
  async getPresence() {
    return await fetchApi<{ data: any[]; meta: any }>('/api/presence');
  },

  async updatePresenceStatus(status: 'online' | 'away' | 'offline') {
    return await fetchApi<{ data: any; message: string }>('/api/presence/status', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async sendPresenceHeartbeat() {
    return await fetchApi<{ data: any; message: string }>('/api/presence/heartbeat', {
      method: 'POST',
    });
  },

  async getRealtimeStats() {
    return await fetchApi<{ data: any; timestamp: string }>('/api/presence/stats');
  },

  async getRealtimeEvents(limit = 30) {
    return await fetchApi<{ data: any[]; meta: any }>(`/api/presence/events?limit=${limit}`);
  },

  // Analytics & Billing API
  async getAnalytics() {
    return await fetchApi<{ analytics: any }>('/api/analytics');
  },

  async getBilling() {
    return await fetchApi<{ billing: any }>('/api/billing');
  },

  async getAdminTools() {
    return await fetchApi<any>('/api/admin/tools');
  },

  // Automations API (Phase 3 No-Code Engine)
  async getAutomations() {
    return await fetchApi<{ rules: any[]; total: number }>('/api/automations');
  },

  async getAutomationTemplates() {
    return await fetchApi<{ templates: any[] }>('/api/automations/templates');
  },

  async installAutomationTemplate(templateId: string) {
    return await fetchApi<{ rule: any; message: string }>(`/api/automations/templates/${templateId}/install`, {
      method: 'POST',
    });
  },

  async createAutomation(data: {
    name: string;
    description?: string;
    entityType?: string;
    triggerType: string;
    triggerConfig?: Record<string, any>;
    conditionConfig?: any[];
    actionType?: string;
    actionConfig?: Record<string, any>;
    enabled?: boolean;
    isActive?: boolean;
    actions?: Array<{ actionType: string; actionConfig: Record<string, any> }>;
  }) {
    return await fetchApi<{ rule: any }>('/api/automations/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAutomation(id: string, data: Partial<{
    name: string;
    description?: string;
    entityType?: string;
    triggerType?: string;
    triggerConfig?: Record<string, any>;
    conditionConfig?: any[];
    actionType?: string;
    actionConfig?: Record<string, any>;
    enabled?: boolean;
    isActive?: boolean;
    actions?: Array<{ actionType: string; actionConfig: Record<string, any> }>;
  }>) {
    return await fetchApi<{ rule: any }>(`/api/automations/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleAutomation(id: string) {
    return await fetchApi<{ rule: any; message: string }>(`/api/automations/rules/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  async duplicateAutomation(id: string) {
    return await fetchApi<{ rule: any; message: string }>(`/api/automations/rules/${id}/duplicate`, {
      method: 'POST',
    });
  },

  async deleteAutomation(id: string) {
    return await fetchApi<{ success: boolean; message: string }>(`/api/automations/rules/${id}`, {
      method: 'DELETE',
    });
  },

  async getAutomationExecutions(params?: { ruleId?: string; status?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.ruleId) searchParams.set('ruleId', params.ruleId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await fetchApi<{ executions: any[]; total: number }>(`/api/automations/executions${query}`);
  },

  async getAutomationAnalytics() {
    return await fetchApi<{
      totalRules: number;
      activeRules: number;
      totalExecutions: number;
      successRate: number;
      failedExecutions: number;
      topRules: any[];
    }>('/api/automations/analytics');
  },

  async triggerAutomation(triggerType: string, payload?: Record<string, any>) {
    return await fetchApi<{ success: boolean; executions: any[] }>('/api/automations/trigger', {
      method: 'POST',
      body: JSON.stringify({ triggerType, ...payload }),
    });
  },

  // Notifications MVP & Enhancements
  async getNotifications(options?: { unreadOnly?: boolean; limit?: number; offset?: number; tab?: string; search?: string; category?: string }) {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.set('unreadOnly', 'true');
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.tab) params.set('tab', options.tab);
    if (options?.search) params.set('search', options.search);
    if (options?.category) params.set('category', options.category);
    const qs = params.toString();
    return await fetchApi<{ notifications: any[] }>(`/api/notifications${qs ? `?${qs}` : ''}`);
  },

  async getNotificationUnreadCount() {
    return await fetchApi<{ count: number; unreadCount: number }>('/api/notifications/unread-count');
  },

  async markNotificationRead(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async markAllNotificationsRead() {
    return await fetchApi<{ success: boolean; updatedCount: number }>('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  async archiveNotification(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/notifications/${id}/archive`, {
      method: 'PATCH',
    });
  },

  async getNotificationPreferences() {
    return await fetchApi<{ preferences: any }>('/api/notifications/preferences');
  },

  async updateNotificationPreferences(preferences: Record<string, boolean>) {
    return await fetchApi<{ success: boolean; preferences: any }>('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },

  // Phase 22: Closed Beta API Methods
  async submitFeedback(data: {
    category: string;
    severity: string;
    title: string;
    description: string;
    screenshotUrl?: string;
  }) {
    return await fetchApi<{ success: boolean; feedback: any }>('/api/beta/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getBetaFeedback(params?: { category?: string; severity?: string; status?: string; crossWorkspace?: boolean }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return await fetchApi<{ feedback: any[] }>(`/api/beta/feedback${query ? `?${query}` : ''}`);
  },

  async updateBetaFeedback(id: string, updates: { status?: string; founderNotes?: string }) {
    return await fetchApi<{ success: boolean; feedback: any }>(`/api/beta/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async getBetaFeedbackMetrics() {
    return await fetchApi<any>('/api/beta/feedback/metrics');
  },

  async getCustomerSuccess() {
    return await fetchApi<{ companies: any[] }>('/api/beta/customer-success');
  },

  async getWeeklyBetaReport() {
    return await fetchApi<any>('/api/beta/reports/weekly');
  },

  async getLaunchReadiness() {
    return await fetchApi<any>('/api/beta/launch-readiness');
  },

  // Phase 23: NPS and Metric Lineage Methods
  async submitNps(data: { score: number; comment?: string }) {
    return await fetchApi<{ success: boolean; survey: any }>('/api/nps/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getNpsMetrics(minRequired?: number) {
    const query = minRequired ? `?minRequired=${minRequired}` : '';
    return await fetchApi<any>(`/api/nps/metrics${query}`);
  },

  async getMetricLineage() {
    return await fetchApi<any>('/api/analytics/lineage');
  },

  async getAuditLogs(params?: { actorId?: string; action?: string; module?: string; limit?: number }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return await fetchApi<{ logs: any[]; total: number }>(`/api/audit/logs${query ? `?${query}` : ''}`);
  },

  async getFounderConsole() {
    return await fetchApi<any>('/api/admin/founder-console').catch(() => null);
  },

  // Phase 30: Billing API Integration
  async createSubscription(data: { planTier: string; billingCycle: string; seats?: number; workspaceId?: string }) {
    return await fetchApi<{ success: boolean; subscriptionId: string; razorpayKey?: string; planTier: string; billingCycle: string }>(
      '/api/billing/create-subscription',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async verifySubscription(data: {
    razorpay_payment_id: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
    planTier: string;
    billingCycle: string;
    seats?: number;
    workspaceId?: string;
  }) {
    return await fetchApi<{ success: boolean; planTier: string; billingCycle: string; workspace?: any }>(
      '/api/billing/verify',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // Phase 30: Founding Partner Application API
  async getFoundingPartnerMetrics() {
    return await fetchApi<{ success: boolean; metrics: { slotsStatus: string; isProgramFull: boolean; remainingSlots: number } }>(
      '/api/founding-partner/metrics'
    );
  },

  async applyFoundingPartner(data: {
    businessName: string;
    industry?: string;
    website?: string;
    teamSize?: string;
    location?: string;
    ownerName: string;
    email: string;
    phone?: string;
    currentTools?: string;
    biggestChallenge?: string;
    whyInterested?: string;
  }) {
    return await fetchApi<{ success: boolean; application: any; message?: string }>(
      '/api/founding-partner/apply',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // Phase 31: Workspace Wiki API Methods
  async getWikiPages() {
    return await fetchApi<{ pages: any[] }>('/api/wiki');
  },

  async getWikiPage(id: string) {
    return await fetchApi<{ page: any }>(`/api/wiki/${id}`);
  },

  async createWikiPage(data: { title?: string; icon?: string; contentJson?: any; parentId?: string | null; visibility?: string; departmentId?: string | null; department_id?: string | null }) {
    return await fetchApi<{ page: any }>('/api/wiki', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateWikiPage(id: string, data: { title?: string; icon?: string; contentJson?: any; visibility?: string; departmentId?: string | null; department_id?: string | null }) {
    return await fetchApi<{ page: any }>(`/api/wiki/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteWikiPage(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/wiki/${id}`, {
      method: 'DELETE',
    });
  },

  async getWikiComments(pageId: string) {
    return await fetchApi<{ comments: any[] }>(`/api/wiki/pages/${pageId}/comments`);
  },

  async addWikiComment(pageId: string, data: { comment: string; blockId?: string }) {
    return await fetchApi<{ comment: any }>(`/api/wiki/pages/${pageId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Phase 31: Time Tracking & Timesheet API Methods
  async startTimeTimer(data: { taskId?: string; billable?: boolean; hourlyRate?: number; notes?: string }) {
    return await fetchApi<{ entry: any }>('/api/time/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async stopTimeTimer() {
    return await fetchApi<{ entry: any }>('/api/time/stop', {
      method: 'POST',
    });
  },

  async getActiveTimer() {
    return await fetchApi<{ activeTimer: any }>('/api/time/active');
  },

  async logManualTime(data: { taskId?: string; startTime?: string; durationMinutes: number; billable?: boolean; hourlyRate?: number; notes?: string }) {
    return await fetchApi<{ entry: any }>('/api/time/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTimeEntries() {
    return await fetchApi<{ entries: any[] }>('/api/time/entries');
  },

  async deleteTimeEntry(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/time/entries/${id}`, {
      method: 'DELETE',
    });
  },

  async getTimeUtilization() {
    return await fetchApi<{ report?: any; analytics?: any }>('/api/time/analytics');
  },

  async getEmployeeBillingProfiles() {
    return await fetchApi<{ profiles: any[] }>('/api/time/profiles');
  },

  async getEmployeeBillingProfile(userId: string) {
    return await fetchApi<{ profile: any }>(`/api/time/profiles/${userId}`);
  },

  async updateEmployeeBillingProfile(userId: string, data: { costRate?: number; billableRate?: number; utilizationTarget?: number }) {
    return await fetchApi<{ profile: any }>(`/api/time/profiles/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Phase 4: People Operating System (HR + Team Management) API
  async getEmployeeDirectory(params?: { search?: string; departmentId?: string; managerId?: string; status?: string; employmentType?: string }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return await fetchApi<{ profiles: any[]; total: number }>(`/api/people/profiles${query ? `?${query}` : ''}`);
  },

  async getEmployeeProfile(userId: string) {
    return await fetchApi<{ profile: any }>(`/api/people/profiles/${userId}`);
  },

  async updateEmployeeProfile(userId: string, data: any) {
    return await fetchApi<{ profile: any; message: string }>(`/api/people/profiles/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getDepartments() {
    return await fetchApi<{ departments: any[] }>('/api/people/departments');
  },

  async createDepartment(data: { name: string; description?: string; headId?: string; color?: string }) {
    return await fetchApi<{ department: any; message: string }>('/api/people/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDepartment(id: string, data: { name?: string; description?: string; headId?: string | null; color?: string }) {
    return await fetchApi<{ department: any; message: string }>(`/api/people/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteDepartment(id: string) {
    return await fetchApi<{ success: boolean; message: string }>(`/api/people/departments/${id}`, {
      method: 'DELETE',
    });
  },

  async getOrgChart() {
    return await fetchApi<{ root: any; unassigned: any[]; totalEmployees: number; departments: any[] }>('/api/people/org-chart');
  },

  async reassignManager(userId: string, managerId: string | null) {
    return await fetchApi<{ profile: any; message: string }>('/api/people/org-chart/reassign', {
      method: 'POST',
      body: JSON.stringify({ userId, managerId }),
    });
  },

  async transferDepartment(userId: string, departmentId: string | null) {
    return await fetchApi<{ profile: any; message: string }>('/api/people/org-chart/transfer', {
      method: 'POST',
      body: JSON.stringify({ userId, departmentId }),
    });
  },

  async getLeaveRequests(params?: { userId?: string; status?: string }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return await fetchApi<{ leaves: any[] }>(`/api/people/leaves${query ? `?${query}` : ''}`);
  },

  async requestLeave(data: { leaveType: string; startDate: string; endDate: string; reason: string; daysCount?: number }) {
    return await fetchApi<{ leave: any; message: string }>('/api/people/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async approveLeaveRequest(id: string, reviewNotes?: string) {
    return await fetchApi<{ leave: any; message: string }>(`/api/people/leaves/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewNotes }),
    });
  },

  async rejectLeaveRequest(id: string, reviewNotes?: string) {
    return await fetchApi<{ leave: any; message: string }>(`/api/people/leaves/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewNotes }),
    });
  },

  async getLeaveBalances(userId?: string) {
    const query = userId ? `?userId=${userId}` : '';
    return await fetchApi<{ balances: any }>(`/api/people/leaves/balances${query}`);
  },

  async checkInAttendance(notes?: string) {
    return await fetchApi<{ record: any; message: string }>('/api/people/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async checkOutAttendance(notes?: string) {
    return await fetchApi<{ record: any; message: string }>('/api/people/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async getTodayAttendance() {
    return await fetchApi<{ record: any; isCheckedIn: boolean }>('/api/people/attendance/today');
  },

  async getAttendanceHistory(params?: { userId?: string; startDate?: string; endDate?: string; limit?: number }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return await fetchApi<{ history: any[] }>(`/api/people/attendance/history${query ? `?${query}` : ''}`);
  },

  async getAttendanceMetrics() {
    return await fetchApi<{ presentToday: number; absentToday: number; lateToday: number; onLeaveToday: number; attendanceRate: number; totalStaff: number }>('/api/people/attendance/metrics');
  },

  async getGoals(params?: { userId?: string; departmentId?: string; category?: string; status?: string }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return await fetchApi<{ goals: any[] }>(`/api/people/goals${query ? `?${query}` : ''}`);
  },

  async createGoal(data: any) {
    return await fetchApi<{ goal: any; message: string }>('/api/people/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGoalProgress(id: string, progressValue: number, progressPercent: number, notes?: string) {
    return await fetchApi<{ goal: any; message: string }>(`/api/people/goals/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progressValue, progressPercent, notes }),
    });
  },

  async getPerformanceReviews(params?: { userId?: string; reviewerId?: string; cycle?: string; status?: string }) {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return await fetchApi<{ reviews: any[] }>(`/api/people/performance/reviews${query ? `?${query}` : ''}`);
  },

  async createPerformanceReview(data: { userId: string; reviewerId: string; cycle: string }) {
    return await fetchApi<{ review: any; message: string }>('/api/people/performance/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async submitSelfReview(id: string, selfRatings: Record<string, any>, comments?: string) {
    return await fetchApi<{ review: any; message: string }>(`/api/people/performance/reviews/${id}/self`, {
      method: 'POST',
      body: JSON.stringify({ selfRatings, comments }),
    });
  },

  async submitManagerReview(id: string, managerRatings: Record<string, any>, comments?: string, strengths?: string, growthAreas?: string) {
    return await fetchApi<{ review: any; message: string }>(`/api/people/performance/reviews/${id}/manager`, {
      method: 'POST',
      body: JSON.stringify({ managerRatings, comments, strengths, growthAreas }),
    });
  },

  async getPeopleAnalytics() {
    return await fetchApi<any>('/api/people/analytics');
  },

  // Executive Dashboard V2
  async getExecutiveDashboard() {
    return await fetchApi<any>('/api/dashboard/executive');
  },

  // Phase 30: Client Observability & Error Reporting
  async reportClientError(payload: any) {
    try {
      return await fetchApi<{ success: boolean }>(
        '/api/health/client-error',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
    } catch {
      return { success: false };
    }
  }
};



