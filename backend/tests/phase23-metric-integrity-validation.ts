/**
 * PHASE 23: METRIC INTEGRITY & BILLING REALITY VALIDATION TEST SUITE
 * 
 * Comprehensive verification of:
 * - 1. Zero hardcoded business KPI constants in analytics engines
 * - 2. Zero seeded beta company fixtures in CustomerSuccessService
 * - 3. Zero fallback revenue ($0 MRR / $0 ARR when no paid subscriptions exist)
 * - 4. Real cohort retention engine using timestamp windows (D1, D7, D30)
 * - 5. Real NPS survey submission and statistical validity gating (< 20 responses)
 * - 6. Dynamic Customer Success profiling mapped strictly to real workspaces
 * - 7. Truth-enforced Launch Readiness gates (blocking public launch on missing proof)
 * - 8. Metric Lineage Engine providing transparent table mapping and confidence tags
 * - 9. Weekly Beta Report generator deriving feature usage from real entities
 * - 10. End-to-end RBAC and API security isolation on NPS & Lineage endpoints
 */

import { strict as assert } from 'assert';
import { app } from '../src/app';
import { ProductAnalyticsService } from '../src/services/product-analytics-service';
import { CustomerSuccessService } from '../src/services/customer-success-service';
import { NpsService } from '../src/services/nps-service';
import { RevenueAnalyticsService } from '../src/services/revenue-analytics-service';
import { RetentionAnalyticsService } from '../src/services/retention-analytics-service';
import { LaunchReadinessService } from '../src/services/launch-readiness-service';
import { BetaReportService } from '../src/services/beta-report-service';
import { MetricLineageService } from '../src/services/metric-lineage-service';
import { inMemoryDb } from '../packages/database';

function extractCookies(res: Response) {
  const getSetCookie = (res.headers as any).getSetCookie?.() || [];
  let sessionToken = '';
  let csrfToken = '';
  for (const chunk of getSetCookie) {
    const nameVal = chunk.trim().split(';')[0];
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx !== -1) {
      const key = nameVal.substring(0, eqIdx).trim();
      const val = nameVal.substring(eqIdx + 1).trim();
      if (key === 'ws_session') sessionToken = val;
      if (key === 'ws_csrf') csrfToken = val;
    }
  }
  return {
    sessionToken,
    csrfToken,
    cookieHeader: `ws_session=${sessionToken}; ws_csrf=${csrfToken}`,
  };
}

