import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { timingSafeStringEqual } from '../lib/secure-token';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';

/**
 * CSRF PROTECTION (Phase 17 — Fix #9)
 *
 * Double-submit cookie pattern:
 *  - `ws_csrf` is a JavaScript-readable cookie issued alongside every session
 *    (login / register / invite accept / guest portal auth / /api/auth/csrf).
 *  - Every state-changing request (POST/PATCH/PUT/DELETE) that is
 *    cookie-authenticated MUST echo the value in the `X-CSRF-Token` header.
 *
 * Requests authenticated via `Authorization`/`x-session-token` headers are
 * exempt: cross-site attackers cannot forge custom headers, so header-based
 * API clients are not CSRF-vulnerable.
 *
 * Exempt endpoints: pre-auth credential exchanges (login/register), the
 * Razorpay webhook (server-to-server, signature-verified) and health ops.
 */

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const EXEMPT_PATHS = [
  '/api/auth/login',
  '/auth/login',
  '/api/auth/register',
  '/auth/register',
  '/api/auth/csrf',
  '/auth/csrf',
  '/api/billing/webhook',
  '/billing/webhook',
];

const SESSION_COOKIES = ['ws_session', 'gs_session'];

export async function csrfProtection(c: Context, next: Next) {
  if (!MUTATING_METHODS.has(c.req.method.toUpperCase())) {
    await next();
    return;
  }

  const path = c.req.path;
  if (EXEMPT_PATHS.some((exempt) => path === exempt || path.startsWith(`${exempt}/`))) {
    await next();
    return;
  }

  // Header-authenticated clients are not susceptible to CSRF.
  const authHeader = c.req.header('authorization');
  const sessionHeader = c.req.header('x-session-token');
  if ((authHeader && authHeader.startsWith('Bearer ')) || sessionHeader) {
    await next();
    return;
  }

  // No session cookie in play -> nothing to forge on behalf of a victim.
  const hasSessionCookie = SESSION_COOKIES.some((name) => !!getCookie(c, name));
  if (!hasSessionCookie) {
    await next();
    return;
  }

  const cookieToken = getCookie(c, 'ws_csrf') || '';
  const headerToken = c.req.header('x-csrf-token') || '';

  if (!cookieToken || !headerToken || !timingSafeStringEqual(cookieToken, headerToken)) {
    const user = c.get('user') as { id?: string } | undefined;
    await logSecurityEvent('csrf.failure', {
      actorId: user?.id || null,
      workspaceId: null,
      resourceId: `${c.req.method} ${path}`,
      ...requestSecurityMeta(c),
      details: { reason: !cookieToken ? 'missing_csrf_cookie' : !headerToken ? 'missing_csrf_header' : 'csrf_mismatch' },
    });
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'CSRF validation failed. Refresh the page and try again.',
        },
      },
      403
    );
  }

  await next();
}
