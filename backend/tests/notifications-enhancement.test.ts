import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { NotificationService } from '../src/services/notification-service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runNotificationsEnhancementTests() {
  console.log('\n===============================================================');
  console.log(' NOTIFICATIONS MVP ENHANCEMENTS — PRIORITY, PREFERENCES, MENTIONS, ACTIONS, RETENTION & RBAC');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // --------------------------------------------------------------------------
  // STEP 1: SETUP WORKSPACE AND 2 USERS (Admin & Employee)
  // --------------------------------------------------------------------------
  console.log('--- Step 1: Setting up Workspace and Users ---');

  // 1. Admin
  const regAdminRes = await app.fetch(new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Admin',
      email: 'alice-admin@corp.io',
      password: 'Password123!',
      workspaceName: 'Acme Enhancements Corp',
    }),
  }));
  const adminSession = attachSessionToken(regAdminRes, await regAdminRes.json());
  const adminToken = adminSession.token;
  const adminUser = adminSession.user;
  const workspaceId = adminSession.workspace.id;

  // 2. Employee invited by Admin
  const inviteEmpRes = await app.fetch(new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: 'bob-emp@corp.io', role: 'employee' }),
  }));
  const inviteEmpData = await inviteEmpRes.json();
  const empInviteToken = inviteEmpData.invite?.token || inviteEmpData.token;

  await app.fetch(new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: empInviteToken,
      name: 'Bob Employee',
      password: 'Password123!',
    }),
  }));

  const loginEmpRes = await app.fetch(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bob-emp@corp.io', password: 'Password123!' }),
  }));
  const empSession = attachSessionToken(loginEmpRes, await loginEmpRes.json());
  const empToken = empSession.token;
  const empUser = empSession.user;

  console.log('Users created: Alice (Admin), Bob (Employee)');

  // --------------------------------------------------------------------------
  // TEST 1: PRIORITY ORDERING
  // --------------------------------------------------------------------------
  console.log('\n--- Test 1: Priority Ordering (urgent > high > medium > low) ---');

  // Create notifications of different priorities for Bob
  await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    type: 'deal_stage_changed', // low
    title: 'Deal Updated',
    message: 'Stage changed to Qualification',
  });

  await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    type: 'task_assigned', // medium
    title: 'Task Assigned',
    message: 'New task assigned to you',
  });

  await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    type: 'task_overdue', // high
    title: 'Task Overdue',
    message: 'Your task is past due',
  });

  await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    type: 'initiative_rejected', // urgent
    title: 'Initiative Rejected',
    message: 'Changes required immediately',
  });

  const getNotifsRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
    headers: { Authorization: `Bearer ${empToken}` },
  }));
  assert(getNotifsRes.status === 200, 'GET /api/notifications returns 200');
  const notifsData = await getNotifsRes.json();
  const notifs = notifsData.notifications;

  assert(notifs.length >= 4, `Received ${notifs.length} notifications`);
  const priorities = notifs.map((n: any) => n.priority);
  console.log('Returned priorities:', priorities);

  assert(priorities[0] === 'urgent', 'First notification has urgent priority');
  assert(priorities[1] === 'high', 'Second notification has high priority');
  assert(priorities[2] === 'medium', 'Third notification has medium priority');
  assert(priorities[3] === 'low', 'Fourth notification has low priority');

  // --------------------------------------------------------------------------
  // TEST 2: PREFERENCES (Disabled toggle prevents notification)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Notification Preferences (Toggles respect user settings) ---');

  // Bob disables Task Assignments notifications
  const updatePrefsRes = await app.fetch(new Request('http://localhost:3000/api/notifications/preferences', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasksAssignments: false,
    }),
  }));
  assert(updatePrefsRes.status === 200, 'PUT /api/notifications/preferences returns 200');

  // Fetch Bob preferences
  const getPrefsRes = await app.fetch(new Request('http://localhost:3000/api/notifications/preferences', {
    headers: { Authorization: `Bearer ${empToken}` },
  }));
  const prefsData = await getPrefsRes.json();
  assert(prefsData.preferences.tasksAssignments === false, 'Bob has tasksAssignments disabled');

  // Attempt to send task_assigned notification to Bob
  const blockedNotif = await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    type: 'task_assigned',
    title: 'Another Task Assigned',
    message: 'This should be blocked by preferences',
  });
  assert(blockedNotif === null, 'createNotification returned null when preference is disabled');

  // Re-enable tasksAssignments for Bob
  await app.fetch(new Request('http://localhost:3000/api/notifications/preferences', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasksAssignments: true,
    }),
  }));

  const allowedNotif = await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    type: 'task_assigned',
    title: 'Permitted Task Assigned',
    message: 'This should now be allowed',
  });
  assert(allowedNotif !== null, 'createNotification succeeded after re-enabling preference');

  // --------------------------------------------------------------------------
  // TEST 3: @MENTION NOTIFICATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: @Mention Notifications ---');

  // Alice mentions Bob in a task comment: "@Bob Please review this task."
  const mentionsCreated = await NotificationService.dispatchMentions({
    workspaceId,
    actorId: adminUser.id,
    text: 'Hello @Bob Employee, please review this task as soon as possible!',
    entityType: 'task',
    entityId: 'task-test-123',
    link: '/tasks/task-test-123',
  });

  assert(mentionsCreated.length === 1, 'One mention notification dispatched');
  assert(mentionsCreated[0].recipientId === empUser.id, 'Mention sent to Bob');
  assert(mentionsCreated[0].type === 'mention_received', 'Type is mention_received');
  assert(mentionsCreated[0].priority === 'high', 'Mention priority is high');
  assert(mentionsCreated[0].link === '/tasks/task-test-123', 'Link points to source task');

  // --------------------------------------------------------------------------
  // TEST 4: ACTIONABLE NOTIFICATIONS (Leave Approve / Reject)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Actionable Notifications (Direct Execute) ---');

  // Bob submits a leave request
  const submitLeaveRes = await app.fetch(new Request('http://localhost:3000/api/people/leaves', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'annual',
      startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      reason: 'Vacation',
    }),
  }));
  assert(submitLeaveRes.status === 201, 'Leave request submitted by Employee');
  const leaveData = await submitLeaveRes.json();
  const leaveId = leaveData.leave.id;

  // Alice (Admin) checks notifications and approves directly via action endpoint
  const approveLeaveRes = await app.fetch(new Request(`http://localhost:3000/api/people/leaves/${leaveId}/approve`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reviewNotes: 'Approved directly from notifications inbox' }),
  }));
  assert(approveLeaveRes.status === 200, 'Admin approves leave directly');

  // Bob should have received leave_approved notification
  const bobNotifsRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
    headers: { Authorization: `Bearer ${empToken}` },
  }));
  const bobNotifs = (await bobNotifsRes.json()).notifications;
  const leaveApprovedNotif = bobNotifs.find((n: any) => n.type === 'leave_approved');
  assert(!!leaveApprovedNotif, 'Bob received leave_approved notification');

  // --------------------------------------------------------------------------
  // TEST 5: NOTIFICATION RETENTION (90 Days Archive)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Notification Retention (Archive >90 days, no delete) ---');

  // Seed an old notification created 100 days ago
  const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
  const oldNotifId = crypto.randomUUID();
  const oldNotif = {
    id: oldNotifId,
    workspaceId,
    recipientId: empUser.id,
    type: 'system',
    priority: 'low',
    title: 'Old Notification',
    message: 'Created 100 days ago',
    isRead: true,
    archived: false,
    createdAt: oldDate,
    updatedAt: oldDate,
  };
  inMemoryDb.notifications.set(oldNotifId, oldNotif);

  // Run retention archive
  const retentionRes = await app.fetch(new Request('http://localhost:3000/api/notifications/retention/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }));
  assert(retentionRes.status === 200, 'POST /api/notifications/retention/run returns 200');
  const retentionData = await retentionRes.json();
  assert(retentionData.archivedCount >= 1, `Archived at least 1 notification (got ${retentionData.archivedCount})`);

  // Verify the old notification is still in DB (not deleted) but marked archived
  const archivedInDb = inMemoryDb.notifications.get(oldNotifId);
  assert(archivedInDb !== undefined, 'Old notification is preserved in database (not deleted)');
  assert(archivedInDb.archived === true, 'Old notification is marked archived = true');

  // Verify unread feed excludes archived notifications
  const unreadFeedRes = await app.fetch(new Request('http://localhost:3000/api/notifications?tab=unread', {
    headers: { Authorization: `Bearer ${empToken}` },
  }));
  const unreadFeed = (await unreadFeedRes.json()).notifications;
  assert(!unreadFeed.some((n: any) => n.id === oldNotifId), 'Unread feed excludes archived notification');

  // Verify archived feed includes it
  const archivedFeedRes = await app.fetch(new Request('http://localhost:3000/api/notifications?tab=archived', {
    headers: { Authorization: `Bearer ${empToken}` },
  }));
  const archivedFeed = (await archivedFeedRes.json()).notifications;
  assert(archivedFeed.some((n: any) => n.id === oldNotifId), 'Archived feed includes archived notification');

  // --------------------------------------------------------------------------
  // TEST 6: RBAC ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: RBAC Isolation (Cross-User & Cross-Tenant Boundary) ---');

  // Employee attempts to fetch notifications of Admin
  const adminNotifsInDb = Array.from(inMemoryDb.notifications.values()).filter((n: any) => n.recipientId === adminUser.id);
  assert(adminNotifsInDb.length > 0, 'Admin has notifications in DB');
  const adminNotifId = adminNotifsInDb[0].id;

  // Bob attempts to archive Alice's notification
  const unauthorizedArchiveRes = await app.fetch(new Request(`http://localhost:3000/api/notifications/${adminNotifId}/archive`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${empToken}` },
  }));
  assert(unauthorizedArchiveRes.status === 404, 'Employee cannot archive Admin notification (404 Not Found in user scope)');

  // Bob cannot see Alice's notification in his feed
  const bobFeedRes = await app.fetch(new Request('http://localhost:3000/api/notifications?tab=all', {
    headers: { Authorization: `Bearer ${empToken}` },
  }));
  const bobAllNotifs = (await bobFeedRes.json()).notifications;
  assert(!bobAllNotifs.some((n: any) => n.recipientId === adminUser.id), 'Bob cannot see Alice notifications');

  console.log('\n===============================================================');
  console.log(' ALL NOTIFICATIONS ENHANCEMENT TESTS PASSED PERFECTLY (6/6)');
  console.log('===============================================================\n');
}
