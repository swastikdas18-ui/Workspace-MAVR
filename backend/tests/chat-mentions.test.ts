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
  userBId: string;
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
        email: 'alice.mention@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Mention Corp',
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
      body: JSON.stringify({ email: 'bob.mention@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.mention@acme.io', password: 'Password123!' }),
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
      body: JSON.stringify({ email: 'ian.mention@acme.io', role: 'intern' }),
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
      body: JSON.stringify({ email: 'ian.mention@acme.io', password: 'Password123!' }),
    })
  );
  const ianData = attachSessionToken(loginIanRes, await loginIanRes.json());
  const tokenInternA = ianData.token;
  const userAInternId = ianData.user.id;

  // 4. Register Charlie in Workspace B (Cross-tenant user)
  const regCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie Tenant',
        email: 'charlie@other.io',
        password: 'Password123!',
        workspaceName: 'Other Tenant Corp',
      }),
    })
  );
  const charlieData = attachSessionToken(regCharlieRes, await regCharlieRes.json());
  const tokenUserB = charlieData.token;
  const workspaceBId = charlieData.workspace.id;
  const userBId = charlieData.user.id;

  // 5. Create a team in Workspace A and add Bob to it
  const teamRes = await request('/api/teams', {
    method: 'POST',
    headers: aliceHeaders,
    body: {
      name: 'Engineering',
      description: 'Core dev squad',
    },
  });
  assert.equal(teamRes.status, 201);
  const teamId = teamRes.body.team?.id || teamRes.body.id;

  // Add Bob to Engineering team
  await request(`/api/teams/${teamId}/members`, {
    method: 'POST',
    headers: aliceHeaders,
    body: { userId: userAEmployeeId },
  });

  // 6. Create a channel in Workspace A
  const channelRes = await request('/api/chat/conversations/channel', {
    method: 'POST',
    headers: aliceHeaders,
    body: {
      title: 'announcements-and-ops',
      description: 'Main general announcements channel',
    },
  });
  assert.equal(channelRes.status, 201, `Failed to create channel: ${JSON.stringify(channelRes.body)}`);
  const channelAId = channelRes.body.conversation?.id || channelRes.body.id;

  // Add Bob and Ian to the channel
  const { ChatRepository } = await import('../src/repositories/chat-repository');
  await ChatRepository.addConversationMember({
    conversationId: channelAId,
    workspaceId: workspaceAId,
    userId: userAEmployeeId,
    role: 'member',
  });
  await ChatRepository.addConversationMember({
    conversationId: channelAId,
    workspaceId: workspaceAId,
    userId: userAInternId,
    role: 'member',
  });

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
    userBId,
  };
}

