/**
 * Suite 46: Chat Activity Feed (Phase 2E Operational Activity Feed) Test Suite
 *
 * Validates:
 * 1. Activity ingestion across all 7 operational events:
 *    - Task Created
 *    - Task Updated
 *    - Task Completed
 *    - Project Assigned
 *    - Document Updated
 *    - Employee Added
 *    - SOP Published
 * 2. Timeline API retrieval (GET /api/chat/conversations/:id/timeline)
 * 3. Strict Multi-Tenant Isolation (Workspace B cannot access Workspace A's timeline or activities)
 * 4. Realtime delivery via EventBus ('chat.activity.created' / 'activity_created')
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { EventBus } from '../src/realtime/event-bus';
import { ActivityAggregationService } from '../src/services/activity-aggregation-service';
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
        email: 'alice.act@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Activity Hub',
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
      body: JSON.stringify({ email: 'bob.act@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.act@acme.io', password: 'Password123!' }),
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
      body: JSON.stringify({ email: 'charlie.act@acme.io', role: 'intern' }),
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
      body: JSON.stringify({ email: 'charlie.act@acme.io', password: 'Password123!' }),
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
        email: 'eve.act@other.io',
        password: 'Password123!',
        workspaceName: 'Competitor Activity Hub',
      }),
    })
  );
  const eveData = attachSessionToken(regEveRes, await regEveRes.json());
  const tokenUserB = eveData.token;
  const workspaceBId = eveData.workspace.id;

  // 5. Create channel in Workspace A
  const createChannelRes = await request('/api/chat/channels', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { title: 'ops-activity', description: 'Operational activity hub' },
  });
  const channelAId = createChannelRes.body.conversation.id;

  // 6. Create Project in Workspace A
  const createProjectRes = await request('/api/projects', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: {
      title: 'Alpha Initiative',
      description: 'Alpha mission',
      status: 'in_progress',
    },
  });
  const projectIdA = createProjectRes.body.project?.id || createProjectRes.body.id;

  // 7. Link project to conversation context
  await request(`/api/chat/conversations/${channelAId}/context`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { projectId: projectIdA },
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

export async function runChatActivityFeedTests(): Promise<void> {
  console.log('\n--- Running Suite 46: Operational Activity Feed (Phase 2E) ---');

  const ctx = await setupTestData();
  ActivityAggregationService.initSubscriptions();

  // =========================================================================
  // Test 1: Ingestion of All 7 Operational Events
  // =========================================================================
  console.log('Test 1: Ingest all 7 operational events via EventBus & Service');

  // Event 1: Task Created
  EventBus.publishWorkspaceEvent(
    ctx.workspaceAId,
    'task_created',
    {
      taskId: 'task-101',
      title: 'Design API Specs',
      projectId: ctx.projectIdA,
      assignedTo: ctx.userAEmployeeId,
    },
    { actorId: ctx.userAAdminId }
  );

  // Event 2: Task Updated
  EventBus.publishWorkspaceEvent(
    ctx.workspaceAId,
    'task_updated',
    {
      taskId: 'task-101',
      title: 'Design API Specs (Revision 2)',
      projectId: ctx.projectIdA,
      assignedTo: ctx.userAEmployeeId,
      status: 'in_progress',
    },
    { actorId: ctx.userAEmployeeId }
  );

  // Event 3: Task Completed
  EventBus.publishWorkspaceEvent(
    ctx.workspaceAId,
    'task_completed',
    {
      taskId: 'task-101',
      title: 'Design API Specs (Revision 2)',
      projectId: ctx.projectIdA,
      status: 'completed',
    },
    { actorId: ctx.userAEmployeeId }
  );

  // Event 4: Project Assigned / Created
  EventBus.publishWorkspaceEvent(
    ctx.workspaceAId,
    'project_created',
    {
      projectId: ctx.projectIdA,
      title: 'Alpha Initiative',
      assignedTo: ctx.userAEmployeeId,
    },
    { actorId: ctx.userAAdminId }
  );

  // Event 5: Document Updated
  EventBus.publishWorkspaceEvent(
    ctx.workspaceAId,
    'document_updated',
    {
      documentId: 'doc-777',
      title: 'Architecture Blueprint',
      fileType: 'pdf',
    },
    { actorId: ctx.userAAdminId }
  );

  // Event 6: Employee Added
  EventBus.publishWorkspaceEvent(
    ctx.workspaceAId,
    'employee_added',
    {
      userId: 'user-new-joiner',
      name: 'Devon Lee',
      role: 'employee',
      email: 'devon@workspace.com',
    },
    { actorId: ctx.userAAdminId }
  );

  // Event 7: SOP Published
  EventBus.publishWorkspaceEvent(
    ctx.workspaceAId,
    'sop_published',
    {
      sopId: 'sop-999',
      title: 'Production Deployment Protocol',
    },
    { actorId: ctx.userAAdminId }
  );

  // Small delay for event loop cycle
  await new Promise((r) => setTimeout(r, 50));

  // Check in-memory activity logs
  const logsA = Array.from(inMemoryDb.activityLogs.values()).filter((l) => l.workspaceId === ctx.workspaceAId);
  assert.ok(logsA.length >= 7, `Expected at least 7 activity logs, found ${logsA.length}`);
  console.log('✓ Ingested all 7 operational events into activity logs');

  // =========================================================================
  // Test 2: Timeline API Retrieval (GET /api/chat/conversations/:id/timeline)
  // =========================================================================
  console.log('Test 2: Retrieve timeline via GET /api/chat/conversations/:id/timeline');
  const resTimeline = await request(`/api/chat/conversations/${ctx.channelAId}/timeline`, {
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });

  assert.equal(resTimeline.status, 200, `Expected 200 status, got ${resTimeline.status}`);
  assert.equal(resTimeline.body.conversationId, ctx.channelAId);
  assert.equal(resTimeline.body.projectId, ctx.projectIdA);
  assert.ok(Array.isArray(resTimeline.body.timeline), 'Timeline should be an array');
  assert.ok(resTimeline.body.timeline.length >= 5, `Expected >= 5 timeline items, got ${resTimeline.body.timeline.length}`);

  // Validate item format
  const sample = resTimeline.body.timeline[0];
  assert.ok(sample.id, 'Timeline item must have id');
  assert.ok(sample.user, 'Timeline item must have user');
  assert.ok(sample.action, 'Timeline item must have action');
  assert.ok(sample.createdAt, 'Timeline item must have timestamp');
  console.log('✓ Timeline API returns structured cards with User, Action, and Timestamp');

  // =========================================================================
  // Test 3: Multi-Tenant Isolation
  // =========================================================================
  console.log('Test 3: Multi-tenant isolation verification');
  // Tenant B cannot access Tenant A's conversation timeline
  const resTenantB = await request(`/api/chat/conversations/${ctx.channelAId}/timeline`, {
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
  });

  assert.equal(resTenantB.status, 404, `Tenant B should receive 404 Not Found when attempting to access Tenant A conversation, got ${resTenantB.status}`);

  // Direct Ingestion of Workspace B activity should not leak into Workspace A
  await ActivityAggregationService.ingestActivity({
    workspaceId: ctx.workspaceBId,
    userId: 'user-b-admin',
    action: 'created',
    entityType: 'task',
    entityId: 'task-b-secret',
    metadata: { title: 'Tenant B Confidential Plan' },
  });

  const resTimelineRefetched = await request(`/api/chat/conversations/${ctx.channelAId}/timeline`, {
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
  });
  assert.equal(resTimelineRefetched.status, 200);
  const leaked = resTimelineRefetched.body.timeline.some((t: any) => t.metadata?.title?.includes('Tenant B'));
  assert.equal(leaked, false, 'Tenant B activities must never leak into Tenant A timeline');
  console.log('✓ Strict multi-tenant isolation preserved across timeline feeds');

  // =========================================================================
  // Test 4: Realtime Delivery
  // =========================================================================
  console.log('Test 4: Realtime delivery via EventBus');
  let realtimeReceived = false;
  const unsubscribe = EventBus.subscribe('chat.activity.created', (event) => {
    if (event.workspaceId === ctx.workspaceAId && event.payload?.metadata?.title === 'Urgent Bug Fix') {
      realtimeReceived = true;
    }
  });

  await ActivityAggregationService.ingestActivity({
    workspaceId: ctx.workspaceAId,
    userId: ctx.userAAdminId,
    action: 'created',
    entityType: 'task',
    entityId: 'task-urgent-1',
    metadata: { title: 'Urgent Bug Fix' },
  });

  await new Promise((r) => setTimeout(r, 20));
  unsubscribe();
  assert.equal(realtimeReceived, true, 'Realtime event chat.activity.created must be broadcasted on activity ingestion');
  console.log('✓ Realtime delivery verified via EventBus');

  console.log('\n--- Suite 46: All Tests Passed Cleanly ---');
}

if (process.argv[1]?.endsWith('chat-activity-feed.test.ts')) {
  runChatActivityFeedTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
