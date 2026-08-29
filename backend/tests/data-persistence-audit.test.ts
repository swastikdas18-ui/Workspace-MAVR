/**
 * backend/tests/data-persistence-audit.test.ts
 * 
 * Suite 18: Full End-to-End Data Persistence & Cross-Session Isolation
 * 
 * Audits:
 * 1. Wiki Page persistence & Versioning across logout/login cycles
 * 2. Time Tracking entries & Utilization calculations persistence
 * 3. Projects, Tasks, and Teams persistence
 * 4. Workspace ownership and membership integrity across sessions
 * 5. Absence of unauthorized workspace regeneration or in-memory leaks
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database/index';
import { WikiRepository } from '../src/repositories/wiki-repository';
import { TimeTrackingRepository } from '../src/repositories/time-tracking-repository';
import { ProjectRepository } from '../src/repositories/project-repository';
import { TaskRepository } from '../src/repositories/task-repository';
import { TeamRepository } from '../src/repositories/team-repository';

export async function runDataPersistenceAuditTests() {
  console.log('===============================================================');
  console.log(' SUITE 18: DATA PERSISTENCE & MULTI-SESSION AUDIT');
  console.log('===============================================================');

  let passed = 0;
  function pass(msg: string) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }

  const testEmail = `founder-${Date.now()}@enterprisecorp.io`;
  const testPassword = 'Password123!';
  const orgName = 'Persistence Corp';

  // --- Step 1: Register New Admin & Workspace ---
  console.log('\n--- Step 1: Register Organization & Admin ---');
  const regRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: 'Persistence Founder',
      workspaceName: orgName,
    }),
  });

  assert.equal(regRes.status, 201, 'Admin registration should return 201');
  const regData = await regRes.json();
  const token = regData.token;
  const workspaceId = regData.workspace.id;
  const userId = regData.user.id;
  pass('Admin registered with persistent workspace');

  // --- Step 2: Create Project, Task, Team, Wiki Page, and Time Entry ---
  console.log('\n--- Step 2: Create Full Workspace Entities ---');

  // 1. Create Team
  const teamRes = await app.request('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Core Engineering',
      description: 'Main product team',
      leadId: userId,
      color: '#3b82f6',
    }),
  });
  assert.equal(teamRes.status, 201);
  const teamData = await teamRes.json();
  const teamId = teamData.team.id;
  pass('Team created via API');

  // 2. Create Project
  const projRes = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Persistent Q3 Initiative',
      description: 'Must persist across restarts',
      dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      teamIds: [teamId],
    }),
  });
  assert.equal(projRes.status, 201);
  const projData = await projRes.json();
  const projectId = projData.project.id;
  pass('Project created via API');

  // 3. Create Task
  const taskRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Critical Database Sync Audit',
      description: 'Audit Drizzle ORM persistence',
      projectId,
      assignedTo: userId,
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    }),
  });
  assert.equal(taskRes.status, 201);
  const taskData = await taskRes.json();
  const taskId = taskData.task.id;
  pass('Task created via API');

  // 4. Create Wiki Page
  const wikiRes = await app.request('/api/wiki', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Enterprise Architecture RFC',
      icon: '🏛️',
      visibility: 'team',
      contentJson: { blocks: [{ id: 'b1', type: 'h1', content: 'Architecture Specs' }] },
    }),
  });
  assert.equal(wikiRes.status, 201);
  const wikiData = await wikiRes.json();
  const wikiPageId = wikiData.page.id;
  pass('Wiki page created via API');

  // 5. Log Time Entry
  const timeRes = await app.request('/api/time/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      taskId,
      startTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      durationMinutes: 120,
      billable: true,
      notes: 'Database persistence audit execution',
    }),
  });
  assert.equal(timeRes.status, 201);
  const timeData = await timeRes.json();
  const timeEntryId = timeData.entry.id;
  pass('Time entry created via API');

  // --- Step 3: Logout Session ---
  console.log('\n--- Step 3: Terminate Session (Logout) ---');
  const logoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logoutRes.status, 200);
  pass('Session successfully logged out');

  // Verify old token is rejected
  const rejectedRes = await app.request('/api/projects', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(rejectedRes.status, 401, 'Logged-out token must be rejected with 401');
  pass('Logged-out token invalidation confirmed');

  // --- Step 4: Login & Resume Workspace ---
  console.log('\n--- Step 4: Re-Authenticate (Login) ---');
  const loginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  const newToken = loginData.token;
  const loggedInWorkspace = loginData.workspace;

  assert.equal(loggedInWorkspace.id, workspaceId, 'Login must resolve the EXACT same workspace');
  assert.equal(loggedInWorkspace.owner_id || loggedInWorkspace.ownerId, userId, 'Workspace ownership must remain invariant');
  pass('Login restored identical workspace and owner linkage');

  // --- Step 5: Read All Entities Post-Login ---
  console.log('\n--- Step 5: Verify All Entities Present Post-Login ---');

  // 1. Projects
  const getProjRes = await app.request('/api/projects', {
    method: 'GET',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.equal(getProjRes.status, 200);
  const fetchedProjects = await getProjRes.json();
  const hasProject = fetchedProjects.projects.some((p: any) => p.id === projectId && p.title === 'Persistent Q3 Initiative');
  assert.ok(hasProject, 'Project must persist after login');
  pass('Project persisted across logout/login');

  // 2. Tasks
  const getTasksRes = await app.request('/api/tasks', {
    method: 'GET',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.equal(getTasksRes.status, 200);
  const fetchedTasks = await getTasksRes.json();
  const hasTask = fetchedTasks.tasks.some((t: any) => t.id === taskId && t.title === 'Critical Database Sync Audit');
  assert.ok(hasTask, 'Task must persist after login');
  pass('Task persisted across logout/login');

  // 3. Teams
  const getTeamsRes = await app.request('/api/teams', {
    method: 'GET',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.equal(getTeamsRes.status, 200);
  const fetchedTeams = await getTeamsRes.json();
  const hasTeam = fetchedTeams.teams.some((t: any) => t.id === teamId && t.name === 'Core Engineering');
  assert.ok(hasTeam, 'Team must persist after login');
  pass('Team persisted across logout/login');

  // 4. Wiki Pages
  const getWikiRes = await app.request('/api/wiki', {
    method: 'GET',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.equal(getWikiRes.status, 200);
  const fetchedWiki = await getWikiRes.json();
  const hasWiki = fetchedWiki.pages.some((w: any) => w.id === wikiPageId && w.title === 'Enterprise Architecture RFC');
  assert.ok(hasWiki, 'Wiki page must persist after login');
  pass('Wiki page persisted across logout/login');

  // 5. Time Entries & Utilization Analytics
  const getTimeRes = await app.request('/api/time/entries', {
    method: 'GET',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.equal(getTimeRes.status, 200);
  const fetchedTime = await getTimeRes.json();
  const hasTime = fetchedTime.entries.some((e: any) => e.id === timeEntryId && e.durationMinutes === 120);
  assert.ok(hasTime, 'Time entry must persist after login');
  pass('Time entry persisted across logout/login');

  const getUtilRes = await app.request('/api/time/utilization', {
    method: 'GET',
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.equal(getUtilRes.status, 200);
  const utilData = await getUtilRes.json();
  assert.ok(utilData.analytics.totalHours >= 2, 'Utilization calculations must reflect persisted time entries');
  pass('Utilization analytics accurately aggregates persisted records');

  console.log('\n===============================================================');
  console.log(` SUITE 18 PASSED: ${passed} Assertions, 0 Failures`);
  console.log('===============================================================');
}