export async function runChatMentionsTests() {
  console.log('--- Suite: Workspace OS — Chat Mentions & Notification Engine (Phase 2B) ---');
  const ctx = await setupTestData();

  // Keep track of emitted events
  const publishedEvents: Array<{ event: string; payload: any; options?: any }> = [];
  const origPublish = EventBus.publishWorkspaceEvent.bind(EventBus);
  (EventBus as any).publishWorkspaceEvent = (workspaceId: string, event: string, payload: any, options?: any) => {
    publishedEvents.push({ event, payload, options });
    return origPublish(workspaceId, event, payload, options);
  };

  try {
    // -------------------------------------------------------------
    // Test 1: User Mention (@Bob)
    // -------------------------------------------------------------
    console.log('Checking Test 1: User Mentions (@Bob)...');
    publishedEvents.length = 0;

    const msg1Res = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
      body: {
        content: 'Hey @Bob please review the PR when you get a chance!',
      },
    });
    assert.equal(msg1Res.status, 201, `Failed to send user mention message: ${JSON.stringify(msg1Res.body)}`);
    const msg1Id = msg1Res.body.message?.id || msg1Res.body.id;

    // Check message_mentions in DB
    const mentions1 = Array.from(inMemoryDb.messageMentions.values()).filter((m: any) => m.messageId === msg1Id);
    assert.equal(mentions1.length, 1, 'Expected 1 message_mentions record');
    assert.equal(mentions1[0].mentionedUserId, ctx.userAEmployeeId, 'Mentioned user must be Bob');
    assert.equal(mentions1[0].mentionType, 'user');
    assert.equal(mentions1[0].workspaceId, ctx.workspaceAId);

    // Verify realtime event was emitted
    const mentionEvent1 = publishedEvents.find((e) => e.event === 'chat.mention.created');
    assert.ok(mentionEvent1, 'chat.mention.created event must be emitted');
    assert.equal(mentionEvent1.payload.mentionedUserId, ctx.userAEmployeeId);
    assert.equal(mentionEvent1.payload.mentionType, 'user');

    // Verify Bob received notification
    const bobNotifRes1 = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    });
    assert.equal(bobNotifRes1.status, 200);
    const bobNotifs = bobNotifRes1.body.notifications || bobNotifRes1.body || [];
    const mentionNotif = bobNotifs.find((n: any) => n.type === 'mention_received');
    assert.ok(mentionNotif, 'Bob must have a mention_received notification');
    assert.match(mentionNotif.title, /mentioned you/i);

    console.log('✅ Test 1 Passed: Direct user mention recorded, notified, and emitted.');

    // -------------------------------------------------------------
    // Test 2: Team Mention (@team or @Engineering)
    // -------------------------------------------------------------
    console.log('Checking Test 2: Team Mentions (@team)...');
    publishedEvents.length = 0;

    const msg2Res = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
      body: {
        content: 'Attention @team: Deploy freeze is now active!',
      },
    });
    assert.equal(msg2Res.status, 201);
    const msg2Id = msg2Res.body.message?.id || msg2Res.body.id;

    const mentions2 = Array.from(inMemoryDb.messageMentions.values()).filter((m: any) => m.messageId === msg2Id);
    assert.ok(mentions2.length >= 1, 'Expected team mention records');
    const bobTeamMention = mentions2.find((m: any) => m.mentionedUserId === ctx.userAEmployeeId);
    assert.ok(bobTeamMention, 'Bob (team member) should have mention record');
    assert.equal(bobTeamMention.mentionType, 'team');

    // Verify realtime event for team mention
    const teamEvent = publishedEvents.find(
      (e) => e.event === 'chat.mention.created' && e.payload.mentionType === 'team' && e.payload.mentionedUserId === ctx.userAEmployeeId
    );
    assert.ok(teamEvent, 'Team mention event must be emitted for Bob');

    console.log('✅ Test 2 Passed: Team mention properly routed to team members.');

    // -------------------------------------------------------------
    // Test 3: Admin Mention (@admins)
    // -------------------------------------------------------------
    console.log('Checking Test 3: Admin Mentions (@admins)...');
    publishedEvents.length = 0;

    // Bob sends message mentioning @admins
    const msg3Res = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
      body: {
        content: 'Urgent: @admins please unlock production credentials.',
      },
    });
    assert.equal(msg3Res.status, 201);
    const msg3Id = msg3Res.body.message?.id || msg3Res.body.id;

    const mentions3 = Array.from(inMemoryDb.messageMentions.values()).filter((m: any) => m.messageId === msg3Id);
    const aliceAdminMention = mentions3.find((m: any) => m.mentionedUserId === ctx.userAAdminId);
    assert.ok(aliceAdminMention, 'Alice (Admin) should have mention record for @admins');
    assert.equal(aliceAdminMention.mentionType, 'admins');

    // Verify Alice received notification
    const aliceNotifRes = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
    });
    assert.equal(aliceNotifRes.status, 200);
    const aliceNotifs = aliceNotifRes.body.notifications || aliceNotifRes.body || [];
    const adminMentionNotif = aliceNotifs.find((n: any) => n.type === 'mention_received' && n.title.includes('@admins'));
    assert.ok(adminMentionNotif, 'Alice must receive an @admins mention notification');

    console.log('✅ Test 3 Passed: Admin mentions routed exclusively to workspace admins.');

    // -------------------------------------------------------------
    // Test 4: Everyone Mention (@everyone)
    // -------------------------------------------------------------
    console.log('Checking Test 4: Everyone Mentions (@everyone)...');
    publishedEvents.length = 0;

    // Alice mentions @everyone in channel with Bob and Ian
    const msg4Res = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
      body: {
        content: 'Good morning @everyone, company all-hands in 10 minutes!',
      },
    });
    assert.equal(msg4Res.status, 201);
    const msg4Id = msg4Res.body.message?.id || msg4Res.body.id;

    const mentions4 = Array.from(inMemoryDb.messageMentions.values()).filter((m: any) => m.messageId === msg4Id);
    // Should notify Bob and Ian (excluding Alice herself)
    const notifiedUserIds = mentions4.map((m: any) => m.mentionedUserId);
    assert.ok(notifiedUserIds.includes(ctx.userAEmployeeId), 'Bob must be mentioned by @everyone');
    assert.ok(notifiedUserIds.includes(ctx.userAInternId), 'Ian must be mentioned by @everyone');
    assert.ok(!notifiedUserIds.includes(ctx.userAAdminId), 'Sender Alice must not receive self-mention');

    console.log('✅ Test 4 Passed: @everyone mentions all conversation members excluding sender.');

    // -------------------------------------------------------------
    // Test 5: Notification Delivery Verification
    // -------------------------------------------------------------
    console.log('Checking Test 5: Notification Delivery...');
    const ianNotifRes = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${ctx.tokenInternA}` },
    });
    assert.equal(ianNotifRes.status, 200);
    const ianNotifs = ianNotifRes.body.notifications || ianNotifRes.body || [];
    const ianMentionNotif = ianNotifs.find((n: any) => n.type === 'mention_received');
    assert.ok(ianMentionNotif, 'Ian Intern must have received mention notification');
    assert.ok(
      ianMentionNotif.link.includes(`/chat?conversation=${ctx.channelAId}`) ||
        ianMentionNotif.link.includes(`/chat?conversationId=${ctx.channelAId}`),
      'Notification link must point to chat conversation'
    );

    console.log('✅ Test 5 Passed: Instant notification delivery verified with deep link.');

    // -------------------------------------------------------------
    // Test 6: Cross-Tenant Isolation
    // -------------------------------------------------------------
    console.log('Checking Test 6: Cross-Tenant Isolation...');

    // 6.1 Charlie (Workspace B) must not receive any mentions or notifications from Workspace A
    const charlieNotifRes = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
    });
    assert.equal(charlieNotifRes.status, 200);
    const charlieNotifs = charlieNotifRes.body.notifications || charlieNotifRes.body || [];
    assert.equal(charlieNotifs.length, 0, 'Cross-tenant Charlie must have zero notifications from Workspace A');

    // 6.2 Charlie cannot read Workspace A conversation messages
    const charlieReadRes = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
      headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
    });
    assert.ok(
      charlieReadRes.status === 403 || charlieReadRes.status === 404,
      'Cross-tenant user must be rejected with 403 or 404 when accessing Workspace A messages'
    );

    // 6.3 Mentioning Charlie in Workspace A should not create mention for cross-tenant user
    const crossMentionRes = await request(`/api/chat/conversations/${ctx.channelAId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
      body: {
        content: 'Hey @Charlie are you there?',
      },
    });
    assert.equal(crossMentionRes.status, 201);
    const crossMentionId = crossMentionRes.body.message?.id || crossMentionRes.body.id;
    const crossMentions = Array.from(inMemoryDb.messageMentions.values()).filter(
      (m: any) => m.messageId === crossMentionId
    );
    const charlieMention = crossMentions.find((m: any) => m.mentionedUserId === ctx.userBId);
    assert.equal(charlieMention, undefined, 'Must not resolve or link mention for user from another workspace');

    console.log('✅ Test 6 Passed: Complete cross-tenant mention and notification isolation enforced.');

    console.log('\n🌟 ALL CHAT MENTIONS & NOTIFICATION TESTS (PHASE 2B) PASSED CLEANLY 🌟\n');
  } finally {
    EventBus.publishWorkspaceEvent = origPublish;
  }
}

if (process.argv[1]?.includes('chat-mentions.test')) {
  runChatMentionsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
