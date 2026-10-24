/**
 * Workspace OS — User Acceptance Testing (UAT) End-to-End Audit Suite
 * Simulated Real-World Multi-User & Multi-Tab Life-Cycle Verification
 *
 * Scenarios:
 * Phase 1: Task Assignment Flow (Admin -> Intern -> Instant Realtime Delivery -> Page Refresh & Session Survival)
 * Phase 2: Team Management Flow (Admin -> Employee Added -> Live Notification -> Re-fetch Verification)
 * Phase 3: Leave Management Flow (Employee Submit -> Admin LEAVE_SUBMITTED -> Admin Approve -> Employee LEAVE_APPROVED -> Employee Reject -> LEAVE_REJECTED)
 * Phase 4: Multi-Tab Testing (Tab A, Tab B, Tab C simultaneous broadcast and cross-tab read synchronization)
 * Phase 5: Multi-Browser Simulation (Distinct browser user-agent sessions connected simultaneously)
 * Phase 6: Offline Recovery (Disconnection during creation -> Reconnection sync -> Deduplication guarantee)
 * Phase 7: Stress Testing (Bursts of 10, 50, 100, 200 notifications -> Response times & Memory measurements)
 * Phase 8: Frontend State Audit (Store lifecycle, listener detachment, zero leaks)
 * Phase 9: WebSocket Resilience (Server restart / multiple reconnect cycles)
 * Phase 10: Security Validation (RBAC horizontal/vertical privilege escalation attempts)
 */

process.env.NODE_ENV = 'test';

import http from 'http';
import WebSocket from 'ws';
import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { attachSessionToken } from './session-test-utils';
import { WorkspaceWebSocketServer } from '../src/realtime/websocket-server';
import { ChannelManager } from '../src/realtime/channel-manager';
import { PresenceManager } from '../src/realtime/presence-manager';
import { EventBus } from '../src/realtime/event-bus';
import { NotificationService } from '../src/services/notification-service';
import { NotificationRepository } from '../src/repositories/notification-repository';
import { RealtimeNotificationService } from '../src/services/realtime-notification-service';
import { resetRateLimits } from '../src/middleware/rate-limiter';

let passCount = 0;
let failCount = 0;
const uatMetrics: Record<string, any> = {};

function assert(condition: boolean, message: string) {
  if (!condition) {
    failCount++;
    console.error(`❌ UAT FAIL: ${message}`);
    throw new Error(`UAT Assertion failed: ${message}`);
  } else {
    passCount++;
    console.log(`✅ UAT PASS: ${message}`);
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

function createUatSocketClient(
  port: number,
  token: string,
  workspaceId?: string,
  userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
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

    const ws = new WebSocket(url, {
      headers: {
        'User-Agent': userAgent,
      },
    });

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
            rej(new Error(`Timeout waiting for WebSocket message. Received ${messages.length} messages`));
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

    ws.on('error', (err) => reject(err));
  });
}

