import { Context } from 'hono';

/**
 * SESSION COOKIE CONTRACT (Dual-Transport Hardened)
 *
 * Session tokens are transported via:
 *  - ws_session : workspace member sessions (httpOnly cookie)
 *  - gs_session : guest portal sessions      (httpOnly cookie)
 *  - ws_csrf    : double-submit CSRF token   (readable by the SPA)
 *  - Authorization Bearer / x-session-token  (API dual-transport)
 */

export const WORKSPACE_SESSION_COOKIE = 'ws_session';
export const GUEST_SESSION_COOKIE = 'gs_session';
export const CSRF_COOKIE = 'ws_csrf';

export interface CookieOptions {
  secure?: boolean;
  maxAgeSeconds?: number;
  sameSite?: 'Lax' | 'None' | 'Strict';
}

export function isSecureRequestContext(c?: Context): boolean {
  if (c) {
    const proto = c.req.header('x-forwarded-proto') || c.req.header('X-Forwarded-Proto');
    if (proto) return proto.toLowerCase() === 'https';
    if (c.req.url && c.req.url.startsWith('https:')) return true;
    const host = c.req.header('host') || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return false;
    }
  }
  return process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
}

function baseAttributes(secure: boolean, maxAgeSeconds: number, sameSite?: 'Lax' | 'None' | 'Strict'): string {
  const policy = sameSite || (secure ? 'None' : 'Lax');
  return [
    'Path=/',
    `SameSite=${policy}`,
    secure ? ' Secure' : '',
    ` Max-Age=${maxAgeSeconds}`,
  ].join(';');
}

export function buildWorkspaceSessionCookie(token: string, maxAgeSeconds = 7 * 24 * 60 * 60, secure = isSecureRequestContext()): string {
  return `${WORKSPACE_SESSION_COOKIE}=${token}; HttpOnly;${baseAttributes(secure, maxAgeSeconds)}`;
}

export function buildGuestSessionCookie(token: string, maxAgeSeconds = 30 * 24 * 60 * 60, secure = isSecureRequestContext()): string {
  return `${GUEST_SESSION_COOKIE}=${token}; HttpOnly;${baseAttributes(secure, maxAgeSeconds)}`;
}

export function buildCsrfCookie(token: string, maxAgeSeconds = 7 * 24 * 60 * 60, secure = isSecureRequestContext()): string {
  // NOT httpOnly: must be readable by the SPA for double-submit echo.
  return `${CSRF_COOKIE}=${token};${baseAttributes(secure, maxAgeSeconds)}`;
}

export function buildExpiredCookie(name: string, secure = isSecureRequestContext()): string {
  const policy = secure ? 'None' : 'Lax';
  return `${name}=; Path=/; SameSite=${policy}${secure ? '; Secure' : ''}; Max-Age=0`;
}

/** Extract a cookie value from a raw Cookie header string with quote stripping and whitespace normalization. */
export function readCookieFromHeader(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  const raw = decodeURIComponent(match[1]).trim();
  // Strip optional surrounding double quotes (e.g. "token_val")
  return raw.replace(/^"|"$/g, '').trim();
}

