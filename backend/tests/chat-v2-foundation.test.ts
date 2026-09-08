/**
 * Suite 40: Chat V2 Foundation (Phase 1) Tests
 *
 * Verifies Phase 1 Foundation requirements:
 * 1. Admin channel creation (Admin allowed 201; Employee & Intern forbidden 403)
 * 2. Employee & Admin group creation (Employee & Admin allowed 201; Intern forbidden 403)
 * 3. Strict tenant isolation (Workspace B cannot view or post to Workspace A conversations)
 * 4. Realtime message delivery (EventBus dispatches 'chat.message.created' with proper payload)
 * 5. Cursor pagination for message history (limit & before cursor)
 */

import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { EventBus } from '../src/realtime/event-bus';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runChatV2FoundationTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING SUITE 40: CHAT V2 FOUNDATION (PHASE 1) TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // ==========================================
  // SETUP: WORKSPACES & USERS
  // ==========================================
  console.log('--- Setting up Workspaces & Users ---');

  // 1. Workspace A: Admin (Alice)
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Admin',
        email: 'alice@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Corp',
      }),
    })
  );
  const aliceData = attachSessionToken(regAliceRes, await regAliceRes.json());
  const aliceHeaders = {
    Authorization: `Bearer ${aliceData.token}`,
    'Content-Type': 'application/json',
  };
  const aliceUser = aliceData.user;
  const workspaceA = aliceData.workspace;

  // 2. Workspace A: Employee (Bob)
  const inviteBobRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'bob@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob@acme.io', password: 'Password123!' }),
    })
  );
  const bobData = attachSessionToken(loginBobRes, await loginBobRes.json());
  const bobHeaders = {
    Authorization: `Bearer ${bobData.token}`,
    'Content-Type': 'application/json',
  };
  const bobUser = bobData.user;

  // 3. Workspace A: Intern (Ian)
  const inviteIanRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'ian@acme.io', role: 'intern' }),
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
      body: JSON.stringify({ email: 'ian@acme.io', password: 'Password123!' }),
    })
  );
  const ianData = attachSessionToken(loginIanRes, await loginIanRes.json());
  const ianHeaders = {
    Authorization: `Bearer ${ianData.token}`,
    'Content-Type': 'application/json',
  };
  const ianUser = ianData.user;

  // 4. Workspace B: Eve Admin in EvilCorp
  const regEveRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eve Evil',
        email: 'eve@evilcorp.io',
        password: 'Password123!',
        workspaceName: 'Evil Corp',
      }),
    })
  );
  const eveData = attachSessionToken(regEveRes, await regEveRes.json());
  const eveHeaders = {
    Authorization: `Bearer ${eveData.token}`,
    'Content-Type': 'application/json',
  };
  const eveUser = eveData.user;
  const workspaceB = eveData.workspace;

  console.log('✅ Workspace setup completed successfully.');

  // ==========================================
  // TEST 1: ADMIN CHANNEL CREATION & RBAC
  // ==========================================
  console.log('\n--- Test 1: Admin Channel Creation & RBAC ---');

  // 1a: Admin (Alice) creates channel
  const createChannelRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/channel', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        title: 'engineering-general',
        description: 'General discussion for engineering',
      }),
    })
  );
  assert(createChannelRes.status === 201, 'Admin can create channel (201 Created)');
  const channelData = await createChannelRes.json();
  assert(channelData.conversation?.title === 'engineering-general', 'Channel title matches');
  assert(channelData.conversation?.type === 'channel', 'Conversation type is channel');
  assert(channelData.conversation?.workspaceId === workspaceA.id, 'Channel belongs to Workspace A');
  const channelId = channelData.conversation.id;

  // 1b: Employee (Bob) attempts to create channel -> 403
  const empChannelRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/channel', {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ title: 'bob-unauthorized-channel' }),
    })
  );
  assert(empChannelRes.status === 403, 'Employee is forbidden from creating channel (403 Forbidden)');

  // 1c: Intern (Ian) attempts to create channel -> 403
  const internChannelRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/channel', {
      method: 'POST',
      headers: ianHeaders,
      body: JSON.stringify({ title: 'ian-unauthorized-channel' }),
    })
  );
  assert(internChannelRes.status === 403, 'Intern is forbidden from creating channel (403 Forbidden)');

  // ==========================================
  // TEST 2: EMPLOYEE & ADMIN GROUP CREATION & RBAC
  // ==========================================
  console.log('\n--- Test 2: Group Creation & RBAC ---');

  // 2a: Employee (Bob) creates group
  const createGroupRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/group', {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({
        title: 'Frontend Squad',
        memberUserIds: [aliceUser.id, ianUser.id],
      }),
    })
  );
  assert(createGroupRes.status === 201, 'Employee can create group chat (201 Created)');
  const groupData = await createGroupRes.json();
  assert(groupData.conversation?.title === 'Frontend Squad', 'Group title matches');
  assert(groupData.conversation?.type === 'group', 'Conversation type is group');
  assert(groupData.conversation?.members?.length >= 2, 'Group has multiple members');
  const groupId = groupData.conversation.id;

  // 2b: Admin (Alice) creates group
  const adminGroupRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/group', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        title: 'Leadership Sync',
        memberUserIds: [bobUser.id],
      }),
    })
  );
  assert(adminGroupRes.status === 201, 'Admin can also create group chat (201 Created)');

  // 2c: Intern (Ian) attempts to create group -> 403
  const internGroupRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/group', {
      method: 'POST',
      headers: ianHeaders,
      body: JSON.stringify({
        title: 'Intern Secret Group',
        memberUserIds: [bobUser.id],
      }),
    })
  );
  assert(internGroupRes.status === 403, 'Intern is forbidden from creating group chat (403 Forbidden)');

  // ==========================================
  // TEST 3: STRICT TENANT ISOLATION
  // ==========================================
  console.log('\n--- Test 3: Strict Tenant Isolation ---');

  // 3a: Eve in Workspace B attempts to post to Workspace A channel
  const crossPostRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${channelId}/messages`, {
      method: 'POST',
      headers: eveHeaders,
      body: JSON.stringify({ content: 'Eve unauthorized injection' }),
    })
  );
  assert(
    crossPostRes.status === 403 || crossPostRes.status === 404,
    `Foreign workspace user cannot post to Workspace A channel (${crossPostRes.status})`
  );

  // 3b: Eve in Workspace B attempts to read Workspace A channel messages
  const crossReadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${channelId}/messages`, {
      method: 'GET',
      headers: eveHeaders,
    })
  );
  assert(
    crossReadRes.status === 403 || crossReadRes.status === 404,
    `Foreign workspace user cannot read Workspace A channel messages (${crossReadRes.status})`
  );

  // 3c: Eve attempts to read Workspace A group messages
  const crossGroupReadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${groupId}/messages`, {
      method: 'GET',
      headers: eveHeaders,
    })
  );
  assert(
    crossGroupReadRes.status === 403 || crossGroupReadRes.status === 404,
    `Foreign workspace user cannot read Workspace A group messages (${crossGroupReadRes.status})`
  );

  // 3d: Eve lists conversations -> Must never include Workspace A conversations
  const eveConvsRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations', {
      method: 'GET',
      headers: eveHeaders,
    })
  );
  assert(eveConvsRes.status === 200, 'Eve can list her own conversations');
  const eveConvsData = await eveConvsRes.json();
  const leakedConv = (eveConvsData.conversations || []).find(
    (c: any) => c.id === channelId || c.id === groupId
  );
  assert(!leakedConv, 'Eve conversations list does not leak Workspace A channels or groups');

  // ==========================================
  // TEST 4: REALTIME MESSAGE DELIVERY & EVENTBUS
  // ==========================================
  console.log('\n--- Test 4: Realtime Message Delivery ---');

  let dispatchedEventName = '';
  let dispatchedPayload: any = null;

  const unsubscribe = EventBus.subscribe('chat.message.created', async (data) => {
    dispatchedEventName = 'chat.message.created';
    dispatchedPayload = data;
  });

  // Bob posts a message to the engineering channel
  const postMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${channelId}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Hello team, welcome to the new engineering channel!' }),
    })
  );
  assert(postMsgRes.status === 201, 'Bob can post message to channel (201 Created)');
  const msgData = await postMsgRes.json();
  assert(msgData.message?.content === 'Hello team, welcome to the new engineering channel!', 'Message content matches');

  // Verify EventBus dispatch
  assert(dispatchedEventName === 'chat.message.created', 'EventBus dispatched chat.message.created event');
  const eventPayload = dispatchedPayload?.payload || dispatchedPayload;
  assert(dispatchedPayload?.workspaceId === workspaceA.id || eventPayload?.workspaceId === workspaceA.id, 'Dispatched event has correct workspaceId');
  assert(eventPayload?.conversationId === channelId, 'Dispatched event has correct conversationId');
  assert(eventPayload?.message?.senderId === bobUser.id, 'Dispatched event has correct senderId');

  unsubscribe();

  // ==========================================
  // TEST 5: CURSOR PAGINATION
  // ==========================================
  console.log('\n--- Test 5: Cursor Pagination ---');

  // Post 3 more messages
  for (let i = 1; i <= 3; i++) {
    await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${channelId}/messages`, {
        method: 'POST',
        headers: aliceHeaders,
        body: JSON.stringify({ content: `Message sequence #${i}` }),
      })
    );
  }

  // Fetch with limit: 2
  const page1Res = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${channelId}/messages?limit=2`, {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  assert(page1Res.status === 200, 'Page 1 fetched successfully');
  const page1Data = await page1Res.json();
  assert(page1Data.messages?.length === 2, 'Page 1 respects limit parameter (2 messages)');

  // Use 'before' cursor of oldest message on page 1
  const cursorDate = page1Data.messages[0].createdAt;
  const page2Res = await app.fetch(
    new Request(
      `http://localhost:3000/api/chat/conversations/${channelId}/messages?limit=2&before=${encodeURIComponent(
        cursorDate
      )}`,
      {
        method: 'GET',
        headers: aliceHeaders,
      }
    )
  );
  assert(page2Res.status === 200, 'Page 2 with cursor fetched successfully');
  const page2Data = await page2Res.json();
  assert(page2Data.messages?.length >= 1, 'Cursor pagination returned older messages');

  console.log('\n===============================================================');
  console.log(' ✅ ALL CHAT V2 FOUNDATION (PHASE 1) TESTS PASSED!');
  console.log('===============================================================\n');
}
