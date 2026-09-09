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

export async function runChatMessageTaskTests() {
  console.log('\n--- Running Suite 42: Chat Message To Task Conversion (Phase 2A) ---');
  const ctx = await setupTestData();

  // Test 1: Admin converts message to task
  console.log('Test 1: Admin converts message to task with auto-filled fields');
  let receivedRealtimeEvents: any[] = [];
  const unsubscribe = EventBus.subscribe('chat.task.created', (evt: any) => {
    receivedRealtimeEvents.push(evt);
  });

  const resAdminTask = await request(`/api/chat/messages/${ctx.messageAId}/create-task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenAdminA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: {
      priority: 'urgent',
    },
  });

  assert.equal(resAdminTask.status, 201, `Admin task creation failed: ${JSON.stringify(resAdminTask.body)}`);
  assert.ok(resAdminTask.body.task, 'Response must contain task');
  assert.ok(resAdminTask.body.messageTask, 'Response must contain messageTask');
  assert.equal(resAdminTask.body.task.title, 'Fix the authentication session timeout bug', 'Title should be first line of message');
  assert.ok(resAdminTask.body.task.description.includes('Fix the authentication session timeout bug'), 'Description should contain original message');
  assert.equal(resAdminTask.body.task.priority, 'urgent');
  assert.equal(resAdminTask.body.messageTask.messageId, ctx.messageAId);
  console.log('✓ Admin task conversion succeeded with auto-filled fields');

  // Test 2: Realtime event verification
  console.log('Test 2: Realtime event emission (chat.task.created)');
  const taskCreatedEvent = receivedRealtimeEvents.find((e) => e.type === 'chat.task.created');
  assert.ok(taskCreatedEvent, 'Realtime event chat.task.created must be fired');
  assert.equal(taskCreatedEvent.payload.messageId, ctx.messageAId);
  assert.equal(taskCreatedEvent.payload.taskId, resAdminTask.body.task.id);
  console.log('✓ Realtime event chat.task.created emitted properly');
  unsubscribe();

  // Test 3: Employee converts message to task
  console.log('Test 3: Employee converts message to task');
  const resEmpTask = await request(`/api/chat/messages/${ctx.messageAId}/create-task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenEmployeeA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: {
      title: 'Employee-created task for QA review',
      description: 'Review the session timeout test suite',
      priority: 'medium',
      assigneeId: ctx.userAEmployeeId,
    },
  });

  assert.equal(resEmpTask.status, 201, `Employee task creation failed: ${JSON.stringify(resEmpTask.body)}`);
  assert.equal(resEmpTask.body.task.title, 'Employee-created task for QA review');
  assert.equal(resEmpTask.body.messageTask.createdBy, ctx.userAEmployeeId);
  console.log('✓ Employee task conversion succeeded');

  // Test 4: Intern converts message to task
  console.log('Test 4: Intern converts message to task');
  const resInternTask = await request(`/api/chat/messages/${ctx.messageAId}/create-task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenInternA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
    body: {
      title: 'Intern follow-up notes',
      priority: 'low',
    },
  });

  assert.equal(resInternTask.status, 201, `Intern task creation failed: ${JSON.stringify(resInternTask.body)}`);
  assert.equal(resInternTask.body.task.title, 'Intern follow-up notes');
  assert.equal(resInternTask.body.messageTask.createdBy, ctx.userAInternId);
  console.log('✓ Intern task conversion succeeded');

  // Test 5: Task linkage verification
  console.log('Test 5: Task linkage verification in message listings');
  const resMessages = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.tokenAdminA}`,
      'x-workspace-id': ctx.workspaceAId,
    },
  });

  assert.equal(resMessages.status, 200);
  const messagesList = resMessages.body.messages || resMessages.body;
  const targetMessage = messagesList.find((m: any) => m.id === ctx.messageAId);
  assert.ok(targetMessage, 'Target message must exist');
  assert.ok(Array.isArray(targetMessage.linkedTasks), 'linkedTasks must be an array');
  assert.equal(targetMessage.linkedTasks.length, 3, 'Message should have 3 linked tasks');
  const titles = targetMessage.linkedTasks.map((t: any) => t.task?.title || t.title);
  assert.ok(titles.includes('Fix the authentication session timeout bug'), `Missing title: ${titles}`);
  assert.ok(titles.includes('Employee-created task for QA review'), `Missing emp title: ${titles}`);
  assert.ok(titles.includes('Intern follow-up notes'), `Missing intern title: ${titles}`);
  console.log('✓ Message reflects all linked tasks with status and title');

  // Test 6: Tenant isolation
  console.log('Test 6: Tenant isolation check');
  const resTenantB = await request(`/api/chat/messages/${ctx.messageAId}/create-task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.tokenUserB}`,
      'x-workspace-id': ctx.workspaceBId,
    },
    body: {
      title: 'Malicious cross-tenant task creation',
    },
  });

  assert.ok(
    resTenantB.status === 404 || resTenantB.status === 403,
    `Cross-tenant access must be rejected with 403 or 404, got ${resTenantB.status}`
  );
  console.log('✓ Cross-tenant task creation blocked as expected');

  console.log('All Suite 42: Chat Message To Task Conversion tests passed!\n');
}

if (process.argv[1]?.endsWith('chat-message-task.test.ts')) {
  runChatMessageTaskTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Chat message task tests failed:', err);
      process.exit(1);
    });
}
