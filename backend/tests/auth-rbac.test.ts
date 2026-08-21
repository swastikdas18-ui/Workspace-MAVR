import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';

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

export async function runAllTests() {
  console.log('\n==================================================');
  console.log(' RUNNING WORKSPACE OS BACKEND & RBAC TEST SUITE');
  console.log('==================================================\n');

  // Reset in-memory database for clean test run
  inMemoryDb.reset();

  let adminToken = '';
  let adminUserId = '';
  let workspaceId = '';
  let employeeToken = '';
  let employeeUserId = '';
  let internToken = '';
  let internUserId = '';

  // TEST 1: Admin Registration (creates User, Role=ADMIN, Workspace, Owner=User.id)
  {
    const res = await testApi('POST', '/api/auth/register', {
      name: 'Sarah Connor',
      email: 'sarah@sky.net',
      password: 'CyberPassword2026!',
      workspaceName: 'Cyberdyne Systems',
    });

    assert(res.status === 201, '1. Admin registration returns HTTP 201 Created');
    assert(res.data.user.role === 'admin', '1. Admin registration assigns role "admin"');
    assert(res.data.workspace.name === 'Cyberdyne Systems', '1. Workspace is created with provided name');
    assert(res.data.workspace.ownerId === res.data.user.id, '1. Workspace owner_id matches Admin user ID');
    assert(!!res.data.token, '1. Session token is generated');
    assert(!('password' in res.data.user), '1. Password hash is never returned in response');

    adminToken = res.data.token;
    adminUserId = res.data.user.id;
    workspaceId = res.data.workspace.id;
  }

  // TEST 2: Admin Login
  {
    const res = await testApi('POST', '/api/auth/login', {
      email: 'sarah@sky.net',
      password: 'CyberPassword2026!',
    });

    assert(res.status === 200, '2. Admin login returns HTTP 200 OK');
    assert(res.data.user.id === adminUserId, '2. Login resolves correct user ID');
    assert(res.data.user.role === 'admin', '2. Server-side session verifies Admin role');
    assert(!!res.data.token, '2. New active session token issued');
    adminToken = res.data.token;
  }

  // TEST 3: Invalid Login Attempt
  {
    const res = await testApi('POST', '/api/auth/login', {
      email: 'sarah@sky.net',
      password: 'WrongPassword!',
    });

    assert(res.status === 401, '3. Invalid password rejected with HTTP 401 Unauthorized');
    assert(res.data.error.code === 'UNAUTHORIZED', '3. Standard error format returned');
  }

  // TEST 4: Logout
  {
    // Register temporary user to test logout
    const reg = await testApi('POST', '/api/auth/register', {
      name: 'Temp User',
      email: 'temp@sky.net',
      password: 'Password123!',
      workspaceName: 'Temp Org',
    });
    const tempToken = reg.data.token;

    const logoutRes = await testApi('POST', '/api/auth/logout', {}, {
      Authorization: `Bearer ${tempToken}`,
    });
    assert(logoutRes.status === 200, '4. Logout returns HTTP 200 OK');

    // Trying to use invalidated session should fail
    const sessionRes = await testApi('GET', '/api/auth/session', undefined, {
      Authorization: `Bearer ${tempToken}`,
    });
    assert(sessionRes.status === 401, '4. Invalidated session is rejected with HTTP 401');
  }

  // TEST 5: Session Retrieval
  {
    const res = await testApi('GET', '/api/auth/session', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert(res.status === 200, '5. GET /api/auth/session returns HTTP 200 OK');
    assert(res.data.user.email === 'sarah@sky.net', '5. Session user email matches server database');
    assert(res.data.user.role === 'admin', '5. Server-side role is returned');
  }

  // TEST 6: Workspace Creation & Member Setup
  {
    // Register Employee
    const empRes = await testApi('POST', '/api/auth/register', {
      name: 'John Reese',
      email: 'john@sky.net',
      password: 'Password123!',
      workspaceId: workspaceId,
      role: 'employee',
    });
    assert(empRes.status === 201, '6. Employee registration into workspace returns 201');
    assert(empRes.data.user.role === 'employee', '6. Employee assigned role "employee"');
    employeeToken = empRes.data.token;
    employeeUserId = empRes.data.user.id;

    // Register Intern
    const internRes = await testApi('POST', '/api/auth/register', {
      name: 'Harold Finch',
      email: 'harold@sky.net',
      password: 'Password123!',
      workspaceId: workspaceId,
      role: 'intern',
    });
    assert(internRes.status === 201, '6. Intern registration into workspace returns 201');
    assert(internRes.data.user.role === 'intern', '6. Intern assigned role "intern"');
    internToken = internRes.data.token;
    internUserId = internRes.data.user.id;
  }

  // TEST 7: Admin Workspace Access
  {
    const res = await testApi('GET', '/api/workspace', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert(res.status === 200, '7. Admin workspace access returns HTTP 200 OK');
    assert(res.data.workspace.id === workspaceId, '7. Admin retrieves own workspace');
    assert(res.data.workspace.roleInWorkspace === 'admin', '7. Workspace role verified as admin');
  }

  // TEST 8: Employee Workspace Access
  {
    const res = await testApi('GET', '/api/workspace', undefined, {
      Authorization: `Bearer ${employeeToken}`,
    });

    assert(res.status === 200, '8. Employee workspace access returns HTTP 200 OK');
    assert(res.data.workspace.id === workspaceId, '8. Employee retrieves associated workspace');
    assert(res.data.workspace.roleInWorkspace === 'employee', '8. Workspace role verified as employee');
  }

  // TEST 9: Intern Workspace Access
  {
    const res = await testApi('GET', '/api/workspace', undefined, {
      Authorization: `Bearer ${internToken}`,
    });

    assert(res.status === 200, '9. Intern workspace access returns HTTP 200 OK');
    assert(res.data.workspace.id === workspaceId, '9. Intern retrieves associated workspace');
    assert(res.data.workspace.roleInWorkspace === 'intern', '9. Workspace role verified as intern');
  }

  // TEST 10: Unauthenticated Workspace Access Attempt
  {
    const res = await testApi('GET', '/api/workspace');
    assert(res.status === 401, '10. Unauthenticated workspace access rejected with HTTP 401 Unauthorized');
  }

  // TEST 11: Employee Attempting Admin-Only Operation
  {
    // Employee attempting to register member as Admin
    const res = await testApi('POST', '/api/auth/register', {
      name: 'Hacker',
      email: 'hacker@sky.net',
      password: 'Password123!',
      workspaceId: workspaceId,
      role: 'admin', // FORBIDDEN SELF-PROMOTION
    });

    // Server must either reject invalid role (400) or never assign admin
    const prevented = res.status === 400 || (res.status === 201 && res.data.user.role !== 'admin');
    assert(
      prevented,
      '11. Client cannot self-promote to admin during member registration'
    );
  }

  // TEST 12: Intern Attempting Restricted Operation
  {
    // Check members list
    const res = await testApi('GET', '/api/workspace/members', undefined, {
      Authorization: `Bearer ${internToken}`,
    });
    assert(res.status === 200, '12. Intern can view workspace team directory');
  }

  // TEST 13: Cross-Workspace Access Attempt
  {
    // Create separate Org 2
    const otherOrg = await testApi('POST', '/api/auth/register', {
      name: 'Other Admin',
      email: 'other@other.com',
      password: 'Password123!',
      workspaceName: 'Secret External Org',
    });
    const otherWorkspaceId = otherOrg.data.workspace.id;

    // Employee from Cyberdyne Systems attempts to access Secret External Org
    const crossAccess = await testApi(
      'GET',
      `/api/workspace?workspaceId=${otherWorkspaceId}`,
      undefined,
      {
        Authorization: `Bearer ${employeeToken}`,
      }
    );

    assert(
      crossAccess.status === 403,
      '13. Cross-workspace unauthorized access rejected with HTTP 403 Forbidden'
    );
  }

  // TEST 14: Client-Supplied Role Manipulation (Tampering in request headers/body)
  {
    // Employee tries to send role: "admin" or x-role: "admin"
    const tamperedSession = await testApi('GET', '/api/auth/session', undefined, {
      Authorization: `Bearer ${employeeToken}`,
      'x-user-role': 'admin',
      'role': 'admin',
    });

    assert(
      tamperedSession.data.user.role === 'employee',
      '14. Client-supplied role header is strictly ignored; server-side identity enforced'
    );
  }

  // TEST 15: Client-Supplied User ID Manipulation (Impersonation attempt)
  {
    // Employee sends x-user-id pointing to Sarah Connor (Admin)
    const impersonatedSession = await testApi('GET', '/api/auth/session', undefined, {
      Authorization: `Bearer ${employeeToken}`,
      'x-user-id': adminUserId,
    });

    assert(
      impersonatedSession.data.user.id === employeeUserId,
      '15. Client-supplied userId header is strictly ignored; session token identity enforced'
    );
  }

  console.log('\n==================================================');
  console.log(` TEST RUN COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================\n');

  if (failCount > 0) {
    throw new Error(`${failCount} tests failed.`);
  }
}
