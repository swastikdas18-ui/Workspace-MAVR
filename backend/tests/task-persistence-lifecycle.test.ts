process.env.NODE_ENV = 'test';

import { app } from '../src/app';
import { inMemoryDb } from '../packages/database/index';
import { TaskRepository } from '../src/repositories/task-repository';
import { TaskService } from '../src/services/task-service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

export async function runTaskPersistenceLifecycleTests() {
  console.log('\n===============================================================');
  console.log(' SUITE: Task Persistence & RBAC Scoping Lifecycle Verification');
  console.log('===============================================================\n');

  const wsId = 'ws-persist-' + Date.now();
  const adminId = 'admin-persist-' + Date.now();
  const empId = 'emp-persist-' + Date.now();
  const internId = 'intern-persist-' + Date.now();

  const adminToken = 'tok-admin-p-' + Date.now();
  const empToken = 'tok-emp-p-' + Date.now();
  const internToken = 'tok-intern-p-' + Date.now();

  // 1. Seed Workspace, Users & Sessions
  inMemoryDb.workspaces.set(wsId, {
    id: wsId,
    name: 'Persistence Verification Org',
    slug: 'persist-org',
    ownerId: adminId,
    plan: 'enterprise',
  } as any);

  inMemoryDb.users.set(adminId, {
    id: adminId,
    name: 'Admin Boss',
    email: 'admin@persist.org',
    password: 'hash',
    role: 'admin',
    platformRole: 'admin',
  } as any);

  inMemoryDb.users.set(empId, {
    id: empId,
    name: 'Engineer Alice',
    email: 'alice@persist.org',
    password: 'hash',
    role: 'employee',
    platformRole: 'user',
  } as any);

  inMemoryDb.users.set(internId, {
    id: internId,
    name: 'Intern Bob',
    email: 'bob@persist.org',
    password: 'hash',
    role: 'intern',
    platformRole: 'user',
  } as any);

  inMemoryDb.workspaceMembers.set('wm-p1', { id: 'wm-p1', workspaceId: wsId, userId: adminId, role: 'admin' } as any);
  inMemoryDb.workspaceMembers.set('wm-p2', { id: 'wm-p2', workspaceId: wsId, userId: empId, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set('wm-p3', { id: 'wm-p3', workspaceId: wsId, userId: internId, role: 'intern' } as any);

  inMemoryDb.sessions.set(adminToken, { id: 's-p1', userId: adminId, workspaceId: wsId, token: adminToken, expiresAt: new Date(Date.now() + 86400000) } as any);
  inMemoryDb.sessions.set(empToken, { id: 's-p2', userId: empId, workspaceId: wsId, token: empToken, expiresAt: new Date(Date.now() + 86400000) } as any);
  inMemoryDb.sessions.set(internToken, { id: 's-p3', userId: internId, workspaceId: wsId, token: internToken, expiresAt: new Date(Date.now() + 86400000) } as any);

  // 2. Create Project
  const projRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Persistence Test Project',
      description: 'Testing task persistence lifecycle across sessions',
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    }),
  });

  const projBody = await projRes.json();
  assert(projRes.status === 201, 'Project created successfully');
  const projectId = projBody.project.id;

  // 3. Admin creates Task assigned to Intern (without explicitly passing isLearningTask)
  const internTaskRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Complete Onboarding Guide',
      description: 'Read the developer handbook and complete setup',
      priority: 'high',
      assigned_to: internId,
      project_id: projectId,
    }),
  });

  const internTaskBody = await internTaskRes.json();
  assert(internTaskRes.status === 201, 'Admin can create task assigned to intern');
  const internTaskId = internTaskBody.task.id;
  assert(internTaskId !== undefined, 'Task ID was generated');
  assert(internTaskBody.task.assigned_to === internId, 'Task assigned to intern');
  assert(internTaskBody.task.created_by === adminId, 'Task records admin as created_by in response');
  assert(internTaskBody.task.is_learning_task === true, 'Task assigned to intern automatically sets isLearningTask = true');

  // 4. Intern fetches task list via GET /api/tasks (simulating browser reload / re-login)
  const internListRes = await app.request('/api/tasks', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${internToken}`,
    },
  });

  const internListBody = await internListRes.json();
  assert(internListRes.status === 200, 'Intern can list tasks');
  const internVisibleTasks = internListBody.tasks || [];
  assert(
    internVisibleTasks.some((t: any) => t.id === internTaskId),
    'Assigned task appears in Intern task list after query'
  );

  // 5. Intern retrieves single task details via GET /api/tasks/:id
  const internGetRes = await app.request(`/api/tasks/${internTaskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${internToken}`,
    },
  });

  const internGetBody = await internGetRes.json();
  assert(internGetRes.status === 200, 'Intern can view assigned task details without 403 Forbidden');
  assert(internGetBody.task.id === internTaskId, 'Intern retrieved correct task payload');
  assert(internGetBody.task.created_by === adminId, 'Task details payload includes created_by');

  // 6. Employee creates task for themselves
  const empTaskRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      title: 'Configure DB Connection Pooling',
      description: 'Optimize Neon serverless pool sizing',
      priority: 'medium',
      assigned_to: empId,
      project_id: projectId,
    }),
  });

  const empTaskBody = await empTaskRes.json();
  assert(empTaskRes.status === 201, 'Employee can create task');
  const empTaskId = empTaskBody.task.id;
  assert(empTaskBody.task.created_by === empId, 'Employee task records creator ID');

  // 7. Employee queries task list via GET /api/tasks
  const empListRes = await app.request('/api/tasks', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${empToken}`,
    },
  });

  const empListBody = await empListRes.json();
  assert(empListRes.status === 200, 'Employee can list tasks');
  const empTasks = empListBody.tasks || [];
  assert(
    empTasks.some((t: any) => t.id === empTaskId),
    'Employee created task is visible to Employee in list query'
  );

  // 8. Direct Repository verification: verify createdBy is stored and mapped
  const repoTask = await TaskRepository.getTaskById(wsId, internTaskId);
  assert(repoTask !== null, 'TaskRepository.getTaskById finds task');
  assert(repoTask?.createdBy === adminId, 'TaskRepository returns createdBy field correctly');

  const repoList = await TaskRepository.listTasks(wsId, { userId: internId, role: 'intern' });
  assert(
    repoList.some((t) => t.id === internTaskId),
    'TaskRepository.listTasks RBAC filter preserves intern assigned task'
  );

  // 9. Intern starts assigned task via /start state machine endpoint
  const startRes = await app.request(`/api/tasks/${internTaskId}/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${internToken}`,
    },
  });

  const startBody = await startRes.json();
  assert(startRes.status === 200, 'Intern starts assigned task successfully');
  assert(startBody.task.status === 'in_progress', 'Updated status is in_progress');

  // 10. Admin updates task details via PATCH /api/tasks/:id
  const updateRes = await app.request(`/api/tasks/${internTaskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      priority: 'urgent',
      description: 'Updated onboarding instructions with latest repo specs',
    }),
  });

  const updateBody = await updateRes.json();
  assert(updateRes.status === 200, 'Admin can update task details');
  assert(updateBody.task.priority === 'urgent', 'Task priority updated to urgent');

  // 11. Verify update persisted in repository retrieval
  const reloadedTask = await TaskRepository.getTaskById(wsId, internTaskId);
  assert(reloadedTask?.status === 'in_progress', 'Reloaded task status is in_progress');
  assert(reloadedTask?.priority === 'urgent', 'Reloaded task priority is urgent');
  assert(reloadedTask?.createdBy === adminId, 'Reloaded task preserves createdBy');

  console.log('\n===============================================================');
  console.log(' ALL TASK PERSISTENCE LIFECYCLE TESTS PASSED (11/11)');
  console.log('===============================================================\n');
}

// Auto-run if executed directly
if (process.argv[1]?.includes('task-persistence-lifecycle')) {
  runTaskPersistenceLifecycleTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test Suite Failed:', err);
      process.exit(1);
    });
}
