import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { TaskRepository } from '../src/repositories/task-repository';
import { PeopleRepository } from '../src/repositories/people-repository';
import { ChatService } from '../src/services/chat-service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runWorkInboxTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING WORK INBOX TESTS (Suite 33: Action Center & Priority Engine)');
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
        email: 'alice.inbox@test.io',
        password: 'Password123!',
        workspaceName: 'Acme Inbox HQ',
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
      body: JSON.stringify({ email: 'bob.inbox@test.io', role: 'employee' }),
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
      body: JSON.stringify({ email: 'bob.inbox@test.io', password: 'Password123!' }),
    })
  );
  const bobData = attachSessionToken(bobLoginRes, await bobLoginRes.json());
  const bobHeaders = {
    Authorization: `Bearer ${bobData.token}`,
    'Content-Type': 'application/json',
  };
  const bobUser = bobData.user;

  // 3. Invite Ian (Intern) to Workspace A
  const inviteIanRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'ian.inbox@test.io', role: 'intern' }),
    })
  );
  const ianInvite = await inviteIanRes.json();

  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: ianInvite.invite.token,
        name: 'Ian Intern',
        password: 'Password123!',
      }),
    })
  );

  const ianLoginRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ian.inbox@test.io', password: 'Password123!' }),
    })
  );
  const ianData = attachSessionToken(ianLoginRes, await ianLoginRes.json());
  const ianHeaders = {
    Authorization: `Bearer ${ianData.token}`,
    'Content-Type': 'application/json',
  };
  const ianUser = ianData.user;

  // 4. Register Charlie Admin in Workspace B (Isolated)
  const regCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie Admin',
        email: 'charlie.inbox@other.io',
        password: 'Password123!',
        workspaceName: 'Isolated Workspace B',
      }),
    })
  );
  const charlieData = attachSessionToken(regCharlieRes, await regCharlieRes.json());
  const charlieHeaders = {
    Authorization: `Bearer ${charlieData.token}`,
    'Content-Type': 'application/json',
  };

  console.log('✅ PASS: Workspaces and test roles initialized successfully');

  // ==========================================
  // Test 1: Overdue tasks appear in urgent
  // ==========================================
  console.log('\n--- Test 1: Overdue tasks appear in urgent ---');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const overdueTask = await TaskRepository.createTask(workspaceA.id, aliceUser.id, {
    title: 'Fix Critical Production Bug',
    description: 'Resolve gateway error',
    assignedTo: bobUser.id,
    projectId: 'proj-default',
    status: 'in_progress',
    priority: 'urgent',
    dueDate: yesterday,
  });

  const bobInboxRes1 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  assert(bobInboxRes1.status === 200, 'Bob fetches inbox successfully (200 OK)');
  const inbox1 = await bobInboxRes1.json();
  const overdueFound = inbox1.urgent.find((item: any) => item.entityId === overdueTask.id);
  assert(!!overdueFound, 'Overdue task is present in Bob urgent queue');
  assert(overdueFound?.priority === 'urgent', 'Overdue task priority is urgent');
  assert(overdueFound?.actionLabel === 'Open Task', 'Action label is Open Task');

  // ==========================================
  // Test 2: Mentions appear in urgent
  // ==========================================
  console.log('\n--- Test 2: Mentions appear in urgent ---');
  // Alice starts DM conversation with Bob and sends a mention
  const dmRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/dm', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ targetUserId: bobUser.id }),
    })
  );
  const dmData = await dmRes.json();
  const dmConvId = dmData.conversation.id;
  await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmConvId}/messages`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ content: 'Hey @bob.inbox, please review this PR!' }),
    })
  );

  const bobInboxRes2 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const inbox2 = await bobInboxRes2.json();
  const mentionFound = inbox2.urgent.find((item: any) => item.entityType === 'mention' && item.entityId === dmConvId);
  assert(!!mentionFound, 'Chat mention is present in Bob urgent queue');
  assert(mentionFound?.priority === 'urgent', 'Mention priority is urgent');
  assert(mentionFound?.actionLabel === 'Open Conversation', 'Mention action label is Open Conversation');

  // ==========================================
  // Test 3: Tasks due today appear in today
  // ==========================================
  console.log('\n--- Test 3: Tasks due today appear in today ---');
  const now = new Date();
  const todayDue = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0); // 5 PM today
  const todayTask = await TaskRepository.createTask(workspaceA.id, aliceUser.id, {
    title: 'Finish API Docs Review',
    description: 'Review and sign off OpenAPI specs',
    assignedTo: bobUser.id,
    projectId: 'proj-default',
    status: 'in_progress',
    priority: 'high',
    dueDate: todayDue,
  });

  const bobInboxRes3 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const inbox3 = await bobInboxRes3.json();
  const todayFound = inbox3.today.find((item: any) => item.entityId === todayTask.id);
  assert(!!todayFound, 'Task due today appears in Bob today queue');
  assert(todayFound?.priority === 'today', 'Task due today priority is today');

  // ==========================================
  // Test 4: Future tasks appear in upcoming
  // ==========================================
  console.log('\n--- Test 4: Future tasks appear in upcoming ---');
  const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const futureTask = await TaskRepository.createTask(workspaceA.id, aliceUser.id, {
    title: 'Deploy Q4 Infrastructure',
    description: 'Terraform rollout to staging',
    assignedTo: bobUser.id,
    projectId: 'proj-default',
    status: 'todo',
    priority: 'medium',
    dueDate: fiveDaysLater,
  });

  const bobInboxRes4 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const inbox4 = await bobInboxRes4.json();
  const futureFound = inbox4.upcoming.find((item: any) => item.entityId === futureTask.id);
  assert(!!futureFound, 'Future task appears in Bob upcoming queue');
  assert(futureFound?.priority === 'upcoming', 'Future task priority is upcoming');

  // ==========================================
  // Test 5: Completed work appears in completedRecently
  // ==========================================
  console.log('\n--- Test 5: Completed work appears in completedRecently ---');
  const completedTask = await TaskRepository.createTask(workspaceA.id, aliceUser.id, {
    title: 'Setup Redis Cluster',
    description: 'Cluster configured and tested',
    assignedTo: bobUser.id,
    projectId: 'proj-default',
    status: 'done',
    priority: 'low',
  });

  const bobInboxRes5 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const inbox5 = await bobInboxRes5.json();
  const doneFound = inbox5.completedRecently.find((item: any) => item.entityId === completedTask.id);
  assert(!!doneFound, 'Completed task appears in completedRecently queue');
  assert(doneFound?.priority === 'completed', 'Completed item priority is completed');

  // ==========================================
  // Test 6: Inbox counts and summary math are correct
  // ==========================================
  console.log('\n--- Test 6: Inbox counts and summary math are correct ---');
  assert(inbox5.summary.totalUrgent === inbox5.urgent.length, 'Summary totalUrgent strictly matches urgent length');
  assert(inbox5.summary.totalToday === inbox5.today.length, 'Summary totalToday strictly matches today length');
  assert(inbox5.summary.totalUpcoming === inbox5.upcoming.length, 'Summary totalUpcoming strictly matches upcoming length');
  assert(inbox5.summary.totalCompletedRecently === inbox5.completedRecently.length, 'Summary totalCompletedRecently matches length');
  assert(
    inbox5.summary.totalUnresolved === inbox5.summary.totalUrgent + inbox5.summary.totalToday,
    'Summary totalUnresolved matches urgent + today'
  );

  // ==========================================
  // Test 7: RBAC isolation (Admin vs Employee vs Intern)
  // ==========================================
  console.log('\n--- Test 7: RBAC isolation ---');
  // Bob submits a leave request
  const leaveReq = await PeopleRepository.createLeaveRequest(workspaceA.id, bobUser.id, {
    leaveType: 'sick',
    startDate: new Date('2026-09-10'),
    endDate: new Date('2026-09-12'),
    reason: 'Medical recovery',
  });

  // 1. Alice (Admin) MUST see Bob's leave request in urgent approvals
  const aliceInboxRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  const aliceInbox = await aliceInboxRes.json();
  const adminLeaveFound = aliceInbox.urgent.find((item: any) => item.entityType === 'leave' && item.entityId === leaveReq.id);
  assert(!!adminLeaveFound, 'Admin sees pending leave request in urgent action center');

  // 2. Bob (Employee applicant) does NOT see the leave request in urgent approvals (he cannot review own request)
  const bobInboxRes7 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const bobInbox7 = await bobInboxRes7.json();
  const employeeLeaveApproval = bobInbox7.urgent.find((item: any) => item.entityType === 'leave' && item.entityId === leaveReq.id);
  assert(!employeeLeaveApproval, 'Employee does not receive approval action card for own leave request');

  // 3. Ian (Intern) does not see non-learning projects or CRM deals
  const ianInboxRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: ianHeaders,
    })
  );
  const ianInbox = await ianInboxRes.json();
  const internHasCRM = [...ianInbox.urgent, ...ianInbox.today].some((item: any) => item.entityType === 'lead' || item.entityType === 'deal');
  assert(!internHasCRM, 'Intern sandbox does not receive CRM deals or sensitive customer leads');

  // ==========================================
  // Test 8: Cross-workspace isolation
  // ==========================================
  console.log('\n--- Test 8: Cross-workspace isolation ---');
  const charlieInboxRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: charlieHeaders,
    })
  );
  assert(charlieInboxRes.status === 200, 'Charlie fetches Workspace B inbox');
  const charlieInbox = await charlieInboxRes.json();
  assert(charlieInbox.summary.totalUnresolved === 0, 'Charlie in Workspace B has 0 items from Workspace A');
  const leakedItem = [...charlieInbox.urgent, ...charlieInbox.today, ...charlieInbox.upcoming].find(
    (item: any) => item.entityId === overdueTask.id || item.entityId === todayTask.id
  );
  assert(!leakedItem, 'No cross-workspace data leakage');

  // ==========================================
  // Test 9: In-line Quick Action: Task completion
  // ==========================================
  console.log('\n--- Test 9: In-line Quick Action: Task completion ---');
  const completeActionRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({
        action: 'mark_task_complete',
        payload: { taskId: overdueTask.id },
      }),
    })
  );
  assert(completeActionRes.status === 200, 'Quick action task completion returns 200 OK');
  const actionJson = await completeActionRes.json();
  assert(actionJson.success === true, 'Task completed successfully via in-line quick action');

  // Re-fetch Bob inbox: overdue task is no longer in urgent, but in completedRecently!
  const bobInboxRes9 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const inbox9 = await bobInboxRes9.json();
  const stillInUrgent = inbox9.urgent.find((item: any) => item.entityId === overdueTask.id);
  const nowInCompleted = inbox9.completedRecently.find((item: any) => item.entityId === overdueTask.id);
  assert(!stillInUrgent, 'Completed task removed from urgent queue');
  assert(!!nowInCompleted, 'Completed task immediately reflected in completedRecently');

  // ==========================================
  // Test 10: In-line Quick Action: Leave approval
  // ==========================================
  console.log('\n--- Test 10: In-line Quick Action: Leave approval ---');
  const approveLeaveRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: leaveReq.id },
      }),
    })
  );
  assert(approveLeaveRes.status === 200, 'Leave approval quick action returns 200 OK');

  // Re-fetch Alice inbox: leave request is no longer in urgent
  const aliceInboxRes10 = await app.fetch(
    new Request('http://localhost:3000/api/inbox', {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  const aliceInbox10 = await aliceInboxRes10.json();
  const leaveStillInUrgent = aliceInbox10.urgent.find((item: any) => item.entityId === leaveReq.id);
  assert(!leaveStillInUrgent, 'Approved leave request removed from urgent review queue');

  console.log('\n===============================================================');
  console.log(' ✅ ALL 10 WORK INBOX TESTS PASSED SUCCESSFULLY (SUITE 33)');
  console.log('===============================================================\n');
}
