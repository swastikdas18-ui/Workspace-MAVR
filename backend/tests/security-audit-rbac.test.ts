/**
 * Suite 34: Workspace OS — Quick Action RBAC & Security Boundaries
 * Target: Remediation of CRIT-01 Privilege Escalation
 *
 * Validates:
 * Test 1: Employee attempts own leave approval -> Expected: 403 Forbidden
 * Test 2: Employee attempts colleague leave approval -> Expected: 403 Forbidden
 * Test 3: Intern attempts leave approval -> Expected: 403 Forbidden
 * Test 4: Department Head approves leave in own department -> Expected: 200 OK
 * Test 5: Department Head approves leave in another department -> Expected: 403 Forbidden
 * Test 6: Admin approves leave -> Expected: 200 OK
 * Test 7: Admin rejects leave -> Expected: 200 OK
 * Test 8: Employee marks own task complete -> Expected: 200 OK
 * Test 9: Employee marks another user's task complete -> Expected: 403 Forbidden
 * Test 10: Cross-workspace approval attempt -> Expected: 404/403 Forbidden
 */

import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { TaskRepository } from '../src/repositories/task-repository';
import { PeopleRepository } from '../src/repositories/people-repository';
import { ProjectRepository } from '../src/repositories/project-repository';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runSecurityAuditRbacTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING SUITE 34: QUICK ACTION RBAC & SECURITY REMEDIATION');
  console.log('===============================================================\n');

  // ==========================================
  // SETUP: Workspaces, Roles & Departments
  // ==========================================
  console.log('--- Setting up Security Test Workspaces and Personnel ---');

  // 1. Register Alice Admin in Workspace A
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice SecAdmin',
        email: 'alice.security@enterprise.io',
        password: 'Password123!',
        workspaceName: 'Security Ops HQ',
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

  // Helper to invite and register users with specific workspace roles
  async function createMember(email: string, name: string, role: string) {
    const invRes = await app.fetch(
      new Request('http://localhost:3000/api/invites', {
        method: 'POST',
        headers: aliceHeaders,
        body: JSON.stringify({ email, role }),
      })
    );
    const invJson = await invRes.json();
    await app.fetch(
      new Request('http://localhost:3000/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: invJson.invite.token,
          name,
          password: 'Password123!',
        }),
      })
    );
    const loginRes = await app.fetch(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
      })
    );
    const data = attachSessionToken(loginRes, await loginRes.json());
    return {
      user: data.user,
      headers: {
        Authorization: `Bearer ${data.token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  // 2. Members in Workspace A:
  // - David: Department Head for Engineering
  // - Eve: Department Head for Marketing
  // - Bob: Engineer (in Engineering dept)
  // - Carol: Marketer (in Marketing dept)
  // - Ian: Intern (no department head authority)
  const davidDeptHeadEng = await createMember('david.head@enterprise.io', 'David Lead', 'employee');
  const eveDeptHeadMkt = await createMember('eve.head@enterprise.io', 'Eve Lead', 'employee');
  const bobEngineer = await createMember('bob.dev@enterprise.io', 'Bob Engineer', 'employee');
  const carolMarketer = await createMember('carol.mkt@enterprise.io', 'Carol Marketer', 'employee');
  const ianIntern = await createMember('ian.secintern@enterprise.io', 'Ian Intern', 'intern');

  // 3. Setup Departments in Workspace A
  const engDept = await PeopleRepository.createDepartment(workspaceA.id, {
    name: 'Engineering',
    headId: davidDeptHeadEng.user.id,
  });

  const mktDept = await PeopleRepository.createDepartment(workspaceA.id, {
    name: 'Marketing',
    headId: eveDeptHeadMkt.user.id,
  });

  // Assign profiles to departments
  await PeopleRepository.upsertProfile(workspaceA.id, bobEngineer.user.id, {
    departmentId: engDept.id,
    designation: 'Software Engineer',
  });
  await PeopleRepository.upsertProfile(workspaceA.id, carolMarketer.user.id, {
    departmentId: mktDept.id,
    designation: 'Growth Marketer',
  });

  // Create Project in Workspace A for tasks
  const testProject = await ProjectRepository.createProject({
    workspaceId: workspaceA.id,
    title: 'Security Hardening Project',
    createdBy: aliceUser.id,
    dueDate: new Date(Date.now() + 86400000),
  });

  // 4. Setup Workspace B (Isolated Workspace for Cross-Workspace testing)
  const regCrossRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Zara CrossAdmin',
        email: 'zara.cross@external.io',
        password: 'Password123!',
        workspaceName: 'Foreign Corp B',
      }),
    })
  );
  const zaraData = attachSessionToken(regCrossRes, await regCrossRes.json());
  const zaraHeaders = {
    Authorization: `Bearer ${zaraData.token}`,
    'Content-Type': 'application/json',
  };

  console.log('✅ PASS: Multi-department personnel and isolated workspaces initialized');

  // ==========================================
  // Test 1: Employee attempts own leave approval
  // Expected: 403 Forbidden
  // ==========================================
  console.log('\n--- Test 1: Employee attempts own leave approval ---');
  const bobLeave = await PeopleRepository.createLeaveRequest(workspaceA.id, bobEngineer.user.id, {
    leaveType: 'annual',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-05'),
    reason: 'Vacation',
  });

  const bobOwnApproveRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: bobEngineer.headers,
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: bobLeave.id },
      }),
    })
  );
  assert(bobOwnApproveRes.status === 403, 'Employee approving own leave returns 403 Forbidden');
  const bobOwnJson = await bobOwnApproveRes.json();
  assert(bobOwnJson.error.code === 'FORBIDDEN', 'Error code is FORBIDDEN');

  // Verify status is still pending
  const checkBobLeave1 = await PeopleRepository.getLeaveRequestById(workspaceA.id, bobLeave.id);
  assert(checkBobLeave1?.status === 'pending', 'Leave status remains pending after blocked exploit');

  // ==========================================
  // Test 2: Employee attempts colleague leave approval
  // Expected: 403 Forbidden
  // ==========================================
  console.log("\n--- Test 2: Employee attempts colleague leave approval ---");
  const carolLeave = await PeopleRepository.createLeaveRequest(workspaceA.id, carolMarketer.user.id, {
    leaveType: 'sick',
    startDate: new Date('2026-10-10'),
    endDate: new Date('2026-10-12'),
    reason: 'Dental surgery',
  });

  const bobApproveCarolRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: bobEngineer.headers,
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: carolLeave.id },
      }),
    })
  );
  assert(bobApproveCarolRes.status === 403, 'Employee approving colleague leave returns 403 Forbidden');

  // ==========================================
  // Test 3: Intern attempts leave approval
  // Expected: 403 Forbidden
  // ==========================================
  console.log('\n--- Test 3: Intern attempts leave approval ---');
  const ianApproveRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: ianIntern.headers,
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: bobLeave.id },
      }),
    })
  );
  assert(ianApproveRes.status === 403, 'Intern approving leave returns 403 Forbidden');

  // ==========================================
  // Test 4: Department Head approves leave in own department
  // Expected: 200 OK
  // ==========================================
  console.log('\n--- Test 4: Department Head approves leave in own department ---');
  // David is Head of Engineering. Bob is in Engineering.
  const davidApproveBobRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: davidDeptHeadEng.headers,
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: bobLeave.id, reviewNotes: 'Approved by Engineering Head' },
      }),
    })
  );
  assert(davidApproveBobRes.status === 200, 'Department head approving own department leave returns 200 OK');
  const davidApproveJson = await davidApproveBobRes.json();
  assert(davidApproveJson.success === true, 'Leave approved successfully by Department Head');

  const checkBobLeave4 = await PeopleRepository.getLeaveRequestById(workspaceA.id, bobLeave.id);
  assert(checkBobLeave4?.status === 'approved', 'Leave status updated to approved');

  // ==========================================
  // Test 5: Department Head approves leave in another department
  // Expected: 403 Forbidden
  // ==========================================
  console.log('\n--- Test 5: Department Head approves leave in another department ---');
  // David (Engineering Head) attempts to approve Carol (Marketing department)
  const davidApproveCarolRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: davidDeptHeadEng.headers,
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: carolLeave.id },
      }),
    })
  );
  assert(davidApproveCarolRes.status === 403, 'Department head approving outside department returns 403 Forbidden');
  const checkCarolLeave5 = await PeopleRepository.getLeaveRequestById(workspaceA.id, carolLeave.id);
  assert(checkCarolLeave5?.status === 'pending', 'Marketing leave remains pending after out-of-scope attempt');

  // ==========================================
  // Test 6: Admin approves leave
  // Expected: 200 OK
  // ==========================================
  console.log('\n--- Test 6: Admin approves leave ---');
  // Alice (Workspace Admin) approves Carol's leave
  const aliceApproveCarolRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: carolLeave.id, reviewNotes: 'Approved by Admin' },
      }),
    })
  );
  assert(aliceApproveCarolRes.status === 200, 'Admin approving leave returns 200 OK');
  const checkCarolLeave6 = await PeopleRepository.getLeaveRequestById(workspaceA.id, carolLeave.id);
  assert(checkCarolLeave6?.status === 'approved', 'Leave successfully approved by Admin');

  // ==========================================
  // Test 7: Admin rejects leave
  // Expected: 200 OK
  // ==========================================
  console.log('\n--- Test 7: Admin rejects leave ---');
  const leaveToReject = await PeopleRepository.createLeaveRequest(workspaceA.id, bobEngineer.user.id, {
    leaveType: 'casual',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-11-02'),
    reason: 'Casual day',
  });

  const aliceRejectRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        action: 'reject_leave',
        payload: { leaveId: leaveToReject.id, reviewNotes: 'Too many team members out' },
      }),
    })
  );
  assert(aliceRejectRes.status === 200, 'Admin rejecting leave returns 200 OK');
  const checkRejectedLeave = await PeopleRepository.getLeaveRequestById(workspaceA.id, leaveToReject.id);
  assert(checkRejectedLeave?.status === 'rejected', 'Leave status successfully recorded as rejected');

  // ==========================================
  // Test 8: Employee marks own task complete
  // Expected: 200 OK
  // ==========================================
  console.log('\n--- Test 8: Employee marks own task complete ---');
  const bobTask = await TaskRepository.createTask(workspaceA.id, aliceUser.id, {
    projectId: testProject.id,
    title: 'Bob Personal Task',
    assignedTo: bobEngineer.user.id,
    dueDate: new Date(),
    priority: 'high',
  });

  const bobCompleteOwnTaskRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: bobEngineer.headers,
      body: JSON.stringify({
        action: 'mark_task_complete',
        payload: { taskId: bobTask.id },
      }),
    })
  );
  assert(bobCompleteOwnTaskRes.status === 200, 'Employee marking own task complete returns 200 OK');
  const checkBobTask = await TaskRepository.getTaskById(workspaceA.id, bobTask.id);
  assert(checkBobTask?.status === 'done', 'Task status is done');

  // ==========================================
  // Test 9: Employee marks another user's task complete
  // Expected: 403 Forbidden
  // ==========================================
  console.log("\n--- Test 9: Employee marks another user's task complete ---");
  const carolTask = await TaskRepository.createTask(workspaceA.id, aliceUser.id, {
    projectId: testProject.id,
    title: 'Carol Marketing Campaign Task',
    assignedTo: carolMarketer.user.id,
    dueDate: new Date(),
    priority: 'medium',
  });

  // Bob attempts to complete Carol's task
  const bobCompleteCarolTaskRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: bobEngineer.headers,
      body: JSON.stringify({
        action: 'mark_task_complete',
        payload: { taskId: carolTask.id },
      }),
    })
  );
  assert(bobCompleteCarolTaskRes.status === 403, "Employee completing another user's task returns 403 Forbidden");
  const checkCarolTask = await TaskRepository.getTaskById(workspaceA.id, carolTask.id);
  assert(checkCarolTask?.status !== 'done', 'Colleague task remains uncompleted after unauthorized attempt');

  // ==========================================
  // Test 10: Cross-workspace approval attempt
  // Expected: 403 or 404 Forbidden
  // ==========================================
  console.log('\n--- Test 10: Cross-workspace approval attempt ---');
  // Zara (Admin of Workspace B) attempts to approve Bob's leave in Workspace A
  const zaraLeaveAttempt = await PeopleRepository.createLeaveRequest(workspaceA.id, bobEngineer.user.id, {
    leaveType: 'annual',
    startDate: new Date('2026-12-01'),
    endDate: new Date('2026-12-05'),
    reason: 'Year end break',
  });

  const crossApproveRes = await app.fetch(
    new Request('http://localhost:3000/api/inbox/quick-action', {
      method: 'POST',
      headers: zaraHeaders, // Session bound to Workspace B
      body: JSON.stringify({
        action: 'approve_leave',
        payload: { leaveId: zaraLeaveAttempt.id },
      }),
    })
  );
  assert(
    crossApproveRes.status === 403 || crossApproveRes.status === 404,
    `Cross-workspace approval returns 403 or 404 (received ${crossApproveRes.status})`
  );
  const checkCrossLeave = await PeopleRepository.getLeaveRequestById(workspaceA.id, zaraLeaveAttempt.id);
  assert(checkCrossLeave?.status === 'pending', 'Cross-workspace leave remains pending');

  console.log('\n===============================================================');
  console.log(' ✅ ALL 10 SECURITY AUDIT & RBAC TESTS PASSED SUCCESSFULLY (SUITE 34)');
  console.log('===============================================================\n');
}
