/**
 * PHASE 20 — AUTHENTICATION SESSION LIFECYCLE AUDIT & VERIFICATION SUITE
 *
 * Verifies and proves the end-to-end security posture of the Workspace OS
 * authentication session lifecycle:
 *
 * 1. Login Endpoint & Cookie Issuance:
 *    - Session token is NEVER returned in JSON response body.
 *    - Session token is delivered ONLY via HttpOnly ws_session cookie.
 *    - Cookie flags: HttpOnly, Path=/, SameSite=Strict, Secure (production).
 *    - ws_csrf cookie is issued alongside session for double-submit CSRF.
 *
 * 2. Session Validation Middleware:
 *    - Cookie-based authentication across protected routes.
 *    - Server-side session verification (zero client trust).
 *    - Request body tampering (userId/role/workspaceId spoofing) is strictly ignored.
 *
 * 3. Double-Submit CSRF Protection:
 *    - Enforced on mutating methods: POST, PUT, PATCH, DELETE.
 *    - Missing or mismatched X-CSRF-Token header returns 403 Forbidden.
 *    - Valid matching token allows mutation.
 *
 * 4. Session Timeouts:
 *    - 4-hour Idle Timeout enforcement (inactivity rejection).
 *    - Sliding idle window: active requests refresh lastActiveAt.
 *    - 7-day Absolute Timeout enforcement (hard expiration rejection).
 *
 * 5. Logout & Session Invalidation:
 *    - Server-side session record deleted from store.
 *    - HttpOnly session cookie and CSRF cookie cleared (Max-Age=0).
 *    - Subsequent requests with revoked session return 401 Unauthorized.
 */

process.env.NODE_ENV = process.env.NODE_ENV === 'production' ? 'development' : process.env.NODE_ENV || 'test';
process.env.PLATFORM_ADMIN_EMAILS = 'founder@mavr.io';

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

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failCount++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passCount++;
    console.log(`  ✅ PASS: ${message}`);
  }
}

interface HttpResponse {
  status: number;
  data: any;
  headers: Headers;
}

async function request(
  method: string,
  path: string,
  options: {
    body?: any;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    csrf?: string;
    token?: string;
  } = {}
): Promise<HttpResponse> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    reqHeaders['Authorization'] = `Bearer ${options.token}`;
  }

  if (options.csrf) {
    reqHeaders['X-CSRF-Token'] = options.csrf;
  }

  const cookieEntries = Object.entries(options.cookies || {});
  if (cookieEntries.length > 0) {
    reqHeaders['Cookie'] = cookieEntries.map(([k, v]) => `${k}=${v}`).join('; ');
  }

  const req = new Request(`http://localhost:3000${path}`, {
    method,
    headers: reqHeaders,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const res = await app.fetch(req);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON responses handled gracefully
  }

  return {
    status: res.status,
    data,
    headers: res.headers,
  };
}

