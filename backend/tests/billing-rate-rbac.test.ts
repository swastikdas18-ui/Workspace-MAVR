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

export async function runBillingRateRbacTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING BILLING RATE RBAC & SERVER-SIDE ENFORCEMENT TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // 1. Setup Admin in Workspace A
  const regAdminReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Emma Executive',
      email: 'emma@fintech.io',
      password: 'Password123!',
      workspaceName: 'Fintech Workspace'
    })
  });
  const regAdminRes = await app.fetch(regAdminReq);
  const adminData = attachSessionToken(regAdminRes, await regAdminRes.json());
  const adminToken = adminData.token;
  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // 2. Setup Employee in Workspace A
  const inviteEmpReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email: 'eric@fintech.io',
      role: 'employee'
    })
  });
  const inviteEmpRes = await app.fetch(inviteEmpReq);
  const inviteEmpData = await inviteEmpRes.json();

  const acceptEmpReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteEmpData.invite?.token,
      name: 'Eric Engineer',
      password: 'Password123!'
    })
  });
  const acceptEmpRes = await app.fetch(acceptEmpReq);
  const employeeUserId = (await acceptEmpRes.json()).user.id;

  const loginEmpReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'eric@fintech.io', password: 'Password123!' })
  });
  const loginEmpRes = await app.fetch(loginEmpReq);
  const empLoginData = attachSessionToken(loginEmpRes, await loginEmpRes.json());
  const empToken = empLoginData.token;
  const empHeaders = {
    'Authorization': `Bearer ${empToken}`,
    'Content-Type': 'application/json'
  };

  console.log('--- Step 1: Admin Configures Employee Billing Profile ---');
  const updateProfileReq = new Request(`http://localhost:3000/api/time/profiles/${employeeUserId}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      costRate: 1500,
      billableRate: 4000,
      utilizationTarget: 80
    })
  });
  const updateProfileRes = await app.fetch(updateProfileReq);
  assert(updateProfileRes.status === 200, 'Admin successfully updates billing profile (200 OK)');
  const updatedProfile = (await updateProfileRes.json()).profile;
  assert(updatedProfile.billableRate === 4000, 'Profile billable rate set to ₹4,000/hr');
  assert(updatedProfile.costRate === 1500, 'Profile cost rate set to ₹1,500/hr');
  assert(updatedProfile.utilizationTarget === 80, 'Utilization target set to 80%');

  console.log('\n--- Step 2: Employee Denied Access to Billing Profiles API (403) ---');
  const empGetProfilesReq = new Request('http://localhost:3000/api/time/profiles', {
    method: 'GET',
    headers: empHeaders
  });
  const empGetProfilesRes = await app.fetch(empGetProfilesReq);
  assert(empGetProfilesRes.status === 403, 'Employee cannot list billing profiles (403 Forbidden)');

  const empUpdateProfileReq = new Request(`http://localhost:3000/api/time/profiles/${employeeUserId}`, {
    method: 'PATCH',
    headers: empHeaders,
    body: JSON.stringify({ billableRate: 9999 })
  });
  const empUpdateProfileRes = await app.fetch(empUpdateProfileReq);
  assert(empUpdateProfileRes.status === 403, 'Employee cannot modify billing rates (403 Forbidden)');

  console.log('\n--- Step 3: Server-Side Rate Enforcement (Client Rate Manipulation Prevention) ---');
  // Employee tries to supply custom hourlyRate: 999 from client
  const empStartTimerReq = new Request('http://localhost:3000/api/time/start', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      hourlyRate: 999, // Manipulated client value (must be ignored)
      notes: 'Developing Core API'
    })
  });
  const empStartTimerRes = await app.fetch(empStartTimerReq);
  assert(empStartTimerRes.status === 201, 'Employee starts timer (201 Created)');
  const empTimer = (await empStartTimerRes.json()).entry;
  assert(empTimer.hourlyRate === 4000, 'Server-side rate of ₹4,000/hr enforced over client value');

  // Employee logs manual entry with manipulated hourlyRate: 100
  const empManualReq = new Request('http://localhost:3000/api/time/manual', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      durationMinutes: 60,
      hourlyRate: 100, // Manipulated client value (must be ignored)
      notes: 'Sprint Planning'
    })
  });
  const empManualRes = await app.fetch(empManualReq);
  assert(empManualRes.status === 201, 'Employee logs manual time (201 Created)');
  const empManualEntry = (await empManualRes.json()).entry;
  assert(empManualEntry.hourlyRate === 4000, 'Server-side rate of ₹4,000/hr enforced for manual entries');

  console.log('\n--- Step 4: Admin Views Team Profiles List ---');
  const adminProfilesReq = new Request('http://localhost:3000/api/time/profiles', {
    method: 'GET',
    headers: adminHeaders
  });
  const adminProfilesRes = await app.fetch(adminProfilesReq);
  assert(adminProfilesRes.status === 200, 'Admin lists workspace billing profiles (200 OK)');
  const adminProfiles = (await adminProfilesRes.json()).profiles;
  assert(adminProfiles.length >= 1, 'Profile returned in workspace profiles list');

  console.log('\n===============================================================');
  console.log(' BILLING RATE RBAC TESTS: ALL 7 CHECKS PASSED');
  console.log('===============================================================\n');
}

if (process.argv[1]?.endsWith('billing-rate-rbac.test.ts')) {
  runBillingRateRbacTests().catch((err) => {
    console.error('Billing rate RBAC test run failed:', err);
    process.exit(1);
  });
}
