import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { ChatService } from '../src/services/chat-service';
import { ChatRepository } from '../src/repositories/chat-repository';
import { EventBus } from '../src/realtime/event-bus';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runChatV2Tests() {
  console.log('\n===============================================================');
  console.log(' RUNNING CHAT V2 TESTS (Suite 32: Unread, Mentions, Realtime, Typing)');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // ==========================================
  // SETUP: USERS & WORKSPACES
  // ==========================================
  console.log('--- Setting up Test Workspaces and Users ---');

  // 1. Register Alice Admin in Workspace A
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Admin',
        email: 'alice.v2@chat.io',
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

  // 2. Invite Bob (Employee) to Workspace A
  const inviteBobRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'bob.v2@chat.io', role: 'employee' }),
    })
  );
  const bobInvite = await inviteBobRes.json();

  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: bobInvite.invite.token,
        name: 'Bob Employee',
        password: 'Password123!',
      }),
    })
  );

  const bobLoginRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob.v2@chat.io', password: 'Password123!' }),
    })
  );
  const bobData = attachSessionToken(bobLoginRes, await bobLoginRes.json());
  const bobHeaders = {
    Authorization: `Bearer ${bobData.token}`,
    'Content-Type': 'application/json',
  };
  const bobUser = bobData.user;

  // 3. Register Charlie in Workspace B (for cross-workspace isolation)
  const regCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie External',
        email: 'charlie@isolated.io',
        password: 'Password123!',
        workspaceName: 'Isolated Corp',
      }),
    })
  );
  const charlieData = attachSessionToken(regCharlieRes, await regCharlieRes.json());
  const charlieHeaders = {
    Authorization: `Bearer ${charlieData.token}`,
    'Content-Type': 'application/json',
  };
  const charlieUser = charlieData.user;
  const workspaceB = charlieData.workspace;

  // Create DM between Alice and Bob in Workspace A
  const dmRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/dm', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ targetUserId: bobUser.id }),
    })
  );
  const dmData = await dmRes.json();
  const dmConvId = dmData.conversation.id;

  // -------------------------------------------------------------
  // TEST 1: Unread count increments when new message sent
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Unread count increments when new message sent ---');
  {
    // Initial unread count for Alice should be 0
    let aliceUnread = await ChatRepository.getUnreadCountForConversation(dmConvId, aliceUser.id);
    assert(aliceUnread === 0, 'Alice initial unread count in DM is 0');

    // Bob sends a message to Alice
    const sendRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages`, {
        method: 'POST',
        headers: bobHeaders,
        body: JSON.stringify({ content: 'Hello Alice, here is the new brief!' }),
      })
    );
    assert(sendRes.status === 201, 'Bob sent message successfully');

    // Alice unread count should now be 1
    aliceUnread = await ChatRepository.getUnreadCountForConversation(dmConvId, aliceUser.id);
    assert(aliceUnread === 1, 'Alice unread count incremented to 1 after Bob sent message');

    // Test endpoint GET /api/chat/unread-counts for Alice
    const unreadCountsRes = await app.fetch(
      new Request('http://localhost:3000/api/chat/unread-counts', {
        headers: aliceHeaders,
      })
    );
    const unreadCountsData = await unreadCountsRes.json();
    assert(unreadCountsData.unreadCounts[dmConvId] === 1, 'GET /api/chat/unread-counts returns 1 for DM');
  }

  // -------------------------------------------------------------
  // TEST 2: Opening conversation resets unread count
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Opening conversation resets unread count ---');
  {
    // Alice opens the conversation and marks it read
    const readRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/read`, {
        method: 'POST',
        headers: aliceHeaders,
      })
    );
    assert(readRes.status === 200, 'Alice marked conversation as read');

    // Alice unread count in DM must now be 0
    const aliceUnreadAfterRead = await ChatRepository.getUnreadCountForConversation(dmConvId, aliceUser.id);
    assert(aliceUnreadAfterRead === 0, 'Alice unread count reset to 0 after marking read');

    // Check conversation_reads table in database
    let hasReadRecord = false;
    for (const r of inMemoryDb.conversationReads.values()) {
      if (r.conversationId === dmConvId && r.userId === aliceUser.id) {
        hasReadRecord = true;
        break;
      }
    }
    assert(hasReadRecord, 'conversation_reads table holds read record for Alice');
  }

  // -------------------------------------------------------------
  // TEST 3: Mention creates mention_received notification
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Mention creates mention_received notification ---');
  {
    const beforeCount = Array.from(inMemoryDb.notifications.values()).filter(
      (n: any) => n.recipientId === aliceUser.id && n.type === 'mention_received'
    ).length;

    // Bob mentions Alice: "@Alice please review"
    const mentionMsgRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages`, {
        method: 'POST',
        headers: bobHeaders,
        body: JSON.stringify({ content: '@Alice please review the financial audit ASAP' }),
      })
    );
    assert(mentionMsgRes.status === 201, 'Bob sent message with mention');

    const afterNotifs = Array.from(inMemoryDb.notifications.values()).filter(
      (n: any) => n.recipientId === aliceUser.id && n.type === 'mention_received'
    );
    assert(afterNotifs.length > beforeCount, 'Notification of type mention_received created for Alice');
    const latestNotif = afterNotifs[afterNotifs.length - 1];
    assert(latestNotif.priority === 'high', 'Notification priority is strictly high');
  }

  // -------------------------------------------------------------
  // TEST 4: Mention filter returns only conversations with unread mentions
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Mention filter returns only conversations with unread mentions ---');
  {
    // Check GET /api/chat/conversations?filter=mentions for Alice
    const mentionsRes = await app.fetch(
      new Request('http://localhost:3000/api/chat/conversations?filter=mentions', {
        headers: aliceHeaders,
      })
    );
    const mentionsData = await mentionsRes.json();
    assert(mentionsData.conversations.length > 0, 'Mention filter returns conversation with unread mention');
    const matched = mentionsData.conversations.find((c: any) => c.id === dmConvId);
    assert(Boolean(matched), 'Conversation with mention is present in filtered results');
    assert(Boolean(matched.hasUnreadMention), 'Conversation has hasUnreadMention flag set to true');

    // When Alice marks conversation read, mention filter should now return empty
    await ChatService.markConversationRead(workspaceA.id, dmConvId, aliceUser.id);
    const mentionsAfterReadRes = await app.fetch(
      new Request('http://localhost:3000/api/chat/conversations?filter=mentions', {
        headers: aliceHeaders,
      })
    );
    const mentionsAfterReadData = await mentionsAfterReadRes.json();
    const stillPresent = mentionsAfterReadData.conversations.some((c: any) => c.id === dmConvId);
    assert(!stillPresent, 'After marking read, conversation no longer appears in mentions filter');
  }

  // -------------------------------------------------------------
  // TEST 5: Real-time event broadcasts on chat.message.created
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Real-time event broadcasts on chat.message.created ---');
  {
    let broadcastPayload: any = null;
    const unsubscribe = EventBus.subscribeWorkspace(workspaceA.id, (event) => {
      if (event.type === 'chat.message.created') {
        broadcastPayload = event.payload;
      }
    });

    // Bob sends a message
    await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages`, {
        method: 'POST',
        headers: bobHeaders,
        body: JSON.stringify({ content: 'Real-time test message payload validation' }),
      })
    );

    assert(broadcastPayload !== null, 'chat.message.created event was published to EventBus');
    assert(broadcastPayload.workspaceId === workspaceA.id, 'Payload contains correct workspaceId');
    assert(broadcastPayload.conversationId === dmConvId, 'Payload contains correct conversationId');
    assert(broadcastPayload.senderId === bobUser.id, 'Payload contains correct senderId');
    assert(Boolean(broadcastPayload.messageId), 'Payload contains messageId');
    assert(Boolean(broadcastPayload.createdAt), 'Payload contains createdAt');

    unsubscribe();
  }

  // -------------------------------------------------------------
  // TEST 6: Typing indicator emitted without database persistence
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Typing indicator emitted without database persistence ---');
  {
    let typingReceived: any = null;
    const unsubscribe = EventBus.subscribeWorkspace(workspaceA.id, (event) => {
      if (event.type === 'chat.user.typing') {
        typingReceived = event.payload;
      }
    });

    // Bob sends typing indicator
    const typingRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/typing`, {
        method: 'POST',
        headers: bobHeaders,
      })
    );
    assert(typingRes.status === 200, 'POST typing endpoint returned 200 OK');
    assert(typingReceived !== null, 'EventBus received chat.user.typing event');
    assert(typingReceived.conversationId === dmConvId, 'Typing event has matching conversationId');
    assert(typingReceived.userId === bobUser.id, 'Typing event has matching userId');

    // Verify no typing table exists in database
    const dbAny: any = inMemoryDb;
    assert(dbAny.typing === undefined && dbAny.typingIndicators === undefined, 'No typing database table exists');

    unsubscribe();
  }

  // -------------------------------------------------------------
  // TEST 7: Sender never receives unread count for own message
  // -------------------------------------------------------------
  console.log('\n--- Test 7: Sender never receives unread count for own message ---');
  {
    // Bob sends 3 messages in a row
    for (let i = 1; i <= 3; i++) {
      await app.fetch(
        new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages`, {
          method: 'POST',
          headers: bobHeaders,
          body: JSON.stringify({ content: `Sender message ${i}` }),
        })
      );
    }

    // Bob's own unread count for this conversation must strictly be 0
    const bobUnread = await ChatRepository.getUnreadCountForConversation(dmConvId, bobUser.id);
    assert(bobUnread === 0, 'Bob (sender) never receives unread count for own messages (unreadCount = 0)');

    // But Alice's unread count should reflect the unread messages
    const aliceUnread = await ChatRepository.getUnreadCountForConversation(dmConvId, aliceUser.id);
    assert(aliceUnread > 0, 'Recipient (Alice) correctly receives unread count for Bob messages');
  }

  // -------------------------------------------------------------
  // TEST 8: Cross-workspace isolation
  // -------------------------------------------------------------
  console.log('\n--- Test 8: Cross-workspace isolation ---');
  {
    // Charlie from Workspace B attempts to access Workspace A DM conversation messages
    const accessRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages`, {
        headers: charlieHeaders,
      })
    );
    assert(accessRes.status === 404 || accessRes.status === 403, 'User from Workspace B cannot access Workspace A chat (403/404)');

    // Charlie's global unread count in Workspace B must be 0
    const charlieUnreadRes = await app.fetch(
      new Request('http://localhost:3000/api/chat/unread-count', {
        headers: charlieHeaders,
      })
    );
    const charlieUnreadData = await charlieUnreadRes.json();
    assert(charlieUnreadData.unreadCount === 0, 'Charlie in Workspace B has 0 unread count');
  }

  // -------------------------------------------------------------
  // TEST 9: Pagination returns 50 messages max
  // -------------------------------------------------------------
  console.log('\n--- Test 9: Pagination returns 50 messages max ---');
  {
    // Send 60 messages into dmConvId
    for (let i = 1; i <= 60; i++) {
      await ChatRepository.createMessage({
        conversationId: dmConvId,
        workspaceId: workspaceA.id,
        senderId: bobUser.id,
        content: `Bulk message #${i}`,
      });
    }

    // Fetch messages without limit parameter (should default and cap at 50)
    const listRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages`, {
        headers: aliceHeaders,
      })
    );
    const listData = await listRes.json();
    assert(listData.messages.length === 50, `Default fetch returns exactly 50 messages (actual: ${listData.messages.length})`);

    // Fetch with explicit limit=100 (guardrail should enforce max 50)
    const listOverLimitRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages?limit=100`, {
        headers: aliceHeaders,
      })
    );
    const listOverLimitData = await listOverLimitRes.json();
    assert(listOverLimitData.messages.length === 50, 'Enforced guardrail prevents fetching > 50 messages');

    // Fetch older messages using before
    const oldestTimestamp = listData.messages[0].createdAt;
    const olderRes = await app.fetch(
      new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages?before=${encodeURIComponent(oldestTimestamp)}`, {
        headers: aliceHeaders,
      })
    );
    const olderData = await olderRes.json();
    assert(olderData.messages.length > 0, 'Older messages successfully retrieved using before cursor');
    assert(olderData.messages.length <= 50, 'Older messages query also adheres to 50 message guardrail');
  }

  // -------------------------------------------------------------
  // TEST 10: Unread badge accuracy after multiple conversations receive messages
  // -------------------------------------------------------------
  console.log('\n--- Test 10: Unread badge accuracy after multiple conversations receive messages ---');
  {
    // Reset Alice's read position for DM
    await ChatService.markConversationRead(workspaceA.id, dmConvId, aliceUser.id);

    // Create a department channel
    const dept = await inMemoryDb.departments.get(
      Array.from(inMemoryDb.departments.keys())[0]
    ) || { id: 'dept-eng', workspaceId: workspaceA.id, name: 'Engineering' };
    inMemoryDb.departments.set(dept.id, dept);

    const deptConv = await ChatService.getOrCreateDepartmentChannel(workspaceA.id, dept.id, aliceUser.id);
    await ChatRepository.addConversationMember({
      conversationId: deptConv.id,
      workspaceId: workspaceA.id,
      userId: bobUser.id,
      role: 'member',
    });
    await ChatService.markConversationRead(workspaceA.id, deptConv.id, aliceUser.id);

    // Get announcement channel
    const annConv = await ChatService.getOrCreateAnnouncementChannel(workspaceA.id, aliceUser.id);
    await ChatService.markConversationRead(workspaceA.id, annConv.id, bobUser.id);

    // Allow timestamp progression so new messages are strictly newer
    await new Promise((resolve) => setTimeout(resolve, 25));

    // 1. Bob sends 3 messages in DM
    for (let i = 0; i < 3; i++) {
      await ChatRepository.createMessage({
        conversationId: dmConvId,
        workspaceId: workspaceA.id,
        senderId: bobUser.id,
        content: `DM message ${i}`,
      });
    }

    // 2. Bob sends 2 messages in Department channel
    for (let i = 0; i < 2; i++) {
      await ChatRepository.createMessage({
        conversationId: deptConv.id,
        workspaceId: workspaceA.id,
        senderId: bobUser.id,
        content: `Dept message ${i}`,
      });
    }

    // 3. Verify individual unread counts for Alice
    const dmUnread = await ChatRepository.getUnreadCountForConversation(dmConvId, aliceUser.id);
    const deptUnread = await ChatRepository.getUnreadCountForConversation(deptConv.id, aliceUser.id);
    assert(dmUnread === 3, `DM unread count for Alice is 3 (actual: ${dmUnread})`);
    assert(deptUnread === 2, `Dept unread count for Alice is 2 (actual: ${deptUnread})`);

    // 4. Verify global unread count via endpoint GET /api/chat/unread-count
    const globalRes = await app.fetch(
      new Request('http://localhost:3000/api/chat/unread-count', {
        headers: aliceHeaders,
      })
    );
    const globalData = await globalRes.json();
    assert(globalData.unreadCount === 5, `Global unread count is exactly 5 (actual: ${globalData.unreadCount})`);

    // 5. Alice reads the department channel
    await ChatService.markConversationRead(workspaceA.id, deptConv.id, aliceUser.id);

    const globalResAfterDeptRead = await app.fetch(
      new Request('http://localhost:3000/api/chat/unread-count', {
        headers: aliceHeaders,
      })
    );
    const globalDataAfter = await globalResAfterDeptRead.json();
    assert(globalDataAfter.unreadCount === 3, `Global unread count drops to 3 after reading Dept channel (actual: ${globalDataAfter.unreadCount})`);
  }

  console.log('\n===============================================================');
  console.log(' ✅ ALL 10 CHAT V2 TESTS PASSED SUCCESSFULLY (SUITE 32)');
  console.log('===============================================================\n');
}
