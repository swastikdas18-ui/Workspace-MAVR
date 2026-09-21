process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { inMemoryDb } from '../packages/database/index.js';

export async function runDepartmentMemberManagementTests(): Promise<void> {
  console.log('\n--- Running Department Member Management Tests ---');

  const timestamp = Date.now();
  const workspaceId = `ws-dept-mgmt-${timestamp}`;
  const adminId = `admin-dm-${timestamp}`;
  const empId = `emp-dm-${timestamp}`;
  const emp2Id = `emp2-dm-${timestamp}`;
  const internId = `intern-dm-${timestamp}`;

  const adminToken = `token-admin-dm-${timestamp}`;
  const empToken = `token-emp-dm-${timestamp}`;
  const internToken = `token-intern-dm-${timestamp}`;

  // 1. Setup Workspace & Users
  inMemoryDb.workspaces.set(workspaceId, {
    id: workspaceId,
    name: 'Department Management Corp',
    slug: `dept-mgmt-${timestamp}`,
    ownerId: adminId,
    plan: 'enterprise',
  } as any);

  inMemoryDb.users.set(adminId, { id: adminId, email: `admin-${timestamp}@dm.io`, name: 'Admin User', role: 'admin' } as any);
  inMemoryDb.users.set(empId, { id: empId, email: `emp-${timestamp}@dm.io`, name: 'Employee User', role: 'employee' } as any);
  inMemoryDb.users.set(emp2Id, { id: emp2Id, email: `emp2-${timestamp}@dm.io`, name: 'Second Employee', role: 'employee' } as any);
  inMemoryDb.users.set(internId, { id: internId, email: `intern-${timestamp}@dm.io`, name: 'Intern User', role: 'intern' } as any);

  // 2. Setup Sessions
  const expiresAt = new Date(Date.now() + 86400000);
  inMemoryDb.sessions.set(adminToken, { id: 's-adm', userId: adminId, workspaceId, token: adminToken, expiresAt } as any);
  inMemoryDb.sessions.set(empToken, { id: 's-emp', userId: empId, workspaceId, token: empToken, expiresAt } as any);
  inMemoryDb.sessions.set(internToken, { id: 's-int', userId: internId, workspaceId, token: internToken, expiresAt } as any);

  // 3. Setup Workspace Memberships
  inMemoryDb.workspaceMembers.set(`wm-${adminId}`, { id: 'wm1', workspaceId, userId: adminId, role: 'admin' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${empId}`, { id: 'wm2', workspaceId, userId: empId, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${emp2Id}`, { id: 'wm3', workspaceId, userId: emp2Id, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${internId}`, { id: 'wm4', workspaceId, userId: internId, role: 'intern' } as any);

  // 4. Create Departments
  const dept1Id = `dept-1-${timestamp}`;
  const dept2Id = `dept-2-${timestamp}`;

  inMemoryDb.departments.set(dept1Id, {
    id: dept1Id,
    workspaceId,
    name: 'Engineering',
    description: 'Software and infrastructure',
    headId: null,
    color: '#3B82F6',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryDb.departments.set(dept2Id, {
    id: dept2Id,
    workspaceId,
    name: 'Design & Marketing',
    description: 'Product design and growth',
    headId: null,
    color: '#EC4899',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Setup initial employee profiles
  inMemoryDb.employeeProfiles.set(`prof-${empId}`, {
    id: `prof-${empId}`,
    workspaceId,
    userId: empId,
    departmentId: null,
    designation: 'Senior Engineer',
    status: 'active',
  } as any);

  inMemoryDb.employeeProfiles.set(`prof-${emp2Id}`, {
    id: `prof-${emp2Id}`,
    workspaceId,
    userId: emp2Id,
    departmentId: null,
    designation: 'Product Designer',
    status: 'active',
  } as any);

  // Test 1: RBAC - Non-admin cannot add member, remove member, or set lead
  console.log('Test 1: Non-admin users are blocked with 403 on department member modification');
  const empAddRes = await app.request(`/departments/${dept1Id}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: emp2Id }),
  });
  assert.equal(empAddRes.status, 403, 'Employee must be rejected with 403');

  const empRemoveRes = await app.request(`/departments/${dept1Id}/members/${empId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert.equal(empRemoveRes.status, 403, 'Employee must be rejected with 403');

  const internLeadRes = await app.request(`/departments/${dept1Id}/lead`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${internToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: empId }),
  });
  assert.equal(internLeadRes.status, 403, 'Intern must be rejected with 403');

  // Test 2: Admin can add member to department (POST /departments/:id/members)
  console.log('Test 2: Admin adds member to department');
  const addRes = await app.request(`/departments/${dept1Id}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: empId }),
  });
  assert.equal(addRes.status, 200, 'Adding department member returns 200');
  const addBody = await addRes.json();
  assert.equal(addBody.profile.departmentId, dept1Id);

  // Verify member listed in GET /departments/:id/members
  const listRes = await app.request(`/departments/${dept1Id}/members`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.equal(listBody.members.length, 1);
  assert.equal(listBody.members[0].userId, empId);
  assert.equal(listBody.members[0].departmentPosition, 'member');

  // Test 3: Admin sets department lead (PATCH /departments/:id/lead)
  console.log('Test 3: Admin sets department lead');
  const setLeadRes = await app.request(`/departments/${dept1Id}/lead`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: empId }),
  });
  assert.equal(setLeadRes.status, 200, 'Setting department lead returns 200');
  const setLeadBody = await setLeadRes.json();
  assert.equal(setLeadBody.department.headId, empId);

  // Verify member position is now 'lead'
  const listAfterLeadRes = await app.request(`/departments/${dept1Id}/members`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const listAfterLeadBody = await listAfterLeadRes.json();
  const empMember = listAfterLeadBody.members.find((m: any) => m.userId === empId);
  assert.ok(empMember, 'Member must exist');
  assert.equal(empMember.departmentPosition, 'lead');

  // Test 4: Move member to another department (POST/PATCH /departments/:id/members/move)
  console.log('Test 4: Move member between departments');
  const moveRes = await app.request(`/departments/${dept1Id}/members/move`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: empId, toDepartmentId: dept2Id }),
  });
  assert.equal(moveRes.status, 200, 'Moving member returns 200');

  // Verify dept2 now has empId
  const dept2MembersRes = await app.request(`/departments/${dept2Id}/members`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dept2MembersBody = await dept2MembersRes.json();
  assert.equal(dept2MembersBody.members.some((m: any) => m.userId === empId), true);

  // Test 5: Remove member from department (DELETE /departments/:id/members/:memberId)
  console.log('Test 5: Remove member from department');
  const removeRes = await app.request(`/departments/${dept2Id}/members/${empId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(removeRes.status, 200, 'Removing department member returns 200');

  // Verify dept2 no longer contains empId
  const dept2AfterRemoveRes = await app.request(`/departments/${dept2Id}/members`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dept2AfterRemoveBody = await dept2AfterRemoveRes.json();
  assert.equal(dept2AfterRemoveBody.members.some((m: any) => m.userId === empId), false);

  console.log('✅ Department Member Management tests completed successfully!\n');
}

if (process.argv[1]?.includes('department-member-management.test')) {
  runDepartmentMemberManagementTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
