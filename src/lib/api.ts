/**
 * Workspace OS - Centralized Backend API Client
 * Connects frontend state and authentication directly to Render backend & PostgreSQL.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://workspace-mavr.onrender.com';

// Console diagnostics for production & runtime verification
console.log('API_BASE_URL:', API_BASE_URL);

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
};

