process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { inMemoryDb } from '../packages/database/index.js';
import { WorkspaceRepository } from '../src/repositories/workspace-repository.js';

export async function runWorkspaceMemberRemovalTests() {
  console.log('\n--- Running Workspace Member Removal System Tests ---');

  const testWorkspaceId = 'ws-removal-test-' + Date.now();
  const admin1Id = 'usr-admin-1-' + Date.now();
  const admin2Id = 'usr-admin-2-' + Date.now();
  const employeeId = 'usr-emp-1-' + Date.now();
  const outsiderId = 'usr-outsider-' + Date.now();

  // 1. Setup in-memory test data using Maps
  inMemoryDb.workspaces.set(testWorkspaceId, {
    id: testWorkspaceId,
    name: 'Removal Test Org',
    slug: 'removal-test-org',
    ownerId: admin1Id,
    plan: 'enterprise',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryDb.users.set(admin1Id, { id: admin1Id, email: 'admin1@test.org', name: 'Admin One', role: 'admin', createdAt: new Date() } as any);
  inMemoryDb.users.set(admin2Id, { id: admin2Id, email: 'admin2@test.org', name: 'Admin Two', role: 'admin', createdAt: new Date() } as any);
  inMemoryDb.users.set(employeeId, { id: employeeId, email: 'employee@test.org', name: 'Regular Employee', role: 'employee', createdAt: new Date() } as any);
  inMemoryDb.users.set(outsiderId, { id: outsiderId, email: 'outsider@other.org', name: 'Outsider User', role: 'employee', createdAt: new Date() } as any);

  // Add memberships: two admins, one employee
  inMemoryDb.workspaceMembers.set('mem-admin-1', {
    id: 'mem-admin-1',
    workspaceId: testWorkspaceId,
    userId: admin1Id,
    role: 'admin',
    joinedAt: new Date(),
  } as any);
  inMemoryDb.workspaceMembers.set('mem-admin-2', {
    id: 'mem-admin-2',
    workspaceId: testWorkspaceId,
    userId: admin2Id,
    role: 'admin',
    joinedAt: new Date(),
  } as any);
  inMemoryDb.workspaceMembers.set('mem-emp-1', {
    id: 'mem-emp-1',
    workspaceId: testWorkspaceId,
    userId: employeeId,
    role: 'employee',
    joinedAt: new Date(),
  } as any);

  // Setup department and employee profile
  const deptId = 'dept-test-' + Date.now();
  inMemoryDb.departments.set(deptId, {
    id: deptId,
    workspaceId: testWorkspaceId,
    name: 'Engineering',
    headId: employeeId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryDb.employeeProfiles.set('prof-test-1', {
    id: 'prof-test-1',
    workspaceId: testWorkspaceId,
    userId: employeeId,
    departmentId: deptId,
    designation: 'Senior Engineer',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryDb.teamMembers.set('tm-test-1', {
    id: 'tm-test-1',
    teamId: deptId,
    userId: employeeId,
    joinedAt: new Date(),
  });

  // Setup project assignment
  const projId = 'proj-test-' + Date.now();
  inMemoryDb.projects.set(projId, {
    id: projId,
    workspaceId: testWorkspaceId,
    name: 'Core Platform',
    createdById: admin1Id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryDb.projectMembers.set('pm-test-1', {
    id: 'pm-test-1',
    projectId: projId,
    userId: employeeId,
    role: 'developer',
    joinedAt: new Date(),
  });

  // Setup sessions
  inMemoryDb.sessions.set('sess-emp-1', {
    id: 'sess-emp-1',
    userId: employeeId,
    workspaceId: testWorkspaceId,
    token: 'emp-token-1',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
  } as any);
  inMemoryDb.sessions.set('sess-admin-1', {
    id: 'sess-admin-1',
    userId: admin1Id,
    workspaceId: testWorkspaceId,
    token: 'admin-token-1',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
  } as any);

  // Test 1: Admin cannot remove self
  console.log('Test 1: Admin cannot remove self');
  await assert.rejects(
    async () => {
      await WorkspaceRepository.removeWorkspaceMember(testWorkspaceId, admin1Id, admin1Id);
    },
    (err: any) => {
      assert.equal(err.code, 'CANNOT_REMOVE_SELF');
      assert.equal(err.status, 400);
      return true;
    },
    'Should throw CANNOT_REMOVE_SELF when target equals actor'
  );

  // Test 2: Target not in workspace throws MEMBER_NOT_FOUND
  console.log('Test 2: Target not in workspace throws MEMBER_NOT_FOUND');
  await assert.rejects(
    async () => {
      await WorkspaceRepository.removeWorkspaceMember(testWorkspaceId, outsiderId, admin1Id);
    },
    (err: any) => {
      assert.equal(err.code, 'MEMBER_NOT_FOUND');
      assert.equal(err.status, 404);
      return true;
    },
    'Should throw MEMBER_NOT_FOUND when user is not a member'
  );

  // Test 3: Last admin cannot be removed
  console.log('Test 3: Cannot remove the last admin of a workspace');
  // First remove admin2
  const removeAdmin2Result = await WorkspaceRepository.removeWorkspaceMember(testWorkspaceId, admin2Id, admin1Id);
  assert.equal(removeAdmin2Result, true);

  // Now only admin1 remains as admin. Attempting to remove admin1 by any other caller should fail with CANNOT_REMOVE_LAST_ADMIN
  await assert.rejects(
    async () => {
      await WorkspaceRepository.removeWorkspaceMember(testWorkspaceId, admin1Id, 'usr-hypothetical');
    },
    (err: any) => {
      assert.equal(err.code, 'CANNOT_REMOVE_LAST_ADMIN');
      assert.equal(err.status, 400);
      return true;
    },
    'Should throw CANNOT_REMOVE_LAST_ADMIN when only one admin exists'
  );

  // Test 4: Successful removal cascades properly
  console.log('Test 4: Successful removal cascades across membership, teams, projects, sessions & audit');
  const removeEmpResult = await WorkspaceRepository.removeWorkspaceMember(
    testWorkspaceId,
    employeeId,
    admin1Id,
    { ipAddress: '127.0.0.1', userAgent: 'Automated-Test' }
  );

  assert.equal(removeEmpResult, true);

  // Check membership removed
  const isMember = Array.from(inMemoryDb.workspaceMembers.values()).some(
    (m) => m.workspaceId === testWorkspaceId && m.userId === employeeId
  );
  assert.equal(isMember, false, 'Workspace membership must be deleted');

  // Check employee profile updated
  const profile = Array.from(inMemoryDb.employeeProfiles.values()).find(
    (p) => p.workspaceId === testWorkspaceId && p.userId === employeeId
  );
  assert.ok(profile, 'Profile should still exist for archival');
  assert.equal(profile.departmentId, null, 'Department ID must be cleared');
  assert.equal(profile.status, 'terminated', 'Profile status must be terminated');

  // Check department head cleared
  const dept = inMemoryDb.departments.get(deptId);
  assert.equal(dept?.headId, null, 'Department headId must be cleared if removed member was head');

  // Check team membership deleted
  const isTeamMember = Array.from(inMemoryDb.teamMembers.values()).some(
    (tm) => tm.teamId === deptId && tm.userId === employeeId
  );
  assert.equal(isTeamMember, false, 'Team membership must be deleted');

  // Check project membership deleted
  const isProjMember = Array.from(inMemoryDb.projectMembers.values()).some(
    (pm) => pm.projectId === projId && pm.userId === employeeId
  );
  assert.equal(isProjMember, false, 'Project membership must be deleted');

  // Check session terminated
  const hasSession = Array.from(inMemoryDb.sessions.values()).some(
    (s) => s.userId === employeeId && s.workspaceId === testWorkspaceId
  );
  assert.equal(hasSession, false, 'Workspace sessions must be terminated');

  // Check audit log created
  const empAuditLogs = Array.from(inMemoryDb.auditLogs.values()).filter(
    (l) => l.workspaceId === testWorkspaceId && (l.action === 'workspace:member_removed' || l.action === 'workspace.member.removed') && l.resourceId === employeeId
  );
  assert.ok(empAuditLogs.length > 0, 'Audit log must be created for member removal');
  const log = empAuditLogs[0];
  assert.equal(log.userId, admin1Id);
  assert.equal(log.resourceId, employeeId);

  console.log('✅ Workspace Member Removal System tests completed successfully!\n');
}
