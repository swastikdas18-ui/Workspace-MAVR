/**
 * Production Database Direct Verification Tool
 * 
 * Directly queries the Neon PostgreSQL database without intermediate caches.
 * Prints database identity, schema, and live table record counts.
 */

import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function verifyProductionDatabase() {
  console.log('================================================================================');
  console.log(' DIRECT POSTGRESQL PRODUCTION DATABASE INSPECTION');
  console.log('================================================================================\n');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL is not set in environment or .env file.');
    console.error('Cannot query Neon directly without DATABASE_URL.');
    console.log('Pass DATABASE_URL in environment: DATABASE_URL="postgresql://..." npx tsx scripts/verify-production-db.ts');
    process.exit(1);
  }

  try {
    const parsed = new URL(databaseUrl);
    console.log(`DATABASE HOST: ${parsed.host}`);
    console.log(`DATABASE NAME: ${parsed.pathname.replace(/^\//, '')}`);
    console.log(`DATABASE USER: ${parsed.username}`);
    console.log('--------------------------------------------------------------------------------');

    const sql = neon(databaseUrl);

    // 1. Current Database & Schema
    const dbMeta = await sql`SELECT current_database(), current_schema(), version();`;
    console.log(`SELECT current_database() -> ${dbMeta[0]?.current_database}`);
    console.log(`SELECT current_schema()   -> ${dbMeta[0]?.current_schema}`);
    console.log(`VERSION()                 -> ${dbMeta[0]?.version}`);
    console.log('--------------------------------------------------------------------------------');

    // Schema Column Audit: users table
    const userColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    console.log('USERS TABLE COLUMNS:');
    console.table(userColumns);
    const hasPlatformRole = userColumns.some((c: any) => c.column_name === 'platform_role');
    console.log(`platform_role column present: ${hasPlatformRole ? '✅ YES' : '❌ NO'}`);
    console.log('--------------------------------------------------------------------------------');

    // 2. Query Table Row Counts
    const usersCount = await sql`SELECT COUNT(*)::int AS count FROM users;`;
    const workspacesCount = await sql`SELECT COUNT(*)::int AS count FROM workspaces;`;
    const teamsCount = await sql`SELECT COUNT(*)::int AS count FROM teams;`;
    const workspaceMembersCount = await sql`SELECT COUNT(*)::int AS count FROM workspace_members;`;
    const teamMembersCount = await sql`SELECT COUNT(*)::int AS count FROM team_members;`;
    const sessionsCount = await sql`SELECT COUNT(*)::int AS count FROM sessions;`;

    console.log(`SELECT COUNT(*) FROM users;             -> ${usersCount[0]?.count}`);
    console.log(`SELECT COUNT(*) FROM workspaces;        -> ${workspacesCount[0]?.count}`);
    console.log(`SELECT COUNT(*) FROM teams;             -> ${teamsCount[0]?.count}`);
    console.log(`SELECT COUNT(*) FROM workspace_members; -> ${workspaceMembersCount[0]?.count}`);
    console.log(`SELECT COUNT(*) FROM team_members;      -> ${teamMembersCount[0]?.count}`);
    console.log(`SELECT COUNT(*) FROM sessions;          -> ${sessionsCount[0]?.count}`);
    console.log('--------------------------------------------------------------------------------');

    if (usersCount[0]?.count > 0) {
      console.log('✅ PASS: Users exist in PostgreSQL database (users > 0)');
      const userRows = await sql`SELECT id, name, email, role, platform_role, created_at FROM users LIMIT 10;`;
      console.log('\nEnrolled Users:');
      console.table(userRows);
    } else {
      console.warn('⚠️ WARNING: 0 users found in PostgreSQL database.');
      console.warn('Run `npm run db:seed` with DATABASE_URL configured to populate production records.');
    }

    console.log('\n================================================================================');
  } catch (err: any) {
    console.error('❌ Direct PostgreSQL Query Error:', err.message);
    process.exit(1);
  }
}

verifyProductionDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
