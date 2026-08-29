/**
 * Workspace OS - Centralized Backend API Client
 * Connects frontend state and authentication directly to backend & PostgreSQL.
 */

export const DEFAULT_API_URL = 'https://workspace-mavr.onrender.com';

export const API_BASE_URL: string =
  ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || DEFAULT_API_URL) as string).replace(/\/$/, '');

/**
 * Centrally construct authoritative WebSocket URLs targeting the backend server origin.
 */
export function getWebSocketUrl(token?: string, workspaceId?: string): string {
  const backend =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
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
    (import.meta.env.VITE_FRONTEND_URL as string | undefined) ||
    (import.meta.env.VITE_APP_URL as string | undefined) ||
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
    const errorMsg = json?.error?.message || `HTTP error ${response.status}`;
    const errorObj = new Error(errorMsg);
    (errorObj as any).code = json?.error?.code || 'API_ERROR';
    (errorObj as any).status = response.status;
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

  // Tasks API
  async getTasks() {
    return await fetchApi<{ tasks: any[] }>('/api/tasks');
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

  // Automations API
  async getAutomations() {
    return await fetchApi<{ rules: any[]; total: number }>('/api/automations');
  },

  async createAutomation(data: {
    name: string;
    description?: string;
    entityType: string;
    triggerType: string;
    isActive?: boolean;
    actions: Array<{ actionType: string; actionConfig: Record<string, any> }>;
  }) {
    return await fetchApi<{ rule: any }>('/api/automations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAutomation(id: string, data: Partial<{
    name: string;
    description?: string;
    entityType: string;
    triggerType: string;
    isActive?: boolean;
    actions: Array<{ actionType: string; actionConfig: Record<string, any> }>;
  }>) {
    return await fetchApi<{ rule: any }>(`/api/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleAutomation(id: string) {
    return await fetchApi<{ rule: any }>(`/api/automations/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  async deleteAutomation(id: string) {
    return await fetchApi<{ success: boolean; message: string }>(`/api/automations/${id}`, {
      method: 'DELETE',
    });
  },

  async getAutomationExecutions(ruleId?: string) {
    const query = ruleId ? `?ruleId=${encodeURIComponent(ruleId)}` : '';
    return await fetchApi<{ executions: any[]; total: number }>(`/api/automations/executions${query}`);
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

  async createWikiPage(data: { title?: string; icon?: string; contentJson?: any; parentId?: string | null; visibility?: string }) {
    return await fetchApi<{ page: any }>('/api/wiki', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateWikiPage(id: string, data: { title?: string; icon?: string; contentJson?: any; visibility?: string }) {
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
  },
};


