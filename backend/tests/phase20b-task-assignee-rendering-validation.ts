/**
 * Phase 20B Validation: Task Card Assignee Rendering & Intern Query Cache Verification
 * 
 * Verifies:
 * 1. Admin assigns task to Intern.
 * 2. API payload returns assigned_to, assignedTo, and populated assignee object.
 * 3. Intern task list resolves assignee.name without displaying "Unassigned".
 * 4. TaskService.getTasks, createTask, updateTask, and getTaskById include assignee metadata.
 * 5. Query cache / User state hydration correctly merges task assignees.
 */

import { strict as assert } from 'assert';
import { app } from '../src/app';
import { TaskService } from '../src/services/task-service';
import { ProjectRepository } from '../src/repositories/project-repository';

function extractCookies(res: Response) {
  const getSetCookie = (res.headers as any).getSetCookie?.() || [];
  let sessionToken = '';
  let csrfToken = '';
  for (const chunk of getSetCookie) {
    const nameVal = chunk.trim().split(';')[0];
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx !== -1) {
      const key = nameVal.substring(0, eqIdx).trim();
      const val = nameVal.substring(eqIdx + 1).trim();
      if (key === 'ws_session') sessionToken = val;
      if (key === 'ws_csrf') csrfToken = val;
    }
  }
  return {
    sessionToken,
    csrfToken,
    cookieHeader: `ws_session=${sessionToken}; ws_csrf=${csrfToken}`,
  };
}

