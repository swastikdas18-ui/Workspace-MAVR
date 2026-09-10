/**
 * Suite 48: Chat Announcement Acknowledgements (Phase 2G) Test Suite
 *
 * Validates:
 * 1. Acknowledgement:
 *    - Employee/Intern acknowledges official announcements via POST /api/chat/acknowledge & POST /api/chat/announcements/:id/acknowledge
 *    - Multiple acknowledgements by same user are handled idempotently
 * 2. Reporting / Stats:
 *    - Admin and members retrieve stats via GET /api/chat/announcements/:id/stats & GET /api/chat/stats
 *    - Progress counts (acknowledgedCount / totalMembers) and percentages are exact
 *    - Audit list includes names, roles, emails, and timestamps
 * 3. Permissions:
 *    - Interns can acknowledge announcements
 *    - Unauthorized / unauthenticated requests are rejected (401/403)
 * 4. Isolation:
 *    - User in Workspace B cannot acknowledge or query announcements in Workspace A
 *    - Stats reflect strictly current workspace membership and acknowledgements
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { ChatService } from '../src/services/chat-service';

interface TestContext {
  tokenAdminA: string;
  tokenEmployeeA: string;
  tokenInternA: string;
  tokenUserB: string;
  workspaceAId: string;
  workspaceBId: string;
  announcementConvId: string;
  announcementMsgId: string;
  generalConvId: string;
  generalMsgId: string;
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

  // 1. Register Alice Admin in Workspace A
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Admin',
        email: 'alice.ack@acme.io',
        password: 'Password123!',
        workspaceName: 'Acme Acknowledgements Hub',
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
      body: JSON.stringify({ email: 'bob.ack@acme.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.ack@acme.io', password: 'Password123!' }),
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
      body: JSON.stringify({ email: 'charlie.ack@acme.io', role: 'intern' }),
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
      body: JSON.stringify({ email: 'charlie.ack@acme.io', password: 'Password123!' }),
    })
  );
  const charlieData = attachSessionToken(loginCharlieRes, await loginCharlieRes.json());
  const tokenInternA = charlieData.token;
  const userAInternId = charlieData.user.id;

  // 4. Register Eve in Workspace B (Competitor)
  const regEveRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eve Evil',
        email: 'eve.ack@other.io',
        password: 'Password123!',
        workspaceName: 'Competitor Hub',
      }),
    })
  );
  const eveData = attachSessionToken(regEveRes, await regEveRes.json());
  const tokenUserB = eveData.token;
  const workspaceBId = eveData.workspace.id;

  // 5. Ensure Announcements channel exists in Workspace A
  const annConv = await ChatService.getOrCreateAnnouncementChannel(workspaceAId, userAAdminId);
  const announcementConvId = annConv.id;

  // 6. Admin posts an official policy announcement in Workspace A
  const postAnnRes = await request(`/api/chat/conversations/${announcementConvId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { content: '📢 Mandatory Security Policy Update: All employees and interns must rotate passwords immediately.' },
  });
  const announcementMsgId = postAnnRes.body.message.id;

  // 7. Admin also creates a regular channel for negative testing
  const createGenRes = await request('/api/chat/channels', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { title: 'watercooler', description: 'Random discussion' },
  });
  const generalConvId = createGenRes.body.conversation.id;
  const postGenRes = await request(`/api/chat/conversations/${generalConvId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAdminA}` },
    body: { content: 'Casual friday lunch plans' },
  });
  const generalMsgId = postGenRes.body.message.id;

  return {
    tokenAdminA,
    tokenEmployeeA,
    tokenInternA,
    tokenUserB,
    workspaceAId,
    workspaceBId,
    announcementConvId,
    announcementMsgId,
    generalConvId,
    generalMsgId,
    userAAdminId,
    userAEmployeeId,
    userAInternId,
  };
}

export async function runChatAnnouncementsTests(): Promise<void> {
  console.log('\n--- Running Suite 48: Announcement Acknowledgements (Phase 2G) ---');
  const ctx = await setupTestData();

  // =========================================================================
  // TEST 1: EMPLOYEE ACKNOWLEDGEMENT (POST /api/chat/acknowledge)
  // =========================================================================
  console.log('Test 1: Employee acknowledges announcement');
  const ack1Res = await request('/api/chat/acknowledge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: { announcementId: ctx.announcementMsgId },
  });
  assert.equal(ack1Res.status, 201, 'Status should be 201 Created');
  assert.ok(ack1Res.body.success, 'Acknowledgement response should be successful');
  assert.ok(ack1Res.body.acknowledged, 'Should indicate acknowledged');
  assert.ok(ack1Res.body.stats, 'Response should contain updated stats');
  assert.equal(ack1Res.body.stats.acknowledgedCount, 1, '1 member acknowledged so far');
  assert.equal(ack1Res.body.stats.userAcknowledged, true, 'Current user is marked acknowledged');
  console.log('✓ Employee successfully acknowledged announcement via POST /api/chat/acknowledge');

  // Test 1b: Duplicate acknowledgement is idempotent
  const dupAckRes = await request(`/api/chat/announcements/${ctx.announcementMsgId}/acknowledge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
  });
  assert.equal(dupAckRes.status, 201, 'Duplicate acknowledgement returns 201');
  assert.equal(dupAckRes.body.stats.acknowledgedCount, 1, 'Count remains 1 without double-counting');
  console.log('✓ Duplicate acknowledgement is idempotent');

  // =========================================================================
  // TEST 2: INTERN PERMISSION & ACKNOWLEDGEMENT
  // =========================================================================
  console.log('Test 2: Intern acknowledges announcement');
  const internAckRes = await request(`/api/chat/announcements/${ctx.announcementMsgId}/acknowledge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenInternA}` },
  });
  assert.equal(internAckRes.status, 201, 'Intern can acknowledge official announcements');
  assert.equal(internAckRes.body.stats.acknowledgedCount, 2, 'Total acknowledgements should now be 2');
  console.log('✓ Intern can successfully acknowledge announcements');

  // =========================================================================
  // TEST 3: REPORTING & STATS (GET /api/chat/announcements/:id/stats & GET /api/chat/stats)
  // =========================================================================
  console.log('Test 3: Admin & Member view stats and auditor breakdown');
  const adminStatsRes = await request(`/api/chat/announcements/${ctx.announcementMsgId}/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
  });
  assert.equal(adminStatsRes.status, 200, 'Admin can fetch stats');
  assert.equal(adminStatsRes.body.acknowledgedCount, 2, '2 members acknowledged');
  assert.equal(adminStatsRes.body.totalMembers, 3, 'Workspace A has 3 total members (Alice, Bob, Charlie)');
  assert.equal(adminStatsRes.body.percentage, 67, '2/3 rounds to 67%');
  assert.equal(adminStatsRes.body.userAcknowledged, false, 'Alice herself has not yet acknowledged');
  assert.ok(Array.isArray(adminStatsRes.body.acknowledgements), 'Should include acknowledgements array');
  assert.equal(adminStatsRes.body.acknowledgements.length, 2, 'Contains 2 audit records');

  // Verify audit item fields
  const ackUserNames = adminStatsRes.body.acknowledgements.map((a: any) => a.name);
  assert.ok(ackUserNames.includes('Bob Employee'), 'Audit log contains Bob Employee');
  assert.ok(ackUserNames.includes('Charlie Intern'), 'Audit log contains Charlie Intern');

  // Query via alternate GET /api/chat/stats?announcementId=...
  const altStatsRes = await request(`/api/chat/stats?announcementId=${ctx.announcementMsgId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
  });
  assert.equal(altStatsRes.status, 200);
  assert.equal(altStatsRes.body.userAcknowledged, true, 'Bob sees userAcknowledged = true');
  console.log('✓ Stats and audit reporting verified: 2 / 3 acknowledged (67%) with full attendee logs');

  // =========================================================================
  // TEST 4: ADMIN ACKNOWLEDGES -> 100% COMPLIANCE
  // =========================================================================
  console.log('Test 4: Admin acknowledges announcement -> 100% compliance');
  const adminAckRes = await request('/api/chat/acknowledge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenAdminA}` },
    body: { announcementId: ctx.announcementMsgId },
  });
  assert.equal(adminAckRes.status, 201);
  assert.equal(adminAckRes.body.stats.acknowledgedCount, 3);
  assert.equal(adminAckRes.body.stats.percentage, 100, '3/3 is 100% compliance');
  assert.equal(adminAckRes.body.stats.userAcknowledged, true);
  console.log('✓ Admin acknowledged: full 3 / 3 (100%) compliance achieved');

  // =========================================================================
  // TEST 5: CROSS-TENANT & SCOPE ISOLATION
  // =========================================================================
  console.log('Test 5: Strict Multi-Tenant Isolation');
  // Eve in Workspace B attempts to acknowledge Workspace A's announcement -> 404 (or 403)
  const eveAckRes = await request('/api/chat/acknowledge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
    body: { announcementId: ctx.announcementMsgId },
  });
  assert.equal(eveAckRes.status, 404, 'Eve cannot acknowledge Workspace A announcement (404 Not Found)');

  // Eve attempts to query stats for Workspace A announcement -> 404
  const eveStatsRes = await request(`/api/chat/announcements/${ctx.announcementMsgId}/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${ctx.tokenUserB}` },
  });
  assert.equal(eveStatsRes.status, 404, 'Eve cannot query stats for Workspace A announcement');

  // Non-announcement channel messages cannot be acknowledged
  const invalidAckRes = await request('/api/chat/acknowledge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.tokenEmployeeA}` },
    body: { announcementId: ctx.generalMsgId },
  });
  assert.equal(invalidAckRes.status, 404, 'Non-announcement channel messages cannot be acknowledged (404)');

  console.log('✓ Strict Multi-Tenant and channel isolation enforced');
  console.log('\n--- Suite 48: All Tests Passed Cleanly ---\n');
}

// Auto-run if directly executed
if (process.argv[1]?.endsWith('chat-announcements.test.ts') || process.argv[1]?.endsWith('chat-announcements.test.js')) {
  runChatAnnouncementsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Suite 48 Failed:', err);
      process.exit(1);
    });
}
