/**
 * backend/tests/project-creation-rbac.test.ts
 * 
 * Regression Test: Project Creation RBAC Scoping
 * 
 * Objectives:
 * 1. Admin creates project -> 201 Created
 * 2. Owner creates project -> 201 Created
 * 3. Employee creates project -> 403 Forbidden
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';

export async function runProjectCreationRbacTests() {
  console.log('===============================================================');
  console.log(' SUITE 20: PROJECT CREATION RBAC & ROLE SCOPING REGRESSION');
  console.log('===============================================================');

  let passed = 0;
  function pass(msg: string) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }

  const timestamp = Date.now();
  const ownerEmail = `owner-proj-${timestamp}@oscorp.io`;
  const adminEmail = `admin-proj-${timestamp}@oscorp.io`;
  const employeeEmail = `emp-proj-${timestamp}@oscorp.io`;
  const password = 'Password123!';

  // --- Step 1: Register Owner & Initialize Workspace (OSCORP) ---
  const ownerRegRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password,
      name: 'Norman Osborn',
      workspaceName: 'OSCORP',
    }),
  });
  assert.equal(ownerRegRes.status, 201);
  const ownerRegData = await ownerRegRes.json();
  const ownerToken = ownerRegData.token;
  const workspaceId = ownerRegData.workspace.id;
  const ownerUserId = ownerRegData.user.id;
  pass('Owner registered and workspace OSCORP initialized');

  // --- Step 2: Owner invites Admin and Employee to OSCORP ---
  const adminInviteRes = await app.request('/api/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ email: adminEmail, role: 'admin' }),
  });
  assert.equal(adminInviteRes.status, 201);
  const adminInviteToken = (await adminInviteRes.json()).invite.token;

  const empInviteRes = await app.request('/api/invites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ email: employeeEmail, role: 'employee' }),
  });
  assert.equal(empInviteRes.status, 201);
  const empInviteToken = (await empInviteRes.json()).invite.token;

  // --- Step 3: Admin & Employee accept invites ---
  const acceptAdminRes = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: adminInviteToken,
      name: 'Admin User',
      password,
    }),
  });
  assert.equal(acceptAdminRes.status, 200);
  const adminUserId = (await acceptAdminRes.json()).user.id;

  const adminLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password }),
  });
  assert.equal(adminLoginRes.status, 200);
  const adminToken = (await adminLoginRes.json()).token;
  pass('Admin invited and authenticated with role admin');

  const acceptEmpRes = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: empInviteToken,
      name: 'Peter Parker',
      password,
    }),
  });
  assert.equal(acceptEmpRes.status, 200);

  const empLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: employeeEmail, password }),
  });
  assert.equal(empLoginRes.status, 200);
  const employeeToken = (await empLoginRes.json()).token;
  pass('Employee invited and authenticated with role employee');

  // --- Step 4: OWNER creates project -> Expect 201 Created ---
  const ownerCreateRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      title: 'Glider Propulsion Research',
      description: 'Advanced turbine and aero-glider tech',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      member_ids: [ownerUserId],
    }),
  });
  assert.equal(ownerCreateRes.status, 201, 'Workspace Owner must be allowed to create projects (201)');
  const ownerCreateData = await ownerCreateRes.json();
  assert.equal(ownerCreateData.project.title, 'Glider Propulsion Research');
  pass('Owner successfully created project (HTTP 201)');

  // --- Step 5: ADMIN creates project -> Expect 201 Created ---
  const adminCreateRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Biochemical Armor Project',
      description: 'High-tensile exoskeleton formulation',
      dueDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      member_ids: [adminUserId],
    }),
  });
  assert.equal(adminCreateRes.status, 201, 'Workspace Admin must be allowed to create projects (201)');
  const adminCreateData = await adminCreateRes.json();
  assert.equal(adminCreateData.project.title, 'Biochemical Armor Project');
  pass('Admin successfully created project (HTTP 201)');

  // --- Step 6: EMPLOYEE creates project -> Expect 403 Forbidden ---
  const empCreateRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({
      title: 'Unauthorized Web Fluid Project',
      description: 'Employee attempt to create project',
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    }),
  });
  assert.equal(empCreateRes.status, 403, 'Employee must receive 403 Forbidden when creating project');
  pass('Employee correctly blocked with HTTP 403 Forbidden');

  console.log('===============================================================');
  console.log(` SUITE 20 PASSED: ${passed} Assertions, 0 Failures`);
  console.log('===============================================================');
}