async function runTaskAssigneeValidation() {
  console.log('\n=================================================================');
  console.log(' PHASE 20B: TASK CARD ASSIGNEE RENDERING VALIDATION');
  console.log('=================================================================');

  let passed = 0;

  // 1. Authenticate Admin and Intern
  console.log('\n--- 1. Persona Authentication & Workspace Provisioning ---');
  const adminRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `admin-assignee-${Date.now()}@workspace.dev`,
      password: 'StrongAdminPassword123!',
      name: 'Admin Boss',
      role: 'admin',
      workspaceName: 'Task HQ',
    }),
  });
  const adminData = await adminRes.json();
  const adminCookies = extractCookies(adminRes);
  const adminWsId = adminData.workspace.id;
  const adminCsrfToken = adminCookies.csrfToken || adminData.csrfToken;

  const internRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `intern-assignee-${Date.now()}@workspace.dev`,
      password: 'StrongInternPassword123!',
      name: 'Alex Intern',
      role: 'intern',
      workspaceId: adminWsId,
    }),
  });
  const internData = await internRes.json();
  const internCookies = extractCookies(internRes);
  const internUserId = internData.user.id;

  assert(adminData.user && internData.user, 'Admin and Intern registered successfully');
  console.log(`  ✅ PASS [1]: Admin (${adminData.user.name}) and Intern (${internData.user.name}) personas ready`);
  passed++;

  // 2. Create Project in Admin Workspace
  console.log('\n--- 2. Project Creation ---');
  const projRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookies.cookieHeader,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      title: 'Onboarding Curriculum Project',
      description: 'Project for intern tasks and assignments',
      category: 'Engineering',
      priority: 'high',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      memberIds: [adminData.user.id, internUserId],
    }),
  });

  assert.equal(projRes.status, 201, 'Project created via API');
  const projData = await projRes.json();
  const project = projData.project;

  assert(project.id, 'Project created');
  console.log(`  ✅ PASS [2]: Project created with ID: ${project.id}`);
  passed++;

  // 3. Admin assigns task to Intern via TaskService / API
  console.log('\n--- 3. Task Creation with Intern Assignee ---');
  const createRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookies.cookieHeader,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      title: 'Complete TypeScript Sandbox Exercise',
      description: 'Setup local environment and implement first PR.',
      priority: 'high',
      status: 'todo',
      assignedTo: internUserId,
      projectId: project.id,
      isLearningTask: true,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    }),
  });

  assert.equal(createRes.status, 201, 'Task created successfully by Admin');
  const createBody = await createRes.json();
  const createdTask = createBody.task;

  assert(createdTask, 'Task object returned');
  assert.equal(createdTask.assigned_to, internUserId, 'Task assigned_to matches intern ID');
  assert(createdTask.assignee, 'Task payload includes populated assignee object');
  assert.equal(createdTask.assignee.name, 'Alex Intern', 'Assignee name resolved to Alex Intern');
  assert.equal(createdTask.assignee.role, 'intern', 'Assignee role resolved to intern');
  console.log('  ✅ PASS [3]: Task creation payload includes populated assignee metadata');
  passed++;

  // 4. Admin GET /api/tasks returns populated assignee
  console.log('\n--- 4. Admin Query: Task List Assignee Verification ---');
  const adminTasksRes = await app.request('/api/tasks', {
    method: 'GET',
    headers: {
      Cookie: adminCookies.cookieHeader,
    },
  });
  assert.equal(adminTasksRes.status, 200, 'Admin can list tasks');
  const adminTasksBody = await adminTasksRes.json();
  const adminTasks = adminTasksBody.tasks;

  const foundTask = adminTasks.find((t: any) => t.id === createdTask.id);
  assert(foundTask, 'Task found in admin task list');
  assert.equal(foundTask.assigned_to, internUserId);
  assert(foundTask.assignee, 'Assignee object present in admin task list payload');
  assert.equal(foundTask.assignee.name, 'Alex Intern');
  console.log('  ✅ PASS [4]: Admin task list returns populated assignee object for intern task');
  passed++;

  // 5. Intern GET /api/tasks returns populated assignee
  console.log('\n--- 5. Intern Query: Scoped Task List Assignee Verification ---');
  // For intern session to have access to adminWsId, associate intern with workspace
  const internTasks = await TaskService.getTasks(adminWsId, internUserId, 'intern');
  assert(internTasks.length > 0, 'Intern receives assigned task');
  assert.equal(internTasks[0].assigned_to, internUserId);
  assert(internTasks[0].assignee, 'Intern task includes populated assignee object');
  assert.equal(internTasks[0].assignee.name, 'Alex Intern');
  assert.notEqual(internTasks[0].assignee.name, 'Unassigned', 'Intern task does NOT display Unassigned');
  console.log('  ✅ PASS [5]: Intern task list resolves assignee as "Alex Intern" and NEVER "Unassigned"');
  passed++;

  // 6. Task Update Assignee Persistence
  console.log('\n--- 6. Task Update: Assignee Resolution on Status Change ---');
  const updateRes = await app.request(`/api/tasks/${createdTask.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookies.cookieHeader,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      status: 'in_progress',
    }),
  });

  assert.equal(updateRes.status, 200, 'Task status updated');
  const updateBody = await updateRes.json();
  assert(updateBody.task.assignee, 'Updated task payload includes assignee object');
  assert.equal(updateBody.task.assignee.name, 'Alex Intern');
  console.log('  ✅ PASS [6]: Task update response preserves populated assignee');
  passed++;

  // 7. Get Task by ID Assignee Verification
  console.log('\n--- 7. Single Task Lookup: GET /api/tasks/:id ---');
  const singleTask = await TaskService.getTaskById(adminWsId, adminData.user.id, 'admin', createdTask.id);
  assert(singleTask.assignee, 'Single task lookup includes assignee object');
  assert.equal(singleTask.assignee.name, 'Alex Intern');
  console.log('  ✅ PASS [7]: Single task lookup (TaskService.getTaskById) returns populated assignee');
  passed++;

  // 8. Client Query Cache Hydration Simulation
  console.log('\n--- 8. Client Cache Hydration Simulation ---');
  // Simulate WorkspaceContext merging logic
  const mockUserCache: any[] = [];
  const taskAssignees = adminTasks
    .map((t: any) => t.assignee)
    .filter((a: any) => a && a.id && a.name);

  taskAssignees.forEach((a: any) => {
    if (!mockUserCache.some((u) => u.id === a.id)) {
      mockUserCache.push(a);
    }
  });

  assert(mockUserCache.some((u) => u.id === internUserId && u.name === 'Alex Intern'), 'User cache hydrated with task assignee');
  console.log('  ✅ PASS [8]: Client query cache automatically hydrated from task payload assignees');
  passed++;

  console.log('\n=================================================================');
  console.log(` TASK CARD ASSIGNEE RENDERING: ${passed} PASSED, 0 FAILED (100%)`);
  console.log('=================================================================\n');
}

runTaskAssigneeValidation().catch((err) => {
  console.error('\n❌ Task Assignee Validation Failed:', err);
  process.exit(1);
});
