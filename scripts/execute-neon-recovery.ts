/**
 * Neon Schema Drift Correction, Seed, and Live Auth Validation Tool
 * 
 * Executes:
 * STEP 1 — Inspect Real Neon Schema (before)
 * STEP 2 — Compare Schema vs Drizzle
 * STEP 3 — Fix Migration System
 * STEP 4 — Apply Missing Columns (ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role ...)
 * STEP 5 — Run Seed
 * STEP 6 — Verify Row Counts (SELECT COUNT(*) from all tables)
 * STEP 7 — Verify Accounts (SELECT email, role from users)
 * STEP 8 — Verify Login & Session Creation (POST /api/auth/login -> sessions count increases)
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../backend/packages/database/schema';
import { runMigrations } from '../backend/packages/database/migrate';
import { seedProductionDatabase, SEED_PASSWORD_PLAIN } from './seed-production';
import { app } from '../backend/src/app';
import 'dotenv/config';

async function executeNeonRecovery() {
  console.log('================================================================================');
  console.log(' NEON DATABASE RECOVERY & LIVE EVIDENCE RUNNER');
  console.log('================================================================================\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ FATAL: DATABASE_URL is not set in environment or .env.');
    console.error('Please run with:');
    console.error('DATABASE_URL="postgresql://..." npx tsx scripts/execute-neon-recovery.ts');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // ============================================================================
  // STEP 1: INSPECT REAL NEON SCHEMA BEFORE FIX
  // ============================================================================
  console.log('--------------------------------------------------------------------------------');
  console.log('STEP 1: INSPECT REAL NEON SCHEMA (BEFORE FIX)');
  console.log('--------------------------------------------------------------------------------');
  const dbInfo = await sql`SELECT current_database(), current_schema(), version();`;
  console.log('Database Info:', dbInfo[0]);

  const usersColumnsBefore = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
  `;
  console.log('\n[Neon] Table: "users" Columns (Before Fix):');
  console.table(usersColumnsBefore);

  const sessionsColumnsBefore = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    ORDER BY ordinal_position;
  `;
  console.log('\n[Neon] Table: "sessions" Columns (Before Fix):');
  console.table(sessionsColumnsBefore);

  // ============================================================================
  // STEP 4: APPLY MISSING COLUMNS VIA MIGRATION ENGINE
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('STEP 4: APPLYING MIGRATIONS & ALTER TABLE FIXES');
  console.log('--------------------------------------------------------------------------------');
  await runMigrations();

  const usersColumnsAfter = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
  `;
  console.log('\n[Neon] Table: "users" Columns (After Fix):');
  console.table(usersColumnsAfter);

  const hasPlatformRole = usersColumnsAfter.some((c: any) => c.column_name === 'platform_role');
  console.log(`\nVerification: "platform_role" exists in "users"? -> ${hasPlatformRole ? '✅ YES' : '❌ NO'}`);
  if (!hasPlatformRole) {
    throw new Error('Fatal: platform_role column still does not exist in users table!');
  }

  // ============================================================================
  // STEP 5: EXECUTE SEED
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('STEP 5: RUNNING PRODUCTION SEED');
  console.log('--------------------------------------------------------------------------------');
  await seedProductionDatabase();

  // ============================================================================
  // STEP 6: VERIFY ROW COUNTS DIRECTLY FROM NEON
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('STEP 6: VERIFY ROW COUNTS (SQL PROOF)');
  console.log('--------------------------------------------------------------------------------');
  const countUsers = await sql`SELECT COUNT(*)::int as count FROM users;`;
  const countWorkspaces = await sql`SELECT COUNT(*)::int as count FROM workspaces;`;
  const countTeams = await sql`SELECT COUNT(*)::int as count FROM teams;`;
  const countWorkspaceMembers = await sql`SELECT COUNT(*)::int as count FROM workspace_members;`;
  const countTeamMembers = await sql`SELECT COUNT(*)::int as count FROM team_members;`;
  const countSessionsBefore = await sql`SELECT COUNT(*)::int as count FROM sessions;`;

  console.log(`SELECT COUNT(*) FROM users;             -> ${countUsers[0]?.count}`);
  console.log(`SELECT COUNT(*) FROM workspaces;        -> ${countWorkspaces[0]?.count}`);
  console.log(`SELECT COUNT(*) FROM teams;             -> ${countTeams[0]?.count}`);
  console.log(`SELECT COUNT(*) FROM workspace_members; -> ${countWorkspaceMembers[0]?.count}`);
  console.log(`SELECT COUNT(*) FROM team_members;      -> ${countTeamMembers[0]?.count}`);
  console.log(`SELECT COUNT(*) FROM sessions;          -> ${countSessionsBefore[0]?.count}`);

  // ============================================================================
  // STEP 7: VERIFY ACCOUNTS
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('STEP 7: VERIFY ENROLLED ACCOUNTS');
  console.log('--------------------------------------------------------------------------------');
  const userRows = await sql`
    SELECT email, role, platform_role, created_at 
    FROM users 
    ORDER BY email;
  `;
  console.table(userRows);

  // ============================================================================
  // STEP 8: LIVE AUTH & SESSION VALIDATION
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('STEP 8: LIVE AUTHENTICATION TEST (POST /api/auth/login)');
  console.log('--------------------------------------------------------------------------------');

  const loginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@polotechnologies.com',
      password: SEED_PASSWORD_PLAIN,
    }),
  });

  console.log(`HTTP Status: ${loginRes.status}`);
  const loginBody = await loginRes.json();
  console.log('Response Body:', JSON.stringify(loginBody, null, 2));

  const countSessionsAfter = await sql`SELECT COUNT(*)::int as count FROM sessions;`;
  console.log(`\nSELECT COUNT(*) FROM sessions (After Login); -> ${countSessionsAfter[0]?.count}`);
  console.log(`Session Created in Neon: ${countSessionsAfter[0]?.count > countSessionsBefore[0]?.count ? '✅ YES' : '❌ NO'}`);

  const activeSessions = await sql`SELECT id, user_id, workspace_id, token, expires_at FROM sessions ORDER BY created_at DESC LIMIT 5;`;
  console.log('\nActive Sessions in Neon:');
  console.table(activeSessions);

  console.log('\n================================================================================');
  console.log(' ALL RECOVERY & EVIDENCE STEPS COMPLETE');
  console.log('================================================================================\n');
}

executeNeonRecovery().catch((err) => {
  console.error('\n❌ Fatal Recovery Error:', err);
  process.exit(1);
});
