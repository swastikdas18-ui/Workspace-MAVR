import { Context, Next } from 'hono';
import { AuthService } from '../services/auth-service';
import { SafeUser, SafeWorkspace } from '../types';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';

declare module 'hono' {
  interface ContextVariableMap {
    user: SafeUser;
    workspace: SafeWorkspace | null;
    sessionToken: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  const customHeader = c.req.header('x-session-token') || c.req.header('X-Session-Token');
  const cookieHeader = c.req.header('cookie') || c.req.header('Cookie');

  let token: string | null = null;
  let transport: 'header' | 'cookie' = 'header';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  } else if (cookieHeader) {
    const match = cookieHeader.match(/ws_session=([^;]+)/);
    if (match) {
      token = match[1];
      transport = 'cookie';
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
    // SECURITY AUDIT (Phase 17): record expired/invalid token usage.
    await logSecurityEvent('auth.expired_token', {
      resourceId: `${c.req.method} ${c.req.path}`,
      ...requestSecurityMeta(c),
      details: { transport, tokenPrefix: `${token.slice(0, 8)}…` },
    });
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
