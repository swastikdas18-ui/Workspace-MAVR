import { Context, Next } from 'hono';
import { AuthService } from '../services/auth-service';
import { SafeUser, SafeWorkspace } from '../types';

declare module 'hono' {
  interface ContextVariableMap {
    user: SafeUser;
    workspace: SafeWorkspace | null;
    sessionToken: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const customHeader = c.req.header('x-session-token');
  const cookieHeader = c.req.header('cookie');

  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  } else if (cookieHeader) {
    const match = cookieHeader.match(/ws_session=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Missing session token.',
        },
      },
      401
    );
  }

  const sessionData = await AuthService.getSession(token);

  if (!sessionData) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session has expired or is invalid. Please sign in again.',
        },
      },
      401
    );
  }

  // Set verified server-side identity on context
  c.set('user', sessionData.user);
  c.set('workspace', sessionData.workspace);
  c.set('sessionToken', token);

  await next();
}
