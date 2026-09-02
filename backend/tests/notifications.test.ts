import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runNotificationsTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING REAL-TIME NOTIFICATION SYSTEM TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // 1. Setup Admin in Workspace
  const regAdminReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Notif Admin',
      email: 'admin-notif@test.io',
      password: 'Password123!',
      workspaceName: 'Notif Test Workspace',
    }),
  });
  const regAdminRes = await app.fetch(regAdminReq);
  const adminData = attachSessionToken(regAdminRes, await regAdminRes.json());
  const adminToken = adminData.token;
  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  // 2. Invite & Create Employee in Admin's Workspace
  const inviteEmpReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'emp-notif@test.io', role: 'employee' }),
  });
  const inviteEmpRes = await app.fetch(inviteEmpReq);
  const inviteEmpData = await inviteEmpRes.json();

  const acceptEmpReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteEmpData.invite?.token,
      name: 'Notif Employee',
      password: 'Password123!',
    }),
  });
  await app.fetch(acceptEmpReq);

  const loginEmpReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emp-notif@test.io', password: 'Password123!' }),
  });
  const loginEmpRes = await app.fetch(loginEmpReq);
  const empSessionData = attachSessionToken(loginEmpRes, await loginEmpRes.json());
  const empToken = empSessionData.token;
  const empUser = empSessionData.user;
  const empHeaders = {
    Authorization: `Bearer ${empToken}`,
    'Content-Type': 'application/json',
  };

  // 3. Test 1: Task Assignment Notification (task_assigned)
  const createProjReq = new Request('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Notification System Project',
      description: 'Test project for notifications',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  const createProjRes = await app.fetch(createProjReq);
  const projData = await createProjRes.json();
  const projectId = projData.project?.id || projData.id;

  // Admin creates task assigned to Employee
  const createTaskReq = new Request('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Build Notification Engine',
      description: 'Implement backend notification service',
      projectId,
      assignedTo: empUser.id,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  const createTaskRes = await app.fetch(createTaskReq);
  assert(createTaskRes.status === 201 || createTaskRes.status === 200, 'Task created successfully');

  // Employee checks notifications (task_assigned notification present)
  const getEmpNotifReq = new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: empHeaders,
  });
  const getEmpNotifRes = await app.fetch(getEmpNotifReq);
  assert(getEmpNotifRes.status === 200, 'Employee fetches notifications (200 OK)');
  const empNotifsData = await getEmpNotifRes.json();
  const taskAssignedNotif = empNotifsData.notifications.find((n: any) => n.type === 'task_assigned');
  assert(!!taskAssignedNotif, '✓ Notification created for Task Assignment (task_assigned)');

  // 4. Test 2: Leave Submission Notification (leave_submitted)
  const submitLeaveReq = new Request('http://localhost:3000/api/people/leaves', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      leaveType: 'annual',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      daysCount: 1,
      reason: 'Medical checkup',
    }),
  });
  const submitLeaveRes = await app.fetch(submitLeaveReq);
  assert(submitLeaveRes.status === 201 || submitLeaveRes.status === 200, 'Employee submits leave request');
  const leaveData = await submitLeaveRes.json();
  const leaveId = leaveData.id || leaveData.leaveRequest?.id;

  // Admin checks notifications (leave_submitted notification present)
  const getAdminNotifReq = new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: adminHeaders,
  });
  const getAdminNotifRes = await app.fetch(getAdminNotifReq);
  const adminNotifsData = await getAdminNotifRes.json();
  const leaveSubmittedNotif = adminNotifsData.notifications.find((n: any) => n.type === 'leave_submitted');
  assert(!!leaveSubmittedNotif, '✓ Notification created for Leave Submission (leave_submitted)');

  // 5. Test 3: Leave Approval Notification (leave_approved)
  if (leaveId) {
    const reviewLeaveReq = new Request(`http://localhost:3000/api/people/leaves/${leaveId}/review`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'approved',
        reviewNotes: 'Approved by admin',
      }),
    });
    const reviewLeaveRes = await app.fetch(reviewLeaveReq);
    assert(reviewLeaveRes.status === 200, 'Admin approves leave request (200 OK)');

    // Employee checks for leave_approved notification
    const getEmpNotifReq2 = new Request('http://localhost:3000/api/notifications', {
      method: 'GET',
      headers: empHeaders,
    });
    const getEmpNotifRes2 = await app.fetch(getEmpNotifReq2);
    const empNotifsData2 = await getEmpNotifRes2.json();
    const leaveApprovedNotif = empNotifsData2.notifications.find((n: any) => n.type === 'leave_approved');
    assert(!!leaveApprovedNotif, '✓ Notification created for Leave Approval (leave_approved)');
  }

  // 6. Test 4: Wiki Creation Notification (wiki_created)
  const createWikiReq = new Request('http://localhost:3000/api/wiki', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Company Engineering Guidelines',
      contentJson: { blocks: [{ id: 'b1', type: 'paragraph', content: 'Engineering standards' }] },
      visibility: 'workspace',
    }),
  });
  const createWikiRes = await app.fetch(createWikiReq);
  assert(createWikiRes.status === 201 || createWikiRes.status === 200, 'Admin creates wiki page');

  // Employee checks for wiki_created notification
  const getEmpNotifReq3 = new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: empHeaders,
  });
  const getEmpNotifRes3 = await app.fetch(getEmpNotifReq3);
  const empNotifsData3 = await getEmpNotifRes3.json();
  const wikiCreatedNotif = empNotifsData3.notifications.find((n: any) => n.type === 'wiki_created');
  assert(!!wikiCreatedNotif, '✓ Notification created for Wiki Creation (wiki_created)');

  // 7. Test 5: Document Upload Notification (document_uploaded)
  const uploadDocReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Architecture Blueprint 2026.pdf',
      fileUrl: 'https://storage.workspace.io/blueprint.pdf',
      fileType: 'pdf',
      fileSize: '2.4 MB',
      category: 'Engineering',
      visibility: 'workspace',
    }),
  });
  const uploadDocRes = await app.fetch(uploadDocReq);
  assert(uploadDocRes.status === 201 || uploadDocRes.status === 200, 'Admin uploads document');

  // Employee checks for document_uploaded notification
  const getEmpNotifReq4 = new Request('http://localhost:3000/api/notifications', {
    method: 'GET',
    headers: empHeaders,
  });
  const getEmpNotifRes4 = await app.fetch(getEmpNotifReq4);
  const empNotifsData4 = await getEmpNotifRes4.json();
  const docUploadedNotif = empNotifsData4.notifications.find((n: any) => n.type === 'document_uploaded');
  assert(!!docUploadedNotif, '✓ Notification created for Document Upload (document_uploaded)');

  // 8. Test 6: Unread Badge Count Endpoint
  const unreadCountReq = new Request('http://localhost:3000/api/notifications/unread-count', {
    method: 'GET',
    headers: empHeaders,
  });
  const unreadCountRes = await app.fetch(unreadCountReq);
  assert(unreadCountRes.status === 200, 'Fast unread count endpoint returns 200 OK');
  const countData = await unreadCountRes.json();
  assert(typeof countData.count === 'number' && countData.count > 0, 'Unread count is accurate number');

  // 9. Test 7: Mark Single Notification Read
  if (taskAssignedNotif) {
    const markReadReq = new Request(`http://localhost:3000/api/notifications/${taskAssignedNotif.id}/read`, {
      method: 'PATCH',
      headers: empHeaders,
    });
    const markReadRes = await app.fetch(markReadReq);
    assert(markReadRes.status === 200, 'Mark single notification read returns 200 OK');
  }

  // 10. Test 8: Mark All Notifications Read
  const markAllReadReq = new Request('http://localhost:3000/api/notifications/read-all', {
    method: 'PATCH',
    headers: empHeaders,
  });
  const markAllReadRes = await app.fetch(markAllReadReq);
  assert(markAllReadRes.status === 200, 'Mark all notifications read returns 200 OK');

  // Re-check unread count
  const postMarkUnreadReq = new Request('http://localhost:3000/api/notifications/unread-count', {
    method: 'GET',
    headers: empHeaders,
  });
  const postMarkUnreadRes = await app.fetch(postMarkUnreadReq);
  const postCountData = await postMarkUnreadRes.json();
  assert(postCountData.count === 0, '✓ Unread count becomes 0 after markAllRead');

  // 11. Test 9: Strict RBAC Isolation (Users cannot access other users notifications)
  if (leaveSubmittedNotif) {
    const unauthorizedReadReq = new Request(`http://localhost:3000/api/notifications/${leaveSubmittedNotif.id}/read`, {
      method: 'PATCH',
      headers: empHeaders,
    });
    const unauthorizedReadRes = await app.fetch(unauthorizedReadReq);
    assert(unauthorizedReadRes.status === 404 || unauthorizedReadRes.status === 403, '✓ RBAC Security: Employee cannot mutate Admin notification (404/403)');
  }

  console.log('\n===============================================================');
  console.log(' REAL-TIME NOTIFICATION SYSTEM TESTS: ALL CHECKS PASSED');
  console.log('===============================================================\n');
}
