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

export async function runTimeTrackingDeleteTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING TIME TRACKING DELETION & UTILIZATION RECALC TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // 1. Setup Admin in Workspace A
  const regAdminReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Admin',
      email: 'sarah@agency.com',
      password: 'Password123!',
      workspaceName: 'Agency Workspace'
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
      email: 'dave@agency.com',
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
      name: 'Dave Dev',
      password: 'Password123!'
    })
  });
  await app.fetch(acceptEmpReq);

  const loginEmpReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dave@agency.com', password: 'Password123!' })
  });
  const loginEmpRes = await app.fetch(loginEmpReq);
  const empLoginData = attachSessionToken(loginEmpRes, await loginEmpRes.json());
  const empToken = empLoginData.token;
  const empHeaders = {
    'Authorization': `Bearer ${empToken}`,
    'Content-Type': 'application/json'
  };

  // 3. Setup Foreign Workspace B
  const regBetaReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Other Admin',
      email: 'other@corp.com',
      password: 'Password123!',
      workspaceName: 'Other Workspace'
    })
  });
  const regBetaRes = await app.fetch(regBetaReq);
  const betaData = attachSessionToken(regBetaRes, await regBetaRes.json());
  const betaHeaders = {
    'Authorization': `Bearer ${betaData.token}`,
    'Content-Type': 'application/json'
  };

  // Step 1: Create a manual time entry (Admin)
  console.log('--- Step 1: Create Manual & Stopwatch Entries ---');
  const manualEntryReq = new Request('http://localhost:3000/api/time/manual', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      durationMinutes: 120, // 2 hours
      billable: true,
      hourlyRate: 2000,
      notes: 'Strategic Planning'
    })
  });
  const manualEntryRes = await app.fetch(manualEntryReq);
  assert(manualEntryRes.status === 201, 'Manual time entry created (201 Created)');
  const adminManualEntry = (await manualEntryRes.json()).entry;

  // Step 2: Create a stopwatch entry (Employee)
  const startTimerReq = new Request('http://localhost:3000/api/time/start', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      billable: true,
      hourlyRate: 1500,
      notes: 'Frontend Engineering'
    })
  });
  const startTimerRes = await app.fetch(startTimerReq);
  assert(startTimerRes.status === 201, 'Stopwatch entry started (201 Created)');

  const stopTimerReq = new Request('http://localhost:3000/api/time/stop', {
    method: 'POST',
    headers: empHeaders
  });
  const stopTimerRes = await app.fetch(stopTimerReq);
  assert(stopTimerRes.status === 200, 'Stopwatch entry stopped (200 OK)');
  const empStopwatchEntry = (await stopTimerRes.json()).entry;

  // Step 3: Verify initial utilization analytics
  console.log('\n--- Step 2: Check Initial Analytics & Utilization ---');
  const initialAnalyticsReq = new Request('http://localhost:3000/api/time/analytics', {
    method: 'GET',
    headers: adminHeaders
  });
  const initialAnalyticsRes = await app.fetch(initialAnalyticsReq);
  assert(initialAnalyticsRes.status === 200, 'Admin can view utilization analytics (200 OK)');
  const initialAnalytics = (await initialAnalyticsRes.json()).analytics;
  assert(initialAnalytics.entriesCount === 2, 'Initial entries count is 2');
  assert(initialAnalytics.billableHours >= 2, 'Billable hours includes manual and stopwatch time');

  // Step 4: Employee attempts to delete Admin's entry -> 403 Forbidden
  console.log('\n--- Step 3: Unauthorized Delete Check (403) ---');
  const unauthDeleteReq = new Request(`http://localhost:3000/api/time/entries/${adminManualEntry.id}`, {
    method: 'DELETE',
    headers: empHeaders
  });
  const unauthDeleteRes = await app.fetch(unauthDeleteReq);
  assert(unauthDeleteRes.status === 403, 'Employee cannot delete Admin time entry (403 Forbidden)');

  // Step 5: Foreign workspace attempts to delete entry -> 403 Forbidden
  console.log('\n--- Step 4: Cross-Workspace Delete Check (403) ---');
  const crossDeleteReq = new Request(`http://localhost:3000/api/time/entries/${adminManualEntry.id}`, {
    method: 'DELETE',
    headers: betaHeaders
  });
  const crossDeleteRes = await app.fetch(crossDeleteReq);
  assert(crossDeleteRes.status === 403, 'Foreign workspace tenant cannot delete entry (403 Forbidden)');

  // Step 6: Delete missing entry -> 404 Not Found
  console.log('\n--- Step 5: Missing Entry Delete Check (404) ---');
  const missingDeleteReq = new Request('http://localhost:3000/api/time/entries/non-existent-id-999', {
    method: 'DELETE',
    headers: adminHeaders
  });
  const missingDeleteRes = await app.fetch(missingDeleteReq);
  assert(missingDeleteRes.status === 404, 'Missing time entry returns 404 Not Found');

  // Step 7: Employee successfully deletes own stopwatch entry -> 200 OK
  console.log('\n--- Step 6: Authorized Employee Delete Own Entry (200) ---');
  const empDeleteOwnReq = new Request(`http://localhost:3000/api/time/entries/${empStopwatchEntry.id}`, {
    method: 'DELETE',
    headers: empHeaders
  });
  const empDeleteOwnRes = await app.fetch(empDeleteOwnReq);
  assert(empDeleteOwnRes.status === 200, 'Employee deletes own time entry successfully (200 OK)');

  // Step 8: Admin successfully deletes manual entry -> 200 OK
  console.log('\n--- Step 7: Admin Delete Entry (200) ---');
  const adminDeleteReq = new Request(`http://localhost:3000/api/time/entries/${adminManualEntry.id}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  const adminDeleteRes = await app.fetch(adminDeleteReq);
  assert(adminDeleteRes.status === 200, 'Admin deletes time entry successfully (200 OK)');

  // Step 9: Verify analytics recalculation after deletion
  console.log('\n--- Step 8: Verify Real-Time Analytics Recalculation ---');
  const postDeleteAnalyticsReq = new Request('http://localhost:3000/api/time/analytics', {
    method: 'GET',
    headers: adminHeaders
  });
  const postDeleteAnalyticsRes = await app.fetch(postDeleteAnalyticsReq);
  const postDeleteAnalytics = (await postDeleteAnalyticsRes.json()).analytics;
  assert(postDeleteAnalytics.entriesCount === 0, 'Entries count reduced to 0 after full deletion');
  assert(postDeleteAnalytics.totalHours === 0, 'Total hours recalculated to 0.0');
  assert(postDeleteAnalytics.totalRevenue === 0, 'Total revenue recalculated to 0');
  assert(postDeleteAnalytics.utilizationPercent === 0, 'Utilization percent updated to 0%');

  console.log('\n===============================================================');
  console.log(' TIME TRACKING DELETION & UTILIZATION TESTS: ALL 10 CHECKS PASSED');
  console.log('===============================================================\n');
}

if (process.argv[1]?.endsWith('time-tracking-delete.test.ts')) {
  runTimeTrackingDeleteTests().catch((err) => {
    console.error('Time tracking delete test run failed:', err);
    process.exit(1);
  });
}
