import { neon } from '@neondatabase/serverless';

/**
 * Workspace OS Complete Database Migration Engine
 * 
 * Applies all relational table definitions, schema migrations, and column additions
 * to PostgreSQL / Neon database. Uses idempotent non-destructive SQL:
 * - CREATE TABLE IF NOT EXISTS
 * - ALTER TABLE ADD COLUMN IF NOT EXISTS
 * - CREATE INDEX IF NOT EXISTS
 */
export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('[Workspace OS Migration] No DATABASE_URL provided. Skipping remote PostgreSQL migrations.');
    return;
  }

  console.log('[Workspace OS Migration] Connecting to PostgreSQL database for complete schema sync...');
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
        platform_role TEXT NOT NULL DEFAULT 'none',
        title TEXT,
        avatar TEXT,
        team_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role TEXT NOT NULL DEFAULT 'none';`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;`;

    // 2. Workspaces table
    await sql`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'free',
        logo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';`;
    await sql`ALTER TABLE workspaces ALTER COLUMN plan SET DEFAULT 'free';`;
    await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo TEXT;`;

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

    // 3b. Departments table (Phase 4 People OS)
    await sql`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        head_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        parent_id TEXT,
        color TEXT DEFAULT '#7C3AED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_departments_workspace_id ON departments(workspace_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_departments_head_id ON departments(head_id);`;

    // 3c. Employee Profiles table (Phase 4 People OS)
    await sql`
      CREATE TABLE IF NOT EXISTS employee_profiles (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        designation TEXT NOT NULL DEFAULT 'Team Member',
        manager_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        joining_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        employment_type TEXT NOT NULL DEFAULT 'full_time',
        skills JSONB DEFAULT '[]'::jsonb,
        bio TEXT,
        location TEXT DEFAULT 'Remote',
        phone TEXT,
        emergency_contact TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_employee_profiles_workspace_id ON employee_profiles(workspace_id);`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_employee_profiles_department_id ON employee_profiles(department_id);`;

    // 4. Sessions table
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
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;`;
    await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;`;

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
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_department_id ON projects(department_id);`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_by TEXT REFERENCES users(id);`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id);`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS review_feedback TEXT;`;

    // 7b. Project Updates
    await sql`
      CREATE TABLE IF NOT EXISTS project_updates (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_updates_user_id ON project_updates(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON project_updates(created_at);`;

    // 8. Project Members table
    await sql`
      CREATE TABLE IF NOT EXISTS project_members (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'contributor'
      );
    `;

    // 8b. Project Teams table (Assign teams directly to projects)
    await sql`
      CREATE TABLE IF NOT EXISTS project_teams (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON project_teams(project_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_teams_team_id ON project_teams(team_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_teams_proj_team ON project_teams(project_id, team_id);`;

    // 9. Tasks table (Phase 2 Task Execution Engine)
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        story_points INTEGER DEFAULT 1,
        estimated_hours INTEGER,
        actual_hours INTEGER DEFAULT 0,
        assigned_to TEXT NOT NULL REFERENCES users(id),
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        blocked_reason TEXT,
        is_blocked BOOLEAN DEFAULT FALSE,
        is_learning_task BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 1;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id TEXT REFERENCES teams(id) ON DELETE SET NULL;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_learning_task BOOLEAN DEFAULT FALSE;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);`;

    // 9b. Task Updates (Activity Log & Audit Trail)
    await sql`
      CREATE TABLE IF NOT EXISTS task_updates (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT,
        comment TEXT,
        metadata TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON task_updates(task_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_task_updates_user_id ON task_updates(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_task_updates_created_at ON task_updates(created_at);`;

    // 10. Documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL DEFAULT 'pdf',
        file_size TEXT NOT NULL DEFAULT '1.2 MB',
        file_size_bytes INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT NOT NULL DEFAULT 'application/pdf',
        storage_key TEXT,
        storage_url TEXT,
        r2_key TEXT,
        r2_url TEXT,
        owner_id TEXT NOT NULL REFERENCES users(id),
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        visibility TEXT NOT NULL DEFAULT 'workspace',
        category TEXT NOT NULL DEFAULT 'General',
        download_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;`;
    await sql`ALTER TABLE documents ALTER COLUMN visibility SET DEFAULT 'workspace';`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_department_id ON documents(department_id);`;
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER NOT NULL DEFAULT 0;`;
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT 'application/pdf';`;
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_key TEXT;`;
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_url TEXT;`;
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS r2_key TEXT;`;
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS r2_url TEXT;`;

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

    // 12. Workspace Invites table
    await sql`
      CREATE TABLE IF NOT EXISTS workspace_invites (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        token TEXT NOT NULL UNIQUE,
        invited_by TEXT NOT NULL REFERENCES users(id),
        team_id TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        accepted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 13. Task Comments table
    await sql`
      CREATE TABLE IF NOT EXISTS task_comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 14. Notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 15. Activity Logs table
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 16. Audit Logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 17. Automation Rules table
    await sql`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        entity_type TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_config JSONB DEFAULT '{}'::jsonb,
        conditions JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        execution_count INTEGER NOT NULL DEFAULT 0,
        last_executed_at TIMESTAMP WITH TIME ZONE,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 18. Automation Actions table
    await sql`
      CREATE TABLE IF NOT EXISTS automation_actions (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL,
        action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        execution_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 19. Automation Executions table
    await sql`
      CREATE TABLE IF NOT EXISTS automation_executions (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        execution_result JSONB DEFAULT '{}'::jsonb,
        error_message TEXT,
        duration_ms INTEGER DEFAULT 0,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 20. User Presence table
    await sql`
      CREATE TABLE IF NOT EXISTS user_presence (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'offline',
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        connected_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `;

    // 21. Subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        billing_cycle TEXT NOT NULL DEFAULT 'monthly',
        seats INTEGER NOT NULL DEFAULT 5,
        price_per_month INTEGER NOT NULL DEFAULT 0,
        current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 22. Usage Metrics table
    await sql`
      CREATE TABLE IF NOT EXISTS usage_metrics (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        members_count INTEGER NOT NULL DEFAULT 1,
        projects_count INTEGER NOT NULL DEFAULT 0,
        storage_bytes BIGINT NOT NULL DEFAULT 0,
        api_requests_count INTEGER NOT NULL DEFAULT 0,
        automations_count INTEGER NOT NULL DEFAULT 0,
        active_users_count INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 23. Invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        status TEXT NOT NULL DEFAULT 'paid',
        invoice_number TEXT NOT NULL,
        pdf_url TEXT,
        period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 24. Wiki Pages table
    await sql`
      CREATE TABLE IF NOT EXISTS wiki_pages (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        parent_id TEXT,
        title TEXT NOT NULL DEFAULT 'Untitled Page',
        icon TEXT DEFAULT '📄',
        cover_image TEXT,
        slug TEXT NOT NULL,
        content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        visibility TEXT NOT NULL DEFAULT 'workspace',
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    await sql`ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;`;
    await sql`ALTER TABLE wiki_pages ALTER COLUMN visibility SET DEFAULT 'workspace';`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_pages_department_id ON wiki_pages(department_id);`;

    // 25. Wiki Page Versions
    await sql`
      CREATE TABLE IF NOT EXISTS wiki_page_versions (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        content_snapshot JSONB NOT NULL,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 26. Wiki Comments
    await sql`
      CREATE TABLE IF NOT EXISTS wiki_comments (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        block_id TEXT,
        comment TEXT NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 27. Task Time Entries
    await sql`
      CREATE TABLE IF NOT EXISTS task_time_entries (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        billable BOOLEAN NOT NULL DEFAULT TRUE,
        hourly_rate INTEGER NOT NULL DEFAULT 1500,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 28. Guest Users
    await sql`
      CREATE TABLE IF NOT EXISTS guest_users (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        magic_token TEXT NOT NULL UNIQUE,
        token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        last_active_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 29. Guest Permissions
    await sql`
      CREATE TABLE IF NOT EXISTS guest_permissions (
        id TEXT PRIMARY KEY,
        guest_id TEXT NOT NULL REFERENCES guest_users(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        can_approve BOOLEAN NOT NULL DEFAULT TRUE,
        can_comment BOOLEAN NOT NULL DEFAULT TRUE,
        can_download BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 30. Deliverable Approvals
    await sql`
      CREATE TABLE IF NOT EXISTS deliverable_approvals (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        guest_id TEXT NOT NULL REFERENCES guest_users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        feedback TEXT,
        signature_hash TEXT,
        signed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 31. Email Connections
    await sql`
      CREATE TABLE IF NOT EXISTS email_connections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL DEFAULT 'google',
        email_address TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 32. Calendar Events
    await sql`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        crm_record_id TEXT REFERENCES crm_records(id) ON DELETE SET NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        meeting_url TEXT,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 33. Billing Customers (Razorpay)
    await sql`
      CREATE TABLE IF NOT EXISTS billing_customers (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        razorpay_customer_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        contact TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 34. Billing Subscriptions (Razorpay)
    await sql`
      CREATE TABLE IF NOT EXISTS billing_subscriptions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        razorpay_subscription_id TEXT NOT NULL UNIQUE,
        razorpay_plan_id TEXT NOT NULL,
        plan_tier TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        charge_at TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 35. Billing Payments (Razorpay)
    await sql`
      CREATE TABLE IF NOT EXISTS billing_payments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        razorpay_payment_id TEXT NOT NULL UNIQUE,
        razorpay_order_id TEXT,
        razorpay_subscription_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL,
        method TEXT,
        error_description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 36. Billing Webhooks
    await sql`
      CREATE TABLE IF NOT EXISTS billing_webhooks (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL UNIQUE,
        event TEXT NOT NULL,
        payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'processed',
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 37. Task Recurrence Rules
    await sql`
      CREATE TABLE IF NOT EXISTS task_recurrence_rules (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        frequency TEXT NOT NULL,
        interval INTEGER NOT NULL DEFAULT 1,
        next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
        paused BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 38. Task Assignees
    await sql`
      CREATE TABLE IF NOT EXISTS task_assignees (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 39. Task Dependencies
    await sql`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'finish_to_start',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 40. Custom CRM Pipelines
    await sql`
      CREATE TABLE IF NOT EXISTS crm_pipelines (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 41. Custom CRM Pipeline Stages
    await sql`
      CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
        id TEXT PRIMARY KEY,
        pipeline_id TEXT NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#3B82F6',
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 42. API Keys
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        prefix TEXT NOT NULL,
        scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 43. Webhooks
    await sql`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        events JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 44. Webhook Deliveries
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event TEXT NOT NULL,
        payload JSONB NOT NULL,
        response_code INTEGER,
        response_body TEXT,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 1,
        delivered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 45. Product Analytics Events (Phase 21A)
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        event_name TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 46. Onboarding State (Phase 21B)
    await sql`
      CREATE TABLE IF NOT EXISTS onboarding_state (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        completed_steps JSONB DEFAULT '[]'::jsonb,
        dismissed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 47. Notification Preferences (Phase 21C)
    await sql`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email_digest BOOLEAN NOT NULL DEFAULT TRUE,
        task_assigned BOOLEAN NOT NULL DEFAULT TRUE,
        task_due BOOLEAN NOT NULL DEFAULT TRUE,
        task_completed BOOLEAN NOT NULL DEFAULT TRUE,
        project_updated BOOLEAN NOT NULL DEFAULT TRUE,
        document_mention BOOLEAN NOT NULL DEFAULT TRUE,
        crm_stage_changed BOOLEAN NOT NULL DEFAULT TRUE,
        automation_executed BOOLEAN NOT NULL DEFAULT TRUE,
        invoice_paid BOOLEAN NOT NULL DEFAULT TRUE,
        workspace_invite BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 48. Beta Feedback (Phase 22)
    await sql`
      CREATE TABLE IF NOT EXISTS beta_feedback (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        category TEXT NOT NULL DEFAULT 'bug',
        severity TEXT NOT NULL DEFAULT 'p2_major',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        screenshot_url TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        founder_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 49. Customer Success Profiles (Phase 22)
    await sql`
      CREATE TABLE IF NOT EXISTS customer_success_profiles (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        company_name TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'closed_beta',
        health_score INTEGER NOT NULL DEFAULT 100,
        onboarding_status TEXT NOT NULL DEFAULT 'in_progress',
        total_users INTEGER NOT NULL DEFAULT 1,
        active_users_7d INTEGER NOT NULL DEFAULT 1,
        tasks_completed_7d INTEGER NOT NULL DEFAULT 0,
        open_tickets_count INTEGER NOT NULL DEFAULT 0,
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        notes TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 50. NPS Surveys (Phase 23)
    await sql`
      CREATE TABLE IF NOT EXISTS nps_surveys (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        score INTEGER NOT NULL,
        comment TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 51. Backup Reports
    await sql`
      CREATE TABLE IF NOT EXISTS backup_reports (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        verification_status TEXT NOT NULL DEFAULT 'unverified',
        verification_details JSONB DEFAULT '{}'::jsonb,
        duration_ms INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // 52. Email Health Metrics
    await sql`
      CREATE TABLE IF NOT EXISTS email_health_metrics (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        email_id TEXT NOT NULL,
        recipient TEXT NOT NULL,
        event_type TEXT NOT NULL,
        bounce_type TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    // Apply Required Unique Constraints and Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_platform_role ON users(platform_role);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_crm_records_owner_id ON crm_records(owner_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_automation_rules_workspace ON automation_rules(workspace_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_automation_actions_rule ON automation_actions(rule_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_presence_user_workspace ON user_presence(user_id, workspace_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_backup_reports_status ON backup_reports(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_ws ON beta_feedback(workspace_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_nps_ws ON nps_surveys(workspace_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_ws ON events(workspace_id);`;

    console.log('[Workspace OS Migration] ✅ All 52 relational tables, indexes, and missing column migrations verified and applied successfully.');
  } catch (err: any) {
    console.error('[Workspace OS Migration] ❌ Migration failed:', err.message);
    throw err;
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
