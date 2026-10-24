process.env.NODE_ENV = 'test';

import http from 'http';
import WebSocket from 'ws';
import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { attachSessionToken } from './session-test-utils';
import { wsServer, WorkspaceWebSocketServer } from '../src/realtime/websocket-server';
import { ChannelManager } from '../src/realtime/channel-manager';
import { PresenceManager } from '../src/realtime/presence-manager';
import { EventBus } from '../src/realtime/event-bus';
import { NotificationService } from '../src/services/notification-service';
import { NotificationRepository } from '../src/repositories/notification-repository';
import { RealtimeNotificationService } from '../src/services/realtime-notification-service';
import { resetRateLimits } from '../src/middleware/rate-limiter';

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
  const data = attachSessionToken(res, await res.json());
  return { status: res.status, data };
}

function createTestSocketClient(
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
        const existing = messages.find(predicate);
        if (existing) return Promise.resolve(existing);

        return new Promise((res, rej) => {
          const timeout = setTimeout(() => {
            const idx = messageListeners.indexOf(onMsg);
            if (idx >= 0) messageListeners.splice(idx, 1);
            rej(
              new Error(
                `Timeout waiting for WebSocket message. Received ${messages.length} messages: ${JSON.stringify(
                  messages
                )}`
              )
            );
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

export async function runRealtimeNotificationTests() {
  console.log('\n================================================================');
  console.log(' PHASE 2: REAL-TIME NOTIFICATION DELIVERY SYSTEM TEST SUITE');
  console.log('================================================================\n');

  inMemoryDb.reset();
  resetRateLimits();
  ChannelManager.clear();
  PresenceManager.clear();
  EventBus.clearHistory();
  RealtimeNotificationService.resetForTest();

  // Spin up test HTTP server on random free port
  const httpServer = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });

  const testWsServer = new WorkspaceWebSocketServer();
  testWsServer.attach(httpServer, '/ws');

  let testPort = 0;
  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      testPort = (httpServer.address() as any).port;
      httpServer.unref();
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // Step 1: Provision Multi-User RBAC Sandbox (Admin, Employee, Intern)
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Provisioning Multi-User RBAC Environment ---');

    const adminReg = await testApi('POST', '/api/auth/register', {
      name: 'Admin Boss',
      email: 'admin-rt@test.io',
      password: 'Password123!',
      workspaceName: 'Realtime Notifications Inc',
    });
    assert(adminReg.status === 201, 'Admin registered successfully');
    const adminToken = adminReg.data.token;
    const adminUser = adminReg.data.user;
    const workspaceId = adminReg.data.workspace.id;

    // Register Employee
    const inviteEmp = await testApi(
      'POST',
      '/api/invites',
      { email: 'emp-rt@test.io', role: 'employee' },
      { Authorization: `Bearer ${adminToken}` }
    );
    const empInviteToken = inviteEmp.data.invite?.token || inviteEmp.data.token;

    await testApi('POST', '/api/invites/accept', {
      token: empInviteToken,
      name: 'Worker Bee',
      password: 'Password123!',
    });

    const empLogin = await testApi('POST', '/api/auth/login', {
      email: 'emp-rt@test.io',
      password: 'Password123!',
    });
    const empToken = empLogin.data.token;
    const empUser = empLogin.data.user;

    // Register Intern
    const inviteIntern = await testApi(
      'POST',
      '/api/invites',
      { email: 'intern-rt@test.io', role: 'intern' },
      { Authorization: `Bearer ${adminToken}` }
    );
    const internInviteToken = inviteIntern.data.invite?.token || inviteIntern.data.token;

    await testApi('POST', '/api/invites/accept', {
      token: internInviteToken,
      name: 'Curious Intern',
      password: 'Password123!',
    });

    const internLogin = await testApi('POST', '/api/auth/login', {
      email: 'intern-rt@test.io',
      password: 'Password123!',
    });
    const internToken = internLogin.data.token;
    const internUser = internLogin.data.user;

    // -------------------------------------------------------------------------
    // Step 2: Connection Registration & Multi-Tab Tracking
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Connection Registration & Multi-Tab Tracking ---');

    // Connect Tab 1 for Intern
    const internTab1 = await createTestSocketClient(testPort, internToken, workspaceId);
    await internTab1.waitForMessage((m) => m.type === 'connected');
    assert(RealtimeNotificationService.isUserConnected(internUser.id), 'Intern Tab 1 registered in RealtimeNotificationService');
    assert(RealtimeNotificationService.getUserConnectionCount(internUser.id) === 1, 'Intern connection count is 1');

    // Connect Tab 2 for Intern
    const internTab2 = await createTestSocketClient(testPort, internToken, workspaceId);
    await internTab2.waitForMessage((m) => m.type === 'connected');
    assert(RealtimeNotificationService.getUserConnectionCount(internUser.id) === 2, 'Intern connection count is 2 (multiple tabs supported)');

    // Connect Employee Tab
    const empTab = await createTestSocketClient(testPort, empToken, workspaceId);
    await empTab.waitForMessage((m) => m.type === 'connected');
    assert(RealtimeNotificationService.isUserConnected(empUser.id), 'Employee registered in RealtimeNotificationService');

    const connectedUsers = RealtimeNotificationService.getConnectedUsers();
    assert(connectedUsers.includes(internUser.id), 'Connected users list contains intern');
    assert(connectedUsers.includes(empUser.id), 'Connected users list contains employee');

    // -------------------------------------------------------------------------
    // Step 3: Instant Delivery & Unread Count Update upon Task Assignment
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Instant Delivery & Unread Count Update ---');

    // Admin creates task assigned to Intern
    const createNotif = await NotificationService.createNotification({
      workspaceId,
      recipientId: internUser.id,
      actorId: adminUser.id,
      type: 'TASK_ASSIGNED',
      title: 'Task Assigned',
      message: 'You were assigned MVP Dashboard Design',
      entityType: 'task',
      entityId: 'task-realtime-001',
    });
    assert(!!createNotif, 'Notification successfully created in NotificationService');

    // Check Tab 1 receives NOTIFICATION_CREATED & UNREAD_COUNT_UPDATED
    const tab1NotifMsg = await internTab1.waitForMessage(
      (m) => m.type === 'NOTIFICATION_CREATED' && m.payload?.notification?.id === createNotif?.id
    );
    assert(!!tab1NotifMsg, 'Intern Tab 1 received NOTIFICATION_CREATED event instantly');
    assert(
      tab1NotifMsg.payload.notification.title === 'Task Assigned',
      'Event payload contains correct notification title'
    );
    assert(
      tab1NotifMsg.payload.notification.message === 'You were assigned MVP Dashboard Design',
      'Event payload contains correct notification message'
    );

    const tab1CountMsg = await internTab1.waitForMessage(
      (m) => m.type === 'UNREAD_COUNT_UPDATED' && m.payload?.unreadCount === 1
    );
    assert(!!tab1CountMsg, 'Intern Tab 1 received UNREAD_COUNT_UPDATED event with unreadCount=1');

    // Check Tab 2 also receives identical events simultaneously (Multi-tab support)
    const tab2NotifMsg = await internTab2.waitForMessage(
      (m) => m.type === 'NOTIFICATION_CREATED' && m.payload?.notification?.id === createNotif?.id
    );
    assert(!!tab2NotifMsg, 'Intern Tab 2 simultaneously received NOTIFICATION_CREATED event');

    const tab2CountMsg = await internTab2.waitForMessage(
      (m) => m.type === 'UNREAD_COUNT_UPDATED' && m.payload?.unreadCount === 1
    );
    assert(!!tab2CountMsg, 'Intern Tab 2 simultaneously received UNREAD_COUNT_UPDATED event');

    // -------------------------------------------------------------------------
    // Step 4: Strict RBAC Isolation (No Cross-User Leakage)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Strict RBAC Isolation (Zero Cross-User Leakage) ---');

    // Employee must NOT have received Intern's task assignment notification
    const empLeakedNotif = empTab.messages.find(
      (m) => m.type === 'NOTIFICATION_CREATED' && m.payload?.notification?.id === createNotif?.id
    );
    assert(!empLeakedNotif, 'Employee received ZERO notifications targeted to Intern (Strict RBAC isolation)');

    const empLeakedCount = empTab.messages.find(
      (m) => m.type === 'UNREAD_COUNT_UPDATED' && m.recipientId === internUser.id
    );
    assert(!empLeakedCount, 'Employee received ZERO unread count updates targeted to Intern');

    // -------------------------------------------------------------------------
    // Step 5: Real-Time Unread Count Update on markAsRead and markAllAsRead
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Live Unread Count Updates on Read Operations ---');

    // Create second notification for intern
    await NotificationService.createNotification({
      workspaceId,
      recipientId: internUser.id,
      actorId: adminUser.id,
      type: 'LEAVE_APPROVED',
      title: 'Leave Approved',
      message: 'Your leave request has been approved',
      entityType: 'leave',
      entityId: 'leave-realtime-001',
    });

    const count2Msg = await internTab1.waitForMessage(
      (m) => m.type === 'UNREAD_COUNT_UPDATED' && m.payload?.unreadCount === 2
    );
    assert(!!count2Msg, 'Intern received unread count increment to 2');

    // Intern marks first notification as read
    await NotificationService.markRead(workspaceId, internUser.id, createNotif!.id);

    const count1AfterReadMsg = await internTab1.waitForMessage(
      (m) => m.type === 'UNREAD_COUNT_UPDATED' && m.payload?.unreadCount === 1
    );
    assert(!!count1AfterReadMsg, 'Intern received live unread count update to 1 after markRead');

    // Intern marks all as read
    await NotificationService.markAllRead(workspaceId, internUser.id);

    const count0AfterBulkReadMsg = await internTab1.waitForMessage(
      (m) => m.type === 'UNREAD_COUNT_UPDATED' && m.payload?.unreadCount === 0
    );
    assert(!!count0AfterBulkReadMsg, 'Intern received live unread count update to 0 after markAllRead');

    // -------------------------------------------------------------------------
    // Step 6: Disconnect Cleanup
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Disconnect Cleanup & Multi-Tab Tracking ---');

    await internTab1.close();
    // Allow event loop to process close event
    await new Promise((r) => setTimeout(r, 100));

    assert(
      RealtimeNotificationService.getUserConnectionCount(internUser.id) === 1,
      'Closing Tab 1 decreases connection count to 1 while Tab 2 remains active'
    );
    assert(
      RealtimeNotificationService.isUserConnected(internUser.id),
      'Intern remains connected via Tab 2'
    );

    await internTab2.close();
    await new Promise((r) => setTimeout(r, 100));

    assert(
      RealtimeNotificationService.getUserConnectionCount(internUser.id) === 0,
      'Closing Tab 2 removes all connections for Intern'
    );
    assert(
      !RealtimeNotificationService.isUserConnected(internUser.id),
      'Intern is now offline in RealtimeNotificationService'
    );

    // -------------------------------------------------------------------------
    // Step 7: Offline Recovery Simulation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Offline Recovery ---');

    // While intern is offline, admin creates a notification for them
    const offlineNotif = await NotificationService.createNotification({
      workspaceId,
      recipientId: internUser.id,
      actorId: adminUser.id,
      type: 'COMMENT_MENTION',
      title: 'Mentioned in Architecture RFC',
      message: 'Take a look at the websocket specifications.',
      entityType: 'comment',
      entityId: 'comment-realtime-001',
    });
    assert(!!offlineNotif, 'Notification persisted while recipient was offline');

    // Intern reconnects (tab reconnects)
    const internReconnectedTab = await createTestSocketClient(testPort, internToken, workspaceId);
    await internReconnectedTab.waitForMessage((m) => m.type === 'connected');
    assert(
      RealtimeNotificationService.isUserConnected(internUser.id),
      'Intern reconnected and registered'
    );

    // Verify latest unread count from API
    const unreadRes = await testApi(
      'GET',
      '/api/notifications/unread-count',
      undefined,
      { Authorization: `Bearer ${internToken}` }
    );
    assert(unreadRes.status === 200, 'GET /api/notifications/unread-count succeeds after reconnect');
    assert(unreadRes.data.count === 1, 'Unread count is 1 after recovery');

    // Verify notification list contains the offline notification
    const listRes = await testApi(
      'GET',
      '/api/notifications',
      undefined,
      { Authorization: `Bearer ${internToken}` }
    );
    assert(listRes.status === 200, 'GET /api/notifications succeeds after reconnect');
    const recovered = listRes.data.notifications.some((n: any) => n.id === offlineNotif?.id);
    assert(recovered, 'Offline notification safely recovered from PostgreSQL API');

    await empTab.close();
    await internReconnectedTab.close();
    await testWsServer.close();
    await new Promise<void>((r) => httpServer.close(() => r()));

    console.log('\n================================================================');
    console.log(` ✅ ALL REAL-TIME NOTIFICATION TESTS PASSED (${passCount} passed, 0 failed)`);
    console.log('================================================================\n');
  } catch (err) {
    await testWsServer.close().catch(() => {});
    await new Promise<void>((r) => httpServer.close(() => r())).catch(() => {});
    throw err;
  }
}

// Allow direct execution
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) || process.argv[1]?.includes('realtime-notification.test')) {
  runRealtimeNotificationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
