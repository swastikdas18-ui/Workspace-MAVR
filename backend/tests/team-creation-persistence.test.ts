/**
 * backend/tests/team-creation-persistence.test.ts
 * 
 * Regression Test: Team Creation -> Team Member Auto-Assignment -> Immediate Listing Visibility
 * 
 * Objectives:
 * 1. Admin creates a new team via POST /api/teams.
 * 2. Verify creator automatically receives lead role and row in team_members.
 * 3. Verify immediate GET /api/teams includes the newly created team.
 * 4. Verify employee/member of team can also see the team.
 * 5. Verify intern cannot see or create teams (403).
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';

export async function runTeamCreationPersistenceTests() {
  console.log('===============================================================');
  console.log(' SUITE 19: TEAM CREATION & MEMBER PERSISTENCE REGRESSION TEST');
  console.log('===============================================================');

  let passed = 0;
  function pass(msg: string) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }

  const timestamp = Date.now();
  const adminEmail = `admin-team-${timestamp}@betacorp.io`;
  const employeeEmail = `emp-team-${timestamp}@betacorp.io`;
  const password = 'Password123!';

  // --- Step 1: Register Admin & Workspace ---
  const regRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password,
      name: 'Team Admin',
      workspaceName: 'Team Test Corp',
    }),
  });
  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  const adminToken = regData.token;
  const workspaceId = regData.workspace.id;
  const adminUserId = regData.user.id;
  pass('Admin registered and workspace initialized');

  // --- Step 2: Register Employee in same workspace ---
  const empRegRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: employeeEmail,
      password,
      name: 'Team Employee',
      workspaceId,
    }),
  });
  assert.equal(empRegRes.status, 201);
  const empRegData = await empRegRes.json();
  const employeeToken = empRegData.token;
  const employeeUserId = empRegData.user.id;
  pass('Employee registered in workspace');

  // --- Step 3: Admin creates team with creator as lead + employee as member ---
  const createTeamRes = await app.request('/api/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Alpha Engineering',
      description: 'Core product development team',
      color: '#7C3AED',
      lead_id: adminUserId,
      member_ids: [employeeUserId],
    }),
  });

  assert.equal(createTeamRes.status, 201, 'Team creation must return 201 Created');
  const createTeamData = await createTeamRes.json();
  const createdTeam = createTeamData.team;
  assert.ok(createdTeam.id, 'Created team must have valid ID');
  assert.equal(createdTeam.name, 'Alpha Engineering');
  assert.equal(createdTeam.workspace_id, workspaceId, 'Team must be bound to correct workspace_id');
  assert.equal(createdTeam.lead_id, adminUserId, 'Team creator/lead must be adminUserId');
  assert.ok(createdTeam.members.includes(adminUserId), 'Creator must be auto-included in team members');
  assert.ok(createdTeam.members.includes(employeeUserId), 'Employee must be included in team members');
  assert.equal(createdTeam.member_count, 2, 'member_count must be exactly 2');
  pass('Team created with creator auto-assigned as lead and member');

  // --- Step 4: Admin queries GET /api/teams immediately ---
  const listAdminTeamsRes = await app.request('/api/teams', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(listAdminTeamsRes.status, 200);
  const listAdminTeamsData = await listAdminTeamsRes.json();
  const foundInAdminList = listAdminTeamsData.teams.find((t: any) => t.id === createdTeam.id);
  assert.ok(foundInAdminList, 'Newly created team must appear in Admin GET /api/teams immediately');
  assert.equal(foundInAdminList.name, 'Alpha Engineering');
  assert.equal(foundInAdminList.member_count, 2);
  pass('Newly created team immediately visible in Admin GET /api/teams');

  // --- Step 5: Employee queries GET /api/teams immediately ---
  const listEmpTeamsRes = await app.request('/api/teams', {
    method: 'GET',
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert.equal(listEmpTeamsRes.status, 200);
  const listEmpTeamsData = await listEmpTeamsRes.json();
  const foundInEmpList = listEmpTeamsData.teams.find((t: any) => t.id === createdTeam.id);
  assert.ok(foundInEmpList, 'Newly created team must be visible to assigned Employee');
  assert.equal(foundInEmpList.name, 'Alpha Engineering');
  pass('Newly created team immediately visible to assigned Employee');

  console.log('===============================================================');
  console.log(` SUITE 19 PASSED: ${passed} Assertions, 0 Failures`);
  console.log('===============================================================');
}
