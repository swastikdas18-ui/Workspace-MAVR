import { neon } from '@neondatabase/serverless';

/**
 * Workspace OS Startup Schema Validator
 * 
 * Verifies that the live PostgreSQL / Neon database matches the application schema requirements.
 * If any critical columns or tables are missing, it logs an explicit diagnostic report
 * and throws a clear error to prevent startup rather than returning generic 400s at runtime.
 */
export async function validateDatabaseSchema(databaseUrl?: string): Promise<{ valid: boolean; errors: string[] }> {
  const url = databaseUrl || process.env.DATABASE_URL;

  if (!url) {
    // In-memory mode (tests or local offline development)
    return { valid: true, errors: [] };
  }

  const sql = neon(url);
  const errors: string[] = [];

  try {
    // 1. Fetch all columns from information_schema
    const columnsResult = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public';
    `;

    const tableColumns = new Map<string, Set<string>>();
    columnsResult.forEach((row: any) => {
      const table = row.table_name.toLowerCase();
      const col = row.column_name.toLowerCase();
      if (!tableColumns.has(table)) {
        tableColumns.set(table, new Set());
      }
      tableColumns.get(table)!.add(col);
    });

    // 2. Define Critical Required Schema Specifications
    const requiredSchema: Record<string, string[]> = {
      projects: [
        'id',
        'title',
        'workspace_id',
        'created_by',
        'status',
        'progress',
        'due_date',
        'started_at',
        'submitted_for_review_at',
        'completed_at',
        'approved_by',
        'review_feedback',
      ],
      project_updates: ['id', 'project_id', 'user_id', 'progress', 'created_at'],
      project_teams: ['id', 'project_id', 'team_id'],
      users: ['id', 'email', 'password', 'role', 'platform_role'],
      workspaces: ['id', 'name', 'slug', 'owner_id', 'plan'],
      teams: ['id', 'name', 'workspace_id'],
      tasks: ['id', 'title', 'workspace_id', 'project_id', 'status'],
      sessions: ['id', 'user_id', 'token', 'expires_at'],
    };

    console.log('--------------------------------------------------------------------------------');
    console.log(' [Schema Validator] Running Startup PostgreSQL Schema Validation...');

    for (const [table, requiredCols] of Object.entries(requiredSchema)) {
      const existingCols = tableColumns.get(table);

      if (!existingCols) {
        errors.push(`Missing critical table: "${table}" does not exist in database.`);
        continue;
      }

      const missingCols = requiredCols.filter((col) => !existingCols.has(col));
      if (missingCols.length > 0) {
        errors.push(
          `Table "${table}" is missing required column(s): [${missingCols.join(', ')}].`
        );
      }
    }

    if (errors.length > 0) {
      console.error('================================================================================');
      console.error(' ❌ CRITICAL: POSTGRESQL SCHEMA VALIDATION FAILED ON STARTUP');
      console.error('================================================================================');
      errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
      console.error('--------------------------------------------------------------------------------');
      console.error(' Resolution: Run database migrations to apply the missing columns:');
      console.error('   npm run db:migrate');
      console.error(' Or apply the migration file directly:');
      console.error('   backend/packages/database/migrations/001_add_project_workflow_columns.sql');
      console.error('================================================================================\n');

      throw new Error(
        `[Workspace OS Schema Error] Startup aborted due to ${errors.length} schema error(s). Missing columns: ${errors.join(' | ')}`
      );
    }

    console.log(' [Schema Validator] ✅ All required tables and columns verified successfully.');
    console.log('--------------------------------------------------------------------------------');
    return { valid: true, errors: [] };
  } catch (err: any) {
    if (err.message?.includes('[Workspace OS Schema Error]')) {
      throw err;
    }
    console.warn(` [Schema Validator Notice] Could not complete validation probe: ${err.message}`);
    return { valid: false, errors: [err.message] };
  }
}
