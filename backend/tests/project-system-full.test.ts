/**
 * backend/tests/project-system-full.test.ts
 * 
 * Suite 21: Project System Full Integration & Production Fixes
 * 
 * Fixes Verified:
 * 1. Bug #1: Project creation with assigned team (no project_teams error, persists across refresh)
 * 2. Bug #2: Kanban board status transitions (planning, in_progress, review, completed)
 * 3. Bug #3: Employee in assigned team can view & update projects assigned through projects -> project_teams -> team_members
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database/index.js';

export async function runProjectSystemFullTests() {
  console.log('===============================================================');
  console.log(' SUITE 21: PROJECT SYSTEM FULL INTEGRATION (BUGS 1, 2, 3)');
  console.log('===============================================================');

  let passed = 0;
  function pass(msg: string) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }

  inMemoryDb.reset();
  const nonce = Date.now();
  const adminEmail = `admin-proj-${nonce}@apex.io`;
  const employeeEmail = `emp-proj-${nonce}@apex.io`;
  const password = 'Password123!';

  // --- 1. Register Workspace Owner / Admin ---
  const regRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Initiative Admin',
      email: adminEmail,
      password,
      workspaceName: 'APEX CORP',
    }),
  });
  assert.equal(regRes.status, 201, 'Admin registration should succeed (HTTP 201)');
  const regData = await regRes.json();
  const adminToken = regData.token;
  const workspaceId = regData.workspace.id;
  const adminId = regData.user.id;
  pass('Admin registered and workspace APEX CORP created');

  // --- 2. Create Team A ---
  const teamRes = await app.request('/api/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Platform Engineering',
      description: 'Core platform and distributed systems',
      color: '#3B82F6',
      lead_id: adminId,
    }),
  });
  assert.equal(teamRes.status, 201, 'Team creation should succeed');
  const teamData = await teamRes.json();
  const teamId = teamData.team.id;
  assert.ok(teamId, 'Team ID must be returned');
  pass(`Team created with ID ${teamId}`);

  // --- 3. Invite & Register Employee ---
  const invRes = await app.request('/api/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      email: employeeEmail,
      role: 'employee',
    }),
  });
  assert.equal(invRes.status, 201, 'Invite creation should succeed');
  const invData = await invRes.json();
  const inviteToken = invData.invite.token;

  const acceptRes = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteToken,
      name: 'Platform Employee',
      password,
    }),
  });
  assert.equal(acceptRes.status, 200, 'Invite acceptance should succeed');

  const empLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: employeeEmail,
      password,
    }),
  });
  assert.equal(empLoginRes.status, 200, 'Employee login should succeed');
  const empLoginData = await empLoginRes.json();
  const employeeToken = empLoginData.token;
  const employeeId = empLoginData.user.id;
  pass('Employee invited and authenticated');

  // --- 4. Add Employee to Team A ---
  const addMemRes = await app.request(`/api/teams/${teamId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      memberIds: [employeeId],
    }),
  });
  assert.equal(addMemRes.status, 200, 'Add employee to team should succeed');
  pass('Employee assigned to Platform Engineering team');

  // --- 5. Bug #1 Fix: Admin creates project with assigned team without throwing project_teams error ---
  const projRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Kubernetes Multi-Cluster Deployment',
      description: 'Scale microservices globally across multi-region clusters',
      status: 'planning',
      startDate: new Date().toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
      budget: '$50,000',
      memberIds: [adminId],
      teamIds: [teamId],
      tags: ['Infrastructure', 'K8s'],
    }),
  });
  assert.equal(projRes.status, 201, 'Project creation with assigned teams must return 201');
  const projData = await projRes.json();
  const projectId = projData.project.id;
  assert.ok(projData.project.team_ids?.includes(teamId), 'Project response must contain team ID');
  pass('Bug #1 - Admin created project with assigned team without project_teams errors (HTTP 201)');

  // --- 6. Bug #1 Fix: Project survives page refresh (GET /api/projects returns created project) ---
  const getProjRes = await app.request('/api/projects', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(getProjRes.status, 200, 'List projects should succeed');
  const getProjData = await getProjRes.json();
  const foundProj = getProjData.projects.find((p: any) => p.id === projectId);
  assert.ok(foundProj, 'Project must persist across requests/refreshes');
  assert.ok(foundProj.team_ids?.includes(teamId), 'Project team associations must persist');
  pass('Bug #1 - Project and team associations persist across page refresh');

  // --- 7. Bug #2 Fix: Project can move between planning -> in_progress -> review -> completed ---
  const statusCycle = ['in_progress', 'review', 'completed', 'planning'];
  for (const nextStatus of statusCycle) {
    const patchRes = await app.request(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: nextStatus,
        progress: nextStatus === 'completed' ? 100 : nextStatus === 'planning' ? 0 : 50,
      }),
    });
    assert.equal(patchRes.status, 200, `Moving project to ${nextStatus} must return 200`);
    const patchData = await patchRes.json();
    assert.equal(patchData.project.status, nextStatus, `Project status should be ${nextStatus}`);

    const verifyGet = await app.request('/api/projects', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyData = await verifyGet.json();
    const verified = verifyData.projects.find((p: any) => p.id === projectId);
    assert.equal(verified.status, nextStatus, `Status ${nextStatus} must be stored in database`);
  }
  pass('Bug #2 - Project moves smoothly across all Kanban statuses (planning, in_progress, review, completed)');

  // --- 8. Bug #3 Fix: Employee in assigned team can view and update project assigned through team ---
  const empGetRes = await app.request('/api/projects', {
    method: 'GET',
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert.equal(empGetRes.status, 200, 'Employee list projects should succeed');
  const empGetData = await empGetRes.json();
  const empProject = empGetData.projects.find((p: any) => p.id === projectId);
  assert.ok(empProject, 'Employee must be able to see project assigned to their team');
  pass('Bug #3 - Employee can see projects assigned through projects -> project_teams -> team_members');

  const empUpdateRes = await app.request(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({
      progress: 75,
      status: 'in_progress',
    }),
  });
  assert.equal(empUpdateRes.status, 200, 'Employee should be able to update status/progress on assigned team project');
  pass('Bug #3 - Employee in assigned team successfully updated project status & progress');

  console.log('===============================================================');
  console.log(` SUITE 21 PASSED: ${passed} Assertions, 0 Failures`);
  console.log('===============================================================\n');
}
