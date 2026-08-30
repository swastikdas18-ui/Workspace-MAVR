import { app } from '../src/app';
import { inMemoryDb } from '../packages/database/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

export async function runTaskEngineTests() {
  console.log('\n===============================================================');
  console.log(' SUITE 24: Phase 2 Task Execution Engine & State Machine');
  console.log('===============================================================\n');

  const wsId = 'ws-task-engine-' + Date.now();
  const adminId = 'admin-te-' + Date.now();
  const employeeId = 'emp-te-' + Date.now();
  const internId = 'intern-te-' + Date.now();

  const adminToken = 'tok-admin-te-' + Date.now();
  const empToken = 'tok-emp-te-' + Date.now();
  const internToken = 'tok-intern-te-' + Date.now();

  // 1. Seed Workspace, Users & Sessions
  inMemoryDb.workspaces.set(wsId, {
    id: wsId,
    name: 'Task Engine Org',
    slug: 'task-engine-org',
    ownerId: adminId,
    plan: 'enterprise',
  } as any);

  inMemoryDb.users.set(adminId, {
    id: adminId,
    name: 'Admin Boss',
    email: 'admin@engine.io',
    password: 'hash',
    role: 'admin',
    platformRole: 'admin',
  } as any);

  inMemoryDb.users.set(employeeId, {
    id: employeeId,
    name: 'Senior Dev',
    email: 'dev@engine.io',
    password: 'hash',
    role: 'employee',
    platformRole: 'user',
  } as any);

  inMemoryDb.users.set(internId, {
    id: internId,
    name: 'Junior Intern',
    email: 'intern@engine.io',
    password: 'hash',
    role: 'intern',
    platformRole: 'user',
  } as any);

  inMemoryDb.workspaceMembers.set('wm-1', { id: 'wm-1', workspaceId: wsId, userId: adminId, role: 'admin' } as any);
  inMemoryDb.workspaceMembers.set('wm-2', { id: 'wm-2', workspaceId: wsId, userId: employeeId, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set('wm-3', { id: 'wm-3', workspaceId: wsId, userId: internId, role: 'intern' } as any);

  inMemoryDb.sessions.set(adminToken, { id: 's-admin', userId: adminId, workspaceId: wsId, token: adminToken, expiresAt: new Date(Date.now() + 86400000) } as any);
  inMemoryDb.sessions.set(empToken, { id: 's-emp', userId: employeeId, workspaceId: wsId, token: empToken, expiresAt: new Date(Date.now() + 86400000) } as any);
  inMemoryDb.sessions.set(internToken, { id: 's-intern', userId: internId, workspaceId: wsId, token: internToken, expiresAt: new Date(Date.now() + 86400000) } as any);

  // 2. Create Project
  const projRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Infrastructure Modernization',
      description: 'Phase 2 Cloud Engine deployment',
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    }),
  });

  const projBody = await projRes.json();
  assert(projRes.status === 201, 'Admin can create container project');
  const projectId = projBody.project.id;
  assert(projectId !== undefined, 'Project ID generated');
  assert(projBody.project.progress === 0, 'Initial project progress is 0%');

  // 3. Create First Task
  const task1Res = await app.request('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Setup Redis Sentinel Cluster',
      description: 'Deploy 3-node HA Redis caching topology',
      priority: 'high',
      story_points: 3,
      estimated_hours: 6,
      assigned_to: employeeId,
      project_id: projectId,
      status: 'todo',
    }),
  });

  const task1Body = await task1Res.json();
  assert(task1Res.status === 201, 'Admin creates Task 1 with todo status');
  const task1Id = task1Body.task.id;
  assert(task1Body.task.status === 'todo', 'Task 1 status is todo');

  // Verify Project Progress remains 0%
  const projCheck1 = await app.request(`/api/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const projCheck1Body = await projCheck1.json();
  assert(projCheck1Body.project.progress === 0, 'Project progress is 0% with 1 todo task');

  // 4. Test State Machine Lifecycle Action: /start (todo -> in_progress)
  const startRes = await app.request(`/api/tasks/${task1Id}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const startBody = await startRes.json();
  assert(startRes.status === 200, 'Employee starts Task 1 successfully');
  assert(startBody.task.status === 'in_progress', 'Task 1 status transitioned to in_progress');
  assert(startBody.task.started_at !== null, 'Task 1 started_at timestamp recorded');

  // 5. Test State Machine Lifecycle Action: /submit-review (in_progress -> review)
  const submitRes = await app.request(`/api/tasks/${task1Id}/submit-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({ notes: 'Redis cluster provisioned in staging' }),
  });
  const submitBody = await submitRes.json();
  assert(submitRes.status === 200, 'Employee submits Task 1 for review');
  assert(submitBody.task.status === 'review', 'Task 1 status transitioned to review');

  // 6. Test State Machine Lifecycle Action: /request-changes (review -> in_progress)
  const changesRes = await app.request(`/api/tasks/${task1Id}/request-changes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ feedback: 'Please add automated failover tests.' }),
  });
  const changesBody = await changesRes.json();
  assert(changesRes.status === 200, 'Admin requests changes on Task 1');
  assert(changesBody.task.status === 'in_progress', 'Task 1 returned to in_progress state');

  // Re-submit for review
  await app.request(`/api/tasks/${task1Id}/submit-review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  });

  // 7. Test State Machine Lifecycle Action: /approve (review -> done)
  const approveRes = await app.request(`/api/tasks/${task1Id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ feedback: 'Verified failover resilience. Approved.' }),
  });
  const approveBody = await approveRes.json();
  assert(approveRes.status === 200, 'Admin approves Task 1');
  assert(approveBody.task.status === 'done', 'Task 1 transitioned to done');
  assert(approveBody.task.completed_at !== null, 'Task 1 completed_at timestamp recorded');
  assert(approveBody.task.reviewed_by === adminId, 'Task 1 reviewed_by set to adminId');

  // Verify Project Progress is now 100% (1/1 tasks completed)
  const projCheck2 = await app.request(`/api/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const projCheck2Body = await projCheck2.json();
  assert(projCheck2Body.project.progress === 100, 'Project progress automatically recalculated to 100%');

  // 8. Create Second Task and test dynamic progress change to 50%
  const task2Res = await app.request('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Configure PG Connection Pooler',
      description: 'Install PgBouncer',
      priority: 'medium',
      story_points: 2,
      assigned_to: employeeId,
      project_id: projectId,
      status: 'todo',
    }),
  });
  const task2Body = await task2Res.json();
  const task2Id = task2Body.task.id;

  const projCheck3 = await app.request(`/api/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const projCheck3Body = await projCheck3.json();
  assert(projCheck3Body.project.progress === 50, 'Project progress automatically recalculated to 50% (1/2 done)');

  // 9. Test Illegal State Machine Transitions (Must return 400 VALIDATION_ERROR)
  const illegalRes1 = await app.request(`/api/tasks/${task2Id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'done' }), // illegal: todo -> done
  });
  assert(illegalRes1.status === 400, 'Illegal transition todo -> done rejected with 400 VALIDATION_ERROR');

  const illegalRes2 = await app.request(`/api/tasks/${task2Id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'review' }), // illegal: todo -> review
  });
  assert(illegalRes2.status === 400, 'Illegal transition todo -> review rejected with 400 VALIDATION_ERROR');

  // 10. Test Impediment Blocking & Unblocking
  const blockRes = await app.request(`/api/tasks/${task2Id}/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({ reason: 'Waiting on firewall rules from DevOps team' }),
  });
  const blockBody = await blockRes.json();
  assert(blockRes.status === 200, 'Task 2 marked as blocked');
  assert(blockBody.task.is_blocked === true, 'Task 2 is_blocked is true');
  assert(blockBody.task.blocked_reason === 'Waiting on firewall rules from DevOps team', 'Task 2 blocked_reason recorded');

  const unblockRes = await app.request(`/api/tasks/${task2Id}/unblock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const unblockBody = await unblockRes.json();
  assert(unblockRes.status === 200, 'Task 2 unblocked successfully');
  assert(unblockBody.task.is_blocked === false, 'Task 2 is_blocked is false');
  assert(unblockBody.task.blocked_reason === null, 'Task 2 blocked_reason cleared');

  // 11. Test Task Comments & Activity Audit Trail
  const commentRes = await app.request(`/api/tasks/${task1Id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({ content: 'Cluster benchmark completed with 12k ops/sec.' }),
  });
  assert(commentRes.status === 201, 'Employee posts comment on Task 1');

  const activityRes = await app.request(`/api/tasks/${task1Id}/activity`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const activityBody = await activityRes.json();
  assert(activityRes.status === 200, 'Fetched task activity audit trail');
  assert(activityBody.activity.length >= 4, 'Activity trail recorded creation, start, review, changes, approval, comments');

  // 12. Test Intern RBAC Restrictions
  const internCreateRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${internToken}`,
    },
    body: JSON.stringify({
      title: 'Intern forbidden task',
      project_id: projectId,
    }),
  });
  assert(internCreateRes.status === 403, 'Intern is forbidden from creating tasks (403)');

  console.log('\n===============================================================');
  console.log(' SUITE 24: ALL TESTS PASSED! Task Execution Engine is solid.');
  console.log('===============================================================\n');
}
