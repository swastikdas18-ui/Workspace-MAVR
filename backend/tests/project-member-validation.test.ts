/**
 * backend/tests/project-member-validation.test.ts
 *
 * Suite 42: Project Creation Member Validation & Auto-Cleanup
 *
 * Tests Required:
 * 1. VALID USER -> Project created (201)
 * 2. REMOVED / NON-EXISTENT USER -> 400 with "One or more selected members no longer exist"
 * 3. MIXED VALID + INVALID -> 400
 * 4. EMPTY MEMBER LIST -> Project created (201)
 * 5. Department Lead User -> Project created if user exists (201)
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database/index.js';

export async function runProjectMemberValidationTests() {
  console.log('===============================================================');
  console.log(' SUITE 42: PROJECT MEMBER VALIDATION & USER ID REFERENTIAL INTEGRITY');
  console.log('===============================================================');

  let passed = 0;
  function pass(msg: string) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }

  const nonce = Date.now();
  const adminEmail = `admin-pmv-${nonce}@val.io`;
  const employeeEmail = `emp-pmv-${nonce}@val.io`;
  const password = 'Password123!';

  // --- Step 1: Register Workspace & Admin ---
  const regRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Project Validator Admin',
      email: adminEmail,
      password,
      workspaceName: 'Integrity Systems',
    }),
  });
  assert.equal(regRes.status, 201, 'Admin registration should return 201');
  const regData = await regRes.json();
  const adminToken = regData.token;
  const adminUserId = regData.user.id;
  const workspaceId = regData.workspace.id;
  pass('Admin registered and workspace Integrity Systems initialized');

  // --- Step 2: Invite & Accept Employee ---
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
  assert.equal(invRes.status, 201);
  const inviteToken = (await invRes.json()).invite.token;

  const acceptRes = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteToken,
      name: 'Valid Team Member',
      password,
    }),
  });
  assert.equal(acceptRes.status, 200);
  const employeeUserId = (await acceptRes.json()).user.id;
  pass(`Employee registered with valid users.id: ${employeeUserId}`);

  // Create a department with the valid employee as lead
  const deptRes = await app.request('/api/people/departments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Systems Engineering',
      description: 'Core platform engineering',
    }),
  });
  assert.equal(deptRes.status, 201);
  const deptId = (await deptRes.json()).department.id;

  await app.request(`/api/people/departments/${deptId}/lead`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      leadId: employeeUserId,
    }),
  });
  pass(`Department created and led by user ${employeeUserId}`);

  // --- Test 1: VALID USER -> Project created (201) ---
  const validRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Valid Project One',
      description: 'Project with valid users.id',
      member_ids: [adminUserId, employeeUserId],
    }),
  });
  assert.equal(validRes.status, 201, 'Project with valid users.id must be created (201)');
  const validData = await validRes.json();
  assert.ok(validData.project.id);
  pass('Test 1: VALID USER -> Project created (201)');

  // --- Test 2: REMOVED / NON-EXISTENT USER -> 400 with "One or more selected members no longer exist" ---
  const nonExistentUserId = 'usr-non-existent-' + Date.now();
  const removedRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Ghost Project',
      description: 'Project referencing non-existent user',
      member_ids: [nonExistentUserId],
    }),
  });
  assert.equal(removedRes.status, 400, 'Project referencing non-existent user must return 400');
  const removedData = await removedRes.json();
  const errorMsg = removedData.error?.message || removedData.error || removedData.message;
  assert.match(errorMsg, /One or more selected members no longer exist/);
  pass('Test 2: REMOVED USER -> 400 ("One or more selected members no longer exist")');

  // --- Test 3: MIXED VALID + INVALID -> 400 ---
  const mixedRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Mixed Project',
      description: 'Valid admin + non-existent user',
      member_ids: [adminUserId, 'fake-membership-id-12345'],
    }),
  });
  assert.equal(mixedRes.status, 400, 'Mixed valid + invalid members must reject with 400');
  const mixedData = await mixedRes.json();
  const mixedErrMsg = mixedData.error?.message || mixedData.error || mixedData.message;
  assert.match(mixedErrMsg, /One or more selected members no longer exist/);
  pass('Test 3: MIXED VALID + INVALID -> 400');

  // --- Test 4: EMPTY MEMBER LIST -> Project created (201, defaults to creator) ---
  const emptyRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Empty Member List Project',
      description: 'Empty member_ids array',
      member_ids: [],
    }),
  });
  assert.equal(emptyRes.status, 201, 'Empty member_ids must succeed with 201');
  const emptyData = await emptyRes.json();
  assert.ok(emptyData.project.id);
  const emptyMembers = emptyData.project.memberIds || emptyData.project.member_ids;
  assert.ok(emptyMembers.includes(adminUserId));
  pass('Test 4: EMPTY MEMBER LIST -> Project created (201)');

  // Also test with null/undefined/empty string cleanup
  const cleanupRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Auto Cleanup Member List Project',
      description: 'Member list with null, empty strings, and duplicates',
      member_ids: [adminUserId, '', null, undefined, adminUserId],
    }),
  });
  assert.equal(cleanupRes.status, 201, 'Member list with null/empty items must auto-clean and succeed with 201');
  pass('Test 4b: AUTO CLEANUP (null, empty, duplicates) -> Project created (201)');

  // --- Test 5: Department Lead User -> Project created if user exists (201) ---
  const deptLeadProjRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Department Lead Initiative',
      description: 'Project assigned to department with verified department lead',
      department_id: deptId,
      member_ids: [employeeUserId],
    }),
  });
  assert.equal(deptLeadProjRes.status, 201, 'Project created with department lead user must return 201');
  const deptLeadProjData = await deptLeadProjRes.json();
  assert.ok(deptLeadProjData.project.id);
  assert.ok(deptLeadProjData.project.memberIds.includes(employeeUserId));
  pass('Test 5: Department Lead User -> Project created if user exists (201)');

  console.log('===============================================================');
  console.log(` SUITE 42 PASSED: ${passed} Assertions, 0 Failures`);
  console.log('===============================================================');
}
