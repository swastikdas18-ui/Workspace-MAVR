import { getCookie } from 'hono/cookie';

/**
 * SESSION COOKIE CONTRACT (Phase 17 — Fix #5)
 *
 * Session tokens are transported EXCLUSIVELY via httpOnly cookies:
 *  - ws_session : workspace member sessions (httpOnly)
 *  - gs_session : guest portal sessions      (httpOnly)
 *  - ws_csrf    : double-submit CSRF token   (readable by the SPA)
 *
 * Session tokens are NEVER returned in JSON response bodies.
 */

export const WORKSPACE_SESSION_COOKIE = 'ws_session';
export const GUEST_SESSION_COOKIE = 'gs_session';
export const CSRF_COOKIE = 'ws_csrf';

export interface CookieOptions {
  secure?: boolean;
  maxAgeSeconds?: number;
}

function baseAttributes(secure: boolean, maxAgeSeconds: number): string {
  // SameSite=Strict provides the strongest cross-site request protection;
  // combined with the double-submit CSRF token for defense in depth.
  return [
    'Path=/',
    'SameSite=Strict',
    secure ? ' Secure' : '',
    ` Max-Age=${maxAgeSeconds}`,
  ].join(';');
}

export function isSecureRequestContext(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function buildWorkspaceSessionCookie(token: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  return `${WORKSPACE_SESSION_COOKIE}=${token}; HttpOnly;${baseAttributes(isSecureRequestContext(), maxAgeSeconds)}`;
}

export function buildGuestSessionCookie(token: string, maxAgeSeconds = 30 * 24 * 60 * 60): string {
  return `${GUEST_SESSION_COOKIE}=${token}; HttpOnly;${baseAttributes(isSecureRequestContext(), maxAgeSeconds)}`;
}

export function buildCsrfCookie(token: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  // NOT httpOnly: must be readable by the SPA for double-submit echo.
  return `${CSRF_COOKIE}=${token};${baseAttributes(isSecureRequestContext(), maxAgeSeconds)}`;
}

export function buildExpiredCookie(name: string): string {
  return `${name}=; Path=/; SameSite=Strict${isSecureRequestContext() ? '; Secure' : ''}; Max-Age=0`;
}

/** Extract a cookie value from a raw Cookie header string. */
export function readCookieFromHeader(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
