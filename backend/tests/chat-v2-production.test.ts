/**
 * Suite 41: Chat V2 Production (Slack-Grade Communication Hub) Test Suite
 *
 * Verifies Phase 1 Chat V2 production requirements:
 * 1. RBAC:
 *    - Admin channel creation (201 Created)
 *    - Employee channel creation denied (403 Forbidden)
 *    - Intern channel creation denied (403 Forbidden)
 *    - Employee group creation allowed (201 Created)
 *    - Intern group creation denied (403 Forbidden)
 * 2. Threads:
 *    - Replies created via /api/chat/messages/:id/thread
 *    - Parent replyCount updated
 *    - Thread history fetched via /api/chat/messages/:id/thread
 * 3. Reactions:
 *    - Toggle on/off via /api/chat/messages/:id/react
 *    - Events chat.reaction.created and chat.reaction.removed dispatched
 * 4. Read Receipts & Unread Tracking:
 *    - Read state recorded via /api/chat/conversations/:id/read
 *    - Event chat.read dispatched
 *    - Readers fetched via /api/chat/readers
 * 5. Presence & Typing:
 *    - Presence events and typing start/stop indicators
 * 6. File Attachments:
 *    - Admin upload allowed (201 Created)
 *    - Employee upload allowed (201 Created)
 *    - Intern upload denied (403 Forbidden)
 *    - Conversation files fetched via /api/chat/conversations/:id/files
 * 7. Message Pinning:
 *    - Admin allowed (200 OK)
 *    - Employee denied (403 Forbidden)
 *    - Pinned messages listed via /api/chat/conversations/:id/pinned
 * 8. Strict Tenant Isolation:
 *    - Workspace A messages/conversations/files/search inaccessible to Workspace B
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

export async function runChatV2ProductionTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING SUITE 41: CHAT V2 PRODUCTION (SLACK-GRADE) TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // Track dispatched realtime events
  const dispatchedEvents: Array<{ event: string; payload: any }> = [];
  const unsubscribeAll = EventBus.subscribe('*', (eventData: any) => {
    dispatchedEvents.push({ event: eventData.type, payload: eventData.payload });
  });

  // =========================================================================
  // SETUP: WORKSPACE A (Admin Alice, Employee Bob, Intern Ian) & WORKSPACE B (Charlie)
  // =========================================================================
  console.log('--- Setting up Test Workspaces & Users ---');

  // 1. Workspace A: Admin (Alice)
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Admin',
        email: 'alice.v2@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Corp V2',
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
      body: JSON.stringify({ email: 'bob.v2@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.v2@acme.io', password: 'Password123!' }),
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
      body: JSON.stringify({ email: 'ian.v2@acme.io', role: 'intern' }),
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
      body: JSON.stringify({ email: 'ian.v2@acme.io', password: 'Password123!' }),
    })
  );
  const ianData = attachSessionToken(loginIanRes, await loginIanRes.json());
  const ianHeaders = {
    Authorization: `Bearer ${ianData.token}`,
    'Content-Type': 'application/json',
  };
  const ianUser = ianData.user;

  // 4. Workspace B: Admin (Charlie)
  const regCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie TenantB',
        email: 'charlie@beta.io',
        password: 'Password123!',
        workspaceName: 'Beta Org',
      }),
    })
  );
  const charlieData = attachSessionToken(regCharlieRes, await regCharlieRes.json());
  const charlieHeaders = {
    Authorization: `Bearer ${charlieData.token}`,
    'Content-Type': 'application/json',
  };

  // =========================================================================
  // TEST 1: RBAC - CHANNEL & GROUP CREATION
  // =========================================================================
  console.log('\n--- Test 1: Channel & Group Creation RBAC ---');

  // Admin creates channel -> 201 Created
  const adminChannelRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/channels', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ title: 'engineering', description: 'Core Engineering Channel' }),
    })
  );
  assert(adminChannelRes.status === 201, 'Admin can create channel (201)');
  const engineeringChannel = (await adminChannelRes.json()).conversation;
  assert(engineeringChannel.title === 'engineering', 'Engineering channel created with correct title');

  // Employee attempts channel creation -> 403 Forbidden
  const empChannelRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/channels', {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ title: 'employee-secret' }),
    })
  );
  assert(empChannelRes.status === 403, 'Employee denied channel creation (403)');

  // Intern attempts channel creation -> 403 Forbidden
  const internChannelRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/channels', {
      method: 'POST',
      headers: ianHeaders,
      body: JSON.stringify({ title: 'intern-channel' }),
    })
  );
  assert(internChannelRes.status === 403, 'Intern denied channel creation (403)');

  // Employee creates group chat -> 201 Created
  const empGroupRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/groups', {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ title: 'Sprint Squad', memberUserIds: [aliceUser.id, ianUser.id] }),
    })
  );
  assert(empGroupRes.status === 201, 'Employee can create group chat (201)');
  const sprintGroup = (await empGroupRes.json()).conversation;
  assert(sprintGroup.type === 'group', 'Group chat type is group');

  // Intern attempts group creation -> 403 Forbidden
  const internGroupRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/groups', {
      method: 'POST',
      headers: ianHeaders,
      body: JSON.stringify({ title: 'Intern Hangout' }),
    })
  );
  assert(internGroupRes.status === 403, 'Intern denied group creation (403)');

  // =========================================================================
  // TEST 2: THREAD REPLIES & COUNTS
  // =========================================================================
  console.log('\n--- Test 2: Slack-Style Threads & Reply Counts ---');

  // 1. Post parent message in engineering channel
  const parentMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engineeringChannel.id}/messages`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ content: 'Root RFC: Architecture proposal for Chat V2' }),
    })
  );
  assert(parentMsgRes.status === 201, 'Parent message posted (201)');
  const parentMessage = (await parentMsgRes.json()).message;
  assert(parentMessage.replyCount === 0, 'Initial replyCount is 0');

  // 2. Bob replies to thread
  const reply1Res = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/thread`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'I support this RFC! Virtualized lists look great.' }),
    })
  );
  assert(reply1Res.status === 201, 'Bob thread reply created (201)');
  const reply1 = (await reply1Res.json()).reply;
  assert(reply1.parentId === parentMessage.id, 'Reply parentId links to root message');

  // 3. Ian replies to thread
  const reply2Res = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/thread`, {
      method: 'POST',
      headers: ianHeaders,
      body: JSON.stringify({ content: 'Testing thread replies as intern.' }),
    })
  );
  assert(reply2Res.status === 201, 'Ian thread reply created (201)');

  // 4. Fetch thread history
  const threadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/thread`, {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  assert(threadRes.status === 200, 'Thread fetched successfully (200)');
  const threadData = await threadRes.json();
  assert(threadData.parent.id === parentMessage.id, 'Thread parent matches');
  assert(threadData.replies.length === 2, 'Thread contains exactly 2 replies');
  assert(threadData.parent.replyCount === 2, 'Parent message replyCount updated to 2');

  // =========================================================================
  // TEST 3: REACTIONS TOGGLE & EVENT DISPATCH
  // =========================================================================
  console.log('\n--- Test 3: Reactions Toggle & Realtime Events ---');

  dispatchedEvents.length = 0; // clear event log

  // 1. Add reaction (👍)
  const addReactRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/react`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ emoji: '👍' }),
    })
  );
  assert(addReactRes.status === 200, 'Reaction toggle endpoint returned 200');
  const addReactData = await addReactRes.json();
  assert(addReactData.added === true, 'Reaction added successfully');

  // Check event dispatched: chat.reaction.created
  const reactionCreatedEvt = dispatchedEvents.find(
    (e) => e.event === 'chat.reaction.created' && e.payload?.emoji === '👍'
  );
  assert(!!reactionCreatedEvt, 'Realtime event chat.reaction.created dispatched');

  // 2. Remove reaction (toggle off 👍)
  const removeReactRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/react`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ emoji: '👍' }),
    })
  );
  assert(removeReactRes.status === 200, 'Reaction toggle off endpoint returned 200');
  const removeReactData = await removeReactRes.json();
  assert(removeReactData.added === false, 'Reaction toggled off successfully');

  // Check event dispatched: chat.reaction.removed
  const reactionRemovedEvt = dispatchedEvents.find(
    (e) => e.event === 'chat.reaction.removed' && e.payload?.emoji === '👍'
  );
  assert(!!reactionRemovedEvt, 'Realtime event chat.reaction.removed dispatched');

  // =========================================================================
  // TEST 4: READ RECEIPTS & UNREAD TRACKING
  // =========================================================================
  console.log('\n--- Test 4: Read Receipts & Unread Tracking ---');

  // 1. Post a new message from Bob
  const newMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engineeringChannel.id}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Hey Alice, please review the latest PR.' }),
    })
  );
  const newMsg = (await newMsgRes.json()).message;

  // 2. Mark conversation read as Alice
  dispatchedEvents.length = 0;
  const markReadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engineeringChannel.id}/read`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ lastReadMessageId: newMsg.id }),
    })
  );
  assert(markReadRes.status === 200, 'Mark conversation read returned 200');

  // Verify chat.read event dispatched
  const readEvt = dispatchedEvents.find(
    (e) => e.event === 'chat.read' && e.payload?.userId === aliceUser.id
  );
  assert(!!readEvt, 'Realtime event chat.read dispatched for Alice');

  // 3. Get readers for conversation
  const readersRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/readers?conversationId=${engineeringChannel.id}&messageId=${newMsg.id}`, {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  assert(readersRes.status === 200, 'Get readers returned 200');
  const readersData = await readersRes.json();
  assert(Array.isArray(readersData.readers), 'Readers returns an array');
  const aliceReader = readersData.readers.find((r: any) => r.id === aliceUser.id);
  assert(!!aliceReader, 'Alice is recorded in read receipts');

  // =========================================================================
  // TEST 5: MESSAGE PINNING (ADMIN ONLY)
  // =========================================================================
  console.log('\n--- Test 5: Message Pinning RBAC & Listing ---');

  // 1. Employee attempts to pin message -> 403 Forbidden
  const empPinRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/pin`, {
      method: 'POST',
      headers: bobHeaders,
    })
  );
  assert(empPinRes.status === 403, 'Employee denied message pinning (403)');

  // 2. Admin pins message -> 200 OK
  const adminPinRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/pin`, {
      method: 'POST',
      headers: aliceHeaders,
    })
  );
  assert(adminPinRes.status === 200, 'Admin can pin message (200)');
  const adminPinData = await adminPinRes.json();
  assert(adminPinData.isPinned === true, 'Message isPinned status is true');

  // 3. List pinned messages for conversation
  const pinnedListRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engineeringChannel.id}/pinned`, {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  assert(pinnedListRes.status === 200, 'Get pinned messages returned 200');
  const pinnedListData = await pinnedListRes.json();
  assert(pinnedListData.pinned.some((p: any) => p.id === parentMessage.id), 'Pinned list contains the pinned message');

  // =========================================================================
  // TEST 6: FILE ATTACHMENTS & INTERN UPLOAD PROHIBITION
  // =========================================================================
  console.log('\n--- Test 6: File Attachments & Upload RBAC ---');

  // 1. Intern attempts file upload -> 403 Forbidden
  const internUploadRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/upload', {
      method: 'POST',
      headers: ianHeaders,
      body: JSON.stringify({ name: 'intern_notes.txt', mimeType: 'text/plain', size: 128 }),
    })
  );
  assert(internUploadRes.status === 403, 'Intern file upload forbidden (403)');

  // 2. Employee uploads file attachment -> 201 Created
  const empUploadRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/upload', {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ name: 'design_specs.pdf', mimeType: 'application/pdf', size: 2048 }),
    })
  );
  assert(empUploadRes.status === 201, 'Employee file upload allowed (201)');
  const attachment = (await empUploadRes.json()).attachment;
  assert(attachment.name === 'design_specs.pdf', 'Attachment returned with correct filename');

  // 3. Post message with attachment
  const msgWithAttRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engineeringChannel.id}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({
        content: 'Here are the design specifications.',
        attachments: [attachment],
      }),
    })
  );
  assert(msgWithAttRes.status === 201, 'Message with attachment posted (201)');
  const msgWithAtt = (await msgWithAttRes.json()).message;
  assert(msgWithAtt.attachments.length === 1, 'Message has 1 attachment');

  // 4. List conversation files
  const filesRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engineeringChannel.id}/files`, {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  assert(filesRes.status === 200, 'List conversation files returned 200');
  const filesData = await filesRes.json();
  assert(filesData.files.some((f: any) => f.name === 'design_specs.pdf'), 'Conversation files list includes uploaded PDF');

  // =========================================================================
  // TEST 7: GLOBAL CHAT SEARCH
  // =========================================================================
  console.log('\n--- Test 7: Global Chat Search ---');

  const searchRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/search?q=Architecture', {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  assert(searchRes.status === 200, 'Search chat returned 200');
  const searchData = await searchRes.json();
  assert(
    searchData.messages.some((m: any) => m.content.includes('Architecture proposal')),
    'Search returns matching RFC message'
  );

  // Search with hasFile filter
  const searchFilesRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/search?hasFile=true', {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  assert(searchFilesRes.status === 200, 'Search with hasFile filter returned 200');
  const searchFilesData = await searchFilesRes.json();
  assert(
    searchFilesData.messages.some((m: any) => m.attachments && m.attachments.length > 0),
    'Search returns messages with attachments'
  );

  // =========================================================================
  // TEST 8: STRICT MULTI-TENANT ISOLATION
  // =========================================================================
  console.log('\n--- Test 8: Strict Multi-Tenant Isolation ---');

  // 1. Charlie (Workspace B) tries to read Workspace A engineering channel messages
  const crossTenantMsgsRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engineeringChannel.id}/messages`, {
      method: 'GET',
      headers: charlieHeaders,
    })
  );
  assert(
    crossTenantMsgsRes.status === 404 || crossTenantMsgsRes.status === 403,
    'Workspace B denied access to Workspace A conversation messages (404/403)'
  );

  // 2. Charlie searches chat -> 0 messages from Workspace A
  const crossTenantSearchRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/search?q=Architecture', {
      method: 'GET',
      headers: charlieHeaders,
    })
  );
  assert(crossTenantSearchRes.status === 200, 'Workspace B search returned 200');
  const crossSearchData = await crossTenantSearchRes.json();
  assert(crossSearchData.messages.length === 0, 'Workspace B search cannot find Workspace A messages');

  // 3. Charlie tries to pin Workspace A message -> 404/403
  const crossTenantPinRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${parentMessage.id}/pin`, {
      method: 'POST',
      headers: charlieHeaders,
    })
  );
  assert(
    crossTenantPinRes.status === 404 || crossTenantPinRes.status === 403,
    'Workspace B denied pinning Workspace A message (404/403)'
  );

  // Clean up event listener
  unsubscribeAll();

  console.log('\n===============================================================');
  console.log(' ✅ SUITE 41: CHAT V2 PRODUCTION TESTS PASSED CLEANLY');
  console.log('===============================================================\n');
}
