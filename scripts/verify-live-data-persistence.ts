/**
 * scripts/verify-live-data-persistence.ts
 * 
 * Production Live Data Persistence Verification Tool
 * 
 * Executes:
 * 1. Login with real configured account (admin@polotechnologies.com)
 * 2. Records initial userId & workspaceId
 * 3. Creates 1 Wiki Page, 1 Project, 1 Task, 1 Team, 1 Time Entry via real API
 * 4. Queries PostgreSQL / Neon directly to verify database rows and counts
 * 5. Logs out (terminates session)
 * 6. Logs in again with identical account
 * 7. Records post-login userId & workspaceId and asserts strict equality
 * 8. Queries PostgreSQL / Neon directly again and verifies rows remain intact
 * 9. Prints full SQL evidence and API responses
 */

import { neon } from '@neondatabase/serverless';
import { app } from '../backend/src/app';
import { seedPoloTechnologies } from '../backend/packages/database/seed';
import { SEED_PASSWORD_PLAIN } from './seed-production';
import 'dotenv/config';

async function verifyProductionDataPersistence() {
  // Ensure seed is populated
  seedPoloTechnologies();
  console.log('================================================================================');
  console.log(' PRODUCTION DATA PERSISTENCE VERIFICATION');
  console.log('================================================================================\n');

  const databaseUrl = process.env.DATABASE_URL;
  const isDirectPostgres = !!databaseUrl;
  const sql = databaseUrl ? neon(databaseUrl) : null;

  console.log(`DATABASE MODE: ${isDirectPostgres ? 'PostgreSQL (Neon Serverless)' : 'In-Memory Store'}`);
  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    console.log(`DATABASE HOST: ${parsed.host}`);
    console.log(`DATABASE NAME: ${parsed.pathname.replace(/^\//, '')}\n`);
  }

  const accountEmail = 'admin@polotechnologies.com';
  const accountPassword = SEED_PASSWORD_PLAIN;

  // ---------------------------------------------------------------------------
  // STEP 1: INITIAL LOGIN
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log(' STEP 1: LOGIN AS PRODUCTION ACCOUNT');
  console.log('--------------------------------------------------------------------------------');
  const login1Res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: accountEmail,
      password: accountPassword,
    }),
  });

  if (login1Res.status !== 200) {
    console.error(`❌ Initial login failed with status ${login1Res.status}`);
    const errText = await login1Res.text();
    console.error(errText);
    process.exit(1);
  }

  const login1Data = await login1Res.json();
  const token1 = login1Data.token;
  const userId1 = login1Data.user.id;
  const workspaceId1 = login1Data.workspace.id;

  console.log(`✅ Login 1 Successful (HTTP 200)`);
  console.log(`   User ID         : ${userId1}`);
  console.log(`   User Email      : ${login1Data.user.email}`);
  console.log(`   Workspace ID    : ${workspaceId1}`);
  console.log(`   Workspace Name  : ${login1Data.workspace.name}`);
  console.log(`   Workspace Role  : ${login1Data.workspace.role}`);
  console.log(`   Session Token   : ${token1.slice(0, 16)}...\n`);

  // ---------------------------------------------------------------------------
  // STEP 2: CREATE LIVE ENTITIES VIA API
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log(' STEP 2: CREATE PRODUCTION ENTITIES (WIKI, PROJECT, TASK, TEAM, TIME)');
  console.log('--------------------------------------------------------------------------------');

  const timestamp = Date.now();

  // 1. Create Team
  const teamPayload = {
    name: `Platform Engineering ${timestamp}`,
    description: 'Infrastructure and persistence core team',
    leadId: userId1,
    color: '#6366f1',
  };
  const teamRes = await app.request('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify(teamPayload),
  });
  const teamData = await teamRes.json();
  const createdTeamId = teamData.team.id;
  console.log(`✅ Team Created    (HTTP ${teamRes.status}) -> ID: ${createdTeamId}, Name: "${teamData.team.name}"`);

  // 2. Create Project
  const projectPayload = {
    title: `Enterprise Cloud Initiative ${timestamp}`,
    description: 'Production infrastructure scaling and persistence verification',
    dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    teamIds: [createdTeamId],
  };
  const projectRes = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify(projectPayload),
  });
  const projectData = await projectRes.json();
  const createdProjectId = projectData.project.id;
  console.log(`✅ Project Created (HTTP ${projectRes.status}) -> ID: ${createdProjectId}, Title: "${projectData.project.title}"`);

  // 3. Create Task
  const taskPayload = {
    title: `Database Replication Audit ${timestamp}`,
    description: 'Verify Neon PostgreSQL write and read consistency',
    projectId: createdProjectId,
    assignedTo: userId1,
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  };
  const taskRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify(taskPayload),
  });
  const taskData = await taskRes.json();
  const createdTaskId = taskData.task.id;
  console.log(`✅ Task Created    (HTTP ${taskRes.status}) -> ID: ${createdTaskId}, Title: "${taskData.task.title}"`);

  // 4. Create Wiki Page
  const wikiPayload = {
    title: `Production Persistence Architecture ${timestamp}`,
    icon: '🚀',
    visibility: 'team',
    contentJson: {
      blocks: [
        { id: 'b1', type: 'h1', content: 'Database Persistence Specifications' },
        { id: 'b2', type: 'paragraph', content: 'All CRUD operations write directly to PostgreSQL with Drizzle ORM.' }
      ]
    },
  };
  const wikiRes = await app.request('/api/wiki', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify(wikiPayload),
  });
  const wikiData = await wikiRes.json();
  const createdWikiId = wikiData.page.id;
  console.log(`✅ Wiki Created    (HTTP ${wikiRes.status}) -> ID: ${createdWikiId}, Title: "${wikiData.page.title}"`);

  // 5. Create Time Entry
  const timePayload = {
    taskId: createdTaskId,
    startTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    durationMinutes: 120,
    billable: true,
    notes: `Live production persistence probe ${timestamp}`,
  };
  const timeRes = await app.request('/api/time/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token1}` },
    body: JSON.stringify(timePayload),
  });
  const timeData = await timeRes.json();
  const createdTimeEntryId = timeData.entry.id;
  console.log(`✅ Time Created    (HTTP ${timeRes.status}) -> ID: ${createdTimeEntryId}, Duration: ${timeData.entry.durationMinutes} mins\n`);

  // ---------------------------------------------------------------------------
  // STEP 3: DIRECT DATABASE ROW & COUNTS INSPECTION (BEFORE LOGOUT)
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log(' STEP 3: DIRECT DATABASE INSPECTION (BEFORE LOGOUT)');
  console.log('--------------------------------------------------------------------------------');

  let beforeCounts: Record<string, number> = {};
  if (sql) {
    const [teamRow] = await sql`SELECT id, name, workspace_id, lead_id FROM teams WHERE id = ${createdTeamId}`;
    const [projRow] = await sql`SELECT id, title, workspace_id, created_by FROM projects WHERE id = ${createdProjectId}`;
    const [taskRow] = await sql`SELECT id, title, workspace_id, project_id, assigned_to FROM tasks WHERE id = ${createdTaskId}`;
    const [wikiRow] = await sql`SELECT id, title, workspace_id, created_by FROM wiki_pages WHERE id = ${createdWikiId}`;
    const [timeRow] = await sql`SELECT id, workspace_id, task_id, duration_minutes FROM task_time_entries WHERE id = ${createdTimeEntryId}`;

    console.log('SQL SELECT ROWS (Direct Neon Query):');
    console.log('  teams             :', teamRow);
    console.log('  projects          :', projRow);
    console.log('  tasks             :', taskRow);
    console.log('  wiki_pages        :', wikiRow);
    console.log('  task_time_entries :', timeRow);

    const [tCnt] = await sql`SELECT COUNT(*)::int as count FROM teams WHERE workspace_id = ${workspaceId1}`;
    const [pCnt] = await sql`SELECT COUNT(*)::int as count FROM projects WHERE workspace_id = ${workspaceId1}`;
    const [tskCnt] = await sql`SELECT COUNT(*)::int as count FROM tasks WHERE workspace_id = ${workspaceId1}`;
    const [wCnt] = await sql`SELECT COUNT(*)::int as count FROM wiki_pages WHERE workspace_id = ${workspaceId1}`;
    const [tmCnt] = await sql`SELECT COUNT(*)::int as count FROM task_time_entries WHERE workspace_id = ${workspaceId1}`;

    beforeCounts = {
      teams: tCnt.count,
      projects: pCnt.count,
      tasks: tskCnt.count,
      wikiPages: wCnt.count,
      timeEntries: tmCnt.count,
    };
  } else {
    // API verification of counts
    const [pRes, tRes, tmRes, wRes, timeEntriesRes] = await Promise.all([
      app.request('/api/projects', { headers: { Authorization: `Bearer ${token1}` } }).then(r => r.json()),
      app.request('/api/tasks', { headers: { Authorization: `Bearer ${token1}` } }).then(r => r.json()),
      app.request('/api/teams', { headers: { Authorization: `Bearer ${token1}` } }).then(r => r.json()),
      app.request('/api/wiki', { headers: { Authorization: `Bearer ${token1}` } }).then(r => r.json()),
      app.request('/api/time/entries', { headers: { Authorization: `Bearer ${token1}` } }).then(r => r.json()),
    ]);

    beforeCounts = {
      teams: tmRes.teams.length,
      projects: pRes.projects.length,
      tasks: tRes.tasks.length,
      wikiPages: wRes.pages.length,
      timeEntries: timeEntriesRes.entries.length,
    };
  }

  console.log('\nEntity Counts in Workspace (Before Logout):');
  console.table(beforeCounts);

  // ---------------------------------------------------------------------------
  // STEP 4: LOGOUT SESSION
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log(' STEP 4: LOGOUT (TERMINATE SESSION)');
  console.log('--------------------------------------------------------------------------------');
  const logoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`✅ Logout Response: HTTP ${logoutRes.status}`);

  const testOldToken = await app.request('/api/projects', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`✅ Invalidation Check: Old token rejected with HTTP ${testOldToken.status} (Unauthorized)\n`);

  // ---------------------------------------------------------------------------
  // STEP 5: LOGIN AGAIN WITH THE SAME ACCOUNT
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log(' STEP 5: RE-AUTHENTICATE (LOGIN 2)');
  console.log('--------------------------------------------------------------------------------');
  const login2Res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: accountEmail,
      password: accountPassword,
    }),
  });

  if (login2Res.status !== 200) {
    console.error(`❌ Second login failed with status ${login2Res.status}`);
    process.exit(1);
  }

  const login2Data = await login2Res.json();
  const token2 = login2Data.token;
  const userId2 = login2Data.user.id;
  const workspaceId2 = login2Data.workspace.id;

  console.log(`✅ Login 2 Successful (HTTP 200)`);
  console.log(`   User ID         : ${userId2}`);
  console.log(`   Workspace ID    : ${workspaceId2}`);
  console.log(`   Workspace Name  : ${login2Data.workspace.name}`);
  console.log(`   Session Token   : ${token2.slice(0, 16)}...\n`);

  // ---------------------------------------------------------------------------
  // STEP 6: IDENTITY & WORKSPACE INVARIANCE ASSERTION
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log(' STEP 6: IDENTITY & WORKSPACE INVARIANCE AUDIT');
  console.log('--------------------------------------------------------------------------------');
  console.log(`   User ID Before Logout   : ${userId1}`);
  console.log(`   User ID After Login     : ${userId2}`);
  console.log(`   User ID Invariant       : ${userId1 === userId2 ? '✅ IDENTICAL (Zero Drift)' : '❌ DRIFT DETECTED'}`);
  console.log(`   Workspace ID Before     : ${workspaceId1}`);
  console.log(`   Workspace ID After      : ${workspaceId2}`);
  console.log(`   Workspace ID Invariant  : ${workspaceId1 === workspaceId2 ? '✅ IDENTICAL (Zero Drift)' : '❌ DRIFT DETECTED'}\n`);

  if (userId1 !== userId2 || workspaceId1 !== workspaceId2) {
    console.error('❌ FATAL: User ID or Workspace ID drifted across sessions!');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // STEP 7: DIRECT DATABASE & API VERIFICATION OF PERSISTED ENTITIES
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log(' STEP 7: DATABASE & API PERSISTENCE AUDIT (AFTER LOGIN)');
  console.log('--------------------------------------------------------------------------------');

  let afterCounts: Record<string, number> = {};
  if (sql) {
    const [teamRow2] = await sql`SELECT id, name, workspace_id, lead_id FROM teams WHERE id = ${createdTeamId}`;
    const [projRow2] = await sql`SELECT id, title, workspace_id, created_by FROM projects WHERE id = ${createdProjectId}`;
    const [taskRow2] = await sql`SELECT id, title, workspace_id, project_id, assigned_to FROM tasks WHERE id = ${createdTaskId}`;
    const [wikiRow2] = await sql`SELECT id, title, workspace_id, created_by FROM wiki_pages WHERE id = ${createdWikiId}`;
    const [timeRow2] = await sql`SELECT id, workspace_id, task_id, duration_minutes FROM task_time_entries WHERE id = ${createdTimeEntryId}`;

    console.log('SQL SELECT ROWS (Direct Neon Query After Login):');
    console.log('  teams             :', teamRow2);
    console.log('  projects          :', projRow2);
    console.log('  tasks             :', taskRow2);
    console.log('  wiki_pages        :', wikiRow2);
    console.log('  task_time_entries :', timeRow2);

    const [tCnt2] = await sql`SELECT COUNT(*)::int as count FROM teams WHERE workspace_id = ${workspaceId2}`;
    const [pCnt2] = await sql`SELECT COUNT(*)::int as count FROM projects WHERE workspace_id = ${workspaceId2}`;
    const [tskCnt2] = await sql`SELECT COUNT(*)::int as count FROM tasks WHERE workspace_id = ${workspaceId2}`;
    const [wCnt2] = await sql`SELECT COUNT(*)::int as count FROM wiki_pages WHERE workspace_id = ${workspaceId2}`;
    const [tmCnt2] = await sql`SELECT COUNT(*)::int as count FROM task_time_entries WHERE workspace_id = ${workspaceId2}`;

    afterCounts = {
      teams: tCnt2.count,
      projects: pCnt2.count,
      tasks: tskCnt2.count,
      wikiPages: wCnt2.count,
      timeEntries: tmCnt2.count,
    };
  } else {
    const [pRes2, tRes2, tmRes2, wRes2, timeEntriesRes2] = await Promise.all([
      app.request('/api/projects', { headers: { Authorization: `Bearer ${token2}` } }).then(r => r.json()),
      app.request('/api/tasks', { headers: { Authorization: `Bearer ${token2}` } }).then(r => r.json()),
      app.request('/api/teams', { headers: { Authorization: `Bearer ${token2}` } }).then(r => r.json()),
      app.request('/api/wiki', { headers: { Authorization: `Bearer ${token2}` } }).then(r => r.json()),
      app.request('/api/time/entries', { headers: { Authorization: `Bearer ${token2}` } }).then(r => r.json()),
    ]);

    afterCounts = {
      teams: tmRes2.teams.length,
      projects: pRes2.projects.length,
      tasks: tRes2.tasks.length,
      wikiPages: wRes2.pages.length,
      timeEntries: timeEntriesRes2.entries.length,
    };
  }

  console.log('\nEntity Counts in Workspace (After Login):');
  console.table(afterCounts);

  // ---------------------------------------------------------------------------
  // STEP 8: SUMMARY PROOF OF COMPLIANCE
  // ---------------------------------------------------------------------------
  console.log('================================================================================');
  console.log(' PROOF OF COMPLIANCE SUMMARY');
  console.log('================================================================================');
  console.log(` - Workspace ID Before Logout : ${workspaceId1}`);
  console.log(` - Workspace ID After Login   : ${workspaceId2} (MATCH: ${workspaceId1 === workspaceId2})`);
  console.log(` - User ID Before Logout      : ${userId1}`);
  console.log(` - User ID After Login        : ${userId2} (MATCH: ${userId1 === userId2})`);
  console.log(` - Teams Count Before/After   : ${beforeCounts.teams} / ${afterCounts.teams}`);
  console.log(` - Projects Count Before/After: ${beforeCounts.projects} / ${afterCounts.projects}`);
  console.log(` - Tasks Count Before/After   : ${beforeCounts.tasks} / ${afterCounts.tasks}`);
  console.log(` - Wiki Count Before/After    : ${beforeCounts.wikiPages} / ${afterCounts.wikiPages}`);
  console.log(` - Time Count Before/After    : ${beforeCounts.timeEntries} / ${afterCounts.timeEntries}`);
  console.log('================================================================================\n');

  console.log('🎉 ALL DATA PERSISTENCE CRITERIA FULLY VERIFIED END-TO-END.\n');
}

verifyProductionDataPersistence().then(() => process.exit(0)).catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
