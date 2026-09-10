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
  messageAId: string;
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
        email: 'alice.task@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Task Hub',
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
      body: JSON.stringify({ email: 'bob.task@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.task@acme.io', password: 'Password123!' }),
    })
  );
  const bobData = attachSessionToken(loginBobRes, await loginBobRes.json());
  const tokenEmployeeA = bobData.token;
  const userAEmployeeId = bobData.user.id;

  // 3. Invite & Register Ian Intern in Workspace A
  const inviteIanRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'ian.task@acme.io', role: 'intern' }),
    })
  );
  const ianInvite = await inviteIanRes.json();
  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: ianInvite.invite?.token || ianInvite.token,
        name: 'Ian Intern',
        password: 'Password123!',
      }),
    })
  );
  const loginIanRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ian.task@acme.io', password: 'Password123!' }),
    })
  );
  const ianData = attachSessionToken(loginIanRes, await loginIanRes.json());
  const tokenInternA = ianData.token;
  const userAInternId = ianData.user.id;

  // 4. Register Charlie in Workspace B
  const regCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie TenantB',
        email: 'charlie.task@globex.io',
        password: 'Password123!',
        workspaceName: 'Globex Corp',
      }),
    })
  );
  const charlieData = attachSessionToken(regCharlieRes, await regCharlieRes.json());
  const tokenUserB = charlieData.token;
  const workspaceBId = charlieData.workspace.id;

  // 5. Create Channel in Workspace A
  const resChannel = await request('/api/chat/channels', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenAdminA}`,
      'x-workspace-id': workspaceAId,
    },
    body: {
      title: 'general-dev',
      description: 'Engineering coordination',
    },
  });
  assert.equal(resChannel.status, 201, 'Failed to create channel');
  const channelAId = resChannel.body.conversation.id;

  // 6. Post a message in channel from Admin
  const resMsg = await request(`/api/chat/conversations/${channelAId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenAdminA}`,
      'x-workspace-id': workspaceAId,
    },
    body: {
      content: 'Fix the authentication session timeout bug\nWe need this resolved before the customer demo tomorrow.',
    },
  });
  assert.equal(resMsg.status, 201, 'Failed to post message');
  const messageAId = resMsg.body.message.id;

  return {
    tokenAdminA,
    tokenEmployeeA,
    tokenInternA,
    tokenUserB,
    workspaceAId,
    workspaceBId,
    channelAId,
    messageAId,
    userAAdminId,
    userAEmployeeId,
    userAInternId,
  };
}

export async function runChatActionEngineTests() {
  console.log('\n--- Running Suite 50: Chat -> Action Engine (Phase 2.1 & 2.2) ---');
  const ctx = await setupTestData();

  // Test 1: POST /api/tasks/from-message Task Creation with Linkage Fields
  console.log('Test 1: Task creation from message attaches linkage fields');
  const resFromMsg = await request('/api/tasks/from-message', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenAdminA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: {
      messageId: ctx.messageAId,
      title: 'Fix auth session timeout race condition',
      description: 'Extracted from chat discussion',
      priority: 'high',
      assignedTo: ctx.userAEmployeeId,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    },
  });

  assert.equal(resFromMsg.status, 201, `Expected 201 Created, got ${resFromMsg.status}: ${JSON.stringify(resFromMsg.body)}`);
  const createdTask = resFromMsg.body.task;
  assert.ok(createdTask, 'Expected task in response body');
  assert.equal(createdTask.title, 'Fix auth session timeout race condition');
  assert.equal(createdTask.priority, 'high');
  assert.equal(createdTask.assignedTo || createdTask.assigned_to, ctx.userAEmployeeId);

  // Linkage verification
  assert.equal(createdTask.sourceMessageId || createdTask.source_message_id, ctx.messageAId);
  assert.equal(createdTask.sourceConversationId || createdTask.source_conversation_id, ctx.channelAId);
  assert.equal(createdTask.linkedConversationId || createdTask.linked_conversation_id, ctx.channelAId);
  assert.equal(createdTask.linkedMessageId || createdTask.linked_message_id, ctx.messageAId);
  console.log('✓ Task created with source & linked conversation/message IDs');

  // Test 2: Message displays Linked Task with Status Badge and Assignee
  console.log('Test 2: Chat message displays linked task with status and assignee');
  const getMsgRes = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.tokenAdminA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
  });
  assert.equal(getMsgRes.status, 200);
  const messagesList = getMsgRes.body.messages || getMsgRes.body;
  const enrichedMsg = messagesList.find((m: any) => m.id === ctx.messageAId);
  assert.ok(enrichedMsg, 'Target message must exist');
  assert.ok(enrichedMsg.linkedTasks && enrichedMsg.linkedTasks.length > 0, 'Expected linkedTasks array on message');
  const firstLinkedTask = enrichedMsg.linkedTasks[0];
  assert.equal(firstLinkedTask.taskId, createdTask.id);
  assert.ok(firstLinkedTask.task, 'Expected nested task details in messageTask');
  assert.equal(firstLinkedTask.task.status, 'todo');
  assert.equal(firstLinkedTask.task.assignedTo, ctx.userAEmployeeId);
  assert.equal(firstLinkedTask.task.assigneeName, 'Bob Employee');
  console.log('✓ Message feed displays linked task, status badge, and assignee name');

  // Test 3: Intern RBAC Restriction (Self-assign only)
  console.log('Test 3: Intern cannot create task assigned to another user');
  const internIllegalRes = await request('/api/tasks/from-message', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenInternA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: {
      messageId: ctx.messageAId,
      title: 'Intern attempts to assign task to employee',
      assignedTo: ctx.userAEmployeeId, // Forbidden!
    },
  });
  assert.equal(internIllegalRes.status, 403, `Expected 403 for intern assigning to someone else, got ${internIllegalRes.status}`);
  console.log('✓ Intern rejected with 403 when assigning to another user');

  console.log('Test 3b: Intern CAN create task assigned to self');
  const internLegalRes = await request('/api/tasks/from-message', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenInternA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: {
      messageId: ctx.messageAId,
      title: 'Intern task assigned to self',
      assignedTo: ctx.userAInternId,
    },
  });
  assert.equal(internLegalRes.status, 201, `Expected 201 for intern self-assign, got ${internLegalRes.status}`);
  assert.equal(internLegalRes.body.task.assignedTo || internLegalRes.body.task.assigned_to, ctx.userAInternId);
  console.log('✓ Intern successfully created task assigned to self');

  // Test 4: Task Discussion Panel Endpoints (GET /api/tasks/:id/discussion)
  console.log('Test 4: GET /api/tasks/:id/discussion retrieves linked conversation context');
  const getDiscussionRes = await request(`/api/tasks/${createdTask.id}/discussion`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.tokenEmployeeA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
  });
  assert.equal(getDiscussionRes.status, 200);
  assert.ok(getDiscussionRes.body.task, 'Expected task');
  assert.ok(getDiscussionRes.body.conversation, 'Expected linked conversation');
  assert.equal(getDiscussionRes.body.conversation.id, ctx.channelAId);
  assert.ok(getDiscussionRes.body.sourceMessage, 'Expected source message');
  assert.equal(getDiscussionRes.body.sourceMessage.id, ctx.messageAId);
  assert.ok(Array.isArray(getDiscussionRes.body.messages), 'Expected messages array');
  assert.ok(getDiscussionRes.body.messages.some((m: any) => m.id === ctx.messageAId), 'Expected source message in conversation messages');
  console.log('✓ GET /api/tasks/:id/discussion successfully resolved conversation & messages');

  // Test 5: POST /api/tasks/:id/discussion Posts into Linked Chat Conversation
  console.log('Test 5: POST /api/tasks/:id/discussion posts directly into linked conversation');
  let chatMessageCreatedEmitted = false;
  const offMsg = EventBus.subscribe('chat.message.created', (event: any) => {
    if (event.payload?.message?.conversationId === ctx.channelAId) {
      chatMessageCreatedEmitted = true;
    }
  });

  const postDiscussionRes = await request(`/api/tasks/${createdTask.id}/discussion`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenEmployeeA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: {
      content: 'I have isolated the root cause: redis lease expiration during reconnect.',
    },
  });
  offMsg();

  assert.equal(postDiscussionRes.status, 201);
  assert.ok(postDiscussionRes.body.message, 'Expected posted message');
  assert.equal(postDiscussionRes.body.message.conversationId, ctx.channelAId);
  assert.equal(postDiscussionRes.body.message.content, 'I have isolated the root cause: redis lease expiration during reconnect.');
  assert.equal(chatMessageCreatedEmitted, true, 'Expected chat.message.created to be broadcast on EventBus');
  console.log('✓ POST /api/tasks/:id/discussion posted to chat and emitted realtime event');

  // Test 6: Realtime Task Status Change Broadcast
  console.log('Test 6: Task status changes emit chat.task.status_changed on EventBus');
  let statusChangedEventPayload: any = null;
  const offStatus = EventBus.subscribe('chat.task.status_changed', (event: any) => {
    if (event.payload?.taskId === createdTask.id) {
      statusChangedEventPayload = event.payload;
    }
  });

  const updateStatusRes = await request(`/api/tasks/${createdTask.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${ctx.tokenEmployeeA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: { status: 'in_progress' },
  });
  offStatus();

  assert.equal(updateStatusRes.status, 200);
  assert.ok(statusChangedEventPayload, 'Expected chat.task.status_changed event to fire');
  assert.equal(statusChangedEventPayload.taskId, createdTask.id);
  assert.equal(statusChangedEventPayload.status, 'in_progress');
  assert.equal(statusChangedEventPayload.linkedConversationId, ctx.channelAId);
  console.log('✓ Task status transition (in_progress) broadcast into linked chat realtime channel');

  // Test 7: Multi-Tenant Cross-Workspace Isolation
  console.log('Test 7: Cross-workspace tenant isolation');
  const crossWsTaskRes = await request('/api/tasks/from-message', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenUserB}`,
      'x-workspace-id': ctx.workspaceBId,
    },
    body: {
      messageId: ctx.messageAId,
      title: 'Malicious Cross-Tenant Task Creation',
    },
  });
  assert.ok(
    crossWsTaskRes.status === 404 || crossWsTaskRes.status === 403,
    `Expected 403 or 404 for foreign message, got ${crossWsTaskRes.status}`
  );

  const crossWsDiscussionRes = await request(`/api/tasks/${createdTask.id}/discussion`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.tokenUserB}`,
      'x-workspace-id': ctx.workspaceBId,
    },
  });
  assert.equal(crossWsDiscussionRes.status, 404, `Expected 404 for foreign task discussion, got ${crossWsDiscussionRes.status}`);

  const crossWsPostDiscussionRes = await request(`/api/tasks/${createdTask.id}/discussion`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenUserB}`,
      'x-workspace-id': ctx.workspaceBId,
    },
    body: { content: 'Foreign tenant injection' },
  });
  assert.equal(crossWsPostDiscussionRes.status, 404, `Expected 404 for foreign task discussion post, got ${crossWsPostDiscussionRes.status}`);
  console.log('✓ Strict multi-tenant isolation enforced for all task-message linkage and discussion endpoints');

  console.log('All Suite 50: Chat -> Action Engine tests passed!\n');
}

if (process.argv[1]?.endsWith('chat-action-engine.test.ts')) {
  runChatActionEngineTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Chat action engine tests failed:', err);
      process.exit(1);
    });
}
