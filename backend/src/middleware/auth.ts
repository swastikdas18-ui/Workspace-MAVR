import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { AuthService } from '../services/auth-service';
import { SafeUser, SafeWorkspace } from '../types';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';
import { WORKSPACE_SESSION_COOKIE, readCookieFromHeader } from '../lib/session-cookies';

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

  // Primary: HttpOnly session cookie (Strict OWASP compliance)
  const cookieToken = getCookie(c, WORKSPACE_SESSION_COOKIE) || readCookieFromHeader(cookieHeader, WORKSPACE_SESSION_COOKIE);
  if (cookieToken) {
    token = cookieToken;
    transport = 'cookie';
  } else if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  }

  console.log(`[Auth] AUTH MIDDLEWARE -> Path: ${c.req.path}, Transport: ${transport}, Token Present: ${!!token}`);

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
    console.warn(`[Auth] Session invalid or expired for path: ${c.req.path}`);
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

  console.log(`[Auth] SESSION VALID -> User: ${sessionData.user.email}, Workspace: ${sessionData.workspace?.id || 'none'}`);

  // Set verified server-side identity on context
  c.set('user', sessionData.user);
  c.set('workspace', sessionData.workspace);
  c.set('sessionToken', token);

  await next();
}

export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  const customHeader = c.req.header('x-session-token') || c.req.header('X-Session-Token');
  const cookieHeader = c.req.header('cookie') || c.req.header('Cookie');

  let token: string | null = null;

  const cookieToken = getCookie(c, WORKSPACE_SESSION_COOKIE) || readCookieFromHeader(cookieHeader, WORKSPACE_SESSION_COOKIE);
  if (cookieToken) {
    token = cookieToken;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  }

  if (token) {
    const sessionData = await AuthService.getSession(token);
    if (sessionData) {
      c.set('user', sessionData.user);
      c.set('workspace', sessionData.workspace);
      c.set('sessionToken', token);
    }
  }

  await next();
}

