/**
 * Suite 47: Chat Saved Messages (Phase 2F) Test Suite
 *
 * Validates:
 * 1. Save message: POST /api/chat/save & POST /api/chat/messages/:id/save
 * 2. Remove saved message: DELETE /api/chat/save & DELETE /api/chat/messages/:id/save
 * 3. Listing saved messages: GET /api/chat/saved returns structured saved message items with sender & conversation details
 * 4. Isolation:
 *    - User Isolation: User B in same workspace does not see User A's saved messages
 *    - Tenant Isolation: User in Workspace B cannot save or access messages from Workspace A
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';

interface TestContext {
  tokenAdminA: string;
  tokenEmployeeA: string;
  tokenUserB: string;
  workspaceAId: string;
  workspaceBId: string;
  channelAId: string;
  message1Id: string;
  message2Id: string;
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

  // 1. Register Alice Admin in Workspace A
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Admin',
        email: 'alice.saved@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Saved Hub',
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
      body: JSON.stringify({ email: 'bob.saved@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.saved@acme.io', password: 'Password123!' }),
    })
  );
  const bobData = attachSessionToken(loginBobRes, await loginBobRes.json());
  const tokenEmployeeA = bobData.token;

  // 3. Register Eve in Workspace B (for cross-tenant testing)
  const regEveRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eve Evil',
        email: 'eve.saved@other.io',
        password: 'Password123!',
        workspaceName: 'Competitor Saved Hub',
      }),
    })
  );
  const eveData = attachSessionToken(regEveRes, await regEveRes.json());
  const tokenUserB = eveData.token;
  const workspaceBId = eveData.workspace.id;

  // 4. Create channel in Workspace A
  const createChannelRes = await request('/api/chat/channels', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { title: 'important-notes', description: 'Critical documents and messages' },
  });
  const channelAId = createChannelRes.body.conversation.id;

  // 5. Send messages to the channel
  const send1Res = await request(`/api/chat/conversations/${channelAId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { content: 'Critical production database credentials and runbook link.' },
  });
  const message1Id = send1Res.body.message.id;

  const send2Res = await request(`/api/chat/conversations/${channelAId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenEmployeeA}` },
    body: { content: 'Client presentation slide deck notes.' },
  });
  const message2Id = send2Res.body.message.id;

  return {
    tokenAdminA,
    tokenEmployeeA,
    tokenUserB,
    workspaceAId,
    workspaceBId,
    channelAId,
    message1Id,
    message2Id,
  };
}

export async function runChatSavedMessagesTests(): Promise<void> {
  console.log('\n--- Running Suite 47: Saved Messages (Phase 2F) ---');

  const ctx = await setupTestData();

  // =========================================================================
  // Test 1: Save Message
  // =========================================================================
  console.log('Test 1: Save message via POST /api/chat/save & /api/chat/messages/:id/save');

  // Alice saves message 1 via POST /api/chat/save
  const save1Res = await request('/api/chat/save', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
    body: { messageId: ctx.message1Id },
  });
  assert.equal(save1Res.status, 201, `Expected 201 status, got ${save1Res.status}`);
  assert.equal(save1Res.body.success, true);
  assert.ok(save1Res.body.saved.id);

  // Alice saves message 2 via POST /api/chat/messages/:id/save
  const save2Res = await request(`/api/chat/messages/${ctx.message2Id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });
  assert.equal(save2Res.status, 201);
  assert.equal(save2Res.body.success, true);
  console.log('✓ Successfully saved messages via both POST endpoints');

  // =========================================================================
  // Test 2: Listing Saved Messages (GET /api/chat/saved)
  // =========================================================================
  console.log('Test 2: Listing saved messages via GET /api/chat/saved');
  const listRes = await request('/api/chat/saved', {
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.savedMessages), 'savedMessages must be an array');
  assert.equal(listRes.body.savedMessages.length, 2, 'Alice should have 2 saved messages');

  const savedItem = listRes.body.savedMessages[0];
  assert.ok(savedItem.id);
  assert.ok(savedItem.messageId);
  assert.ok(savedItem.message);
  assert.ok(savedItem.message.content);
  assert.ok(savedItem.message.sender);
  assert.ok(savedItem.conversation);
  console.log('✓ Saved messages returned with full message, sender, and conversation payload');

  // =========================================================================
  // Test 3: User & Multi-Tenant Isolation
  // =========================================================================
  console.log('Test 3: User & Tenant Isolation');

  // 3a. Bob (same workspace) should have 0 saved messages
  const bobListRes = await request('/api/chat/saved', {
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
  });
  assert.equal(bobListRes.status, 200);
  assert.equal(bobListRes.body.savedMessages.length, 0, 'Bob should not see Alice’s saved messages');

  // 3b. Eve in Workspace B should have 0 saved messages
  const eveListRes = await request('/api/chat/saved', {
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
  });
  assert.equal(eveListRes.status, 200);
  assert.equal(eveListRes.body.savedMessages.length, 0);

  // 3c. Eve attempts to save Alice’s message from Workspace A -> should receive 404
  const eveSaveRes = await request('/api/chat/save', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
    body: { messageId: ctx.message1Id },
  });
  assert.equal(eveSaveRes.status, 404, `Eve in Workspace B cannot save message from Workspace A, got ${eveSaveRes.status}`);
  console.log('✓ Strict User and Tenant Isolation enforced');

  // =========================================================================
  // Test 4: Remove Saved Message (DELETE /api/chat/save)
  // =========================================================================
  console.log('Test 4: Unsave message via DELETE /api/chat/save & /api/chat/messages/:id/save');

  // Alice unsaves message 1 via DELETE /api/chat/save
  const unsave1Res = await request('/api/chat/save', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
    body: { messageId: ctx.message1Id },
  });
  assert.equal(unsave1Res.status, 200);
  assert.equal(unsave1Res.body.success, true);

  // Check remaining saved messages count
  const listAfter1 = await request('/api/chat/saved', {
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });
  assert.equal(listAfter1.body.savedMessages.length, 1);
  assert.equal(listAfter1.body.savedMessages[0].messageId, ctx.message2Id);

  // Alice unsaves message 2 via DELETE /api/chat/messages/:id/save
  const unsave2Res = await request(`/api/chat/messages/${ctx.message2Id}/save`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });
  assert.equal(unsave2Res.status, 200);
  assert.equal(unsave2Res.body.success, true);

  const listAfter2 = await request('/api/chat/saved', {
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });
  assert.equal(listAfter2.body.savedMessages.length, 0, 'All saved messages cleanly removed');
  console.log('✓ Successfully unsaved messages via both DELETE endpoints');

  console.log('\n--- Suite 47: All Tests Passed Cleanly ---');
}

if (process.argv[1]?.endsWith('chat-saved-messages.test.ts')) {
  runChatSavedMessagesTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
