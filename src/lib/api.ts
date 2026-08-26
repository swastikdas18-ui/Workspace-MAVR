/**
 * Workspace OS - Centralized Backend API Client
 * Connects frontend state and authentication directly to backend & PostgreSQL.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

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
  async createInvite(data: { email: string; role: 'employee' | 'intern'; teamId?: string }) {
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
    const res = await fetchApi<{ user: any; workspace: any; token: string; expiresAt: string }>(
      '/api/invites/accept',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    if (res.token) {
      setStoredSessionToken(res.token);
    }
    return res;
  },

  // Projects API
  async getProjects() {
    return await fetchApi<{ projects: any[] }>('/api/projects');
  },

  async createProject(data: any) {
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

  async deleteDocument(id: string) {
    return await fetchApi<{ success: boolean }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async downloadDocument(id: string) {
    return await fetchApi<{ success: boolean; downloadCount: number }>(`/api/documents/${id}/download`, {
      method: 'POST',
    });
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
};


