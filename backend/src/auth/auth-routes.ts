import { Hono } from 'hono';
import type { Context } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { AuthService } from '../services/auth-service';
import { authMiddleware } from '../middleware/auth';
import { generateSecureToken } from '../lib/secure-token';
import {
  WORKSPACE_SESSION_COOKIE,
  CSRF_COOKIE,
  readCookieFromHeader,
} from '../lib/session-cookies';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';
import { AuthSessionResponse } from '../types';
import { inMemoryDb } from '../../packages/database';

export const authRouter = new Hono();

const COOKIE_BASE = {
  path: '/',
  sameSite: 'Strict' as const,
  secure: process.env.NODE_ENV === 'production',
};

/**
 * SECURITY (Phase 17 — Fix #5): session tokens are delivered exclusively as
 * httpOnly SameSite=Strict cookies. JSON responses expose only the user and
 * workspace — never the raw session token.
 */
function issueSessionCookies(c: Context, result: AuthSessionResponse): string {
  const maxAge = Math.max(
    60,
    Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000)
  );
  setCookie(c, WORKSPACE_SESSION_COOKIE, result.token, {
    ...COOKIE_BASE,
    httpOnly: true,
    maxAge,
  });
  const csrfToken = generateSecureToken();
  setCookie(c, CSRF_COOKIE, csrfToken, {
    ...COOKIE_BASE,
    httpOnly: false,
    maxAge,
  });
  return csrfToken;
}

function clearSessionCookies(c: Context): void {
  setCookie(c, WORKSPACE_SESSION_COOKIE, '', { ...COOKIE_BASE, httpOnly: true, maxAge: 0 });
  setCookie(c, CSRF_COOKIE, '', { ...COOKIE_BASE, httpOnly: false, maxAge: 0 });
}

/** Public-safe session payload — token stripped. */
function publicSessionPayload(result: AuthSessionResponse, csrfToken?: string) {
  return {
    user: result.user,
    workspace: result.workspace,
    expiresAt: result.expiresAt,
    ...(csrfToken ? { csrfToken } : {}),
  };
}

/**
 * POST /register - Register Admin (with new org) or Member (with workspace ID)
 */
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();

    let result: AuthSessionResponse;
    if (body.workspaceName) {
      // Organization Admin Registration
      result = await AuthService.registerAdmin(body);
    } else if (body.workspaceId) {
      // Invited Member Registration
      result = await AuthService.registerMember(body);
    } else {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Must provide either workspaceName (for Admin) or workspaceId (for Member registration).',
          },
        },
        400
      );
    }

    const csrfToken = issueSessionCookies(c, result);
    return c.json(publicSessionPayload(result, csrfToken), 201);
  } catch (err: any) {
    if (err.message === 'USER_EXISTS' || err.code === 'EMAIL_EXISTS') {
      return c.json(
        {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email address already exists.',
          },
        },
        409
      );
    }
    if (err.message === 'WORKSPACE_NOT_FOUND') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Target workspace not found.',
          },
        },
        404
      );
    }
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: err.errors?.[0]?.message || err.message || 'Registration failed.',
        },
      },
      400
    );
  }
});

/**
 * POST /login - Authenticate with email and password
 */
authRouter.post('/login', async (c) => {
  let body: any = null;
  try {
    body = await c.req.json();
    const result = await AuthService.login(body);

    // Persist login IP / user agent on the session for audit trails
    const meta = requestSecurityMeta(c);
    const session = inMemoryDb.sessions.get(result.token);
    if (session) {
      session.ipAddress = meta.ipAddress;
      session.userAgent = meta.userAgent;
    }

    const csrfToken = issueSessionCookies(c, result);
    return c.json(publicSessionPayload(result, csrfToken), 200);
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      // SECURITY AUDIT (Phase 17 — Fix #10): failed login event
      await logSecurityEvent('auth.failed_login', {
        actorId: null,
        resourceId: typeof body?.email === 'string' ? body.email : 'unknown-email',
        ...requestSecurityMeta(c),
        details: { attemptedEmail: typeof body?.email === 'string' ? body.email : null },
      });
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password.',
          },
        },
        401
      );
    }
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: err.errors?.[0]?.message || err.message || 'Login failed.',
        },
      },
      400
    );
  }
});

/**
 * POST /logout - Invalidate active session & clear cookies
 */
authRouter.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    const customHeader = c.req.header('x-session-token');
    if (customHeader) token = customHeader;
  }
  if (!token) {
    const cookieToken = getCookie(c, WORKSPACE_SESSION_COOKIE) || readCookieFromHeader(c.req.header('cookie'), WORKSPACE_SESSION_COOKIE);
    if (cookieToken) token = cookieToken;
  }

  if (token) {
    await AuthService.logout(token);
  }

  clearSessionCookies(c);

  const user = c.get('user');
  await logSecurityEvent('auth.logout', {
    actorId: user?.id || null,
    resourceId: 'session',
    ...requestSecurityMeta(c),
  });

  return c.json({ success: true, message: 'Logged out successfully.' }, 200);
});

/**
 * GET /session - Retrieve authenticated session details
 * (the token never leaves the httpOnly cookie)
 */
authRouter.get('/session', authMiddleware, async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');

  const csrfToken = generateSecureToken();
  setCookie(c, CSRF_COOKIE, csrfToken, { ...COOKIE_BASE, httpOnly: false, maxAge: 7 * 24 * 60 * 60 });

  return c.json(
    {
      user,
      workspace,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      csrfToken,
    },
    200
  );
});

/**
 * GET /csrf - Issue a fresh double-submit CSRF token (pre-auth bootstrap)
 */
authRouter.get('/csrf', (c) => {
  const csrfToken = generateSecureToken();
  setCookie(c, CSRF_COOKIE, csrfToken, { ...COOKIE_BASE, httpOnly: false, maxAge: 7 * 24 * 60 * 60 });
  return c.json({ csrfToken }, 200);
});