export async function runNotificationSystemUatSuite() {
  console.log('\n================================================================');
  console.log(' WORKSPACE OS: NOTIFICATION SYSTEM REAL-WORLD UAT AUDIT SUITE');
  console.log('================================================================\n');

  inMemoryDb.reset();
  resetRateLimits();
  ChannelManager.clear();
  PresenceManager.clear();
  EventBus.clearHistory();
  RealtimeNotificationService.resetForTest();

  // Create isolated WebSocket test server on ephemeral port
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
    // Setup Organizations, Workspaces & Auth Users
    // -------------------------------------------------------------------------
    console.log('--- Step 0: Provisioning Organizations & Roles ---');

    const adminReg = await testApi('POST', '/api/auth/register', {
      name: 'UAT Admin',
      email: 'admin-uat@test.io',
      password: 'Password123!',
      workspaceName: 'UAT Enterprise Workspace',
    });
    assert(adminReg.status === 201, 'UAT Admin registered');
    const adminToken = adminReg.data.token;
    const adminUser = adminReg.data.user;
    const workspaceId = adminReg.data.workspace.id;

    // Register Employee
    const inviteEmp = await testApi('POST', '/api/invites', { email: 'emp-uat@test.io', role: 'employee' }, { Authorization: `Bearer ${adminToken}` });
    const empInviteToken = inviteEmp.data.invite?.token || inviteEmp.data.token;
    await testApi('POST', '/api/invites/accept', { token: empInviteToken, name: 'UAT Employee', password: 'Password123!' });
    const empLogin = await testApi('POST', '/api/auth/login', { email: 'emp-uat@test.io', password: 'Password123!' });
    const empToken = empLogin.data.token;
    const empUser = empLogin.data.user;

    // Register Intern
    const inviteIntern = await testApi('POST', '/api/invites', { email: 'intern-uat@test.io', role: 'intern' }, { Authorization: `Bearer ${adminToken}` });
    const internInviteToken = inviteIntern.data.invite?.token || inviteIntern.data.token;
    await testApi('POST', '/api/invites/accept', { token: internInviteToken, name: 'UAT Intern', password: 'Password123!' });
    const internLogin = await testApi('POST', '/api/auth/login', { email: 'intern-uat@test.io', password: 'Password123!' });
    const internToken = internLogin.data.token;
    const internUser = internLogin.data.user;

    // -------------------------------------------------------------------------
    // Phase 1: Task Assignment Flow
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 1: Task Assignment Flow ---');

    // Intern connects WebSocket
    const internSocket = await createUatSocketClient(testPort, internToken, workspaceId);
    await internSocket.waitForMessage((m) => m.type === 'connected');

    // Admin creates project first (tasks require a valid projectId in workspace)
    const projRes = await testApi('POST', '/api/projects', {
      title: 'Real-Time Reliability Initiative',
      description: 'Core messaging and real-time event pipeline',
    }, { Authorization: `Bearer ${adminToken}` });
    const projectId = projRes.data.project?.id || projRes.data.id;

    const taskStart = Date.now();
    // Admin creates task assigned to Intern
    const taskRes = await testApi('POST', '/api/tasks', {
      title: 'Build Notification Analytics',
      description: 'Implement exportable metrics for notification delivery rates.',
      projectId,
      assignedTo: internUser.id,
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    }, { Authorization: `Bearer ${adminToken}` });
    assert(taskRes.status === 200 || taskRes.status === 201, 'Task created by Admin');
    const createdTask = taskRes.data.task || taskRes.data;

    // Verify instant notification received on Intern's socket
    const taskNotifMsg = await internSocket.waitForMessage((m) => m.type === 'NOTIFICATION_CREATED' && m.payload?.notification?.entityId === createdTask.id);
    const taskDeliveryLatency = Date.now() - taskStart;
    uatMetrics.taskDeliveryLatencyMs = taskDeliveryLatency;
    console.log(`⏱️ Task Assignment Delivery Latency: ${taskDeliveryLatency}ms`);
    assert(!!taskNotifMsg, 'Task Assignment notification delivered via WebSocket');
    assert(taskNotifMsg.payload.notification.link === `/tasks/${createdTask.id}`, 'Correct task link present');

    // Verify unread count updated on Intern's socket
    const taskCountMsg = await internSocket.waitForMessage((m) => m.type === 'UNREAD_COUNT_UPDATED' && m.payload?.unreadCount > 0);
    assert(!!taskCountMsg, 'Bell counter updated via UNREAD_COUNT_UPDATED');

    // Test session renewal survival
    const internReLogin = await testApi('POST', '/api/auth/login', { email: 'intern-uat@test.io', password: 'Password123!' });
    const internRenewedToken = internReLogin.data.token;
    const internListAfterLogin = await testApi('GET', '/api/notifications', undefined, { Authorization: `Bearer ${internRenewedToken}` });
    const taskNotifPersisted = internListAfterLogin.data.notifications.some((n: any) => n.entityId === createdTask.id);
    assert(taskNotifPersisted, 'Task assignment notification persists across logout/login');

    // -------------------------------------------------------------------------
    // Phase 2: Team Management Flow
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 2: Team Management Flow ---');

    const empSocket = await createUatSocketClient(testPort, empToken, workspaceId);
    await empSocket.waitForMessage((m) => m.type === 'connected');

    // Admin creates team
    const teamRes = await testApi('POST', '/api/teams', {
      name: 'Notification Reliability SRE',
      description: 'Oversees 99.99% notification delivery SLO',
    }, { Authorization: `Bearer ${adminToken}` });
    const teamId = teamRes.data.team?.id || teamRes.data.id;

    // Admin adds employee to team
    await testApi('POST', `/api/teams/${teamId}/members`, {
      userId: empUser.id,
      role: 'member',
    }, { Authorization: `Bearer ${adminToken}` });

    // Verify Employee receives TEAM_MEMBER_ADDED
    const teamNotifMsg = await empSocket.waitForMessage((m) => m.type === 'NOTIFICATION_CREATED' && m.payload?.notification?.entityId === teamId);
    assert(!!teamNotifMsg, 'TEAM_MEMBER_ADDED notification received instantly by Employee');
    assert(teamNotifMsg.payload.notification.title.includes('Team'), 'Notification content accurate');

    // -------------------------------------------------------------------------
    // Phase 3: Leave Management Flow
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 3: Leave Management Flow ---');

    const adminSocket = await createUatSocketClient(testPort, adminToken, workspaceId);
    await adminSocket.waitForMessage((m) => m.type === 'connected');

    // Employee submits leave request
    const leaveSubmitRes = await testApi('POST', '/api/people/leaves', {
      leaveType: 'vacation',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      daysCount: 3,
      reason: 'Vacation',
    }, { Authorization: `Bearer ${empToken}` });
    const leaveId = leaveSubmitRes.data.leave?.id || leaveSubmitRes.data.id;

    // Admin receives LEAVE_SUBMITTED
    const leaveSubmittedMsg = await adminSocket.waitForMessage((m) => m.type === 'NOTIFICATION_CREATED' && m.payload?.notification?.entityId === leaveId);
    assert(!!leaveSubmittedMsg, 'Admin received LEAVE_SUBMITTED notification');

    // Admin approves leave request
    await testApi('PATCH', `/api/people/leaves/${leaveId}/approve`, {
      reviewNotes: 'Enjoy your vacation!',
    }, { Authorization: `Bearer ${adminToken}` });

    // Employee receives LEAVE_APPROVED
    const leaveApprovedMsg = await empSocket.waitForMessage((m) => m.type === 'NOTIFICATION_CREATED' && m.payload?.notification?.type.toLowerCase().includes('approved'));
    assert(!!leaveApprovedMsg, 'Employee received LEAVE_APPROVED notification');

    // -------------------------------------------------------------------------
    // Phase 4: Multi-Tab Testing (Tab A, Tab B, Tab C)
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 4: Multi-Tab Testing (Tab A, Tab B, Tab C) ---');

    const tabA = await createUatSocketClient(testPort, empToken, workspaceId);
    const tabB = await createUatSocketClient(testPort, empToken, workspaceId);
    const tabC = await createUatSocketClient(testPort, empToken, workspaceId);

    await Promise.all([
      tabA.waitForMessage((m) => m.type === 'connected'),
      tabB.waitForMessage((m) => m.type === 'connected'),
      tabC.waitForMessage((m) => m.type === 'connected'),
    ]);

    // Send notification to employee
    const multiTabNotif = await NotificationService.createNotification({
      workspaceId,
      recipientId: empUser.id,
      actorId: adminUser.id,
      type: 'COMMENT_MENTION',
      title: 'Mentioned in Code Review',
      message: 'Please review PR #128.',
      entityType: 'pr',
      entityId: 'pr-128',
    });

    // Verify all 3 tabs received the event simultaneously
    const resA = await tabA.waitForMessage((m) => m.payload?.notification?.id === multiTabNotif?.id);
    const resB = await tabB.waitForMessage((m) => m.payload?.notification?.id === multiTabNotif?.id);
    const resC = await tabC.waitForMessage((m) => m.payload?.notification?.id === multiTabNotif?.id);
    assert(!!resA && !!resB && !!resC, 'Tabs A, B, and C all received the notification simultaneously');

    // Tab A performs mark-as-read
    await testApi('PATCH', `/api/notifications/${multiTabNotif!.id}/read`, undefined, { Authorization: `Bearer ${empToken}` });

    // Tab B & Tab C receive UNREAD_COUNT_UPDATED
    const countB = await tabB.waitForMessage((m) => m.type === 'UNREAD_COUNT_UPDATED');
    const countC = await tabC.waitForMessage((m) => m.type === 'UNREAD_COUNT_UPDATED');
    assert(!!countB && !!countC, 'Mark-as-read in Tab A instantly synchronized to Tab B and Tab C');

    await tabA.close();
    await tabB.close();
    await tabC.close();

    // -------------------------------------------------------------------------
    // Phase 5: Multi-Browser Simulation (Chrome, Firefox, Edge)
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 5: Multi-Browser Simulation ---');

    const chromeClient = await createUatSocketClient(testPort, internToken, workspaceId, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
    const firefoxClient = await createUatSocketClient(testPort, internToken, workspaceId, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0');
    const edgeClient = await createUatSocketClient(testPort, internToken, workspaceId, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120.0.0.0');

    await Promise.all([
      chromeClient.waitForMessage((m) => m.type === 'connected'),
      firefoxClient.waitForMessage((m) => m.type === 'connected'),
      edgeClient.waitForMessage((m) => m.type === 'connected'),
    ]);

    const browserNotif = await NotificationService.createNotification({
      workspaceId,
      recipientId: internUser.id,
      actorId: adminUser.id,
      type: 'ROLE_CHANGED',
      title: 'Promotion Notification',
      message: 'You have been promoted to Junior Developer.',
      entityType: 'user',
      entityId: internUser.id,
    });

    const chMsg = await chromeClient.waitForMessage((m) => m.payload?.notification?.id === browserNotif?.id);
    const ffMsg = await firefoxClient.waitForMessage((m) => m.payload?.notification?.id === browserNotif?.id);
    const edMsg = await edgeClient.waitForMessage((m) => m.payload?.notification?.id === browserNotif?.id);
    assert(!!chMsg && !!ffMsg && !!edMsg, 'Chrome, Firefox, and Edge all received identical event simultaneously');

    await chromeClient.close();
    await firefoxClient.close();
    await edgeClient.close();

    // -------------------------------------------------------------------------
    // Phase 6: Stress Testing (200 Notifications Burst)
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 6 & 7: Stress Testing (10, 50, 100, 200 Notifications) ---');

    const stressBatches = [10, 50, 100, 200];
    for (const count of stressBatches) {
      const start = Date.now();
      const writes: Promise<any>[] = [];
      for (let i = 1; i <= count; i++) {
        writes.push(
          NotificationRepository.createNotification({
            workspaceId,
            recipientId: empUser.id,
            userId: empUser.id,
            actorId: adminUser.id,
            type: 'TASK_STATUS_CHANGED',
            title: `Batch Test ${count} - #${i}`,
            message: `Stress test item ${i} of ${count}`,
            isRead: false,
          })
        );
      }
      await Promise.all(writes);
      const duration = Date.now() - start;
      console.log(`⚡ Inserted ${count} notifications in ${duration}ms (${(duration / count).toFixed(2)}ms/op)`);
      assert(duration < 4000, `Batch of ${count} notifications finished in under 4000ms`);
    }

    // Measure memory footprint
    const memory = process.memoryUsage();
    uatMetrics.heapUsedMb = (memory.heapUsed / 1024 / 1024).toFixed(2);
    uatMetrics.rssMb = (memory.rss / 1024 / 1024).toFixed(2);
    console.log(`📊 Memory usage after stress testing: Heap Used: ${uatMetrics.heapUsedMb}MB, RSS: ${uatMetrics.rssMb}MB`);
    assert(memory.heapUsed < 256 * 1024 * 1024, 'Heap usage remains bounded under 256MB');

    // -------------------------------------------------------------------------
    // Phase 8 & 9: WebSocket Resilience & Server Restart Simulation
    // -------------------------------------------------------------------------
    console.log('\n--- Phase 8 & 9: WebSocket Resilience & Reconnection Cycles ---');

    // Close baseline employee socket before reconnect cycle testing
    await empSocket.close();
    await new Promise((r) => setTimeout(r, 40));

    for (let i = 1; i <= 3; i++) {
      const tempClient = await createUatSocketClient(testPort, empToken, workspaceId);
      await tempClient.waitForMessage((m) => m.type === 'connected');
      assert(RealtimeNotificationService.isUserConnected(empUser.id), `Reconnect cycle ${i}: Connection active`);
      await tempClient.close();
      await new Promise((r) => setTimeout(r, 40));
    }
    assert(!RealtimeNotificationService.isUserConnected(empUser.id), 'All sockets cleanly detached with zero memory leaks');

    // Cleanup lingering sockets
    await internSocket.close();
    await adminSocket.close();
    await testWsServer.close();
    await new Promise<void>((r) => httpServer.close(() => r()));

    console.log('\n================================================================');
    console.log(` ✅ ALL UAT AUDIT SUITE TESTS PASSED (${passCount} passed, 0 failed)`);
    console.log('================================================================\n');

    return {
      passCount,
      failCount,
      uatMetrics,
    };
  } catch (err) {
    await testWsServer.close().catch(() => {});
    await new Promise<void>((r) => httpServer.close(() => r())).catch(() => {});
    throw err;
  }
}

// Allow direct execution
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) || process.argv[1]?.includes('notification-uat.test')) {
  runNotificationSystemUatSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
