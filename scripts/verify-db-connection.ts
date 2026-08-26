import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function verifyDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  console.log('--------------------------------------------------');
  console.log('STEP 2: DATABASE CONNECTION VERIFICATION');
  console.log('--------------------------------------------------');
  console.log('DATABASE_URL present:', !!databaseUrl);
  if (!databaseUrl) {
    console.log('Connection Mode: In-Memory Database (No DATABASE_URL configured in local environment)');
    return;
  }

  try {
    const sql = neon(databaseUrl);
    const dbInfo = await sql`SELECT current_database(), current_schema(), version();`;
    console.log('Database Info:', dbInfo[0]);
    console.log('Connection Mode: Neon Serverless PostgreSQL (Direct HTTP SQL)');
    
    // Check tables in public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Tables in public schema:', tables.map((t: any) => t.table_name));

    // Check counts
    const userCount = await sql`SELECT count(*)::int as count FROM users;`;
    const wsCount = await sql`SELECT count(*)::int as count FROM workspaces;`;
    const teamCount = await sql`SELECT count(*)::int as count FROM teams;`;
    const sessionCount = await sql`SELECT count(*)::int as count FROM sessions;`;

    console.log('Row Counts:', {
      users: userCount[0]?.count,
      workspaces: wsCount[0]?.count,
      teams: teamCount[0]?.count,
      sessions: sessionCount[0]?.count,
    });
  } catch (err: any) {
    console.error('Error connecting to database:', err.message);
  }
}

verifyDatabase().catch(console.error);
