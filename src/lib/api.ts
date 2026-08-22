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

export function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

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
  const token = getStoredSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${API_BASE_URL}${normalizedPath}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
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
    const res = await fetchApi<{ user: any; workspace: any; token: string; expiresAt: string }>(
      '/api/auth/register',
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

  async login(credentials: { email: string; password: string }) {
    const res = await fetchApi<{ user: any; workspace: any; token: string; expiresAt: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );
    if (res.token) {
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
    const token = getStoredSessionToken();
    if (!token) return null;
    try {
      const res = await fetchApi<{ user: any; workspace: any; token: string; expiresAt: string }>(
        '/api/auth/session'
      );
      return res;
    } catch {
      setStoredSessionToken(null);
      return null;
    }
  },

  // Workspace API
  async getWorkspace(workspaceId?: string) {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    return await fetchApi<{ workspace: any }>(`/api/workspace${query}`);
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
};
