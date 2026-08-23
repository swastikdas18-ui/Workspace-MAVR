import http from 'http';
import WebSocket from 'ws';
import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { wsServer } from '../src/realtime/websocket-server';
import { ChannelManager } from '../src/realtime/channel-manager';
import { PresenceManager } from '../src/realtime/presence-manager';
import { EventBus } from '../src/realtime/event-bus';
import { EventService } from '../src/services/event-service';
import { ActivityRepository } from '../src/repositories/activity-repository';
import { NotificationRepository } from '../src/repositories/notification-repository';
import { AnalyticsRepository } from '../src/repositories/analytics-repository';

// Test runner helper
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failCount++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passCount++;
    console.log(`✅ PASS: ${message}`);
  }
}

async function testApi(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
) {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  const req = new Request(`http://localhost:3000${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const res = await app.fetch(req);
  const data = await res.json();
  return { status: res.status, data };
}

/**
 * Helper to create a connected WebSocket client and collect incoming messages
 */
function createTestClient(
  port: number,
  token: string,
  workspaceId?: string
): Promise<{
  ws: WebSocket;
  messages: any[];
  waitForMessage: (predicate: (msg: any) => boolean, timeoutMs?: number) => Promise<any>;
  close: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    const messages: any[] = [];
    const messageListeners: Array<(msg: any) => void> = [];

    const url = `ws://localhost:${port}/ws?token=${encodeURIComponent(token)}${
      workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ''
    }`;

    const ws = new WebSocket(url);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        messages.push(msg);
        for (const listener of [...messageListeners]) {
          listener(msg);
        }
      } catch (err) {
        console.warn('Failed to parse test ws message:', err);
      }
    });

    ws.on('open', () => {
      const waitForMessage = (predicate: (msg: any) => boolean, timeoutMs = 4000): Promise<any> => {
        // Check if message was already received
        const existing = messages.find(predicate);
        if (existing) return Promise.resolve(existing);

        return new Promise((res, rej) => {
          const timeout = setTimeout(() => {
            const idx = messageListeners.indexOf(onMsg);
            if (idx >= 0) messageListeners.splice(idx, 1);
            rej(new Error(`Timeout waiting for WebSocket message. Received ${messages.length} messages so far: ${JSON.stringify(messages)}`));
          }, timeoutMs);

          const onMsg = (msg: any) => {
            if (predicate(msg)) {
              clearTimeout(timeout);
              const idx = messageListeners.indexOf(onMsg);
              if (idx >= 0) messageListeners.splice(idx, 1);
              res(msg);
            }
          };

          messageListeners.push(onMsg);
        });
      };

      const close = (): Promise<void> => {
        return new Promise((res) => {
          if (ws.readyState === WebSocket.CLOSED) {
            res();
            return;
          }
          ws.once('close', () => res());
          ws.close();
        });
      };

      resolve({ ws, messages, waitForMessage, close });
    });

    ws.on('error', (err) => {
      reject(err);
    });
  });
}

export async function runRealtimeTests() {
  console.log('\n================================================================');
  console.log(' RUNNING PHASE 5D: REAL-TIME COLLABORATION PLATFORM TESTS');
  console.log('================================================================\n');

  // Reset in-memory database and real-time state for clean isolated test environment
  inMemoryDb.reset();
  ChannelManager.clear();
  PresenceManager.clear();
  EventBus.clearHistory();

  // Spin up temporary HTTP server for WebSocket tests with ephemeral port
  const httpServer = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });

  // Attach WebSocket server to test HTTP server
  wsServer.attach(httpServer, '/ws');

  let testPort = 0;
  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      testPort = (httpServer.address() as any).port;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Setup Organizations, Workspaces & Auth Users
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Setting up Users, Workspaces and Roles ---');

    // 1. Admin in Workspace Alpha
    const adminReg = await testApi('POST', '/api/auth/register', {
      name: 'Alice Admin',
      email: 'alice@alpha.inc',
      password: 'Password123!',
      workspaceName: 'Alpha Workspace',
      role: 'admin',
    });
    assert(adminReg.status === 201, 'Step 1.1: Admin registered successfully in Alpha Workspace');
    const adminToken = adminReg.data.token;
    const adminUserId = adminReg.data.user.id;
    const alphaWorkspaceId = adminReg.data.workspace.id;

    // 2. Employee in Workspace Alpha
    const empReg = await testApi('POST', '/api/auth/register', {
      name: 'Bob Employee',
      email: 'bob@alpha.inc',
      password: 'Password123!',
      workspaceId: alphaWorkspaceId,
      role: 'employee',
    });
    assert(empReg.status === 201, 'Step 1.2: Employee registered in Alpha Workspace');
    const empToken = empReg.data.token;
    const empUserId = empReg.data.user.id;

    // 3. Intern in Workspace Alpha
    const internReg = await testApi('POST', '/api/auth/register', {
      name: 'Ian Intern',
      email: 'ian@alpha.inc',
      password: 'Password123!',
      workspaceId: alphaWorkspaceId,
      role: 'intern',
    });
    assert(internReg.status === 201, 'Step 1.3: Intern registered in Alpha Workspace');
    const internToken = internReg.data.token;
    const internUserId = internReg.data.user.id;

    // 4. Admin in Workspace Beta (Tenant Isolation Verification)
    const betaAdminReg = await testApi('POST', '/api/auth/register', {
      name: 'Bella Beta Admin',
      email: 'bella@beta.org',
      password: 'Password123!',
      workspaceName: 'Beta Workspace',
      role: 'admin',
    });
    assert(betaAdminReg.status === 201, 'Step 1.4: Admin registered in separate Beta Workspace');
    const betaToken = betaAdminReg.data.token;
    const betaUserId = betaAdminReg.data.user.id;
    const betaWorkspaceId = betaAdminReg.data.workspace.id;

    // -------------------------------------------------------------------------
    // STEP 2: WebSocket Authentication & Connection Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: WebSocket Authentication & Connection Lifecycle ---');

    // 2.1: Reject connection without token
    let rejectedNoToken = false;
    try {
      const badWs = new WebSocket(`ws://localhost:${testPort}/ws`);
      await new Promise<void>((res, rej) => {
        badWs.on('open', () => rej(new Error('Should not have opened')));
        badWs.on('close', (code) => {
          if (code === 4001 || code === 1008 || code === 1006) {
            rejectedNoToken = true;
            res();
          } else {
            rej(new Error(`Unexpected close code: ${code}`));
          }
        });
        badWs.on('error', () => {
          rejectedNoToken = true;
          res();
        });
      });
    } catch {
      rejectedNoToken = true;
    }
    assert(rejectedNoToken, 'Step 2.1: Connection without token rejected by WebSocket server');

    // 2.2: Reject connection with invalid/forged token
    let rejectedInvalidToken = false;
    try {
      const badWs = new WebSocket(`ws://localhost:${testPort}/ws?token=forged_token_xyz_999`);
      await new Promise<void>((res, rej) => {
        badWs.on('open', () => rej(new Error('Should not have opened')));
        badWs.on('close', (code) => {
          if (code === 4001 || code === 1008 || code === 1006) {
            rejectedInvalidToken = true;
            res();
          } else {
            rej(new Error(`Unexpected close code: ${code}`));
          }
        });
        badWs.on('error', () => {
          rejectedInvalidToken = true;
          res();
        });
      });
    } catch {
      rejectedInvalidToken = true;
    }
    assert(rejectedInvalidToken, 'Step 2.2: Connection with invalid token rejected by WebSocket server');

    // 2.3: Connect valid Admin Client
    const adminClient = await createTestClient(testPort, adminToken, alphaWorkspaceId);
    assert(adminClient.ws.readyState === WebSocket.OPEN, 'Step 2.3: Valid Admin connected to WebSocket server');

    // Verify initial 'connected' message
    const connectedMsg = await adminClient.waitForMessage((m) => m.type === 'connected');
    assert(connectedMsg.userId === adminUserId, 'Step 2.4: Server sent connected confirmation with correct userId');
    assert(connectedMsg.workspaceId === alphaWorkspaceId, 'Step 2.5: Server connected confirmation includes correct workspaceId');
    assert(connectedMsg.role === 'admin', 'Step 2.6: Server identified correct admin role');

    // 2.7: Ping / Pong Heartbeat
    adminClient.ws.send(JSON.stringify({ type: 'ping' }));
    const pongMsg = await adminClient.waitForMessage((m) => m.type === 'pong');
    assert(pongMsg.type === 'pong', 'Step 2.7: Ping answered with Pong from WebSocket server');
    assert(typeof pongMsg.timestamp === 'string', 'Step 2.8: Pong contains valid ISO timestamp');

    // -------------------------------------------------------------------------
    // STEP 3: Presence State Machine & Multi-Tab Synchronization
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Presence State Machine & Multi-Tab Synchronization ---');

    // 3.1: Connect Employee Client
    const empClient = await createTestClient(testPort, empToken, alphaWorkspaceId);
    assert(empClient.ws.readyState === WebSocket.OPEN, 'Step 3.1: Employee client connected');

    // Admin should receive user_online event for Bob Employee
    const empOnlineEvent = await adminClient.waitForMessage(
      (m) => m.type === 'user_online' && m.payload?.userId === empUserId
    );
    assert(empOnlineEvent !== null, 'Step 3.2: Admin received live user_online event for Employee');
    assert(empOnlineEvent.payload.status === 'online', 'Step 3.3: Employee presence status is online');

    // 3.4: Employee updates status to 'away'
    empClient.ws.send(JSON.stringify({ type: 'presence_update', status: 'away' }));
    const empAwayEvent = await adminClient.waitForMessage(
      (m) => m.type === 'status_changed' && m.payload?.userId === empUserId && m.payload?.status === 'away'
    );
    assert(empAwayEvent !== null, 'Step 3.4: Admin received status_changed broadcast when Employee changed status to away');

    // 3.5: Multi-tab presence: Connect second socket for Employee (e.g. second browser tab)
    const empTab2 = await createTestClient(testPort, empToken, alphaWorkspaceId);
    assert(empTab2.ws.readyState === WebSocket.OPEN, 'Step 3.5: Employee second tab connected');
    assert(PresenceManager.isUserOnline(empUserId, alphaWorkspaceId), 'Step 3.6: User remains online with multi-tab presence');

    // 3.7: Close tab 1 — User should STILL remain online because tab 2 is open
    await empClient.close();
    await new Promise((r) => setTimeout(r, 100));
    assert(
      PresenceManager.isUserOnline(empUserId, alphaWorkspaceId),
      'Step 3.7: User remains online after 1 of 2 tabs is closed'
    );

    // 3.8: Close tab 2 — User should now be marked offline and broadcast user_offline
    await empTab2.close();
    const empOfflineEvent = await adminClient.waitForMessage(
      (m) => m.type === 'user_offline' && m.payload?.userId === empUserId
    );
    assert(empOfflineEvent !== null, 'Step 3.8: Admin received user_offline event when last socket closed');
    assert(!PresenceManager.isUserOnline(empUserId, alphaWorkspaceId), 'Step 3.9: User correctly marked offline in presence manager');

    // -------------------------------------------------------------------------
    // STEP 4: Multi-Tenant Channel Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Multi-Tenant Channel Isolation ---');

    // Reconnect Employee in Alpha Workspace
    const alphaEmpClient = await createTestClient(testPort, empToken, alphaWorkspaceId);
    // Connect Beta Admin in Beta Workspace
    const betaClient = await createTestClient(testPort, betaToken, betaWorkspaceId);

    assert(alphaEmpClient.ws.readyState === WebSocket.OPEN, 'Step 4.1: Alpha employee connected');
    assert(betaClient.ws.readyState === WebSocket.OPEN, 'Step 4.2: Beta admin connected');

    // Clear previous messages
    alphaEmpClient.messages.length = 0;
    betaClient.messages.length = 0;

    // Publish event strictly to Alpha Workspace
    EventBus.publishWorkspaceEvent(alphaWorkspaceId, 'test_alpha_event', { secret: 'alpha_data_123' }, {
      actorId: adminUserId,
      entityType: 'test',
    });

    // Alpha employee MUST receive it
    const alphaMsg = await alphaEmpClient.waitForMessage((m) => m.type === 'test_alpha_event');
    assert(alphaMsg.payload.secret === 'alpha_data_123', 'Step 4.3: Alpha workspace member received Alpha event');

    // Beta admin MUST NOT receive Alpha event
    await new Promise((r) => setTimeout(r, 200));
    const betaReceivedAlpha = betaClient.messages.some((m) => m.type === 'test_alpha_event');
    assert(!betaReceivedAlpha, 'Step 4.4: Multi-tenant boundary enforced: Beta workspace received 0 Alpha events');

    // Publish event strictly to Beta Workspace
    EventBus.publishWorkspaceEvent(betaWorkspaceId, 'test_beta_event', { secret: 'beta_data_999' }, {
      actorId: betaUserId,
      entityType: 'test',
    });

    const betaMsg = await betaClient.waitForMessage((m) => m.type === 'test_beta_event');
    assert(betaMsg.payload.secret === 'beta_data_999', 'Step 4.5: Beta workspace member received Beta event');

    const alphaReceivedBeta = alphaEmpClient.messages.some((m) => m.type === 'test_beta_event');
    assert(!alphaReceivedBeta, 'Step 4.6: Multi-tenant boundary enforced: Alpha workspace received 0 Beta events');

    // -------------------------------------------------------------------------
    // STEP 5: End-to-End Domain Event Broadcasts
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: End-to-End Domain Event Broadcasts ---');

    // Connect Intern in Alpha Workspace
    const internClient = await createTestClient(testPort, internToken, alphaWorkspaceId);
    assert(internClient.ws.readyState === WebSocket.OPEN, 'Step 5.1: Intern connected');

    // 5.2: Emit Task Created via EventService
    await EventService.emitTaskCreated(
      { workspaceId: alphaWorkspaceId, actorId: adminUserId },
      { id: 'task-101', title: 'Launch Real-Time Engine', projectId: 'proj-1', assignedTo: empUserId }
    );

    const taskCreatedOnAdmin = await adminClient.waitForMessage((m) => m.type === 'task_created' && m.payload?.id === 'task-101');
    const taskCreatedOnEmp = await alphaEmpClient.waitForMessage((m) => m.type === 'task_created' && m.payload?.id === 'task-101');
    assert(taskCreatedOnAdmin !== null, 'Step 5.2: Admin received real-time task_created broadcast');
    assert(taskCreatedOnEmp !== null, 'Step 5.3: Employee received real-time task_created broadcast');

    // 5.4: Emit Task Completed via EventService
    await EventService.emitTaskCompleted(
      { workspaceId: alphaWorkspaceId, actorId: empUserId },
      { id: 'task-101', title: 'Launch Real-Time Engine', projectId: 'proj-1', creatorId: adminUserId }
    );

    const taskCompletedMsg = await adminClient.waitForMessage((m) => m.type === 'task_completed' && m.payload?.id === 'task-101');
    assert(taskCompletedMsg.payload.status === 'completed', 'Step 5.4: Task completed event received by all workspace subscribers');

    // 5.5: Emit Project Updated via EventService
    await EventService.emitProjectUpdated(
      { workspaceId: alphaWorkspaceId, actorId: adminUserId },
      { id: 'proj-1', title: 'Workspace OS V2', newValues: { progress: 85, status: 'in_progress' } }
    );

    const projUpdatedMsg = await alphaEmpClient.waitForMessage((m) => m.type === 'project_updated' && m.payload?.id === 'proj-1');
    assert(projUpdatedMsg.payload.progress === 85, 'Step 5.5: Live project_updated event broadcast received');

    // 5.6: Activity Log broadcast via ActivityRepository
    await ActivityRepository.logActivity({
      workspaceId: alphaWorkspaceId,
      userId: adminUserId,
      entityType: 'document',
      entityId: 'doc-99',
      action: 'uploaded',
      metadata: { title: 'Architecture_Spec.pdf' },
    });

    const activityMsg = await alphaEmpClient.waitForMessage(
      (m) => m.type === 'activity_created' && m.payload?.entityId === 'doc-99'
    );
    assert(activityMsg.payload.action === 'uploaded', 'Step 5.6: Activity log creation triggered real-time activity_created broadcast');

    // 5.7: Notification targeting a single user via NotificationRepository
    await NotificationRepository.createNotification({
      workspaceId: alphaWorkspaceId,
      userId: empUserId, // targeted specifically to Employee
      title: 'Direct Alert for Bob',
      message: 'Your task was approved by Admin.',
      type: 'task_assigned',
    });

    const notifMsg = await alphaEmpClient.waitForMessage(
      (m) => m.type === 'notification_created' && m.payload?.title === 'Direct Alert for Bob'
    );
    assert(notifMsg !== null, 'Step 5.7: Targeted notification arrived instantly on Employee WebSocket');

    // Intern should NOT receive targeted notification for Bob
    await new Promise((r) => setTimeout(r, 150));
    const internGotBobNotif = internClient.messages.some(
      (m) => m.type === 'notification_created' && m.payload?.title === 'Direct Alert for Bob'
    );
    assert(!internGotBobNotif, 'Step 5.8: User-targeted notification was not leaked to other users');

    // 5.9: CRM Deal Stage Changed with RBAC Check
    await EventService.emitCrmStageChanged(
      { workspaceId: alphaWorkspaceId, actorId: adminUserId },
      { id: 'crm-77', customerName: 'Apex Corp', company: 'Apex', previousStatus: 'lead', newStatus: 'won', dealValue: 50000, ownerId: empUserId }
    );

    const crmWonOnAdmin = await adminClient.waitForMessage((m) => m.type === 'crm_won' && m.payload?.id === 'crm-77');
    assert(crmWonOnAdmin.payload.dealValue === 50000, 'Step 5.9: Admin received crm_won real-time event');

    // Intern should NOT receive CRM deal event because Intern has no CRM permission
    await new Promise((r) => setTimeout(r, 150));
    const internGotCrm = internClient.messages.some((m) => m.type === 'crm_won' || m.type === 'crm_stage_changed');
    assert(!internGotCrm, 'Step 5.10: RBAC enforced: Intern received 0 CRM real-time events');

    // -------------------------------------------------------------------------
    // STEP 6: Presence REST API & Real-Time Stats
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Presence REST API & Real-Time Stats ---');

    // 6.1: GET /api/presence
    const presenceRes = await testApi('GET', '/api/presence', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(presenceRes.status === 200, 'Step 6.1: GET /api/presence returned 200 OK');
    assert(Array.isArray(presenceRes.data.data), 'Step 6.2: Presence data is an array');
    assert(presenceRes.data.meta.workspaceId === alphaWorkspaceId, 'Step 6.3: Presence meta contains correct workspaceId');
    assert(presenceRes.data.meta.onlineCount >= 3, 'Step 6.4: Presence meta shows active online count');

    // 6.5: POST /api/presence/status
    const statusUpdateRes = await testApi(
      'POST',
      '/api/presence/status',
      { status: 'away' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(statusUpdateRes.status === 200, 'Step 6.5: POST /api/presence/status returned 200 OK');
    assert(statusUpdateRes.data.data.status === 'away', 'Step 6.6: Status successfully updated to away');

    // 6.7: POST /api/presence/heartbeat
    const hbRes = await testApi(
      'POST',
      '/api/presence/heartbeat',
      {},
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(hbRes.status === 200, 'Step 6.7: POST /api/presence/heartbeat returned 200 OK');
    assert(typeof hbRes.data.data.timestamp === 'string', 'Step 6.8: Heartbeat response contains timestamp');

    // 6.9: GET /api/presence/stats
    const statsRes = await testApi('GET', '/api/presence/stats', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(statsRes.status === 200, 'Step 6.9: GET /api/presence/stats returned 200 OK');
    assert(statsRes.data.data.activeConnections >= 4, 'Step 6.10: Stats show active WebSocket connection count');
    assert(statsRes.data.data.broadcastCount > 0, 'Step 6.11: Stats track total broadcast count');
    assert(statsRes.data.data.dailyEvents > 0, 'Step 6.12: Stats track daily event count');

    // 6.13: GET /api/presence/events
    const eventsRes = await testApi('GET', '/api/presence/events?limit=10', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(eventsRes.status === 200, 'Step 6.13: GET /api/presence/events returned 200 OK');
    assert(eventsRes.data.data.length > 0, 'Step 6.14: Event history retrieved from EventBus buffer');
    assert(eventsRes.data.data.length <= 10, 'Step 6.15: Limit parameter respected');

    // -------------------------------------------------------------------------
    // STEP 7: High-Concurrency & Stress Test (25 Concurrent Sockets)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: High-Concurrency & Stress Test (25 Concurrent Sockets) ---');

    const concurrentClients: Array<{ ws: WebSocket; messages: any[]; close: () => Promise<void> }> = [];
    const NUM_CONCURRENT = 25;

    for (let i = 0; i < NUM_CONCURRENT; i++) {
      const client = await createTestClient(testPort, adminToken, alphaWorkspaceId);
      concurrentClients.push(client);
    }

    assert(concurrentClients.length === NUM_CONCURRENT, 'Step 7.1: Successfully connected 25 concurrent WebSocket clients');
    assert(
      ChannelManager.getActiveConnectionCount() >= NUM_CONCURRENT,
      'Step 7.2: ChannelManager tracking all concurrent connections in O(1) map'
    );

    // Rapid event broadcast to all 25 clients
    const stressEventPayload = { timestamp: Date.now(), batchId: 'stress-test-batch' };
    EventBus.publishWorkspaceEvent(alphaWorkspaceId, 'stress_test_event', stressEventPayload, {
      actorId: adminUserId,
      entityType: 'stress_test',
    });

    await new Promise((r) => setTimeout(r, 300));

    let receivedStressCount = 0;
    for (const client of concurrentClients) {
      if (client.messages.some((m) => m.type === 'stress_test_event')) {
        receivedStressCount++;
      }
    }

    assert(
      receivedStressCount === NUM_CONCURRENT,
      `Step 7.3: 100% event propagation success (${receivedStressCount}/${NUM_CONCURRENT} clients received stress event with 0 dropped frames)`
    );

    // -------------------------------------------------------------------------
    // STEP 8: Clean Teardown & 0 Stale Connection Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Clean Teardown & Zero Memory Leak Verification ---');

    // Close all test clients
    await Promise.all([
      adminClient.close(),
      alphaEmpClient.close(),
      internClient.close(),
      betaClient.close(),
      ...concurrentClients.map((c) => c.close()),
    ]);

    await new Promise((r) => setTimeout(r, 300));

    const remainingConnections = ChannelManager.getActiveConnectionCount();
    assert(
      remainingConnections === 0,
      `Step 8.1: Zero stale connections verified (Remaining: ${remainingConnections})`
    );

    const remainingPresenceSockets = PresenceManager.getTotalSocketCount();
    assert(
      remainingPresenceSockets === 0,
      `Step 8.2: Zero orphaned socket references in PresenceManager (Remaining: ${remainingPresenceSockets})`
    );

    console.log('\n================================================================');
    console.log(` ALL REAL-TIME COLLABORATION TESTS PASSED! (${passCount} assertions)`);
    console.log('================================================================\n');
  } finally {
    // Teardown test server
    await wsServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  }
}
