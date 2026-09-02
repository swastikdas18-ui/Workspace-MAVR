import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function migrateDepartmentId() {
  const databaseUrl = process.env.DATABASE_URL;
  console.log('================================================================================');
  console.log(' MIGRATION: ADD department_id COLUMN & FK CONSTRAINT TO PROJECTS TABLE');
  console.log('================================================================================');

  if (!databaseUrl) {
    console.log('[Migration] No DATABASE_URL set. Local environment is running in-memory mode.');
    return;
  }

  const sql = neon(databaseUrl);

  console.log('1. Adding department_id column to projects table (if missing)...');
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id TEXT NULL;`;

  console.log('2. Adding foreign key constraint to departments(id)...');
  try {
    await sql`
      ALTER TABLE projects
      ADD CONSTRAINT projects_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES departments(id)
      ON DELETE SET NULL;
    `;
    console.log('   ✓ Foreign key constraint added successfully.');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('   ✓ Foreign key constraint projects_department_id_fkey already exists.');
    } else {
      console.warn('   ⚠ Foreign key notice:', err.message);
    }
  }

  console.log('3. Updating existing projects...');
  await sql`UPDATE projects SET department_id = NULL WHERE department_id IS NULL;`;

  console.log('4. Creating index idx_projects_department_id...');
  await sql`CREATE INDEX IF NOT EXISTS idx_projects_department_id ON projects(department_id);`;

  console.log('5. Verifying columns in projects table:');
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects'
    ORDER BY column_name;
  `;
  console.log(cols.map((c: any) => `${c.column_name} (${c.data_type})`));
  console.log('\nMigration completed successfully!');
}

migrateDepartmentId().catch(console.error);
