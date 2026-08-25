/**
 * PHASE 17 — SECURITY & PRODUCTION HARDENING VALIDATION SUITE
 *
 * Verifies every fix from the Production Readiness Audit:
 *  1. Razorpay webhook signature enforcement (401 on missing/invalid)
 *  2. Session tokens transported ONLY via httpOnly cookies (never in JSON)
 *  3. 256-bit CSPRNG credentials (invite tokens, magic links, single-use)
 *  4. platform_admin gate on cross-workspace founder console
 *  5. httpOnly + SameSite=Strict cookie attributes
 *  6. Fail-fast secret validation (assertProductionSecrets)
 *  7. Workspace-membership RBAC + IDOR scope checks
 *  9. CSRF double-submit enforcement on cookie-authenticated mutations
 * 10. Security audit trail persistence for denials
 *
 * NOTE: env vars are configured BEFORE dynamic app import so the module graph
 * boots deterministically in test mode.
 */

process.env.NODE_ENV = process.env.NODE_ENV === 'production' ? 'development' : process.env.NODE_ENV || 'test';
process.env.PLATFORM_ADMIN_EMAILS = 'founder@mavr.io';

const { app } = await import('../src/app');
const { inMemoryDb } = await import('../packages/database');
const { assertProductionSecrets } = await import('../src/config/env');
const { AuthService } = await import('../src/services/auth-service');
const crypto = await import('crypto');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failCount++;
    console.error(`FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passCount++;
    console.log(`PASS: ${message}`);
  }
}

interface TestResponse {
  status: number;
  data: any;
  headers: Headers;
}

async function call(
  method: string,
  path: string,
  opts: {
    body?: any;
    token?: string | null;
    cookies?: Record<string, string>;
    csrf?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<TestResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.csrf) headers['X-CSRF-Token'] = opts.csrf;
  const cookieParts = Object.entries(opts.cookies || {}).map(([k, v]) => `${k}=${v}`);
  if (cookieParts.length) headers['Cookie'] = cookieParts.join('; ');

  const res = await app.fetch(
    new Request(`http://localhost:3000${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  );
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data, headers: res.headers };
}

