import { inMemoryDb } from '../packages/database';
import { AuthService } from '../src/services/auth-service';
import { InviteService } from '../src/services/invite-service';
import { app } from '../src/app';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

export async function runInviteSessionIsolationTests() {
  console.log('\n=================================================================');
  console.log('--- PHASE 30.3: INVITE ACCEPTANCE SESSION ISOLATION TESTS ---');
  console.log('=================================================================\n');

  // Reset in-memory test state
  inMemoryDb.workspaces.clear();
  inMemoryDb.users.clear();
  inMemoryDb.workspaceMembers.clear();
  inMemoryDb.teamMembers.clear();
  inMemoryDb.workspaceInvites.clear();
  inMemoryDb.sessions.clear();
  inMemoryDb.teams.clear();

  // -------------------------------------------------------------------------
  // STEP 1: Admin registers organization and obtains active session
  // -------------------------------------------------------------------------
  console.log('--- Step 1: Admin Registers & Authenticates ---');
  const testRunId = Date.now();
  const adminEmail = `admin_${testRunId}@session-isolation.org`;
  const adminRegister = await AuthService.registerAdmin({
    name: 'Admin User',
    email: adminEmail,
    password: 'AdminPassword2026!',
    workspaceName: `Acme Global ${testRunId}`,
  });

  const workspaceId = adminRegister.workspace.id;
  const adminUserId = adminRegister.user.id;
  const adminToken = adminRegister.token;

  assert(!!workspaceId, 'Workspace created with valid ID');
  assert(!!adminUserId, 'Admin user account created');
  assert(!!adminToken, 'Admin session token issued');

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Cookie': `ws_session=${adminToken}`,
    'Content-Type': 'application/json',
  };

  // -------------------------------------------------------------------------
  // STEP 2: Admin creates Invite #1 for Employee A
  // -------------------------------------------------------------------------
  console.log('\n--- Step 2: Admin Creates Invite #1 (Employee A) ---');
  const empAEmail = `emp_a_${testRunId}@session-isolation.org`;
  const createInviteRes1 = await app.request('/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email: empAEmail,
      role: 'employee',
    }),
  });

  assert(createInviteRes1.status === 201, `Admin creates Invite #1 -> 201 Created (got ${createInviteRes1.status})`);
  const invite1Body = await createInviteRes1.json();
  const invite1Token = invite1Body.invite.token;
  assert(!!invite1Token, 'Invite #1 returned with secure token');

  // Verify Admin can list invites
  const listInvitesRes1 = await app.request('/api/invites', {
    method: 'GET',
    headers: adminHeaders,
  });
  assert(listInvitesRes1.status === 200, `Admin queries GET /api/invites -> 200 OK (got ${listInvitesRes1.status})`);
  const list1Data = await listInvitesRes1.json();
  assert(list1Data.invites.length === 1, `1 pending invite listed for workspace`);

  // -------------------------------------------------------------------------
  // STEP 3: Employee A accepts Invite #1 via public POST /api/invites/accept
  // -------------------------------------------------------------------------
  console.log('\n--- Step 3: Employee A Accepts Invite #1 (Session Isolation Enforced) ---');
  const acceptRes1 = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: invite1Token,
      name: 'Employee Alpha',
      password: 'EmployeePassword2026!',
    }),
  });

  assert(acceptRes1.status === 200, `POST /api/invites/accept -> 200 OK (got ${acceptRes1.status})`);
  
  // Verify NO session cookies were set on accept response
  const setCookieHeader = acceptRes1.headers.get('set-cookie');
  const hasSessionCookie = setCookieHeader?.includes('ws_session=') ?? false;
  assert(!hasSessionCookie, 'Invite accept response does NOT set or overwrite ws_session cookie');

  const accept1Body = await acceptRes1.json();
  assert(accept1Body.success === true, 'Response contains success: true');
  assert(accept1Body.accepted === true, 'Response contains accepted: true');
  assert(accept1Body.requiresLogin === true, 'Response indicates requiresLogin: true');
  assert(accept1Body.email === empAEmail, 'Response confirms accepted email');
  assert(!accept1Body.token, 'Response does NOT leak or issue auto-login session token');

  // Verify user and workspace membership were created
  const createdEmpA = Array.from(inMemoryDb.users.values()).find((u) => u.email === empAEmail);
  assert(!!createdEmpA, 'Employee A user record created in persistence store');
  const empAMembership = Array.from(inMemoryDb.workspaceMembers.values()).find(
    (m) => m.workspaceId === workspaceId && m.userId === createdEmpA?.id
  );
  assert(!!empAMembership, 'Employee A workspace_members record created');
  assert(empAMembership?.role === 'employee', 'Employee A has role: employee');

  // Verify invite state (schema source of truth: acceptedAt IS NOT NULL)
  const invite1Entity = inMemoryDb.workspaceInvites.get(invite1Token);
  assert(!!invite1Entity?.acceptedAt, 'Invite #1 marked with acceptedAt timestamp');

  // -------------------------------------------------------------------------
  // STEP 4: Admin immediately makes subsequent Admin calls (Session Preserved)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 4: Admin Session Preservation & Subsequent Invite Operations ---');
  
  // Admin calls GET /api/invites -> Must return 200 OK (NOT 403 Forbidden)
  const listInvitesRes2 = await app.request('/api/invites', {
    method: 'GET',
    headers: adminHeaders,
  });
  assert(
    listInvitesRes2.status === 200,
    `Admin calls GET /api/invites after Employee A accepted -> 200 OK (NOT 403 Forbidden)`
  );
  const list2Data = await listInvitesRes2.json();
  assert(
    list2Data.invites.length === 0,
    'Accepted invite is no longer in pending invites list (acceptedAt IS NOT NULL)'
  );

  // Admin creates Invite #2 for Employee B
  console.log('\n--- Step 5: Admin Creates Invite #2 (Employee B) ---');
  const empBEmail = `emp_b_${testRunId}@session-isolation.org`;
  const createInviteRes2 = await app.request('/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email: empBEmail,
      role: 'employee',
    }),
  });

  assert(
    createInviteRes2.status === 201,
    `Admin successfully creates Invite #2 -> 201 Created (got ${createInviteRes2.status})`
  );
  const invite2Body = await createInviteRes2.json();
  const invite2Token = invite2Body.invite.token;
  assert(!!invite2Token, 'Invite #2 returned with secure token');

  // Admin verifies pending invite count = 1
  const listInvitesRes3 = await app.request('/api/invites', {
    method: 'GET',
    headers: adminHeaders,
  });
  assert(listInvitesRes3.status === 200, `Admin calls GET /api/invites -> 200 OK`);
  const list3Data = await listInvitesRes3.json();
  assert(list3Data.invites.length === 1, 'Invite #2 listed as pending for workspace');

  // Employee B accepts Invite #2
  console.log('\n--- Step 6: Employee B Accepts Invite #2 ---');
  const acceptRes2 = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: invite2Token,
      name: 'Employee Beta',
      password: 'EmployeePassword2026!',
    }),
  });
  assert(acceptRes2.status === 200, `POST /api/invites/accept for Invite #2 -> 200 OK`);
  const accept2Body = await acceptRes2.json();
  assert(accept2Body.requiresLogin === true, 'Requires login flag confirmed');

  // Admin session is STILL valid and authenticated
  const listInvitesRes4 = await app.request('/api/invites', {
    method: 'GET',
    headers: adminHeaders,
  });
  assert(
    listInvitesRes4.status === 200,
    `Admin session remains valid and authenticated after multiple acceptances -> 200 OK`
  );

  console.log('\n=================================================================');
  console.log('✅ ALL PHASE 30.3 INVITE SESSION ISOLATION TESTS PASSED');
  console.log('=================================================================\n');
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  runInviteSessionIsolationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test execution failed:', err);
      process.exit(1);
    });
}
