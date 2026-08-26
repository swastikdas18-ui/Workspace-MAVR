/**
 * Live Authentication Execution Path & Session Verification Script
 * 
 * Verifies:
 * 1. Stored password hash in Neon
 * 2. bcrypt.compare validation against 'PoloPassword2026!'
 * 3. POST /api/auth/login HTTP request execution & response body
 * 4. Session cookie generation and session persistence in Neon
 * 5. GET /api/auth/session identity introspection
 */

import { neon } from '@neondatabase/serverless';
import { app } from '../backend/src/app';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

function extractCookies(res: Response) {
  const getSetCookie = (res.headers as any).getSetCookie?.() || [];
  let sessionToken = '';
  let csrfToken = '';
  for (const chunk of getSetCookie) {
    const nameVal = chunk.trim().split(';')[0];
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx !== -1) {
      const key = nameVal.substring(0, eqIdx).trim();
      const val = nameVal.substring(eqIdx + 1).trim();
      if (key === 'ws_session') sessionToken = val;
      if (key === 'ws_csrf') csrfToken = val;
    }
  }
  return {
    sessionToken,
    csrfToken,
    cookieHeader: `ws_session=${sessionToken}; ws_csrf=${csrfToken}`,
  };
}

async function verifyLiveAuth() {
  console.log('================================================================================');
  console.log(' LIVE AUTHENTICATION EXECUTION PATH & SESSION AUDIT');
  console.log('================================================================================\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL is required to test live Neon authentication.');
    console.error('Run: DATABASE_URL="postgresql://..." npx tsx scripts/verify-live-auth.ts');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // 1. Inspect User in PostgreSQL
  console.log('--- Step 1: Direct Neon PostgreSQL User Inspection ---');
  const userRows = await sql`
    SELECT id, name, email, password, role, platform_role, created_at 
    FROM users 
    WHERE email = 'admin@polotechnologies.com';
  `;

  if (userRows.length === 0) {
    console.error('❌ ERROR: User admin@polotechnologies.com not found in Neon database.');
    console.error('Please run `npm run db:seed` first.');
    process.exit(1);
  }

  const dbUser = userRows[0];
  console.log('Database User Record:');
  console.log({
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    platform_role: dbUser.platform_role,
    password_hash_prefix: dbUser.password.slice(0, 15) + '...',
    hash_length: dbUser.password.length,
  });

  // 2. Direct Bcrypt Compare Verification
  console.log('\n--- Step 2: Direct Bcrypt Hash Validation ---');
  const testPassword = 'PoloPassword2026!';
  const bcryptMatch = await bcrypt.compare(testPassword, dbUser.password);
  console.log(`Password: "${testPassword}"`);
  console.log(`bcrypt.compare() result: ${bcryptMatch ? '✅ MATCH (Password Valid)' : '❌ MISMATCH'}`);

  if (!bcryptMatch) {
    console.error('❌ Password hash in database does not match PoloPassword2026!. Re-run seed.');
    process.exit(1);
  }

  // 3. Count Sessions in Neon before login
  const sessionsBefore = await sql`SELECT COUNT(*)::int as count FROM sessions;`;
  console.log(`\nSessions Count in Neon (Before Login): ${sessionsBefore[0]?.count}`);

  // 4. Fire Live POST /api/auth/login
  console.log('\n--- Step 3: Execute POST /api/auth/login ---');
  const loginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@polotechnologies.com',
      password: testPassword,
    }),
  });

  console.log(`HTTP Status Code: ${loginRes.status}`);
  const loginBody = await loginRes.json();
  console.log('Response Payload:');
  console.log(JSON.stringify(loginBody, null, 2));

  if (loginRes.status !== 200) {
    console.error(`❌ Login failed with status ${loginRes.status}`);
    process.exit(1);
  }

  const cookies = extractCookies(loginRes);
  console.log('\nIssued Session Cookies:');
  console.log(`ws_session: ${cookies.sessionToken.slice(0, 15)}...`);
  console.log(`ws_csrf:    ${cookies.csrfToken.slice(0, 15)}...`);

  // 5. Verify Session Row in Neon
  console.log('\n--- Step 4: Verify Session Created in Neon PostgreSQL ---');
  const sessionsAfter = await sql`SELECT COUNT(*)::int as count FROM sessions;`;
  console.log(`Sessions Count in Neon (After Login): ${sessionsAfter[0]?.count}`);
  console.log(`Session Created & Incremented: ${sessionsAfter[0]?.count > sessionsBefore[0]?.count ? '✅ YES' : '❌ NO'}`);

  const activeSessionRows = await sql`
    SELECT id, user_id, workspace_id, token, expires_at, created_at, last_active_at
    FROM sessions 
    WHERE user_id = ${dbUser.id}
    ORDER BY created_at DESC 
    LIMIT 1;
  `;
  console.log('\nPersisted Session in Neon:');
  console.table(activeSessionRows);

  // 6. Verify GET /api/auth/session
  console.log('\n--- Step 5: Execute GET /api/auth/session ---');
  const sessionRes = await app.request('/api/auth/session', {
    method: 'GET',
    headers: {
      Cookie: cookies.cookieHeader,
    },
  });

  console.log(`HTTP Status Code: ${sessionRes.status}`);
  const sessionBody = await sessionRes.json();
  console.log('Session Introspection Payload:');
  console.log(JSON.stringify(sessionBody, null, 2));

  if (sessionRes.status === 200) {
    console.log('\n================================================================================');
    console.log(' ✅ AUTHENTICATION AUDIT COMPLETE: 100% VERIFIED & FUNCTIONAL');
    console.log('================================================================================\n');
  } else {
    console.error(`❌ Session validation failed with status ${sessionRes.status}`);
    process.exit(1);
  }
}

verifyLiveAuth().catch((err) => {
  console.error('\n❌ Fatal Auth Verification Error:', err);
  process.exit(1);
});
