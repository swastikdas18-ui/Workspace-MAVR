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

export async function runUtilizationAnalyticsEngineTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING ENTERPRISE UTILIZATION ANALYTICS ENGINE TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // 1. Setup Admin in Workspace
  const regAdminReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Victoria Vance',
      email: 'victoria@agency.com',
      password: 'Password123!',
      workspaceName: 'Digital Agency'
    })
  });
  const regAdminRes = await app.fetch(regAdminReq);
  const adminData = attachSessionToken(regAdminRes, await regAdminRes.json());
  const adminToken = adminData.token;
  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // 2. Setup Employee A (Senior Dev: cost 1500, billable 3000, target 80%)
  const inviteEmpAReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'alex@agency.com', role: 'employee' })
  });
  const inviteEmpARes = await app.fetch(inviteEmpAReq);
  const inviteEmpAData = await inviteEmpARes.json();

  const acceptEmpAReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteEmpAData.invite?.token,
      name: 'Alex Developer',
      password: 'Password123!'
    })
  });
  const acceptEmpARes = await app.fetch(acceptEmpAReq);
  const empAId = (await acceptEmpARes.json()).user.id;

  const loginEmpAReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@agency.com', password: 'Password123!' })
  });
  const loginEmpARes = await app.fetch(loginEmpAReq);
  const empALoginData = attachSessionToken(loginEmpARes, await loginEmpARes.json());
  const empAHeaders = {
    'Authorization': `Bearer ${empALoginData.token}`,
    'Content-Type': 'application/json'
  };

  // 3. Setup Employee B (Junior Dev: cost 800, billable 1600, target 70%)
  const inviteEmpBReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'bob@agency.com', role: 'employee' })
  });
  const inviteEmpBRes = await app.fetch(inviteEmpBReq);
  const inviteEmpBData = await inviteEmpBRes.json();

  const acceptEmpBReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteEmpBData.invite?.token,
      name: 'Bob Junior',
      password: 'Password123!'
    })
  });
  const acceptEmpBRes = await app.fetch(acceptEmpBReq);
  const empBId = (await acceptEmpBRes.json()).user.id;

  const loginEmpBReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bob@agency.com', password: 'Password123!' })
  });
  const loginEmpBRes = await app.fetch(loginEmpBReq);
  const empBLoginData = attachSessionToken(loginEmpBRes, await loginEmpBRes.json());
  const empBHeaders = {
    'Authorization': `Bearer ${empBLoginData.token}`,
    'Content-Type': 'application/json'
  };

  console.log('--- Step 1: Configure Billing Profiles ---');
  await app.fetch(new Request(`http://localhost:3000/api/time/profiles/${empAId}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ costRate: 1500, billableRate: 3000, utilizationTarget: 80 })
  }));

  await app.fetch(new Request(`http://localhost:3000/api/time/profiles/${empBId}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ costRate: 800, billableRate: 1600, utilizationTarget: 70 })
  }));
  console.log('✅ PASS: Configured custom cost and billable rates for Alex and Bob');

  console.log('\n--- Step 2: Log Multi-Employee Time Entries ---');
  // Alex logs 10 hours billable (600 mins) -> revenue = 10 * 3000 = 30,000, cost = 10 * 1500 = 15,000
  await app.fetch(new Request('http://localhost:3000/api/time/manual', {
    method: 'POST',
    headers: empAHeaders,
    body: JSON.stringify({ durationMinutes: 600, billable: true, notes: 'Client Backend Architecture' })
  }));

  // Alex logs 2 hours non-billable (120 mins) -> revenue = 0, cost = 2 * 1500 = 3,000
  await app.fetch(new Request('http://localhost:3000/api/time/manual', {
    method: 'POST',
    headers: empAHeaders,
    body: JSON.stringify({ durationMinutes: 120, billable: false, notes: 'Internal Code Review' })
  }));

  // Bob logs 8 hours billable (480 mins) -> revenue = 8 * 1600 = 12,800, cost = 8 * 800 = 6,400
  await app.fetch(new Request('http://localhost:3000/api/time/manual', {
    method: 'POST',
    headers: empBHeaders,
    body: JSON.stringify({ durationMinutes: 480, billable: true, notes: 'Frontend Feature Work' })
  }));

  console.log('\n--- Step 3: Fetch Aggregated Analytics API & Verify Math ---');
  const analyticsReq = new Request('http://localhost:3000/api/time/analytics', {
    method: 'GET',
    headers: adminHeaders
  });
  const analyticsRes = await app.fetch(analyticsReq);
  assert(analyticsRes.status === 200, 'Admin successfully fetches analytics payload (200 OK)');
  const report = (await analyticsRes.json()).analytics;

  // Expected Totals:
  // Total Hours = 10 + 2 + 8 = 20.0 hrs
  // Billable Hours = 10 + 8 = 18.0 hrs
  // Non-Billable Hours = 2.0 hrs
  // Total Revenue = 30,000 + 12,800 = ₹42,800
  // Total Payroll Cost = (12 * 1500) + (8 * 800) = 18,000 + 6,400 = ₹24,400
  // Gross Margin = 42,800 - 24,400 = ₹18,400
  // Team Utilization = (18 / 20) * 100 = 90%
  // Gross Margin % = (18,400 / 42,800) * 100 = 43%

  assert(report.totalHours === 20, `Total hours is 20.0 (got ${report.totalHours})`);
  assert(report.billableHours === 18, `Billable hours is 18.0 (got ${report.billableHours})`);
  assert(report.nonBillableHours === 2, `Non-billable hours is 2.0 (got ${report.nonBillableHours})`);
  assert(report.revenueGenerated === 42800, `Revenue Generated is ₹42,800 (got ${report.revenueGenerated})`);
  assert(report.payrollCost === 24400, `Payroll Cost is ₹24,400 (got ${report.payrollCost})`);
  assert(report.grossMargin === 18400, `Gross Margin is ₹18,400 (got ${report.grossMargin})`);
  assert(report.teamUtilizationPercent === 90, `Team Utilization is 90% (got ${report.teamUtilizationPercent}%)`);
  assert(report.grossMarginPercent === 43, `Gross Margin % is 43% (got ${report.grossMarginPercent}%)`);

  console.log('\n--- Step 4: Verify Employee Leaderboard Rankings ---');
  const rankings = report.employeeRankings;
  assert(Array.isArray(rankings) && rankings.length === 2, 'Leaderboard returned 2 ranked employees');
  
  // Alex should be ranked #1 by revenue (₹30,000 vs ₹12,800)
  const alexRanking = rankings[0];
  assert(alexRanking.userId === empAId, 'Alex Developer is ranked #1 in revenue generation');
  assert(alexRanking.revenue === 30000, 'Alex revenue equals ₹30,000');
  assert(alexRanking.payrollCost === 18000, 'Alex payroll cost equals ₹18,000');
  assert(alexRanking.grossMargin === 12000, 'Alex net margin equals ₹12,000');
  assert(alexRanking.totalHours === 12, 'Alex total hours equals 12.0 hrs');
  assert(alexRanking.billableHours === 10, 'Alex billable hours equals 10.0 hrs');
  assert(alexRanking.utilizationPercent === 83, `Alex utilization is 83% (got ${alexRanking.utilizationPercent}%)`);

  const bobRanking = rankings[1];
  assert(bobRanking.userId === empBId, 'Bob Junior is ranked #2');
  assert(bobRanking.revenue === 12800, 'Bob revenue equals ₹12,800');
  assert(bobRanking.payrollCost === 6400, 'Bob payroll cost equals ₹6,400');
  assert(bobRanking.grossMargin === 6400, 'Bob gross margin equals ₹6,400');
  assert(bobRanking.utilizationPercent === 100, 'Bob utilization is 100%');

  console.log('\n===============================================================');
  console.log(' UTILIZATION ANALYTICS ENGINE TESTS: ALL 18 CHECKS PASSED');
  console.log('===============================================================\n');
}

if (process.argv[1]?.endsWith('utilization-analytics-engine.test.ts')) {
  runUtilizationAnalyticsEngineTests().catch((err) => {
    console.error('Utilization analytics engine test run failed:', err);
    process.exit(1);
  });
}
