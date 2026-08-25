/**
 * Phase 17 shared test utilities.
 *
 * SECURITY MODEL CHANGE: session tokens are no longer returned in JSON bodies.
 * They are delivered exclusively via httpOnly `ws_session` Set-Cookie headers.
 * These helpers let legacy assertions (`res.data.token`) keep verifying that
 * the server issued a session, while exercising the real cookie transport.
 */
export function extractCookie(headerValue: string | null, name: string): string | null {
  if (!headerValue) return null;
  const parts = headerValue.split(/,(?=[^;]+?=)/);
  for (const part of parts) {
    const match = part.trim().match(new RegExp(`^${name}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export function extractSessionToken(res: Response): string | null {
  return extractCookie(res.headers.get('set-cookie'), 'ws_session');
}

/** Re-attaches the cookie-transported session token onto the JSON body for assertions. */
export function attachSessionToken(res: Response, data: any): any {
  const token = extractSessionToken(res);
  if (token && data && typeof data === 'object') {
    data.token = token;
  }
  return data;
}