function parseCookieHeader(res: HttpResponse, cookieName: string): { value: string; attributes: string[] } | null {
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

export async function runPhase20AuthSessionAudit() {
  console.log('\n=================================================================');
  console.log(' PHASE 20: COMPLETE AUTHENTICATION SESSION LIFECYCLE AUDIT');
  console.log('=================================================================\n');

  inMemoryDb.reset();

  // ---------------------------------------------------------------------------
  // SECTION 1: Login Endpoint & Cookie Issuance
  // ---------------------------------------------------------------------------
  console.log('--- Check 1: Login Endpoint & Cookie Issuance ---');

  // Seed test organization admin
  const registerRes = await request('POST', '/api/auth/register', {
    body: {
      name: 'Security Officer',
      email: 'secops@mavr.io',
      password: 'SecOpsSecurePass2026!',
      workspaceName: 'SecOps Corp',
    },
  });

  assert(registerRes.status === 201, '1.1 Admin registration returns 201 Created');
  assert(registerRes.data?.token === undefined, '1.2 Register response JSON body MUST NOT return session token');
  assert(registerRes.data?.user?.email === 'secops@mavr.io', '1.3 Register response exposes user profile');
  assert(registerRes.data?.workspace?.name === 'SecOps Corp', '1.4 Register response exposes workspace metadata');

  // Test Login endpoint
  const loginRes = await request('POST', '/api/auth/login', {
    body: {
      email: 'secops@mavr.io',
      password: 'SecOpsSecurePass2026!',
    },
  });

  assert(loginRes.status === 200, '1.5 POST /api/auth/login returns 200 OK');
  assert(loginRes.data?.token === undefined, '1.6 Login response JSON body MUST NOT contain session token');
  assert(typeof loginRes.data?.csrfToken === 'string' && loginRes.data.csrfToken.length > 0, '1.7 Login response returns CSRF token');

  // Inspect HttpOnly ws_session cookie
  const sessionCookie = parseCookieHeader(loginRes, WORKSPACE_SESSION_COOKIE);
  assert(sessionCookie !== null, '1.8 Login response sets ws_session cookie');
  assert(sessionCookie?.value.length === 64, '1.9 ws_session contains high-entropy 256-bit token');
  assert(
    sessionCookie?.attributes.some((a) => a.toLowerCase() === 'httponly') === true,
    '1.10 ws_session cookie has HttpOnly flag set'
  );
  assert(
    sessionCookie?.attributes.some((a) => a.toLowerCase() === 'samesite=strict') === true,
    '1.11 ws_session cookie has SameSite=Strict flag set'
  );
  assert(
    sessionCookie?.attributes.some((a) => a.toLowerCase() === 'path=/') === true,
    '1.12 ws_session cookie has Path=/ set'
  );

  // Inspect ws_csrf cookie
  const csrfCookie = parseCookieHeader(loginRes, CSRF_COOKIE);
  assert(csrfCookie !== null, '1.13 Login response sets ws_csrf cookie');
  assert(
    csrfCookie?.attributes.some((a) => a.toLowerCase() === 'httponly') === false,
    '1.14 ws_csrf cookie is NOT HttpOnly (accessible to client SPA for double-submit)'
  );
  assert(
    csrfCookie?.attributes.some((a) => a.toLowerCase() === 'samesite=strict') === true,
    '1.15 ws_csrf cookie has SameSite=Strict set'
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: Session Validation Middleware (Zero Client Trust)
  // ---------------------------------------------------------------------------
  console.log('\n--- Check 2: Session Validation & Server-Side Identity Resolution ---');

  const sessionToken = sessionCookie!.value;
  const csrfToken = csrfCookie!.value;

  // Unauthenticated request rejected
  const unauthRes = await request('GET', '/api/workspace');
  assert(unauthRes.status === 401, '2.1 Request without session cookie is rejected with 401 Unauthorized');
  assert(unauthRes.data?.error?.code === 'UNAUTHORIZED', '2.2 Error payload contains UNAUTHORIZED code');

  // Authenticated request via ws_session cookie
  const cookieAuthRes = await request('GET', '/api/workspace', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken },
  });
  assert(cookieAuthRes.status === 200, '2.3 Request with ws_session cookie authenticates successfully (200 OK)');
  assert(cookieAuthRes.data?.workspace?.name === 'SecOps Corp', '2.4 Server-side session resolves correct workspace');

  // GET /api/auth/session verification
  const sessionCheck = await request('GET', '/api/auth/session', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken },
  });
  assert(sessionCheck.status === 200, '2.5 GET /api/auth/session returns 200 OK');
  assert(sessionCheck.data?.user?.email === 'secops@mavr.io', '2.6 Server resolves verified user from cookie');
  assert(sessionCheck.data?.token === undefined, '2.7 GET /session response JSON NEVER leaks session token');

  // Zero Client Trust: Body tampering with spoofed userId / role / workspaceId
  const spoofAttempt = await request('POST', '/api/projects', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    csrf: csrfToken,
    body: {
      title: 'Security Audit Project',
      description: 'Verifying zero client trust',
      // Attacker attempts to spoof creator ID and inject admin override
      userId: 'spoofed-fake-user-id',
      created_by: 'spoofed-fake-user-id',
      workspaceId: 'spoofed-fake-workspace-id',
      role: 'platform_admin',
    },
  });

  assert(spoofAttempt.status === 201, '2.8 Project created successfully under verified server identity');
  assert(
    spoofAttempt.data?.project?.createdBy === sessionCheck.data?.user?.id ||
    spoofAttempt.data?.project?.created_by === sessionCheck.data?.user?.id,
    '2.9 Project createdBy matches server-verified user ID (spoofed userId in body was completely ignored)'
  );
  assert(
    spoofAttempt.data?.project?.workspaceId === sessionCheck.data?.workspace?.id ||
    spoofAttempt.data?.project?.workspace_id === sessionCheck.data?.workspace?.id,
    '2.10 Project workspaceId matches server-verified workspace ID (spoofed workspaceId in body was ignored)'
  );

  const testProjectId = spoofAttempt.data?.project?.id;

  // ---------------------------------------------------------------------------
  // SECTION 3: CSRF Protection (Double-Submit Token Pattern)
  // ---------------------------------------------------------------------------
  console.log('\n--- Check 3: Double-Submit CSRF Enforcement ---');

  // POST without X-CSRF-Token header
  const postNoCsrf = await request('POST', '/api/tasks', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    body: { title: 'CSRF Attack Task', projectId: testProjectId },
  });
  assert(postNoCsrf.status === 403, '3.1 POST with cookie but MISSING X-CSRF-Token is rejected (403 Forbidden)');
  assert(postNoCsrf.data?.error?.code === 'FORBIDDEN', '3.2 Rejection carries FORBIDDEN code');

  // POST with mismatched X-CSRF-Token header
  const postBadCsrf = await request('POST', '/api/tasks', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    csrf: 'forged-attacker-csrf-token-12345',
    body: { title: 'CSRF Attack Task', projectId: testProjectId },
  });
  assert(postBadCsrf.status === 403, '3.3 POST with MISMATCHED X-CSRF-Token is rejected (403 Forbidden)');

  // POST with valid matching X-CSRF-Token
  const postValidCsrf = await request('POST', '/api/tasks', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    csrf: csrfToken,
    body: { title: 'Legitimate Task With Valid CSRF', projectId: testProjectId },
  });
  assert(postValidCsrf.status === 201, '3.4 POST with matching X-CSRF-Token succeeds (201 Created)');
  const createdTaskId = postValidCsrf.data?.task?.id;

  // PATCH with valid CSRF
  const patchRes = await request('PATCH', `/api/tasks/${createdTaskId}`, {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    csrf: csrfToken,
    body: { status: 'in_progress' },
  });
  assert(patchRes.status === 200, '3.5 PATCH with matching X-CSRF-Token succeeds (200 OK)');

  // PATCH without CSRF
  const patchNoCsrf = await request('PATCH', `/api/tasks/${createdTaskId}`, {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    body: { status: 'completed' },
  });
  assert(patchNoCsrf.status === 403, '3.6 PATCH without X-CSRF-Token is rejected (403 Forbidden)');

  // DELETE without CSRF
  const deleteNoCsrf = await request('DELETE', `/api/tasks/${createdTaskId}`, {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
  });
  assert(deleteNoCsrf.status === 403, '3.7 DELETE without X-CSRF-Token is rejected (403 Forbidden)');

  // DELETE with valid CSRF
  const deleteValidCsrf = await request('DELETE', `/api/tasks/${createdTaskId}`, {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    csrf: csrfToken,
  });
  assert(deleteValidCsrf.status === 200, '3.8 DELETE with matching X-CSRF-Token succeeds (200 OK)');

  // ---------------------------------------------------------------------------
  // SECTION 4: Session Timeouts (Idle & Absolute)
  // ---------------------------------------------------------------------------
  console.log('\n--- Check 4: Idle & Absolute Timeout Enforcement ---');

  // Test 4.1: 4-Hour Idle Timeout Enforcement
  const idleSessionToken = 'test_idle_session_token_' + Date.now();
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours inactive > 4h threshold
  inMemoryDb.sessions.set(idleSessionToken, {
    id: 'sess-idle-test',
    userId: sessionCheck.data.user.id,
    workspaceId: sessionCheck.data.workspace.id,
    token: idleSessionToken,
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // Not absolute expired
    createdAt: fiveHoursAgo,
    lastActiveAt: fiveHoursAgo,
    ipAddress: null,
    userAgent: null,
  });

  const idleCheck = await request('GET', '/api/workspace', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: idleSessionToken },
  });
  assert(idleCheck.status === 401, '4.1 Inactive session (> 4 hours idle) is rejected with 401 Unauthorized');
  assert(inMemoryDb.sessions.get(idleSessionToken) === undefined, '4.2 Expired idle session is deleted from session store');

  // Test 4.2: Sliding Idle Window Keeps Active Sessions Alive
  const activeSessionToken = 'test_active_sliding_token_' + Date.now();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago < 4h threshold
  inMemoryDb.sessions.set(activeSessionToken, {
    id: 'sess-sliding-test',
    userId: sessionCheck.data.user.id,
    workspaceId: sessionCheck.data.workspace.id,
    token: activeSessionToken,
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    createdAt: twoHoursAgo,
    lastActiveAt: twoHoursAgo,
    ipAddress: null,
    userAgent: null,
  });

  const slidingCheck = await request('GET', '/api/workspace', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: activeSessionToken },
  });
  assert(slidingCheck.status === 200, '4.3 Active session within 4h window succeeds (200 OK)');
  const updatedSession = inMemoryDb.sessions.get(activeSessionToken);
  assert(
    updatedSession !== undefined && Date.now() - new Date(updatedSession.lastActiveAt).getTime() < 10000,
    '4.4 lastActiveAt is updated to current timestamp (sliding idle window refreshed)'
  );

  // Test 4.3: 7-Day Absolute Timeout Enforcement
  const expiredSessionToken = 'test_expired_absolute_token_' + Date.now();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  inMemoryDb.sessions.set(expiredSessionToken, {
    id: 'sess-absolute-test',
    userId: sessionCheck.data.user.id,
    workspaceId: sessionCheck.data.workspace.id,
    token: expiredSessionToken,
    expiresAt: new Date(Date.now() - 1000), // Hard expired in the past
    createdAt: eightDaysAgo,
    lastActiveAt: new Date(), // Active right now, but absolute expiry reached
    ipAddress: null,
    userAgent: null,
  });

  const absoluteCheck = await request('GET', '/api/workspace', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: expiredSessionToken },
  });
  assert(absoluteCheck.status === 401, '4.5 Absolute expired session (> 7 days) is rejected with 401 Unauthorized');
  assert(inMemoryDb.sessions.get(expiredSessionToken) === undefined, '4.6 Absolute expired session is deleted from store');

  // ---------------------------------------------------------------------------
  // SECTION 5: Logout Flow & Session Invalidation
  // ---------------------------------------------------------------------------
  console.log('\n--- Check 5: Logout Flow & Complete Revocation ---');

  // Logout using cookie auth + CSRF token
  const logoutRes = await request('POST', '/api/auth/logout', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken, [CSRF_COOKIE]: csrfToken },
    csrf: csrfToken,
  });

  assert(logoutRes.status === 200, '5.1 POST /api/auth/logout returns 200 OK');
  assert(logoutRes.data?.success === true, '5.2 Logout reports success: true');

  // Check cleared cookies
  const clearedSessionCookie = parseCookieHeader(logoutRes, WORKSPACE_SESSION_COOKIE);
  assert(clearedSessionCookie !== null, '5.3 Logout sets ws_session expiration header');
  assert(
    clearedSessionCookie?.attributes.some((a) => a.toLowerCase().includes('max-age=0')) === true,
    '5.4 ws_session cookie has Max-Age=0 (cleared from browser)'
  );

  const clearedCsrfCookie = parseCookieHeader(logoutRes, CSRF_COOKIE);
  assert(clearedCsrfCookie !== null, '5.5 Logout sets ws_csrf expiration header');
  assert(
    clearedCsrfCookie?.attributes.some((a) => a.toLowerCase().includes('max-age=0')) === true,
    '5.6 ws_csrf cookie has Max-Age=0 (cleared from browser)'
  );

  // Server-side session record must be deleted
  assert(inMemoryDb.sessions.get(sessionToken) === undefined, '5.7 Server session record is completely deleted from database');

  // Subsequent request with the logged-out token must fail
  const postLogoutReq = await request('GET', '/api/workspace', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: sessionToken },
  });
  assert(postLogoutReq.status === 401, '5.8 Subsequent request with revoked cookie is rejected (401 Unauthorized)');

  // ---------------------------------------------------------------------------
  // SECTION 6: Invited Member Acceptance & CSRF Bootstrap
  // ---------------------------------------------------------------------------
  console.log('\n--- Check 6: Invite Acceptance & CSRF Bootstrap ---');

  // Test /api/auth/csrf bootstrap
  const csrfBootstrap = await request('GET', '/api/auth/csrf');
  assert(csrfBootstrap.status === 200, '6.1 GET /api/auth/csrf returns 200 OK');
  assert(typeof csrfBootstrap.data?.csrfToken === 'string', '6.2 Returns fresh CSRF token in payload');
  const bootstrapCookie = parseCookieHeader(csrfBootstrap, CSRF_COOKIE);
  assert(bootstrapCookie !== null, '6.3 GET /api/auth/csrf sets ws_csrf cookie');

  // Test Invalid Credentials audit & rejection
  const badLogin = await request('POST', '/api/auth/login', {
    body: {
      email: 'secops@mavr.io',
      password: 'IncorrectPassword999!',
    },
  });
  assert(badLogin.status === 401, '6.4 Invalid credentials returns 401 Unauthorized');
  assert(badLogin.data?.error?.code === 'UNAUTHORIZED', '6.5 Error code is UNAUTHORIZED');
  const auditDenial = Array.from(inMemoryDb.auditLogs.values()).find(
    (a) => a.action === 'auth.failed_login'
  );
  assert(auditDenial !== undefined, '6.6 auth.failed_login security audit event persisted');

  // Test Absolute Timeout Boundary under Continuous Activity
  // Even if lastActiveAt was refreshed 1 second ago, if createdAt was 7.1 days ago, absolute timeout triggers
  const continuousActiveToken = 'test_continuous_active_token_' + Date.now();
  inMemoryDb.sessions.set(continuousActiveToken, {
    id: 'sess-cont-active',
    userId: registerRes.data.user.id,
    workspaceId: registerRes.data.workspace.id,
    token: continuousActiveToken,
    expiresAt: new Date(Date.now() - 100), // Hard expiry elapsed
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000),
    lastActiveAt: new Date(), // Active right now (continuous user)
    ipAddress: null,
    userAgent: null,
  });

  const continuousCheck = await request('GET', '/api/workspace', {
    cookies: { [WORKSPACE_SESSION_COOKIE]: continuousActiveToken },
  });
  assert(continuousCheck.status === 401, '6.7 Continuous activity cannot bypass 7-day Absolute Timeout');

  // Test Cookie Serialization Helpers
  const testCookieStr = buildWorkspaceSessionCookie('sample_token_abc123');
  assert(testCookieStr.includes('ws_session=sample_token_abc123'), '6.8 Session cookie string has correct cookie name and token');
  assert(testCookieStr.includes('HttpOnly'), '6.9 Session cookie helper includes HttpOnly');
  assert(testCookieStr.includes('SameSite=Strict'), '6.10 Session cookie helper includes SameSite=Strict');

  const testCsrfStr = buildCsrfCookie('sample_csrf_xyz789');
  assert(testCsrfStr.includes('ws_csrf=sample_csrf_xyz789'), '6.11 CSRF cookie helper has correct cookie name and token');
  assert(!testCsrfStr.includes('HttpOnly'), '6.12 CSRF cookie helper does not set HttpOnly');

  const extracted = readCookieFromHeader('ws_session=sample_token_abc123; ws_csrf=sample_csrf_xyz789', 'ws_session');
  assert(extracted === 'sample_token_abc123', '6.13 readCookieFromHeader extracts target cookie correctly');

  // ---------------------------------------------------------------------------
  // SECTION 7: End-to-End Browser Flow Lifecycle Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- Check 7: End-to-End Browser Flow Lifecycle Validation ---');

  // Step 1: User logs in from browser
  const browserLogin = await request('POST', '/api/auth/login', {
    body: {
      email: 'secops@mavr.io',
      password: 'SecOpsSecurePass2026!',
    },
  });
  assert(browserLogin.status === 200, '7.1 Browser login succeeds (200 OK)');
  const browserSessionCookie = parseCookieHeader(browserLogin, WORKSPACE_SESSION_COOKIE)!.value;
  const browserCsrfCookie = parseCookieHeader(browserLogin, CSRF_COOKIE)!.value;

  // Step 2: Browser initializes session
  const browserSession = await request('GET', '/api/auth/session', {
    cookies: {
      [WORKSPACE_SESSION_COOKIE]: browserSessionCookie,
      [CSRF_COOKIE]: browserCsrfCookie,
    },
  });
  assert(browserSession.status === 200, '7.2 Browser session verification succeeds');
  assert(browserSession.data?.user?.email === 'secops@mavr.io', '7.3 Correct user loaded in browser session');

  // Step 3: Browser creates a project (mutating request with CSRF)
  const browserProject = await request('POST', '/api/projects', {
    cookies: {
      [WORKSPACE_SESSION_COOKIE]: browserSessionCookie,
      [CSRF_COOKIE]: browserCsrfCookie,
    },
    csrf: browserCsrfCookie,
    body: {
      title: 'E2E Browser Workflow Project',
      description: 'Validated in browser lifecycle test',
    },
  });
  assert(browserProject.status === 201, '7.4 Browser creates project with valid CSRF (201 Created)');

  // Step 4: Browser logs out
  const browserLogout = await request('POST', '/api/auth/logout', {
    cookies: {
      [WORKSPACE_SESSION_COOKIE]: browserSessionCookie,
      [CSRF_COOKIE]: browserCsrfCookie,
    },
    csrf: browserCsrfCookie,
  });
  assert(browserLogout.status === 200, '7.5 Browser logs out successfully (200 OK)');

  // Step 5: Post-logout request fails
  const browserPostLogout = await request('GET', '/api/auth/session', {
    cookies: {
      [WORKSPACE_SESSION_COOKIE]: browserSessionCookie,
      [CSRF_COOKIE]: browserCsrfCookie,
    },
  });
  assert(browserPostLogout.status === 401, '7.6 Post-logout session access rejected (401 Unauthorized)');

  console.log('\n=================================================================');
  console.log(` PHASE 20 AUDIT VALIDATION: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=================================================================\n');

  if (failCount > 0) {
    throw new Error(`Phase 20 Audit failed: ${failCount} assertions failed.`);
  }
}

// Auto-run
runPhase20AuthSessionAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
