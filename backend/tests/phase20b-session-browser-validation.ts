/**
 * Phase 20B — Session & Cookie Production Verification Test Suite
 *
 * Verifies:
 * 1. ws_session HttpOnly, SameSite=Strict, Path=/ cookie flags
 * 2. ws_csrf double-submit cookie issuance and validation
 * 3. 4-hour idle timeout inactivity enforcement & sliding window refresh
 * 4. 7-day absolute timeout expiration regardless of activity
 * 5. Complete session revocation and cookie expiration upon logout
 * 6. Zero client trust: server-side session identity resolution
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { AuthService } from '../src/services/auth-service';
import {
  WORKSPACE_SESSION_COOKIE,
  CSRF_COOKIE,
  buildWorkspaceSessionCookie,
  buildCsrfCookie,
  readCookieFromHeader,
} from '../src/lib/session-cookies';

let assertionsCount = 0;

function pass(msg: string) {
  assertionsCount++;
  console.log(`  ✅ PASS [${assertionsCount}]: ${msg}`);
}

function parseCookieHeader(res: Response, cookieName: string): { value: string; attributes: string[] } | null {
  const getSetCookie = (res.headers as any).getSetCookie?.();
  if (Array.isArray(getSetCookie) && getSetCookie.length > 0) {
    for (const chunk of getSetCookie) {
      const parts = chunk.trim().split(';').map((p: string) => p.trim());
      const [nameVal, ...attrs] = parts;
      const eqIdx = nameVal.indexOf('=');
      if (eqIdx !== -1) {
        const name = nameVal.substring(0, eqIdx);
        const value = decodeURIComponent(nameVal.substring(eqIdx + 1));
        if (name === cookieName) {
          return { value, attributes: attrs };
        }
      }
    }
  }

  const setCookie = res.headers.get('set-cookie') || '';
  for (const chunk of setCookie.split(/,(?=[^;]+?=)/)) {
    const parts = chunk.trim().split(';').map((p) => p.trim());
    const [nameVal, ...attrs] = parts;
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx !== -1) {
      const name = nameVal.substring(0, eqIdx);
      const value = decodeURIComponent(nameVal.substring(eqIdx + 1));
      if (name === cookieName) {
        return { value, attributes: attrs };
      }
    }
  }
  return null;
}

export async function runPhase20BSessionValidationSuite() {
  console.log('\n=================================================================');
  console.log(' PHASE 20B: SESSION & COOKIE REALITY VERIFICATION TEST SUITE');
  console.log('=================================================================\n');

  // --- 1. Login & Cookie Issuance Verification ---
  console.log('--- 1. Cookie Issuance & Flag Hygiene ---');
  
  const testEmail = `sec-verify-${Date.now()}@workspaceos.dev`;
  const regRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Security Admin',
      email: testEmail,
      password: 'StrongPassword123!',
      workspaceName: 'Security Validation Workspace',
    }),
  });

  assert.strictEqual(regRes.status, 201, 'Registration returns 201');
  const regBody = await regRes.json();
  assert(regBody.token === undefined, 'Session token MUST NOT leak in JSON body');
  pass('1.1 Registration response omits session token from JSON body');

  const sessionCookieParsed = parseCookieHeader(regRes, WORKSPACE_SESSION_COOKIE);
  assert(sessionCookieParsed !== null, 'ws_session cookie present');
  pass('1.2 Set-Cookie header issued upon registration');

  const sessionToken = sessionCookieParsed.value;
  assert(sessionToken && sessionToken.length >= 64, 'ws_session cookie contains 256-bit token');
  pass('1.3 ws_session contains high-entropy cryptographic token');

  const sessionAttrs = sessionCookieParsed.attributes.map((a) => a.toLowerCase());
  assert(sessionAttrs.some((a) => a === 'httponly'), 'ws_session contains HttpOnly flag');
  pass('1.4 ws_session is HttpOnly (protected from XSS token theft)');

  assert(sessionAttrs.some((a) => a.includes('samesite=strict')), 'ws_session contains SameSite=Strict flag');
  pass('1.5 ws_session is SameSite=Strict (protected from CSRF)');

  assert(sessionAttrs.some((a) => a.includes('path=/')), 'ws_session contains Path=/');
  pass('1.6 ws_session scoped to Path=/');

  const csrfParsed = parseCookieHeader(regRes, CSRF_COOKIE);
  assert(csrfParsed !== null, 'ws_csrf cookie issued');
  const csrfToken = csrfParsed.value;
  pass('1.7 ws_csrf double-submit cookie present in response');

  // Verify ws_csrf is NOT HttpOnly so frontend SPA can read and double-submit it
  const csrfCookieDirect = buildCsrfCookie(csrfToken);
  assert(!csrfCookieDirect.includes('HttpOnly'), 'ws_csrf is not HttpOnly (accessible to client JS)');
  pass('1.8 ws_csrf readable by browser client for mutating headers');

  // --- 2. Authenticated Session Validation via Cookie ---
  console.log('\n--- 2. Server-Side Session Resolution ---');

  const sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${sessionToken}`;
  const fullBrowserCookie = `${WORKSPACE_SESSION_COOKIE}=${sessionToken}; ${CSRF_COOKIE}=${csrfToken}`;

  const authCheckRes = await app.request('/api/auth/session', {
    headers: { Cookie: fullBrowserCookie },
  });

  assert.strictEqual(authCheckRes.status, 200, 'GET /api/auth/session succeeds via cookie');
  const authCheckBody = await authCheckRes.json();
  assert.strictEqual(authCheckBody.user.email, testEmail, 'Server resolves correct verified user');
  assert.strictEqual(authCheckBody.workspace.name, 'Security Validation Workspace', 'Server resolves correct workspace');
  assert(authCheckBody.token === undefined, 'GET /session response never leaks raw token');
  pass('2.1 Cookie session resolves verified identity server-side');
  pass('2.2 Verified workspace context loaded strictly from database');
  pass('2.3 Session payload omits raw session token');

  // --- 3. Double-Submit CSRF Protection on Mutating Endpoints ---
  console.log('\n--- 3. Double-Submit CSRF Verification ---');

  // 3.1 Mutating POST with cookie but without X-CSRF-Token is blocked
  const csrfBlockRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: fullBrowserCookie,
    },
    body: JSON.stringify({ title: 'CSRF Exploit Project' }),
  });
  assert.strictEqual(csrfBlockRes.status, 403, 'Missing CSRF header is rejected with 403');
  pass('3.1 Cookie POST without X-CSRF-Token rejected (403 Forbidden)');

  // 3.2 Mutating POST with invalid X-CSRF-Token is blocked
  const csrfMismatchRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: fullBrowserCookie,
      'X-CSRF-Token': 'forged_fake_csrf_token',
    },
    body: JSON.stringify({ title: 'CSRF Exploit Project' }),
  });
  assert.strictEqual(csrfMismatchRes.status, 403, 'Mismatched CSRF header is rejected with 403');
  pass('3.2 Cookie POST with mismatched X-CSRF-Token rejected (403 Forbidden)');

  // 3.3 Mutating POST with valid X-CSRF-Token succeeds
  const csrfSuccessRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: fullBrowserCookie,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ title: 'Authorized Project' }),
  });
  assert.strictEqual(csrfSuccessRes.status, 201, 'Valid CSRF token allows project creation');
  pass('3.3 Cookie POST with valid double-submit X-CSRF-Token succeeds (201 Created)');

  // --- 4. Idle Timeout (4 Hours) & Sliding Window ---
  console.log('\n--- 4. Idle Timeout Enforcement ---');

  const idleToken = 'idle-test-token-' + Date.now();
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
  inMemoryDb.sessions.set(idleToken, {
    id: 's-idle',
    userId: authCheckBody.user.id,
    workspaceId: authCheckBody.workspace.id,
    token: idleToken,
    expiresAt: new Date(Date.now() + 5 * 86400000), // Not expired absolutely
    createdAt: fiveHoursAgo,
    lastActiveAt: fiveHoursAgo, // Inactive > 4 hours
    ipAddress: null,
    userAgent: null,
  });

  const idleRes = await AuthService.getSession(idleToken);
  assert.strictEqual(idleRes, null, 'Inactive session (>4h) is rejected');
  assert(!inMemoryDb.sessions.has(idleToken), 'Expired idle session purged from database');
  pass('4.1 Inactive session (> 4 hours idle) rejected and permanently purged');

  // Active session within window slides the idle timer
  const activeSessionBefore = inMemoryDb.sessions.get(sessionToken);
  const prevActiveTime = activeSessionBefore?.lastActiveAt;
  await new Promise((r) => setTimeout(r, 10)); // tiny sleep to verify timestamp tick
  const slideRes = await AuthService.getSession(sessionToken);
  assert(slideRes !== null, 'Active session within 4h succeeds');
  const activeSessionAfter = inMemoryDb.sessions.get(sessionToken);
  assert(activeSessionAfter && activeSessionAfter.lastActiveAt > prevActiveTime!, 'lastActiveAt timestamp updated');
  pass('4.2 Active session resolves and slides idle inactivity window');

  // --- 5. Absolute Timeout (7 Days Maximum) ---
  console.log('\n--- 5. Absolute Timeout Enforcement ---');

  const absExpiredToken = 'abs-exp-token-' + Date.now();
  const eightDaysAgo = new Date(Date.now() - 8 * 86400000);
  inMemoryDb.sessions.set(absExpiredToken, {
    id: 's-abs-exp',
    userId: authCheckBody.user.id,
    workspaceId: authCheckBody.workspace.id,
    token: absExpiredToken,
    expiresAt: new Date(Date.now() - 1000), // Exceeded 7-day absolute limit
    createdAt: eightDaysAgo,
    lastActiveAt: new Date(), // Active right now
    ipAddress: null,
    userAgent: null,
  });

  const absRes = await AuthService.getSession(absExpiredToken);
  assert.strictEqual(absRes, null, 'Absolute expired session (>7d) is rejected even if recently active');
  assert(!inMemoryDb.sessions.has(absExpiredToken), 'Absolute expired session deleted from store');
  pass('5.1 Continuous activity cannot bypass 7-day Absolute Timeout');

  // --- 6. Logout & Revocation Hygiene ---
  console.log('\n--- 6. Logout & Cookie Expiration Hygiene ---');

  const logoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: {
      Cookie: fullBrowserCookie,
      'X-CSRF-Token': csrfToken,
    },
  });

  assert.strictEqual(logoutRes.status, 200, 'Logout succeeds with 200 OK');
  const logoutSetCookie = logoutRes.headers.get('set-cookie');
  assert(logoutSetCookie !== null, 'Logout issues cookie expiration headers');
  assert(logoutSetCookie.includes('Max-Age=0') || logoutSetCookie.includes('expires='), 'ws_session cookie cleared with Max-Age=0');
  assert(!inMemoryDb.sessions.has(sessionToken), 'Server session completely deleted from memory/DB');
  pass('6.1 Logout destroys server-side session record');
  pass('6.2 Logout issues Max-Age=0 cookie deletion header');

  const postLogoutRes = await app.request('/api/auth/session', {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(postLogoutRes.status, 401, 'Subsequent request with revoked cookie receives 401');
  pass('6.3 Revoked session cannot authenticate any subsequent endpoint');

  console.log('\n=================================================================');
  console.log(` PHASE 20B SESSION VERIFICATION: ${assertionsCount} PASSED, 0 FAILED`);
  console.log('=================================================================\n');

  return { passed: assertionsCount, failed: 0 };
}

// Auto-run when executed directly via npx tsx
runPhase20BSessionValidationSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ PHASE 20B SESSION VALIDATION FAILED:', err);
    process.exit(1);
  });