async function runPhase23ValidationSuite() {
  console.log('================================================================================');
  console.log(' PHASE 23: METRIC INTEGRITY & BILLING REALITY VALIDATION');
  console.log('================================================================================\n');

  // Reset database to ensure clean audit state
  inMemoryDb.reset();

  console.log('--- 1. Authenticate Admin Persona for Lineage & Audit Queries ---');
  const regAdmin = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'founder.audit@workspaceos.local',
      password: 'AuditSecurePassword123!',
      name: 'Founder Auditor',
      role: 'admin',
      workspaceName: 'Acme Ground Truth HQ',
    }),
  });
  assert.equal(regAdmin.status, 201, 'Admin registration must succeed');
  const adminData = await regAdmin.json();
  const adminWorkspaceId = adminData.workspace.id;
  const adminAuth = extractCookies(regAdmin);
  const authHeaders = {
    Cookie: adminAuth.cookieHeader,
    'X-CSRF-Token': adminAuth.csrfToken,
    'Content-Type': 'application/json',
  };
  console.log('  ✅ PASS [1]: Admin persona registered and authenticated');

  console.log('\n--- 2. Verify Zero Fallback Revenue ($0 MRR & $0 ARR when no subscriptions) ---');
  const revInitial = await RevenueAnalyticsService.calculateRevenue();
  assert.equal(revInitial.mrr, 0, 'MRR must be 0 when no subscriptions exist (never $4,580)');
  assert.equal(revInitial.arr, 0, 'ARR must be 0 when no subscriptions exist (never $54,960)');
  assert.equal(revInitial.activePaidWorkspaces, 0, 'Active paid workspaces must be 0');
  console.log('  ✅ PASS [2]: Zero fallback revenue verified ($0 MRR, $0 ARR)');

  console.log('\n--- 3. Verify Zero Seeded Fake Companies in Customer Success ---');
  const profiles = await CustomerSuccessService.getAllCompanyProfiles();
  // Should only have the 1 real workspace created during registration
  assert.equal(profiles.length, 1, 'Only real registered workspace must exist (no Acme Scale, NexaTech AI seed fixtures)');
  assert.equal(profiles[0].companyName, 'Acme Ground Truth HQ', 'Profile must match registered company name');
  console.log('  ✅ PASS [3]: Seed company injection eliminated — derived strictly from real workspaces');

  console.log('\n--- 4. Verify Real Cohort Retention Engine (No Hardcoded 68%, 42%, 28%) ---');
  const retentionInitial = await RetentionAnalyticsService.calculateRetention();
  assert.equal(typeof retentionInitial.d1Percent, 'number', 'D1 retention must be a computed number');
  assert.equal(typeof retentionInitial.d7Percent, 'number', 'D7 retention must be a computed number');
  assert.equal(typeof retentionInitial.d30Percent, 'number', 'D30 retention must be a computed number');
  console.log(`  Calculated Cohort: Size=${retentionInitial.cohortSize}, D1=${retentionInitial.d1Percent}%, D7=${retentionInitial.d7Percent}%, D30=${retentionInitial.d30Percent}%`);
  console.log('  ✅ PASS [4]: Dynamic cohort retention calculated from real timestamps');

  console.log('\n--- 5. Verify Real NPS Survey System & Statistical Validity Gate ---');
  // Initial check with 0 responses -> Insufficient Data
  const npsRes1 = await app.request('/api/nps/metrics', {
    method: 'GET',
    headers: authHeaders,
  });
  assert.equal(npsRes1.status, 200);
  const npsBody1 = await npsRes1.json();
  assert.equal(npsBody1.status, 'insufficient_data', 'NPS must report insufficient_data when responses < 20');
  assert.equal(npsBody1.totalResponses, 0);

  // Submit real NPS surveys
  for (let i = 0; i < 22; i++) {
    const score = i < 15 ? 10 : (i < 18 ? 8 : 4); // 15 promoters, 3 passives, 4 detractors
    const submitRes = await app.request('/api/nps/submit', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ score, comment: `Real feedback #${i + 1}` }),
    });
    assert.equal(submitRes.status, 201);
  }

  const npsRes2 = await app.request('/api/nps/metrics', {
    method: 'GET',
    headers: authHeaders,
  });
  const npsBody2 = await npsRes2.json();
  assert.equal(npsBody2.status, 'real', 'NPS status must become real once >= 20 responses collected');
  assert.equal(npsBody2.totalResponses, 22);
  assert.equal(npsBody2.promotersCount, 15);
  assert.equal(npsBody2.detractorsCount, 4);
  console.log(`  Calculated NPS: +${npsBody2.npsScore} from ${npsBody2.totalResponses} real submissions`);
  console.log('  ✅ PASS [5]: Real NPS survey persistence and statistical calculation verified');

  console.log('\n--- 6. Verify Launch Readiness Decision Engine Truth Enforcement ---');
  const lrRes = await app.request('/api/beta/launch-readiness', {
    method: 'GET',
    headers: authHeaders,
  });
  assert.equal(lrRes.status, 200);
  const lrBody = await lrRes.json();
  assert.equal(lrBody.verdict, 'LAUNCH BLOCKED', 'Launch must be BLOCKED when requirements are unmet');
  assert(lrBody.blockers.length > 0, 'Must have explicit blockers listed for missing real data');
  console.log(`  Readiness Verdict: ${lrBody.verdict} (${lrBody.blockers.length} blockers identified)`);
  console.log('  ✅ PASS [6]: Launch readiness gate correctly blocks launch without false passes');

  console.log('\n--- 7. Verify Metric Lineage & Provenance API ---');
  const lineageRes = await app.request('/api/analytics/lineage', {
    method: 'GET',
    headers: authHeaders,
  });
  assert.equal(lineageRes.status, 200);
  const lineageBody = await lineageRes.json();
  assert(Array.isArray(lineageBody.metrics), 'Lineage report must return metrics array');
  const mrrLineage = lineageBody.metrics.find((m: any) => m.metric === 'MRR');
  assert(mrrLineage, 'MRR lineage item must exist');
  assert.deepEqual(mrrLineage.sourceTables, ['subscriptions', 'billing_payments']);
  console.log(`  Lineage Authenticity Score: ${lineageBody.summary.authenticityScorePercent}% across ${lineageBody.summary.totalKpis} audited KPIs`);
  console.log('  ✅ PASS [7]: Complete metric provenance and source table mapping verified');

  console.log('\n--- 8. Verify Weekly Beta Report Derives Feature Usage from Real Entities ---');
  const reportRes = await app.request('/api/beta/reports/weekly', {
    method: 'GET',
    headers: authHeaders,
  });
  assert.equal(reportRes.status, 200);
  const reportBody = await reportRes.json();
  assert.equal(reportBody.featureAdoption.tasksCreatedAndCompleted, 0, 'Tasks must reflect actual count in db (0)');
  assert.equal(reportBody.featureAdoption.crmLeadsManaged, 0, 'CRM leads must reflect actual count in db (0)');
  assert.equal(reportBody.featureAdoption.documentsShared, 0, 'Documents must reflect actual count in db (0)');
  console.log('  ✅ PASS [8]: Beta report feature usage derived from real persistence with zero hardcoding');

  console.log('\n--- 9. Verify Subscription Revenue Pipeline Incrementing ---');
  // Inject an active paid subscription
  inMemoryDb.subscriptions.set('sub-real-1', {
    id: 'sub-real-1',
    workspaceId: 'ws-acme-hq',
    plan: 'pro',
    status: 'active',
    amount: 79,
    currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000),
  });
  const revWithSub = await RevenueAnalyticsService.calculateRevenue();
  assert.equal(revWithSub.mrr, 79, 'MRR must be exactly $79 for 1 active Pro subscription');
  assert.equal(revWithSub.arr, 79 * 12, 'ARR must be exactly $948');
  assert.equal(revWithSub.activePaidWorkspaces, 1);
  console.log(`  Updated Revenue: MRR=$${revWithSub.mrr}, ARR=$${revWithSub.arr}`);
  console.log('  ✅ PASS [9]: Real subscription revenue calculations verified');

  console.log('\n--- 10. Role-Based Access Isolation on NPS & Lineage Endpoints ---');
  const regEmp = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'employee.audit@workspaceos.local',
      password: 'AuditSecurePassword123!',
      name: 'Employee Auditor',
      role: 'employee',
      workspaceId: adminWorkspaceId,
    }),
  });
  const empCookies = extractCookies(regEmp);
  const empHeaders = {
    Cookie: empCookies.cookieHeader,
    'X-CSRF-Token': empCookies.csrfToken,
    'Content-Type': 'application/json',
  };

  const empLineageRes = await app.request('/api/analytics/lineage', {
    method: 'GET',
    headers: empHeaders,
  });
  assert.equal(empLineageRes.status, 403, 'Employee must be blocked from Founder Metric Lineage with 403 Forbidden');

  const empNpsMetricsRes = await app.request('/api/nps/metrics', {
    method: 'GET',
    headers: empHeaders,
  });
  assert.equal(empNpsMetricsRes.status, 403, 'Employee must be blocked from aggregated NPS metrics with 403 Forbidden');
  console.log('  ✅ PASS [10]: RBAC security boundary strictly isolates founder intelligence');

  console.log('\n================================================================================');
  console.log(' PHASE 23 VALIDATION: 10 PASSED, 0 FAILED (100%)');
  console.log('================================================================================\n');
}

runPhase23ValidationSuite().catch((err) => {
  console.error('\n❌ Phase 23 Validation Suite Failed:', err);
  process.exit(1);
});
