process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { inMemoryDb } from '../packages/database/index.js';

export async function runDepartmentLeadRbacTests(): Promise<void> {
  console.log('\n--- Running Department Lead Task Assignment Permissions Tests ---');

  const timestamp = Date.now();
  const workspaceId = `ws-dl-rbac-${timestamp}`;
  const adminId = `admin-dl-${timestamp}`;
  const lead1Id = `lead1-dl-${timestamp}`;
  const lead2Id = `lead2-dl-${timestamp}`;
  const empDept1Id = `emp1-dept1-${timestamp}`;
  const empDept2Id = `emp2-dept2-${timestamp}`;
  const normalEmpId = `normal-emp-${timestamp}`;

  const adminToken = `token-admin-dl-${timestamp}`;
  const lead1Token = `token-lead1-dl-${timestamp}`;
  const lead2Token = `token-lead2-dl-${timestamp}`;
  const empDept1Token = `token-emp1-dept1-${timestamp}`;
  const normalEmpToken = `token-normal-emp-${timestamp}`;

  // 1. Setup Workspace & Users
  inMemoryDb.workspaces.set(workspaceId, {
    id: workspaceId,
    name: 'Department Lead Corp',
    slug: `dept-lead-${timestamp}`,
    ownerId: adminId,
    plan: 'enterprise',
  } as any);

  inMemoryDb.users.set(adminId, { id: adminId, email: `admin-${timestamp}@dl.io`, name: 'Admin User', role: 'admin' } as any);
  inMemoryDb.users.set(lead1Id, { id: lead1Id, email: `lead1-${timestamp}@dl.io`, name: 'Eng Lead', role: 'employee' } as any);
  inMemoryDb.users.set(lead2Id, { id: lead2Id, email: `lead2-${timestamp}@dl.io`, name: 'Design Lead', role: 'employee' } as any);
  inMemoryDb.users.set(empDept1Id, { id: empDept1Id, email: `emp1-${timestamp}@dl.io`, name: 'Eng Employee', role: 'employee' } as any);
  inMemoryDb.users.set(empDept2Id, { id: empDept2Id, email: `emp2-${timestamp}@dl.io`, name: 'Design Employee', role: 'employee' } as any);
  inMemoryDb.users.set(normalEmpId, { id: normalEmpId, email: `normal-${timestamp}@dl.io`, name: 'Normal Employee', role: 'employee' } as any);

  // 2. Setup Sessions
  const expiresAt = new Date(Date.now() + 86400000);
  inMemoryDb.sessions.set(adminToken, { id: 's-adm-dl', userId: adminId, workspaceId, token: adminToken, expiresAt } as any);
  inMemoryDb.sessions.set(lead1Token, { id: 's-lead1-dl', userId: lead1Id, workspaceId, token: lead1Token, expiresAt } as any);
  inMemoryDb.sessions.set(lead2Token, { id: 's-lead2-dl', userId: lead2Id, workspaceId, token: lead2Token, expiresAt } as any);
  inMemoryDb.sessions.set(empDept1Token, { id: 's-emp1-dl', userId: empDept1Id, workspaceId, token: empDept1Token, expiresAt } as any);
  inMemoryDb.sessions.set(normalEmpToken, { id: 's-norm-dl', userId: normalEmpId, workspaceId, token: normalEmpToken, expiresAt } as any);

  // 3. Setup Workspace Memberships (all are employees except admin, NO new global role)
  inMemoryDb.workspaceMembers.set(`wm-${adminId}`, { id: 'wm-adm', workspaceId, userId: adminId, role: 'admin' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${lead1Id}`, { id: 'wm-l1', workspaceId, userId: lead1Id, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${lead2Id}`, { id: 'wm-l2', workspaceId, userId: lead2Id, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${empDept1Id}`, { id: 'wm-e1', workspaceId, userId: empDept1Id, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${empDept2Id}`, { id: 'wm-e2', workspaceId, userId: empDept2Id, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${normalEmpId}`, { id: 'wm-norm', workspaceId, userId: normalEmpId, role: 'employee' } as any);

  // 4. Create Departments with Heads
  const deptEngId = `dept-eng-${timestamp}`;
  const deptDesignId = `dept-design-${timestamp}`;

  inMemoryDb.departments.set(deptEngId, {
    id: deptEngId,
    workspaceId,
    name: 'Engineering',
    description: 'Engineering Department',
    headId: lead1Id,
    color: '#3B82F6',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryDb.departments.set(deptDesignId, {
    id: deptDesignId,
    workspaceId,
    name: 'Design',
    description: 'Design Department',
    headId: lead2Id,
    color: '#EC4899',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 5. Setup Employee Profiles (establishing department membership)
  inMemoryDb.employeeProfiles.set(`prof-${lead1Id}`, {
    id: `prof-${lead1Id}`,
    workspaceId,
    userId: lead1Id,
    departmentId: deptEngId,
    designation: 'VP of Engineering',
    status: 'active',
  } as any);

  inMemoryDb.employeeProfiles.set(`prof-${empDept1Id}`, {
    id: `prof-${empDept1Id}`,
    workspaceId,
    userId: empDept1Id,
    departmentId: deptEngId,
    designation: 'Software Engineer',
    status: 'active',
  } as any);

  inMemoryDb.employeeProfiles.set(`prof-${lead2Id}`, {
    id: `prof-${lead2Id}`,
    workspaceId,
    userId: lead2Id,
    departmentId: deptDesignId,
    designation: 'Head of Design',
    status: 'active',
  } as any);

  inMemoryDb.employeeProfiles.set(`prof-${empDept2Id}`, {
    id: `prof-${empDept2Id}`,
    workspaceId,
    userId: empDept2Id,
    departmentId: deptDesignId,
    designation: 'Product Designer',
    status: 'active',
  } as any);

  inMemoryDb.employeeProfiles.set(`prof-${normalEmpId}`, {
    id: `prof-${normalEmpId}`,
    workspaceId,
    userId: normalEmpId,
    departmentId: null,
    designation: 'General Operations',
    status: 'active',
  } as any);

  // 6. Setup Project
  const projectId = `proj-dl-${timestamp}`;
  inMemoryDb.projects.set(projectId, {
    id: projectId,
    workspaceId,
    title: 'Core Platform Initiative',
    description: 'Quarterly platform milestones',
    createdBy: adminId,
    status: 'in_progress',
    memberIds: [adminId, lead1Id, lead2Id, empDept1Id, empDept2Id, normalEmpId],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  // =========================================================================
  // TEST 1: Lead assigning inside department -> Allowed (201 Created)
  // =========================================================================
  console.log('Test 1: Lead assigning inside own department -> Allowed (201)');
  const createInsideRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lead1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Build API Gateway',
      projectId,
      assignedTo: empDept1Id,
      departmentId: deptEngId,
    }),
  });
  assert.equal(createInsideRes.status, 201, 'Engineering Lead should be allowed to assign task to Eng employee');
  const createInsideBody = await createInsideRes.json();
  assert.ok(createInsideBody.task?.id, 'Task ID must be returned');
  assert.equal(createInsideBody.task.department_id, deptEngId, 'Task department must be set to Engineering');
  const taskEng1Id = createInsideBody.task.id;

  // =========================================================================
  // TEST 2: Lead assigning outside department -> Forbidden (403)
  // =========================================================================
  console.log('Test 2: Lead assigning outside own department -> Forbidden (403)');
  const createOutsideRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lead1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Design Marketing Banner',
      projectId,
      assignedTo: empDept2Id, // Member of Design dept!
      departmentId: deptEngId,
    }),
  });
  assert.equal(createOutsideRes.status, 403, 'Engineering Lead must be forbidden from assigning to Design employee');
  const createOutsideBody = await createOutsideRes.json();
  assert.equal(createOutsideBody.error?.code, 'FORBIDDEN');
  assert.ok(createOutsideBody.error?.message?.includes('outside own department'));

  // =========================================================================
  // TEST 3: Lead reassigning inside own department -> Allowed (200)
  // =========================================================================
  console.log('Test 3: Lead reassigning inside own department -> Allowed (200)');
  const reassignInsideRes = await app.request(`/api/tasks/${taskEng1Id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${lead1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignedTo: lead1Id, // Reassign to lead themselves (who is in Eng dept)
    }),
  });
  assert.equal(reassignInsideRes.status, 200, 'Lead should be allowed to reassign task to member within own department');
  const reassignInsideBody = await reassignInsideRes.json();
  assert.equal(reassignInsideBody.task.assigned_to, lead1Id);

  // =========================================================================
  // TEST 4: Lead reassigning outside own department -> Forbidden (403)
  // =========================================================================
  console.log('Test 4: Lead reassigning outside own department -> Forbidden (403)');
  const reassignOutsideRes = await app.request(`/api/tasks/${taskEng1Id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${lead1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignedTo: empDept2Id, // Design employee!
    }),
  });
  assert.equal(reassignOutsideRes.status, 403, 'Lead must be forbidden from reassigning to an outside department member');
  const reassignOutsideBody = await reassignOutsideRes.json();
  assert.equal(reassignOutsideBody.error?.code, 'FORBIDDEN');
  assert.ok(reassignOutsideBody.error?.message?.includes('outside own department'));

  // =========================================================================
  // TEST 5: Lead editing tasks owned by another department -> Forbidden (403)
  // =========================================================================
  console.log('Test 5: Lead editing tasks owned by another department -> Forbidden (403)');
  // Create a design department task by Lead 2
  const createDesignTaskRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lead2Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Design Brand Identity',
      projectId,
      assignedTo: empDept2Id,
      departmentId: deptDesignId,
    }),
  });
  assert.equal(createDesignTaskRes.status, 201);
  const designTask = (await createDesignTaskRes.json()).task;

  // Lead 1 attempts to edit Lead 2's design task
  const editOtherDeptRes = await app.request(`/api/tasks/${designTask.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${lead1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Hacked Design Task Title',
    }),
  });
  assert.equal(editOtherDeptRes.status, 403, 'Lead 1 must not be allowed to edit a task owned by Design department');
  const editOtherDeptBody = await editOtherDeptRes.json();
  assert.equal(editOtherDeptBody.error?.code, 'FORBIDDEN');
  assert.ok(editOtherDeptBody.error?.message?.includes('owned by another department'));

  // =========================================================================
  // TEST 6: Lead deleting workspace-wide task -> Forbidden (403)
  // =========================================================================
  console.log('Test 6: Lead deleting workspace-wide task -> Forbidden (403)');
  // Admin creates a workspace-wide task (no departmentId)
  const createWorkspaceWideRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Workspace Wide All-Hands Preparation',
      projectId,
      assignedTo: adminId,
      departmentId: null,
    }),
  });
  assert.equal(createWorkspaceWideRes.status, 201);
  const workspaceWideTask = (await createWorkspaceWideRes.json()).task;

  // Lead 1 attempts to delete this workspace-wide task
  const deleteWsWideRes = await app.request(`/api/tasks/${workspaceWideTask.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${lead1Token}` },
  });
  assert.equal(deleteWsWideRes.status, 403, 'Lead must be forbidden from deleting workspace-wide tasks');
  const deleteWsWideBody = await deleteWsWideRes.json();
  assert.equal(deleteWsWideBody.error?.code, 'FORBIDDEN');
  assert.ok(deleteWsWideBody.error?.message?.includes('workspace-wide'));

  // =========================================================================
  // TEST 7: Department Lead cannot manage departments -> Forbidden (403)
  // =========================================================================
  console.log('Test 7: Lead cannot manage departments (POST /api/people/departments) -> Forbidden (403)');
  const createDeptAttemptRes = await app.request('/api/people/departments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lead1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rogue Department',
    }),
  });
  assert.equal(createDeptAttemptRes.status, 403, 'Department lead must not be allowed to create departments');

  const updateDeptAttemptRes = await app.request(`/api/people/departments/${deptEngId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${lead1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Renamed Engineering Dept',
    }),
  });
  assert.equal(updateDeptAttemptRes.status, 403, 'Department lead must not be allowed to edit departments');

  // =========================================================================
  // TEST 8: Non-lead employee assigning department task -> Forbidden (403)
  // =========================================================================
  console.log('Test 8: Non-lead employee assigning department task -> Forbidden (403)');
  const empCreateRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${normalEmpToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Employee unauthorized task',
      projectId,
      assignedTo: normalEmpId,
      departmentId: deptEngId,
    }),
  });
  assert.equal(empCreateRes.status, 403, 'Regular employee without permissions must be forbidden from creating tasks');

  console.log('✅ All Department Lead RBAC Tests Passed Cleanly!');
}
