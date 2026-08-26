/**
 * Production Database Initialization & Idempotent Seed System
 * 
 * Sets up production baseline accounts for:
 * - Workspace: Polo Technologies
 * - ADMIN: admin@polotechnologies.com
 * - EMPLOYEE: employee@polotechnologies.com
 * - INTERN: intern@polotechnologies.com
 * (plus convenience demo aliases)
 * - Workspace Members, Teams, and Team Members
 * 
 * Instruments exact lineage telemetry before and after insertion.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../backend/packages/database/schema';
import { inMemoryDb } from '../backend/packages/database/connection';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

export const SEED_PASSWORD_PLAIN = 'PoloPassword2026!';
const PASSWORD_HASH = bcrypt.hashSync(SEED_PASSWORD_PLAIN, 10);

export async function seedProductionDatabase() {
  console.log('================================================================================');
  console.log(' WORKSPACE OS: PRODUCTION DATABASE SEED & TELEMETRY INSTRUMENTATION');
  console.log('================================================================================\n');

  const databaseUrl = process.env.DATABASE_URL;
  const isPostgres = !!databaseUrl;

  let dbHost = 'none (in-memory)';
  let dbName = 'in-memory-store';

  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      dbHost = parsed.host;
      dbName = parsed.pathname.replace(/^\//, '') || 'neondb';
    } catch {
      dbHost = 'postgres-configured';
      dbName = 'custom-db';
    }
  }

  console.log(`[Database Lineage] Mode: ${isPostgres ? 'PostgreSQL (Neon Serverless)' : 'In-Memory Store (Local / Test)'}`);
  console.log(`[Database Lineage] Host: ${dbHost}`);
  console.log(`[Database Lineage] Name: ${dbName}`);

  const now = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  // 1. Define Production Users
  const seedUsers = [
    {
      id: 'usr-polo-admin',
      name: 'Polo Admin',
      email: 'admin@polotechnologies.com',
      password: PASSWORD_HASH,
      role: 'admin',
      platformRole: 'platform_admin',
      title: 'Chief Executive & Founder',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-eng',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'usr-polo-employee',
      name: 'Polo Employee',
      email: 'employee@polotechnologies.com',
      password: PASSWORD_HASH,
      role: 'employee',
      platformRole: 'none',
      title: 'Senior Operations Specialist',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-eng',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'usr-polo-intern',
      name: 'Polo Intern',
      email: 'intern@polotechnologies.com',
      password: PASSWORD_HASH,
      role: 'intern',
      platformRole: 'none',
      title: 'Product Learning Intern',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-design',
      createdAt: yesterday,
      updatedAt: now,
    },
    // Aliases for quick UI demo logins
    {
      id: 'usr-polo-swastik',
      name: 'Swastik Founder',
      email: 'swastik@polotech.com',
      password: PASSWORD_HASH,
      role: 'admin',
      platformRole: 'founder',
      title: 'Platform Founder',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-eng',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'usr-polo-frontend',
      name: 'Frontend Developer',
      email: 'frontend@polotech.com',
      password: PASSWORD_HASH,
      role: 'employee',
      platformRole: 'none',
      title: 'Senior Frontend Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-eng',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'usr-polo-ui-intern',
      name: 'UI Intern',
      email: 'ui.intern@polotech.com',
      password: PASSWORD_HASH,
      role: 'intern',
      platformRole: 'none',
      title: 'UI Design Intern',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-design',
      createdAt: yesterday,
      updatedAt: now,
    },
  ];

  // 2. Define Production Workspace
  const poloWorkspace = {
    id: 'ws-polo-technologies',
    name: 'Polo Technologies',
    slug: 'polo-technologies',
    ownerId: 'usr-polo-admin',
    plan: 'pro',
    logo: null,
    createdAt: yesterday,
    updatedAt: now,
  };

  // 3. Define Teams
  const poloTeams = [
    {
      id: 'team-polo-eng',
      name: 'Engineering & Infrastructure',
      description: 'Core backend APIs, database scalability, and web client systems.',
      workspaceId: 'ws-polo-technologies',
      leadId: 'usr-polo-admin',
      color: '#3b82f6',
      createdAt: yesterday,
    },
    {
      id: 'team-polo-design',
      name: 'Product & Design',
      description: 'User experience research, UI architecture, and feature planning.',
      workspaceId: 'ws-polo-technologies',
      leadId: 'usr-polo-employee',
      color: '#8b5cf6',
      createdAt: yesterday,
    },
    {
      id: 'team-polo-ops',
      name: 'Operations & Growth',
      description: 'Business analytics, billing operations, and customer onboarding.',
      workspaceId: 'ws-polo-technologies',
      leadId: 'usr-polo-admin',
      color: '#10b981',
      createdAt: yesterday,
    },
  ];

  // In-Memory store sync (for local/test runtime)
  inMemoryDb.workspaces.set(poloWorkspace.id, poloWorkspace as any);
  for (const u of seedUsers) {
    inMemoryDb.users.set(u.id, u as any);
    const memId = `mem-${poloWorkspace.id}-${u.id}`;
    inMemoryDb.workspaceMembers.set(memId, {
      id: memId,
      workspaceId: poloWorkspace.id,
      userId: u.id,
      role: u.role,
      joinedAt: yesterday,
    });
  }
  for (const t of poloTeams) {
    inMemoryDb.teams.set(t.id, t as any);
  }

  // 4. PostgreSQL Remote Execution & Instrumentation
  if (databaseUrl) {
    console.log('\n--- PostgreSQL Pre-Insertion Telemetry ---');
    const sql = neon(databaseUrl);
    const db = drizzle(sql, { schema });

    const dbMeta = await sql`SELECT current_database(), current_schema();`;
    console.log(`CURRENT DATABASE: ${dbMeta[0]?.current_database}`);
    console.log(`CURRENT SCHEMA:   ${dbMeta[0]?.current_schema}`);

    // Ensure core tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        platform_role TEXT NOT NULL DEFAULT 'none',
        title TEXT,
        avatar TEXT,
        team_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'pro',
        logo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'employee',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        ip_address TEXT,
        user_agent TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        lead_id TEXT REFERENCES users(id),
        color TEXT DEFAULT '#3b82f6',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_in_team TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role TEXT NOT NULL DEFAULT 'none';`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id TEXT;`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;`;

    const userCountBefore = await sql`SELECT count(*)::int as count FROM users;`;
    console.log(`USERS COUNT BEFORE: ${userCountBefore[0]?.count}`);

    // Upsert Users
    for (const u of seedUsers) {
      await db.insert(schema.users).values(u as any).onConflictDoUpdate({
        target: schema.users.email,
        set: {
          name: u.name,
          password: u.password,
          role: u.role,
          platformRole: u.platformRole,
          title: u.title,
          avatar: u.avatar,
          teamId: u.teamId,
          updatedAt: now,
        },
      });
    }

    // Upsert Workspace
    await db.insert(schema.workspaces).values(poloWorkspace as any).onConflictDoUpdate({
      target: schema.workspaces.slug,
      set: {
        name: poloWorkspace.name,
        ownerId: poloWorkspace.ownerId,
        plan: poloWorkspace.plan,
        updatedAt: now,
      },
    });

    // Upsert Workspace Memberships
    for (const u of seedUsers) {
      const memId = `mem-${poloWorkspace.id}-${u.id}`;
      await db.insert(schema.workspaceMembers).values({
        id: memId,
        workspaceId: poloWorkspace.id,
        userId: u.id,
        role: u.role,
        joinedAt: yesterday,
      } as any).onConflictDoNothing();
    }

    // Upsert Teams
    for (const t of poloTeams) {
      await db.insert(schema.teams).values(t as any).onConflictDoNothing();
    }

    // Upsert Team Members
    const teamMembersList = [
      { id: 'tm-eng-admin', teamId: 'team-polo-eng', userId: 'usr-polo-admin', roleInTeam: 'lead', joinedAt: yesterday },
      { id: 'tm-eng-employee', teamId: 'team-polo-eng', userId: 'usr-polo-employee', roleInTeam: 'member', joinedAt: yesterday },
      { id: 'tm-design-intern', teamId: 'team-polo-design', userId: 'usr-polo-intern', roleInTeam: 'member', joinedAt: yesterday },
    ];
    for (const tm of teamMembersList) {
      await db.insert(schema.teamMembers).values(tm as any).onConflictDoNothing();
    }

    console.log('\n--- PostgreSQL Post-Insertion Telemetry ---');
    const userCountAfter = await sql`SELECT count(*)::int as count FROM users;`;
    const wsCountAfter = await sql`SELECT count(*)::int as count FROM workspaces;`;
    const teamCountAfter = await sql`SELECT count(*)::int as count FROM teams;`;

    console.log(`USERS COUNT AFTER:      ${userCountAfter[0]?.count}`);
    console.log(`WORKSPACES COUNT AFTER: ${wsCountAfter[0]?.count}`);
    console.log(`TEAMS COUNT AFTER:      ${teamCountAfter[0]?.count}`);
  } else {
    console.log('\n--- In-Memory Store Telemetry (No DATABASE_URL provided) ---');
    console.log(`USERS IN-MEMORY:      ${inMemoryDb.users.size}`);
    console.log(`WORKSPACES IN-MEMORY: ${inMemoryDb.workspaces.size}`);
    console.log(`TEAMS IN-MEMORY:      ${inMemoryDb.teams.size}`);
  }

  console.log('\n================================================================================');
  console.log(' SEED EXECUTION COMPLETE');
  console.log('================================================================================\n');

  return {
    workspace: poloWorkspace,
    users: seedUsers,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed-production.ts')) {
  seedProductionDatabase().catch(console.error);
}
