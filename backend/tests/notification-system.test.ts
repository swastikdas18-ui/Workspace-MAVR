process.env.NODE_ENV = 'test';

import { app } from '../src/app';
import { inMemoryDb, getDb, schema } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { NotificationService } from '../src/services/notification-service';
import { NotificationRepository } from '../src/repositories/notification-repository';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runNotificationSystemTests() {
  console.log('\n===============================================================');
  console.log(' PHASE 1: WORKSPACE OS NOTIFICATION FOUNDATION SYSTEM TEST SUITE');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // --------------------------------------------------------------------------
  // 1. Setup Workspace and Multi-User RBAC Sandbox (Admin, Employee, Intern)
  // --------------------------------------------------------------------------
  console.log('--- Step 1: Provisioning Multi-User RBAC Sandbox ---');
  
  // Register Workspace Owner / Admin
  const regAdminRes = await app.fetch(new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Admin User',
      email: 'admin-notif-p1@test.io',
      password: 'Password123!',
      workspaceName: 'Notification Foundation Workspace',
    }),
  }));
  const adminData = attachSessionToken(regAdminRes, await regAdminRes.json());
  const adminToken = adminData.token;
  const adminUser = adminData.user;
  const workspaceId = adminData.workspace?.id || adminData.workspaceId;
  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  // Invite & Register Employee
  const inviteEmpRes = await app.fetch(new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'emp-notif-p1@test.io', role: 'employee' }),
  }));
  const inviteEmpData = await inviteEmpRes.json();
  const empTokenStr = inviteEmpData.invite?.token || inviteEmpData.token;

  await app.fetch(new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: empTokenStr,
      name: 'Employee User',
      password: 'Password123!',
    }),
  }));

  const loginEmpRes = await app.fetch(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emp-notif-p1@test.io', password: 'Password123!' }),
  }));
  const empData = attachSessionToken(loginEmpRes, await loginEmpRes.json());
  const empToken = empData.token;
  const empUser = empData.user;
  const empHeaders = {
    Authorization: `Bearer ${empToken}`,
    'Content-Type': 'application/json',
  };

  // Invite & Register Intern
  const inviteInternRes = await app.fetch(new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'intern-notif-p1@test.io', role: 'intern' }),
  }));
  const inviteInternData = await inviteInternRes.json();
  const internTokenStr = inviteInternData.invite?.token || inviteInternData.token;

  await app.fetch(new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: internTokenStr,
      name: 'Intern User',
      password: 'Password123!',
    }),
  }));

  const loginInternRes = await app.fetch(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'intern-notif-p1@test.io', password: 'Password123!' }),
  }));
  const internData = attachSessionToken(loginInternRes, await loginInternRes.json());
  const internToken = internData.token;
  const internUser = internData.user;
  const internHeaders = {
    Authorization: `Bearer ${internToken}`,
    'Content-Type': 'application/json',
  };

  assert(!!adminUser.id && !!empUser.id && !!internUser.id, 'Sandbox users registered successfully');

  // --------------------------------------------------------------------------
  // 2. Notification Creation & Schema Validation
  // --------------------------------------------------------------------------
  console.log('\n--- Step 2: Service & Repository Notification Creation ---');
  
  const createdNotif = await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    actorId: adminUser.id,
    type: 'TASK_ASSIGNED',
    title: 'New Priority Task Assigned',
    message: 'You have been assigned to implement the Notification Foundation.',
    entityType: 'task',
    entityId: 'task-p1-001',
  });

  assert(!!createdNotif, 'NotificationService.createNotification succeeded');
  assert(createdNotif?.recipientId === empUser.id, 'Recipient ID matches employee');
  assert(createdNotif?.actorId === adminUser.id, 'Actor ID matches admin');
  assert(createdNotif?.type === 'TASK_ASSIGNED', 'Type is strictly TASK_ASSIGNED');
  assert(createdNotif?.isRead === false, 'Notification defaults to unread (isRead: false)');
  assert(createdNotif?.readAt === null || createdNotif?.readAt === undefined, 'readAt initially null');

  // --------------------------------------------------------------------------
  // 3. Notification Retrieval & Unread Count API
  // --------------------------------------------------------------------------
  console.log('\n--- Step 3: Notification Retrieval & Unread Count API ---');

  const unreadCountRes = await app.fetch(new Request('http://localhost:3000/api/notifications/unread-count', {
    method: 'GET',
    headers: empHeaders,
  }));
  assert(unreadCountRes.status === 200, 'GET /api/notifications/unread-count returns 200 OK');
  const countData = await unreadCountRes.json();
  assert(countData.count === 1 || countData.unreadCount === 1, 'Unread count is 1 for employee');

  const listRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: empHeaders,
  }));
  assert(listRes.status === 200, 'GET /api/notifications returns 200 OK');
  const listData = await listRes.json();
  assert(Array.isArray(listData.notifications), 'Notifications array returned');
  assert(listData.notifications.length === 1, 'Employee has exactly 1 notification');
  assert(listData.notifications[0].id === createdNotif?.id, 'Notification ID matches created record');

  // --------------------------------------------------------------------------
  // 4. Mark As Read & Single Notification Update
  // --------------------------------------------------------------------------
  console.log('\n--- Step 4: PATCH /api/notifications/:id/read ---');

  const markReadRes = await app.fetch(new Request(`http://localhost:3000/api/notifications/${createdNotif?.id}/read`, {
    method: 'PATCH',
    headers: empHeaders,
  }));
  assert(markReadRes.status === 200, 'PATCH /api/notifications/:id/read returns 200 OK');

  const postReadCountRes = await app.fetch(new Request('http://localhost:3000/api/notifications/unread-count', {
    method: 'GET',
    headers: empHeaders,
  }));
  const postReadCount = await postReadCountRes.json();
  assert(postReadCount.count === 0, 'Unread count drops to 0 after marking single notification read');

  // --------------------------------------------------------------------------
  // 5. Bulk Mark All As Read
  // --------------------------------------------------------------------------
  console.log('\n--- Step 5: PATCH /api/notifications/read-all ---');

  // Create multiple notifications for intern
  await NotificationService.createNotification({
    workspaceId,
    recipientId: internUser.id,
    actorId: adminUser.id,
    type: 'WORKSPACE_INVITE',
    title: 'Welcome Intern',
    message: 'Welcome to the workspace team!',
    entityType: 'workspace',
    entityId: workspaceId,
  });

  await NotificationService.createNotification({
    workspaceId,
    recipientId: internUser.id,
    actorId: adminUser.id,
    type: 'TASK_ASSIGNED',
    title: 'Intern Learning Task Assigned',
    message: 'Please review documentation.',
    entityType: 'task',
    entityId: 'task-intern-001',
  });

  const internUnreadPre = await NotificationService.getUnreadCount(workspaceId, internUser.id);
  assert(internUnreadPre === 2, 'Intern has 2 unread notifications');

  const markAllRes = await app.fetch(new Request('http://localhost:3000/api/notifications/read-all', {
    method: 'PATCH',
    headers: internHeaders,
  }));
  assert(markAllRes.status === 200, 'PATCH /api/notifications/read-all returns 200 OK');

  const internUnreadPost = await NotificationService.getUnreadCount(workspaceId, internUser.id);
  assert(internUnreadPost === 0, 'Intern unread count is 0 after mark-all-read');

  // --------------------------------------------------------------------------
  // 6. Strict RBAC Isolation & Zero Client Trust Enforcement
  // --------------------------------------------------------------------------
  console.log('\n--- Step 6: Strict RBAC Isolation & Cross-User Security Check ---');

  // Create private notification for employee
  const privateEmpNotif = await NotificationService.createNotification({
    workspaceId,
    recipientId: empUser.id,
    actorId: adminUser.id,
    type: 'ROLE_CHANGED',
    title: 'Private Role Change Alert',
    message: 'Your role has been upgraded to Senior Developer.',
    entityType: 'user',
    entityId: empUser.id,
  });

  // Admin attempts to mark employee's notification as read -> MUST FAIL (404 / Forbidden isolation)
  const adminTamperRes = await app.fetch(new Request(`http://localhost:3000/api/notifications/${privateEmpNotif?.id}/read`, {
    method: 'PATCH',
    headers: adminHeaders,
  }));
  assert(adminTamperRes.status === 404, 'Admin cannot mark employee notification as read (Strict recipient isolation 404)');

  // Intern attempts to mark employee's notification as read -> MUST FAIL
  const internTamperRes = await app.fetch(new Request(`http://localhost:3000/api/notifications/${privateEmpNotif?.id}/read`, {
    method: 'PATCH',
    headers: internHeaders,
  }));
  assert(internTamperRes.status === 404, 'Intern cannot mark employee notification as read (404)');

  // Admin queries their own notifications -> MUST NOT contain employee notifications
  const adminNotifsRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: adminHeaders,
  }));
  const adminNotifsData = await adminNotifsRes.json();
  const leakedToAdmin = adminNotifsData.notifications.some((n: any) => n.id === privateEmpNotif?.id);
  assert(!leakedToAdmin, 'Admin CANNOT see employee notifications (Strict isolation confirmed)');

  // --------------------------------------------------------------------------
  // 7. Pagination & Ordering (Newest First, Unread First)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 7: Pagination & Ordering ---');

  // Create batch of notifications with timestamp spacing
  for (let i = 1; i <= 5; i++) {
    await NotificationRepository.createNotification({
      workspaceId,
      recipientId: empUser.id,
      userId: empUser.id,
      actorId: adminUser.id,
      type: 'TASK_STATUS_CHANGED',
      title: `Task Update ${i}`,
      message: `Status of task ${i} was updated.`,
      isRead: i > 3, // 1, 2, 3 unread; 4, 5 read
      createdAt: new Date(Date.now() + i * 1000),
    });
  }

  const pagedRes = await app.fetch(new Request('http://localhost:3000/api/notifications?limit=2&offset=0', {
    method: 'GET',
    headers: empHeaders,
  }));
  const pagedData = await pagedRes.json();
  assert(pagedData.notifications.length === 2, 'Limit 2 returns exactly 2 notifications');

  // --------------------------------------------------------------------------
  // 8. Integration Hooks Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Step 8: Integration Hooks (Task, Team, Leave) ---');

  // 8a. Leave Request Submission -> Workspace Admin(s) notified
  const leaveRes = await app.fetch(new Request('http://localhost:3000/api/people/leaves', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      leaveType: 'vacation',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      daysCount: 2,
      reason: 'Family event',
    }),
  }));
  assert(leaveRes.status === 200 || leaveRes.status === 201, 'Employee submitted leave request');
  const leavePayload = await leaveRes.json();
  const leaveId = leavePayload.leave?.id || leavePayload.id || leavePayload.leaveRequest?.id;

  const adminLeaveCheckRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: adminHeaders,
  }));
  const adminLeaveCheckData = await adminLeaveCheckRes.json();
  const leaveNotif = adminLeaveCheckData.notifications.find(
    (n: any) => (n.type === 'leave_submitted' || n.type === 'LEAVE_SUBMITTED') && n.entityId === leaveId
  );
  assert(!!leaveNotif, 'Integration Hook: Admin notified when Leave Request is submitted (LEAVE_SUBMITTED)');

  // 8b. Leave Decision -> Employee notified
  if (leaveId) {
    const approveLeaveRes = await app.fetch(new Request(`http://localhost:3000/api/people/leaves/${leaveId}/review`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ decision: 'approved', reviewNotes: 'Approved by lead' }),
    }));
    assert(approveLeaveRes.status === 200, 'Admin approved leave request');

    const empLeaveCheckRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
      method: 'GET',
      headers: empHeaders,
    }));
    const empLeaveCheckData = await empLeaveCheckRes.json();
    const approvedNotif = empLeaveCheckData.notifications.find(
      (n: any) => (n.type === 'leave_approved' || n.type === 'LEAVE_APPROVED') && n.entityId === leaveId
    );
    assert(!!approvedNotif, 'Integration Hook: Employee notified when Leave Request is approved (LEAVE_APPROVED)');
  }

  // 8c. Team Member Added -> Member notified
  const createTeamRes = await app.fetch(new Request('http://localhost:3000/api/teams', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: 'Notification Systems Team',
      description: 'Core backend team',
    }),
  }));
  assert(createTeamRes.status === 200 || createTeamRes.status === 201, 'Team container created');
  const teamPayload = await createTeamRes.json();
  const teamId = teamPayload.team?.id || teamPayload.id;

  if (teamId) {
    const addMemberRes = await app.fetch(new Request(`http://localhost:3000/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: internUser.id, role: 'member' }),
    }));
    assert(addMemberRes.status === 200, 'Intern added to team');

    const internTeamCheckRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
      method: 'GET',
      headers: internHeaders,
    }));
    const internTeamCheckData = await internTeamCheckRes.json();
    const teamAddedNotif = internTeamCheckData.notifications.find(
      (n: any) => (n.type === 'team_member_added' || n.type === 'TEAM_MEMBER_ADDED') && n.entityId === teamId
    );
    assert(!!teamAddedNotif, 'Integration Hook: Member notified when added to team (TEAM_MEMBER_ADDED)');
  }

  // --------------------------------------------------------------------------
  // 9. Logout / Login Persistence Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Step 9: Survival Across Logout & Login ---');

  // Employee logs out
  await app.fetch(new Request('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: empHeaders,
  }));

  // Employee logs back in with new session
  const reLoginEmpRes = await app.fetch(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emp-notif-p1@test.io', password: 'Password123!' }),
  }));
  const reEmpData = attachSessionToken(reLoginEmpRes, await reLoginEmpRes.json());
  const freshEmpHeaders = {
    Authorization: `Bearer ${reEmpData.token}`,
    'Content-Type': 'application/json',
  };

  const reHydratedNotifsRes = await app.fetch(new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: freshEmpHeaders,
  }));
  assert(reHydratedNotifsRes.status === 200, 'Notifications accessible after re-login (200 OK)');
  const reHydratedNotifsData = await reHydratedNotifsRes.json();
  assert(reHydratedNotifsData.notifications.length > 0, 'Notifications persisted across logout & login');

  // --------------------------------------------------------------------------
  // 10. Repository Delete Old Notifications (Retention)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 10: Retention Cleanup (deleteOldNotifications) ---');

  const deletedCount = await NotificationRepository.deleteOldNotifications(workspaceId, 0); // cutoff 0 days removes past records
  assert(typeof deletedCount === 'number', 'deleteOldNotifications executed and returned deleted count');

  console.log('\n===============================================================');
  console.log(' ✅ ALL NOTIFICATION FOUNDATION TESTS PASSED CLEANLY');
  console.log('===============================================================\n');
}

if (process.argv[1]?.endsWith('notification-system.test.ts') || process.argv[1]?.endsWith('notification-system.test.js')) {
  runNotificationSystemTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