function extractCookie(res: TestResponse, name: string): string | null {
  const setCookie = res.headers.get('set-cookie') || '';
  for (const part of setCookie.split(/,(?=[^;]+?=)/)) {
    const m = part.trim().match(new RegExp(`^${name}=([^;]+)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

export async function runPhase17SecurityValidation() {
  console.log('\n=================================================================');
  console.log(' PHASE 17 — SECURITY & PRODUCTION HARDENING VALIDATION');
  console.log('=================================================================\n');

  inMemoryDb.reset();

  // ---------------------------------------------------------------------------
  // FIX #6 — Fail-fast secret validation
  // ---------------------------------------------------------------------------
  console.log('--- Fix #6: Fail-Fast Secret Validation ---');
  {
    let threwMissing = false;
    try {
      assertProductionSecrets({});
    } catch (err: any) {
      threwMissing = /Missing required secrets/.test(err.message) && err.message.includes('SESSION_SECRET');
    }
    assert(threwMissing, '6.1 assertProductionSecrets throws listing missing secrets');

    let threwShortSession = false;
    try {
      assertProductionSecrets({
        SESSION_SECRET: 'short',
        ENCRYPTION_KEY: 'x'.repeat(32),
        RAZORPAY_KEY_SECRET: 'y'.repeat(32),
        RAZORPAY_WEBHOOK_SECRET: 'z'.repeat(32),
        RESEND_API_KEY: 're_valid_key',
      });
    } catch (err: any) {
      threwShortSession = /SESSION_SECRET must be at least 32/.test(err.message);
    }
    assert(threwShortSession, '6.2 Short SESSION_SECRET is rejected');

    let noThrow = true;
    try {
      assertProductionSecrets({
        SESSION_SECRET: 'a'.repeat(32),
        ENCRYPTION_KEY: 'b'.repeat(32),
        RAZORPAY_KEY_SECRET: 'c'.repeat(32),
        RAZORPAY_WEBHOOK_SECRET: 'd'.repeat(32),
        RESEND_API_KEY: 're_valid',
      });
    } catch {
      noThrow = false;
    }
    assert(noThrow, '6.3 Fully-configured environment passes validation');
  }

  // ---------------------------------------------------------------------------
  // FIX #2/#5 — Cookie-only sessions with hardened attributes
  // ---------------------------------------------------------------------------
  console.log('\n--- Fix #2/#5: httpOnly Session Cookies (No Token in JSON) ---');
  let adminToken = '';
  let adminCsrf = '';
  let workspaceAId = '';
  {
    const reg = await call('POST', '/api/auth/register', {
      body: {
        name: 'Alice Admin',
        email: 'alice@alpha.test',
        password: 'SuperSecure2026!',
        workspaceName: 'Alpha Corp',
      },
    });

    assert(reg.status === 201, '2.1 Registration succeeds (201)');
    assert(!('token' in (reg.data || {})), '2.2 Register response JSON contains NO session token');
    assert(!!extractCookie(reg, 'ws_session'), '2.3 Register sets ws_session cookie');

    const rawSetCookie = reg.headers.get('set-cookie') || '';
    assert(
      /ws_session=[^;]+/i.test(rawSetCookie) && /HttpOnly/i.test(rawSetCookie),
      '2.4 ws_session cookie is HttpOnly'
    );
    assert(/SameSite=Strict/i.test(rawSetCookie), '2.5 ws_session cookie is SameSite=Strict');

    adminToken = extractCookie(reg, 'ws_session') as string;
    adminCsrf = extractCookie(reg, 'ws_csrf') as string;
    workspaceAId = reg.data.workspace.id;

    assert(!!adminCsrf, '2.6 Readable ws_csrf cookie issued alongside session');

    // Session endpoint returns identity without leaking the token
    const sess = await call('GET', '/api/auth/session', { token: adminToken });
    assert(sess.status === 200 && !!sess.data?.user?.id, '2.7 GET /session authenticates via token');
    assert(!('token' in (sess.data || {})), '2.8 GET /session response contains NO token field');
    assert(!!sess.data?.expiresAt, '2.9 GET /session exposes expiry metadata');

    // Login also stays cookie-only
    const login = await call('POST', '/api/auth/login', {
      body: { email: 'alice@alpha.test', password: 'SuperSecure2026!' },
    });
    assert(login.status === 200 && !('token' in (login.data || {})), '2.10 Login response contains NO token in JSON');
  }

  // ---------------------------------------------------------------------------
  // FIX #9 — CSRF double-submit enforcement
  // ---------------------------------------------------------------------------
  console.log('\n--- Fix #9: CSRF Double-Submit Protection ---');
  let inviteToken = '';
  {
    const blocked = await call('POST', '/api/invites', {
      cookies: { ws_session: adminToken },
      body: { email: 'bob@alpha.test', role: 'employee' },
    });
    assert(blocked.status === 403, '9.1 Cookie-authenticated POST without X-CSRF-Token is rejected (403)');
    assert(blocked.data?.error?.code === 'FORBIDDEN', '9.2 Rejection carries FORBIDDEN error code');

    const allowed = await call('POST', '/api/invites', {
      cookies: { ws_session: adminToken, ws_csrf: adminCsrf },
      csrf: adminCsrf,
      body: { email: 'bob@alpha.test', role: 'employee' },
    });
    assert(allowed.status === 201, '9.3 Matching X-CSRF-Token allows the mutation (201)');
    inviteToken = allowed.data?.invite?.token || '';

    const headerAuth = await call('POST', '/api/invites', {
      token: adminToken,
      body: { email: 'carol@alpha.test', role: 'intern' },
    });
    assert(headerAuth.status === 201, '9.4 Bearer-header requests bypass CSRF by design (non-browser clients)');
  }

  // ---------------------------------------------------------------------------
  // FIX #3 — Credential entropy & single-use guest magic links
  // ---------------------------------------------------------------------------
  console.log('\n--- Fix #3: 256-bit Credentials & Single-Use Magic Links ---');
  let magicToken = '';
  {
    assert(/^[0-9a-f]{64}$/.test(inviteToken), '3.1 Invite tokens are 64-char hex (256-bit CSPRNG)');

    const gInvite = await call('POST', '/api/portal/invite', {
      token: adminToken,
      body: { email: 'guest@client.test', name: 'Client Guest', company: 'Client Corp' },
    });
    assert(gInvite.status === 201, '3.2 Guest portal invitation created');
    const magicUrl: string = gInvite.data?.magicUrl || '';
    magicToken = magicUrl.split('token=')[1] || '';
    assert(magicToken.startsWith('gml_') && magicToken.length > 60, '3.3 Magic links carry gml_ prefixed high-entropy tokens');
    assert(!('magicToken' in (gInvite.data?.guest || {})), '3.4 Guest payload never includes the raw magic token');

    const firstUse = await call('GET', `/api/portal/auth/${magicToken}`);
    assert(firstUse.status === 200, '3.5 First magic-link redemption succeeds');
    assert(!('magicToken' in (firstUse.data?.guest || {})), '3.6 Redemption response sanitizes the token');
    assert(!!extractCookie(firstUse, 'gs_session'), '3.7 Guest session issued as gs_session cookie');

    const rawGuestSetCookie = firstUse.headers.get('set-cookie') || '';
    assert(
      /gs_session=[^;]+/i.test(rawGuestSetCookie) && /HttpOnly/i.test(rawGuestSetCookie),
      '3.8 gs_session cookie is HttpOnly'
    );

    const reuse = await call('GET', `/api/portal/auth/${magicToken}`);
    assert(reuse.status === 401, '3.9 Magic link reuse is rejected (single-use enforced)');
  }

  // ---------------------------------------------------------------------------
  // FIX #1 — Webhook signature enforcement
  // ---------------------------------------------------------------------------
  console.log('\n--- Fix #1: Razorpay Webhook Signature Enforcement ---');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET as string;
  {
    const eventPayloadObj = { event: 'payment.captured', event_id: 'evt_test_001' };
    const eventPayload = JSON.stringify(eventPayloadObj);

    const missing = await call('POST', '/api/billing/webhook', { body: eventPayloadObj });
    assert(missing.status === 401, '1.1 Webhook WITHOUT signature header rejected (401)');

    const invalid = await call('POST', '/api/billing/webhook', {
      body: eventPayloadObj,
      headers: { 'x-razorpay-signature': 'deadbeef'.repeat(8) },
    });
    assert(invalid.status === 401, '1.2 Webhook with FORGED signature rejected (401)');

    const validSig = crypto.createHmac('sha256', webhookSecret).update(eventPayload).digest('hex');
    const valid = await call('POST', '/api/billing/webhook', {
      body: eventPayloadObj,
      headers: { 'x-razorpay-signature': validSig },
    });
    assert(valid.status === 200 && valid.data?.status === 'ok', '1.3 Correctly-signed webhook is processed');

    // Strict payment verify: invalid signature can NEVER activate a plan
    const badVerify = await call('POST', '/api/v2/billing/verify', {
      token: adminToken,
      body: {
        razorpay_payment_id: 'pay_fake123',
        razorpay_subscription_id: 'sub_fake123',
        razorpay_signature: 'forged_signature_value',
        planTier: 'scale',
      },
    });
    assert(badVerify.status === 400, '1.4 /billing/verify rejects forged payment signatures even in dev');
  }

  // ---------------------------------------------------------------------------
  // FIX #4 — Platform admin gate on founder console
  // ---------------------------------------------------------------------------
  console.log('\n--- Fix #4: Platform-Admin Gate on Cross-Workspace Console ---');
  {
    const forbidden = await call('GET', '/api/admin/founder-console', { token: adminToken });
    assert(forbidden.status === 403, '4.1 Workspace admin denied company-wide financials (403)');
    assert(forbidden.data?.error?.code === 'FORBIDDEN', '4.2 Denial uses FORBIDDEN error code');

    const platReg = await call('POST', '/api/auth/register', {
      body: {
        name: 'Platform Founder',
        email: 'founder@mavr.io',
        password: 'PlatformRoot2026!',
        workspaceName: 'MAVR HQ',
      },
    });
    const platToken = extractCookie(platReg, 'ws_session') as string;
    assert(platReg.status === 201 && !!platToken, '4.3 Platform admin email registered successfully');

    await AuthService.bootstrapPlatformAdmins();

    const allowed = await call('GET', '/api/admin/founder-console', { token: platToken });
    assert(allowed.status === 200, '4.4 PLATFORM_ADMIN_EMAILS user granted founder console access after bootstrap');
    assert(allowed.status === 200 && allowed.data?.financials?.mrr !== undefined, '4.5 Company-wide financial metrics returned to platform admin');
  }

  // ---------------------------------------------------------------------------
  // FIX #7 — Membership RBAC + IDOR scope checks
  // ---------------------------------------------------------------------------
  console.log('\n--- Fix #7: Workspace-Membership RBAC & IDOR Scoping ---');
  let internToken = '';
  let pageId = '';
  {
    const intInvite = await call('POST', '/api/invites', {
      token: adminToken,
      body: { email: 'intern@alpha.test', role: 'intern' },
    });
    const intAccept = await call('POST', '/api/invites/accept', {
      body: {
        token: intInvite.data.invite.token,
        name: 'Ivy Intern',
        password: 'InternPass2026!',
      },
    });
    internToken = extractCookie(intAccept, 'ws_session') as string;
    assert(!!internToken, '7.1 Intern onboarded into workspace A');

    const wikiDenied = await call('POST', '/api/wiki/pages', {
      token: internToken,
      body: { title: 'Hack Attempt', content: '<script>x</script>' },
    });
    assert(wikiDenied.status === 403, '7.2 Intern cannot create wiki pages (read-only sandbox)');

    const reportDenied = await call('GET', '/api/time/report', { token: internToken });
    assert(reportDenied.status === 403, '7.3 Intern cannot read utilization reports');

    const pageCreated = await call('POST', '/api/wiki/pages', {
      token: adminToken,
      body: { title: 'Alpha Playbook', content: 'Confidential Alpha content' },
    });
    pageId = pageCreated.data?.page?.id || pageCreated.data?.id || '';
    assert(pageCreated.status === 201 && !!pageId, '7.4 Workspace A admin creates a wiki page');

    // Workspace B admin attempts IDOR against A's page
    const regB = await call('POST', '/api/auth/register', {
      body: {
        name: 'Ben Rival',
        email: 'ben@beta.test',
        password: 'BetaSecure2026!',
        workspaceName: 'Beta Labs',
      },
    });
    const tokenB = extractCookie(regB, 'ws_session') as string;
    const idor = await call('PATCH', `/api/wiki/pages/${pageId}`, {
      token: tokenB,
      body: { title: 'Defaced' },
    });
    assert(idor.status === 404 || idor.status === 403, '7.5 Cross-workspace page modification blocked (IDOR protected)');

    const delB = await call('DELETE', `/api/wiki/pages/${pageId}`, { token: tokenB });
    assert(delB.status === 404 || delB.status === 403, '7.6 Cross-workspace page deletion blocked (IDOR protected)');

    const ownerPatch = await call('PATCH', `/api/wiki/pages/${pageId}`, {
      token: adminToken,
      body: { title: 'Alpha Playbook v2' },
    });
    assert(ownerPatch.status === 200, '7.7 Same-workspace admin retains full access to own page');
  }

  // ---------------------------------------------------------------------------
  // FIX #10 — Security audit trail persistence
  // ---------------------------------------------------------------------------
  console.log('\n--- Fix #10: Security Audit Trail ---');
  {
    const auditActions = Array.from(inMemoryDb.auditLogs.values()).map((l: any) => l.action);
    assert(auditActions.includes('webhook.missing_signature'), '10.1 Missing webhook signature persisted as security event');
    assert(auditActions.includes('webhook.invalid_signature'), '10.2 Forged webhook signature persisted as security event');
    assert(auditActions.includes('csrf.failure'), '10.3 CSRF rejection persisted as security event');
    assert(auditActions.includes('access.forbidden'), '10.4 RBAC denial persisted as security event');
    assert(auditActions.includes('guest.token_reuse') || auditActions.includes('guest.token_invalid'),
      '10.5 Guest magic-link misuse persisted as security event');

    const sample = Array.from(inMemoryDb.auditLogs.values()).find((l: any) => l.action === 'csrf.failure') as any;
    assert(sample && ('ipAddress' in sample || 'userAgent' in sample), '10.6 Audit events capture request metadata');
  }

  // ---------------------------------------------------------------------------
  // Logout hygiene
  // ---------------------------------------------------------------------------
  console.log('\n--- Session Revocation Hygiene ---');
  {
    const logoutRes = await call('POST', '/api/auth/logout', { token: internToken });
    assert(logoutRes.status === 200, 'L.1 Logout succeeds for cookie-authenticated session');

    const postLogout = await call('GET', '/api/auth/session', { token: internToken });
    assert(postLogout.status === 401, 'L.2 Revoked session is rejected server-side afterwards');

    const cleared = logoutRes.headers.get('set-cookie') || '';
    assert(/ws_session=\s*;/.test(cleared), 'L.3 Logout clears the session cookie');
  }

  console.log('\n=================================================================');
  console.log(` PHASE 17 SECURITY VALIDATION: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=================================================================\n');

  if (failCount > 0) {
    throw new Error(`Phase 17 validation failed with ${failCount} errors.`);
  }
}

// Standalone execution support
const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').includes('phase17-security-validation');
if (invokedDirectly) {
  runPhase17SecurityValidation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Phase 17 validation error:', err);
      process.exit(1);
    });
}
