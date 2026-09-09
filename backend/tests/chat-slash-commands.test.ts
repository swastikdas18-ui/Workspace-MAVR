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
        email: 'alice.slash@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Slash Hub',
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
      body: JSON.stringify({ email: 'bob.slash@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.slash@acme.io', password: 'Password123!' }),
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
      body: JSON.stringify({ email: 'charlie.slash@acme.io', role: 'intern' }),
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
      body: JSON.stringify({ email: 'charlie.slash@acme.io', password: 'Password123!' }),
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
        email: 'eve.slash@other.io',
        password: 'Password123!',
        workspaceName: 'Competitor Hub',
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
    body: { title: 'engineering-hub', description: 'General engineering chat' },
  });
  const channelAId = createChannelRes.body.conversation.id;

  return {
    tokenAdminA,
    tokenEmployeeA,
    tokenInternA,
    tokenUserB,
    workspaceAId,
    workspaceBId,
    channelAId,
    userAAdminId,
    userAEmployeeId,
    userAInternId,
  };
}

export async function runChatSlashCommandsTests() {
  console.log('--- Suite 44: Chat Slash Command System (Phase 2C) ---');

  const ctx = await setupTestData();

  // --------------------------------------------------------------------------
  // TEST 1: Command Parsing & Task Creation (/task Build landing page)
  // --------------------------------------------------------------------------
  console.log('Test 1: /task creates a task and posts bot response message');
  const taskEvents: any[] = [];
  EventBus.subscribe('chat.slash_command.executed', (e) => {
    taskEvents.push(e);
  });

  const taskRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: { command: '/task Build landing page' },
  });

  assert.equal(taskRes.status, 201, 'Should return 201 Created for /task');
  assert.equal(taskRes.body.slashCommand.command, '/task');
  assert.equal(taskRes.body.slashCommand.args, 'Build landing page');
  assert.ok(taskRes.body.slashCommand.result.taskId, 'Result should include taskId');
  assert.equal(taskRes.body.slashCommand.result.title, 'Build landing page');
  assert.ok(taskRes.body.message, 'Should return created chat message entity');
  assert.ok(taskRes.body.message.content.includes(taskRes.body.slashCommand.result.title));

  // Verify task event was emitted
  const taskEvent = taskEvents.find((e) => (e.payload?.command || e.command) === '/task');
  assert.ok(taskEvent, 'chat.slash_command.executed should be emitted');
  assert.equal(taskEvent.payload?.args || taskEvent.args, 'Build landing page');

  // --------------------------------------------------------------------------
  // TEST 2: Poll Creation (/poll Approve release?)
  // --------------------------------------------------------------------------
  console.log('Test 2: /poll creates an interactive poll in the chat');
  const pollRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: { command: '/poll Approve release v2?' },
  });

  assert.equal(pollRes.status, 201, 'Should return 201 Created for /poll');
  assert.equal(pollRes.body.slashCommand.command, '/poll');
  assert.equal(pollRes.body.slashCommand.args, 'Approve release v2?');
  assert.ok(pollRes.body.slashCommand.result.pollId, 'Result should include pollId');
  assert.equal(pollRes.body.slashCommand.result.question, 'Approve release v2?');
  assert.equal(pollRes.body.slashCommand.result.options.length, 2);
  assert.ok(pollRes.body.message.content.includes(pollRes.body.slashCommand.args));

  // --------------------------------------------------------------------------
  // TEST 3: SOP Creation (/sop Deployment Guidelines)
  // --------------------------------------------------------------------------
  console.log('Test 3: /sop creates a wiki/SOP document for employees and admins');
  const sopRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: { command: '/sop Production Deployment Guidelines' },
  });

  assert.equal(sopRes.status, 201, 'Should return 201 Created for /sop');
  assert.equal(sopRes.body.slashCommand.command, '/sop');
  assert.equal(sopRes.body.slashCommand.args, 'Production Deployment Guidelines');
  assert.ok(sopRes.body.slashCommand.result.pageId, 'Result should include pageId');
  assert.equal(sopRes.body.slashCommand.result.title, 'Production Deployment Guidelines');
  assert.ok(sopRes.body.message.content.includes(sopRes.body.slashCommand.result.title));

  // --------------------------------------------------------------------------
  // TEST 4: Reminder Creation (/remind Team sync tomorrow)
  // --------------------------------------------------------------------------
  console.log('Test 4: /remind schedules a notification reminder');
  const remindRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: { command: '/remind Team sync tomorrow at 10 AM' },
  });

  assert.equal(remindRes.status, 201, 'Should return 201 Created for /remind');
  assert.equal(remindRes.body.slashCommand.command, '/remind');
  assert.equal(remindRes.body.slashCommand.args, 'Team sync tomorrow at 10 AM');
  assert.ok(remindRes.body.slashCommand.result.notificationId, 'Result should include notificationId');
  assert.ok(remindRes.body.message.content.includes(remindRes.body.slashCommand.args));

  // --------------------------------------------------------------------------
  // TEST 5: Project Creation & Admin-Only RBAC (/project Workspace OS v2)
  // --------------------------------------------------------------------------
  console.log('Test 5: /project succeeds for Admin, but is forbidden (403) for Employee & Intern');
  // 5a. Admin creates project
  const adminProjectRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
    body: { command: '/project Create Workspace OS v2' },
  });

  assert.equal(adminProjectRes.status, 201, 'Admin should successfully create project via slash command');
  assert.equal(adminProjectRes.body.slashCommand.command, '/project');
  assert.ok(adminProjectRes.body.slashCommand.result.projectId, 'Result should include projectId');
  assert.equal(adminProjectRes.body.slashCommand.result.title, 'Create Workspace OS v2');

  // 5b. Employee is forbidden from creating project
  const empProjectRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: { command: '/project Unauthorized Project' },
  });
  assert.equal(empProjectRes.status, 403, 'Employee should receive 403 Forbidden for /project');

  // 5c. Intern is forbidden from creating tasks, projects, and SOPs
  console.log('Test 5c: Intern is forbidden from creating /task and /sop');
  const internTaskRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenInternA}` },
    body: { command: '/task Intern Task' },
  });
  assert.equal(internTaskRes.status, 403, 'Intern should receive 403 Forbidden for /task');

  const internSopRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenInternA}` },
    body: { command: '/sop Intern SOP' },
  });
  assert.equal(internSopRes.status, 403, 'Intern should receive 403 Forbidden for /sop');

  // --------------------------------------------------------------------------
  // TEST 6: Slash Command Execution History
  // --------------------------------------------------------------------------
  console.log('Test 6: Retrieve slash command execution history');
  const historyRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-commands`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });

  assert.equal(historyRes.status, 200, 'Should return 200 OK for slash command history');
  assert.ok(Array.isArray(historyRes.body.history), 'History should be an array');
  assert.ok(historyRes.body.history.length >= 4, 'Should contain all successfully executed commands');
  const commandsRecorded = historyRes.body.history.map((h: any) => h.command);
  assert.ok(commandsRecorded.includes('/task'), 'History should contain /task');
  assert.ok(commandsRecorded.includes('/poll'), 'History should contain /poll');
  assert.ok(commandsRecorded.includes('/sop'), 'History should contain /sop');
  assert.ok(commandsRecorded.includes('/remind'), 'History should contain /remind');
  assert.ok(commandsRecorded.includes('/project'), 'History should contain /project');

  // --------------------------------------------------------------------------
  // TEST 7: Cross-Tenant Isolation
  // --------------------------------------------------------------------------
  console.log('Test 7: Cross-tenant isolation blocks foreign workspace command execution');
  const foreignRes = await request(`/api/chat/conversations/${ctx.channelAId}/slash-command`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
    body: { command: '/task Malicious Task' },
  });
  assert.equal(foreignRes.status, 403, 'User from another workspace should be rejected with 403');

  console.log('✅ Suite 44 passed cleanly: Chat Slash Command System verified.');
}

if (process.argv[1]?.endsWith('chat-slash-commands.test.ts')) {
  runChatSlashCommandsTests().catch((err) => {
    console.error('Chat slash commands test failed:', err);
    process.exit(1);
  });
}
