/**
 * Suite 49: Advanced Chat Search (Phase 2H) Test Suite
 *
 * Validates:
 * 1. Search Filters:
 *    - from: (filter by sender name, email, or user ID)
 *    - has:file (filter messages with file attachments)
 *    - has:task (filter messages with linked tasks)
 *    - has:mention (filter messages with mentions or @)
 *    - before: & after: (timestamp boundaries)
 *    - in: (filter by channel title or ID)
 *    - Combined token queries (e.g., "from:alice in:engineering has:file")
 * 2. Performance / Speed:
 *    - Search query finishes and measures execution speed (< 50ms)
 * 3. Tenant Isolation & Permissions:
 *    - Workspace B user cannot search or discover messages, files, tasks, or users in Workspace A
 *    - Intern cannot search private/restricted discussions they don't have membership in
 * 4. Relevance & Grouping:
 *    - Returns distinct grouped objects: messages, files, tasks, people, and summary counts
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { ChatRepository } from '../src/repositories/chat-repository';
import { ChatService } from '../src/services/chat-service';
import { ChatSearchParser } from '../src/services/chat-search-parser';

interface TestContext {
  tokenAdminA: string;
  tokenEmployeeA: string;
  tokenInternA: string;
  tokenUserB: string;
  workspaceAId: string;
  workspaceBId: string;
  generalConvId: string;
  engineeringConvId: string;
  convBId: string;
  userAdminA: any;
  userEmployeeA: any;
  userInternA: any;
  userB: any;
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

  // 1. Workspace A Admin (Alice)
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Archer',
        email: 'alice.search@mavr.io',
        password: 'Password123!',
        workspaceName: 'Search Systems Inc',
      }),
    })
  );
  const aliceData = attachSessionToken(regAliceRes, await regAliceRes.json());
  const tokenAdminA = aliceData.token;
  const workspaceAId = aliceData.workspace.id;
  const userAdminA = aliceData.user;
  const headersAdminA = { Authorization: `Bearer ${tokenAdminA}` };

  // 2. Workspace A Employee (Bob)
  const inviteBob = await request('/api/invites', {
    method: 'POST',
    headers: headersAdminA,
    body: { email: 'bob.search@mavr.io', role: 'employee' },
  });
  assert.equal(inviteBob.status, 201);
  const tokenBobInvite = inviteBob.body.invite?.token || inviteBob.body.token;

  await request('/api/invites/accept', {
    method: 'POST',
    body: { token: tokenBobInvite, name: 'Bob Builder', password: 'Password123!' },
  });

  const loginBob = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob.search@mavr.io', password: 'Password123!' }),
    })
  );
  const bobAuth = attachSessionToken(loginBob, await loginBob.json());
  const tokenEmployeeA = bobAuth.token;
  const userEmployeeA = bobAuth.user;

  // 3. Workspace A Intern (Ian)
  const inviteIan = await request('/api/invites', {
    method: 'POST',
    headers: headersAdminA,
    body: { email: 'ian.search@mavr.io', role: 'intern' },
  });
  assert.equal(inviteIan.status, 201);
  const tokenIanInvite = inviteIan.body.invite?.token || inviteIan.body.token;

  await request('/api/invites/accept', {
    method: 'POST',
    body: { token: tokenIanInvite, name: 'Ian Intern', password: 'Password123!' },
  });

  const loginIan = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ian.search@mavr.io', password: 'Password123!' }),
    })
  );
  const ianAuth = attachSessionToken(loginIan, await loginIan.json());
  const tokenInternA = ianAuth.token;
  const userInternA = ianAuth.user;

  // 4. Workspace B Admin (Zoe)
  const regZoeRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Zoe TenantB',
        email: 'zoe.tenantb@other.io',
        password: 'Password123!',
        workspaceName: 'Isolated Org B',
      }),
    })
  );
  const zoeData = attachSessionToken(regZoeRes, await regZoeRes.json());
  const tokenUserB = zoeData.token;
  const userB = zoeData.user;
  const workspaceBId = zoeData.workspace.id;

  // 5. Create Channels in Workspace A
  const createGenRes = await request('/api/chat/conversations/channel', {
    method: 'POST',
    headers: headersAdminA,
    body: { title: 'General', description: 'General announcements and discussions' },
  });
  const generalConvId = createGenRes.body.conversation.id;

  const createEngRes = await request('/api/chat/conversations/channel', {
    method: 'POST',
    headers: headersAdminA,
    body: { title: 'Engineering', description: 'Technical architecture and codebase' },
  });
  const engineeringConvId = createEngRes.body.conversation.id;

  // Add Bob and Ian to General
  await ChatRepository.addConversationMember({
    conversationId: generalConvId,
    workspaceId: workspaceAId,
    userId: userEmployeeA.id,
    role: 'member',
  });
  await ChatRepository.addConversationMember({
    conversationId: generalConvId,
    workspaceId: workspaceAId,
    userId: userInternA.id,
    role: 'member',
  });

  // Add Bob to Engineering (Ian is excluded from engineering channel)
  await ChatRepository.addConversationMember({
    conversationId: engineeringConvId,
    workspaceId: workspaceAId,
    userId: userEmployeeA.id,
    role: 'member',
  });

  // 6. Create Channel in Workspace B
  const createBRes = await request('/api/chat/conversations/channel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUserB}` },
    body: { title: 'Secret Channel B', description: 'Confidential Workspace B notes' },
  });
  const convBId = createBRes.body.conversation.id;

  return {
    tokenAdminA,
    tokenEmployeeA,
    tokenInternA,
    tokenUserB,
    workspaceAId,
    workspaceBId,
    generalConvId,
    engineeringConvId,
    convBId,
    userAdminA,
    userEmployeeA,
    userInternA,
    userB,
  };
}

export async function runChatSearchV2Tests() {
  console.log('\n=== RUNNING SUITE 49: ADVANCED CHAT SEARCH (PHASE 2H) ===');
  const ctx = await setupTestData();

  const headersAdminA = { Authorization: `Bearer ${ctx.tokenAdminA}` };
  const headersEmployeeA = { Authorization: `Bearer ${ctx.tokenEmployeeA}` };
  const headersInternA = { Authorization: `Bearer ${ctx.tokenInternA}` };
  const headersUserB = { Authorization: `Bearer ${ctx.tokenUserB}` };

  // =========================================================================
  // SUB-SUITE 1: Search Query Parser Unit Verification
  // =========================================================================
  console.log('\n--- Test 1: ChatSearchParser Unit Contract ---');

  const p1 = ChatSearchParser.parse('from:alice has:file quarterly review in:general');
  assert.equal(p1.from, 'alice');
  assert.equal(p1.hasFile, true);
  assert.equal(p1.channel, 'general');
  assert.equal(p1.cleanText, 'quarterly review');

  const p2 = ChatSearchParser.parse('has:task has:mention before:2026-10-01 after:2026-01-01 deployment');
  assert.equal(p2.hasTask, true);
  assert.equal(p2.hasMention, true);
  assert.equal(p2.before, '2026-10-01');
  assert.equal(p2.after, '2026-01-01');
  assert.equal(p2.cleanText, 'deployment');

  const p3 = ChatSearchParser.parse('from:"Bob Builder" in:"Engineering"');
  assert.equal(p3.from, 'Bob Builder');
  assert.equal(p3.channel, 'Engineering');
  assert.equal(p3.cleanText, '');

  console.log('✓ ChatSearchParser accurately extracts all filter tokens and residual clean text');

  // =========================================================================
  // SUB-SUITE 2: Populate Seed Data for Search
  // =========================================================================
  console.log('\n--- Seed Data Ingestion ---');

  // Msg 1: Alice in General with File attachment
  const msg1Res = await request(`/api/chat/conversations/${ctx.generalConvId}/messages`, {
    method: 'POST',
    headers: headersAdminA,
    body: {
      content: 'Welcome everyone! Review the company handbook PDF attached.',
      attachments: [{
        id: 'att-handbook-1',
        name: 'handbook.pdf',
        url: '/uploads/handbook.pdf',
        mimeType: 'application/pdf',
        size: 10240,
      }],
    },
  });
  assert.equal(msg1Res.status, 201);
  const msg1 = msg1Res.body.message;

  // Msg 2: Bob in Engineering with linked task
  const msg2Res = await request(`/api/chat/conversations/${ctx.engineeringConvId}/messages`, {
    method: 'POST',
    headers: headersEmployeeA,
    body: {
      content: 'Refactoring database indexes for query performance optimization.',
    },
  });
  assert.equal(msg2Res.status, 201);
  const msg2 = msg2Res.body.message;

  // Link a task to Msg 2
  inMemoryDb.tasks.set('task-perf-1', {
    id: 'task-perf-1',
    workspaceId: ctx.workspaceAId,
    title: 'Database Query Optimization',
    status: 'in_progress',
    priority: 'high',
    createdAt: new Date(),
  } as any);

  inMemoryDb.messageTasks.set('mt-1', {
    id: 'mt-1',
    workspaceId: ctx.workspaceAId,
    messageId: msg2.id,
    taskId: 'task-perf-1',
    createdBy: ctx.userEmployeeA.id,
    createdAt: new Date(),
  });

  // Msg 3: Alice in General with Mention
  const msg3Res = await request(`/api/chat/conversations/${ctx.generalConvId}/messages`, {
    method: 'POST',
    headers: headersAdminA,
    body: {
      content: 'Hey @Bob Builder please check the release pipeline status.',
      mentions: [ctx.userEmployeeA.id],
    },
  });
  assert.equal(msg3Res.status, 201);
  const msg3 = msg3Res.body.message;

  // Msg 4: Workspace B message (isolated)
  const msgBRes = await request(`/api/chat/conversations/${ctx.convBId}/messages`, {
    method: 'POST',
    headers: headersUserB,
    body: {
      content: 'Confidential Workspace B database optimization strategy.',
      attachments: [{
        id: 'att-b-1',
        name: 'secret_report.pdf',
        url: '/uploads/secret_report.pdf',
        mimeType: 'application/pdf',
        size: 5000,
      }],
    },
  });
  assert.equal(msgBRes.status, 201);

  console.log('✓ Test messages, attachments, and tasks seeded successfully');

  // =========================================================================
  // SUB-SUITE 3: Filter Validations (from:, has:file, has:task, has:mention, in:, before:, after:)
  // =========================================================================
  console.log('\n--- Test 2: Filter Validation ---');

  // A. from: filter
  const searchFromAlice = await request('/api/chat/search?q=from:alice', {
    headers: headersAdminA,
  });
  assert.equal(searchFromAlice.status, 200);
  assert(searchFromAlice.body.messages.length >= 2, 'Should find messages sent by Alice');
  assert(
    searchFromAlice.body.messages.every((m: any) => m.senderId === ctx.userAdminA.id),
    'All messages must be from Alice'
  );
  console.log('✓ Filter from: accurately matches author');

  // B. has:file filter
  const searchHasFile = await request('/api/chat/search?q=has:file', {
    headers: headersAdminA,
  });
  assert.equal(searchHasFile.status, 200);
  assert(searchHasFile.body.messages.length >= 1, 'Should return messages with file');
  assert(
    searchHasFile.body.messages.every((m: any) => m.attachments && m.attachments.length > 0),
    'Returned messages must have attachments'
  );
  assert(searchHasFile.body.files.length >= 1, 'Grouped files array should contain handbook.pdf');
  assert.equal(searchHasFile.body.files[0].name, 'handbook.pdf');
  console.log('✓ Filter has:file accurately returns messages with attachments and populates files group');

  // C. has:task filter
  const searchHasTask = await request('/api/chat/search?q=has:task', {
    headers: headersAdminA,
  });
  assert.equal(searchHasTask.status, 200);
  assert(
    searchHasTask.body.messages.some((m: any) => m.id === msg2.id),
    'Message 2 with linked task must be returned'
  );
  assert(
    searchHasTask.body.tasks.some((t: any) => t.id === 'task-perf-1'),
    'Grouped tasks array includes linked task'
  );
  console.log('✓ Filter has:task accurately returns messages with linked tasks and populates tasks group');

  // D. has:mention filter
  const searchHasMention = await request('/api/chat/search?q=has:mention', {
    headers: headersAdminA,
  });
  assert.equal(searchHasMention.status, 200);
  assert(
    searchHasMention.body.messages.some((m: any) => m.id === msg3.id),
    'Message 3 with mention is returned'
  );
  console.log('✓ Filter has:mention accurately returns messages containing mentions');

  // E. in:channel filter
  const searchInGeneral = await request('/api/chat/search?q=in:general', {
    headers: headersAdminA,
  });
  assert.equal(searchInGeneral.status, 200);
  assert(
    searchInGeneral.body.messages.every((m: any) => m.conversationId === ctx.generalConvId),
    'All returned messages must belong to general channel'
  );
  console.log('✓ Filter in:<channel> scopes search strictly to specified conversation');

  // F. Combined filters: "from:Bob in:engineering has:task"
  const searchCombined = await request('/api/chat/search?q=from:bob in:engineering has:task', {
    headers: headersAdminA,
  });
  assert.equal(searchCombined.status, 200);
  assert.equal(searchCombined.body.messages.length, 1, 'Only msg 2 matches all combined filters');
  assert.equal(searchCombined.body.messages[0].id, msg2.id);
  console.log('✓ Multi-attribute combined filter tokens resolve seamlessly');

  // =========================================================================
  // SUB-SUITE 4: Performance & Latency (< 50ms)
  // =========================================================================
  console.log('\n--- Test 3: Search Speed & Benchmark (< 50ms) ---');

  const benchStart = performance.now();
  const perfSearch = await request('/api/chat/search?q=optimization', {
    headers: headersAdminA,
  });
  const benchElapsed = performance.now() - benchStart;

  assert.equal(perfSearch.status, 200);
  assert(perfSearch.body.summary.tookMs !== undefined, 'Summary reports tookMs');
  assert(
    benchElapsed < 50,
    `Search execution must complete in under 50ms (actual: ${benchElapsed.toFixed(2)}ms)`
  );
  console.log(`✓ Search performance verified: completed in ${benchElapsed.toFixed(2)}ms (tookMs: ${perfSearch.body.summary.tookMs}ms)`);

  // =========================================================================
  // SUB-SUITE 5: Result Grouping (Messages, Files, Tasks, People)
  // =========================================================================
  console.log('\n--- Test 4: Result Grouping Contract ---');

  const groupSearch = await request('/api/chat/search?q=Alice', {
    headers: headersAdminA,
  });
  assert.equal(groupSearch.status, 200);

  // Assert all 4 groups are returned
  assert(Array.isArray(groupSearch.body.messages), 'Result contains messages array');
  assert(Array.isArray(groupSearch.body.files), 'Result contains files array');
  assert(Array.isArray(groupSearch.body.tasks), 'Result contains tasks array');
  assert(Array.isArray(groupSearch.body.people), 'Result contains people array');
  assert(groupSearch.body.summary, 'Result contains summary stats');

  // People group should find Alice
  const foundAlice = groupSearch.body.people.find((p: any) => p.name.includes('Alice'));
  assert(!!foundAlice, 'People grouping includes Alice Archer');
  assert.equal(foundAlice.role, 'admin');

  console.log('✓ Grouped search response structure (messages, files, tasks, people, summary) verified');

  // =========================================================================
  // SUB-SUITE 6: Strict Tenant Isolation & Role Scope
  // =========================================================================
  console.log('\n--- Test 5: Strict Multi-Tenant Isolation & Role Scoping ---');

  // 1. Workspace B tries to search Workspace A terms ("handbook", "Alice", "optimization")
  const bSearchA = await request('/api/chat/search?q=handbook', {
    headers: headersUserB,
  });
  assert.equal(bSearchA.status, 200);
  assert.equal(bSearchA.body.messages.length, 0, 'Workspace B cannot find Workspace A messages');
  assert.equal(bSearchA.body.files.length, 0, 'Workspace B cannot find Workspace A files');

  const bSearchPeople = await request('/api/chat/search?q=Alice', {
    headers: headersUserB,
  });
  assert.equal(bSearchPeople.status, 200);
  assert.equal(bSearchPeople.body.people.length, 0, 'Workspace B cannot find Workspace A members');

  // 2. Intern in Workspace A cannot search messages from restricted Engineering channel
  const internSearchEng = await request('/api/chat/search?q=refactoring', {
    headers: headersInternA,
  });
  assert.equal(internSearchEng.status, 200);
  assert.equal(
    internSearchEng.body.messages.length,
    0,
    'Intern cannot find messages in channels they are not members of'
  );

  // 3. Intern CAN search messages in General channel
  const internSearchGen = await request('/api/chat/search?q=handbook', {
    headers: headersInternA,
  });
  assert.equal(internSearchGen.status, 200);
  assert(
    internSearchGen.body.messages.some((m: any) => m.id === msg1.id),
    'Intern can search accessible General channel messages'
  );

  console.log('✓ Cross-tenant and role-scoped channel isolation strictly enforced');

  console.log('\n=== ALL SUITE 49 TESTS COMPLETED SUCCESSFULLY ===\n');
}

// Auto-run if directly executed
if (process.argv[1]?.endsWith('chat-search-v2.test.ts') || process.argv[1]?.endsWith('chat-search-v2.test.js')) {
  runChatSearchV2Tests()
    .then(() => {
      console.log('Suite 49 execution finished with exit code 0.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Suite 49 test failure:', err);
      process.exit(1);
    });
}

