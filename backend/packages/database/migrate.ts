import { neon } from '@neondatabase/serverless';

/**
 * Workspace OS Safe Database Migration Runner
 * Applies required relational schema structures to PostgreSQL / Neon database.
 * Uses additive, non-destructive SQL commands (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).
 */
export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('[Workspace OS Migration] No DATABASE_URL provided. Skipping remote PostgreSQL migrations.');
    return;
  }

  console.log('[Workspace OS Migration] Connecting to PostgreSQL database...');
  const sql = neon(databaseUrl);

  try {
    // 1. Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        title TEXT,
        avatar TEXT,
        team_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 2. Workspaces table
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

    // 3. Workspace Members table
    await sql`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'employee',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 4. Sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        ip_address TEXT,
        user_agent TEXT
      );
    `;

    // 5. Teams table
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

    // 6. Team Members table
    await sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_in_team TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 7. Projects table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        created_by TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'in_progress',
        progress INTEGER NOT NULL DEFAULT 0,
        start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        budget TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 8. Project Members table
    await sql`
      CREATE TABLE IF NOT EXISTS project_members (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'contributor'
      );
    `;

    // 9. Tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        assigned_to TEXT NOT NULL REFERENCES users(id),
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_learning_task BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 10. Documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL DEFAULT 'pdf',
        file_size TEXT NOT NULL DEFAULT '1.2 MB',
        owner_id TEXT NOT NULL REFERENCES users(id),
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        visibility TEXT NOT NULL DEFAULT 'team',
        category TEXT NOT NULL DEFAULT 'General',
        download_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 11. CRM Records table
    await sql`
      CREATE TABLE IF NOT EXISTS crm_records (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        company TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        deal_value INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'new_lead',
        owner_id TEXT NOT NULL REFERENCES users(id),
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        last_contacted TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 12. Optimized Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_records_owner_id ON crm_records(owner_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);`;

    console.log('[Workspace OS Migration] All PostgreSQL schemas and indexes successfully verified & applied.');
  } catch (error) {
    console.error('[Workspace OS Migration Error]', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      console.log('[Workspace OS Migration] Migration run completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Workspace OS Migration Failed]', err);
      process.exit(1);
    });
}
