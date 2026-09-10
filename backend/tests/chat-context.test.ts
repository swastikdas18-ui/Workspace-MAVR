/**
 * Suite 45: Chat Context (Phase 2D Context-Aware Conversations) Test Suite
 *
 * Validates:
 * 1. Context loading (GET /api/chat/conversations/:id/context)
 * 2. Context updates (PUT /api/chat/conversations/:id/context)
 * 3. Project linking & operational aggregates (Project info, Open Tasks, Members, Active SOPs)
 * 4. RBAC Permissions (Admin & Employee can update context; Intern forbidden 403)
 * 5. Strict Tenant Isolation (Workspace B cannot access Workspace A's conversation context)
 * 6. Realtime event dispatch (chat.context.updated)
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { EventBus } from '../src/realtime/event-bus';
import { attachSessionToken } from './session-test-utils';

interface TestContext {
  tokenAdminA: string;
  tokenEmployeeA: string;
  tokenInternA: string;
  tokenUserB: string;
  workspaceAId: string;
  workspaceBId: string;
  channelAId: string;
  projectIdA: string;
  userAAdminId: string;
  userAEmployeeId: string;
  userAInternId: string;
}

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const init: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body !== undefined) {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await app.fetch(new Request(`http://localhost:3000${path}`, init));
  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: response.status, body: json, headers: response.headers };
}

async function setupTestData(): Promise<TestContext> {
  inMemoryDb.reset();

  // 1. Register Admin in Workspace A
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Admin',
        email: 'alice.context@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Context Hub',
      }),
    })
  );
  const aliceData = attachSessionToken(regAliceRes, await regAliceRes.json());
  const tokenAdminA = aliceData.token;
  const workspaceAId = aliceData.workspace.id;
  const userAAdminId = aliceData.user.id;
  const aliceHeaders = {
    Authorization: `Bearer ${tokenAdminA}`,
    'Content-Type': 'application/json',
  };

  // 2. Invite & Register Bob Employee in Workspace A
  const inviteBobRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'bob.context@acme.io', role: 'employee' }),
    })
  );
  const bobInvite = await inviteBobRes.json();
  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: bobInvite.invite?.token || bobInvite.token,
        name: 'Bob Employee',
        password: 'Password123!',
      }),
    })
  );
  const loginBobRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob.context@acme.io', password: 'Password123!' }),
    })
  );
  const bobData = attachSessionToken(loginBobRes, await loginBobRes.json());
  const tokenEmployeeA = bobData.token;
  const userAEmployeeId = bobData.user.id;

  // 3. Invite & Register Charlie Intern in Workspace A
  const inviteCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'charlie.context@acme.io', role: 'intern' }),
    })
  );
  const charlieInvite = await inviteCharlieRes.json();
  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: charlieInvite.invite?.token || charlieInvite.token,
        name: 'Charlie Intern',
        password: 'Password123!',
      }),
    })
  );
  const loginCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'charlie.context@acme.io', password: 'Password123!' }),
    })
  );
  const charlieData = attachSessionToken(loginCharlieRes, await loginCharlieRes.json());
  const tokenInternA = charlieData.token;
  const userAInternId = charlieData.user.id;

  // 4. Register Eve in Workspace B (for cross-tenant testing)
  const regEveRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eve Evil',
        email: 'eve.context@other.io',
        password: 'Password123!',
        workspaceName: 'Competitor Context Hub',
      }),
    })
  );
  const eveData = attachSessionToken(regEveRes, await regEveRes.json());
  const tokenUserB = eveData.token;
  const workspaceBId = eveData.workspace.id;

  // 5. Create a channel in Workspace A
  const createChannelRes = await request('/api/chat/channels', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { title: 'project-war-room', description: 'Operations discussion for Workspace OS' },
  });
  const channelAId = createChannelRes.body.conversation.id;

  // 6. Create a Project in Workspace A: "Workspace OS"
  const createProjectRes = await request('/api/projects', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: {
      title: 'Workspace OS',
      description: 'Unified operating system for knowledge teams',
      status: 'in_progress',
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    },
  });
  const projectIdA = createProjectRes.body.project?.id || createProjectRes.body.id;

  // 7. Seed Tasks for this project: 2 open tasks and 1 completed
  inMemoryDb.tasks.set('task-1', {
    id: 'task-1',
    workspaceId: workspaceAId,
    projectId: projectIdA,
    title: 'Implement Context-Aware Conversations',
    status: 'in_progress',
    priority: 'urgent',
    assignedTo: userAEmployeeId,
    createdAt: new Date(),
  });
  inMemoryDb.tasks.set('task-2', {
    id: 'task-2',
    workspaceId: workspaceAId,
    projectId: projectIdA,
    title: 'Design Operational Header',
    status: 'todo',
    priority: 'high',
    assignedTo: userAEmployeeId,
    createdAt: new Date(),
  });
  inMemoryDb.tasks.set('task-3', {
    id: 'task-3',
    workspaceId: workspaceAId,
    projectId: projectIdA,
    title: 'Completed Task',
    status: 'done',
    priority: 'low',
    assignedTo: userAEmployeeId,
    createdAt: new Date(),
  });

  // 8. Seed Wiki SOP Pages: 3 pages in Workspace A
  inMemoryDb.wikiPages.set('sop-1', {
    id: 'sop-1',
    workspaceId: workspaceAId,
    title: 'Release Deployment Protocol',
    slug: 'release-deployment-protocol',
    visibility: 'workspace',
    createdBy: userAAdminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  inMemoryDb.wikiPages.set('sop-2', {
    id: 'sop-2',
    workspaceId: workspaceAId,
    title: 'Incident Escalation SOP',
    slug: 'incident-escalation-sop',
    visibility: 'workspace',
    createdBy: userAAdminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  inMemoryDb.wikiPages.set('sop-3', {
    id: 'sop-3',
    workspaceId: workspaceAId,
    title: 'Code Review Guidelines',
    slug: 'code-review-guidelines',
    visibility: 'workspace',
    createdBy: userAEmployeeId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    tokenAdminA,
    tokenEmployeeA,
    tokenInternA,
    tokenUserB,
    workspaceAId,
    workspaceBId,
    channelAId,
    projectIdA,
    userAAdminId,
    userAEmployeeId,
    userAInternId,
  };
}

export async function runChatContextTests() {
  console.log('--- Suite 45: Chat Context (Phase 2D Context-Aware Conversations) ---');

  const ctx = await setupTestData();

  // --------------------------------------------------------------------------
  // TEST 1: Context Loading before explicit linking
  // --------------------------------------------------------------------------
  console.log('Test 1: GET /api/chat/conversations/:id/context returns valid initial structure');
  const initialContextRes = await request(`/api/chat/conversations/${ctx.channelAId}/context`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
  });

  assert.equal(initialContextRes.status, 200, 'Should return 200 OK');
  assert.ok(initialContextRes.body.context, 'Context record must be present');
  assert.ok(initialContextRes.body.operational, 'Operational aggregates must be present');
  assert.equal(initialContextRes.body.context.conversationId, ctx.channelAId);
  assert.equal(typeof initialContextRes.body.operational.openTasks, 'number');
  assert.equal(typeof initialContextRes.body.operational.members, 'number');
  assert.equal(typeof initialContextRes.body.operational.activeSops, 'number');

  // --------------------------------------------------------------------------
  // TEST 2: Context Updates & Project Linking by Admin
  // --------------------------------------------------------------------------
  console.log('Test 2: PUT /api/chat/conversations/:id/context links project and returns accurate metrics');
  const realtimeEvents: any[] = [];
  EventBus.subscribe('chat.context.updated', (e) => {
    realtimeEvents.push(e);
  });

  const updateRes = await request(`/api/chat/conversations/${ctx.channelAId}/context`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
    body: {
      projectId: ctx.projectIdA,
    },
  });

  assert.equal(updateRes.status, 200, 'Should return 200 OK on context update');
  assert.equal(updateRes.body.context.projectId, ctx.projectIdA, 'Project ID must match linked project');
  assert.equal(updateRes.body.operational.project.id, ctx.projectIdA);
  assert.equal(updateRes.body.operational.project.title, 'Workspace OS');
  assert.equal(updateRes.body.operational.openTasks, 2, 'Should accurately count 2 open tasks for Workspace OS');
  assert.equal(updateRes.body.operational.activeSops, 3, 'Should reflect 3 active SOPs');

  // Verify realtime event was emitted
  const evt = realtimeEvents.find((e) => (e.payload?.conversationId || e.conversationId) === ctx.channelAId);
  assert.ok(evt, 'chat.context.updated realtime event must be emitted');

  // --------------------------------------------------------------------------
  // TEST 3: Employee can update context (e.g. link team or department)
  // --------------------------------------------------------------------------
  console.log('Test 3: Employee is authorized to update context');
  const empUpdateRes = await request(`/api/chat/conversations/${ctx.channelAId}/context`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: {
      projectId: ctx.projectIdA,
      teamId: 'team-engineering',
    },
  });

  assert.equal(empUpdateRes.status, 200, 'Employee should successfully update context');
  assert.equal(empUpdateRes.body.context.teamId, 'team-engineering');

  // --------------------------------------------------------------------------
  // TEST 4: Intern Permission Enforcement (403 Forbidden)
  // --------------------------------------------------------------------------
  console.log('Test 4: Intern is forbidden from updating context');
  const internUpdateRes = await request(`/api/chat/conversations/${ctx.channelAId}/context`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctx.tokenInternA}` },
    body: {
      projectId: ctx.projectIdA,
    },
  });

  assert.equal(internUpdateRes.status, 403, 'Intern update must return 403 Forbidden');
  assert.equal(internUpdateRes.body.error.code, 'FORBIDDEN');

  // --------------------------------------------------------------------------
  // TEST 5: Cross-Tenant Isolation
  // --------------------------------------------------------------------------
  console.log('Test 5: Cross-tenant isolation prevents foreign workspace access');
  const tenantReadRes = await request(`/api/chat/conversations/${ctx.channelAId}/context`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
  });
  assert.equal(tenantReadRes.status, 404, 'Foreign workspace reading context must return 404');

  const tenantWriteRes = await request(`/api/chat/conversations/${ctx.channelAId}/context`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
    body: { projectId: ctx.projectIdA },
  });
  assert.equal(tenantWriteRes.status, 404, 'Foreign workspace writing context must return 404');

  // --------------------------------------------------------------------------
  // TEST 6: Context Loading reflects updated operational state
  // --------------------------------------------------------------------------
  console.log('Test 6: GET /api/chat/conversations/:id/context retrieves updated context with accurate counts');
  const finalGetRes = await request(`/api/chat/conversations/${ctx.channelAId}/context`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
  });

  assert.equal(finalGetRes.status, 200);
  assert.equal(finalGetRes.body.context.projectId, ctx.projectIdA);
  assert.equal(finalGetRes.body.operational.project.title, 'Workspace OS');
  assert.equal(finalGetRes.body.operational.openTasks, 2);
  assert.equal(finalGetRes.body.operational.activeSops, 3);

  console.log('✅ Suite 45 passed cleanly: Context-Aware Conversations verified.');
}

if (process.argv[1]?.endsWith('chat-context.test.ts') || process.argv[1]?.endsWith('chat-context.test.js')) {
  runChatContextTests().catch((err) => {
    console.error('Chat Context test failure:', err);
    process.exit(1);
  });
}
