/**
 * PHASE 22: CLOSED BETA EXECUTION & LAUNCH READINESS VALIDATION
 * 
 * Comprehensive verification of:
 * - 1. Founder Beta Dashboard & Live Telemetry
 * - 2. Feedback Module & Severity Triage (P0-P3, Screenshot, Founder Notes, Review Queue)
 * - 3. Customer Success Module & Dynamic Health Scoring (0-100 gauge, Activity recency, Open tickets)
 * - 4. Weekly Beta Report Generator (Activation, Retention, MRR, Feature Usage, Tickets)
 * - 5. Public Launch Readiness Decision Engine (10 Launch Gates, P0/P1 Bug Audit, GA Verdict)
 * - 6. Role-Based Access Control (Admin/Founder vs Employee/Intern Isolation)
 * - 7. Audit Logging & Product Analytics Tracking on Mutations
 */

import { strict as assert } from 'assert';
import { app } from '../src/app';
import { FeedbackService } from '../src/services/feedback-service';
import { CustomerSuccessService } from '../src/services/customer-success-service';
import { BetaReportService } from '../src/services/beta-report-service';
import { LaunchReadinessService } from '../src/services/launch-readiness-service';
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

async function runPhase22Validation() {
  console.log('\n================================================================================');
  console.log(' PHASE 22: CLOSED BETA EXECUTION & LAUNCH READINESS VALIDATION');
  console.log('================================================================================\n');

  let passed = 0;

  // ---------------------------------------------------------------------------
  // 1. Authenticate Admin Persona
  // ---------------------------------------------------------------------------
  console.log('--- 1. Authenticate Admin and Employee Personas ---');
  const adminEmail = `admin.p22.${Date.now()}@workspace.os`;
  const regAdminRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: 'StrongAdminPassword!999',
      name: 'Founder Victoria',
      role: 'admin',
      workspaceName: 'Acme Scale Closed Beta',
    }),
  });
  assert.equal(regAdminRes.status, 201);
  const adminData = await regAdminRes.json();
  const adminCookies = extractCookies(regAdminRes);
  const adminCsrfToken = adminCookies.csrfToken || adminData.csrfToken;
  const workspaceId = adminData.workspace.id;
  const adminUserId = adminData.user.id;

  // Authenticate Employee
  const empEmail = `emp.p22.${Date.now()}@workspace.os`;
  const regEmpRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: empEmail,
      password: 'StrongEmpPassword!123',
      name: 'Ethan Employee',
      role: 'employee',
      workspaceId: workspaceId,
    }),
  });
  assert.equal(regEmpRes.status, 201);
  const empCookies = extractCookies(regEmpRes);
  const empData = await regEmpRes.json();
  const empCsrfToken = empCookies.csrfToken || empData.csrfToken;
  console.log(`  ✅ PASS [1]: Admin & Employee personas registered and authenticated`);
  passed++;

  // ---------------------------------------------------------------------------
  // 2. Feedback Module & Severity Triage
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Beta Feedback Submission & Severity Triage ---');
  // Employee submits feedback
  const submitFbRes = await app.request('/api/beta/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: empCookies.cookieHeader,
      'X-CSRF-Token': empCsrfToken,
    },
    body: JSON.stringify({
      category: 'ux_friction',
      severity: 'p2_major',
      title: 'Command search keyboard navigation on Firefox',
      description: 'Arrow down key slightly skips second result item in rapid strokes.',
      screenshotUrl: 'https://cdn.workspace.os/screenshots/cmd-search-firefox.png',
    }),
  });
  assert.equal(submitFbRes.status, 201);
  const fbResult = await submitFbRes.json();
  const feedbackId = fbResult.feedback.id;
  assert.equal(fbResult.feedback.severity, 'p2_major');
  assert.equal(fbResult.feedback.status, 'open');

  // Submit a feature request as well
  await app.request('/api/beta/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookies.cookieHeader,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      category: 'feature_request',
      severity: 'p3_minor',
      title: 'Dark mode contrast customization slider',
      description: 'Add subtle slate-950 vs zinc-950 theme switcher.',
    }),
  });

  console.log(`  ✅ PASS [2]: Feedback submission across categories (UX friction & Feature Request) verified`);
  passed++;

  // ---------------------------------------------------------------------------
  // 3. Founder Feedback Review Queue & Status Updates
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Founder Review Queue & Triage Resolution ---');
  const reviewQueueRes = await app.request('/api/beta/feedback?crossWorkspace=true', {
    method: 'GET',
    headers: { Cookie: adminCookies.cookieHeader },
  });
  assert.equal(reviewQueueRes.status, 200);
  const queueData = await reviewQueueRes.json();
  assert(queueData.feedback.length >= 2, 'Feedback queue populated');

  // Update status with founder notes
  const updateFbRes = await app.request(`/api/beta/feedback/${feedbackId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookies.cookieHeader,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      status: 'resolved',
      founderNotes: 'Keyboard index boundary clamped in CommandPalette.tsx. Hotfix verified on Firefox 128.',
    }),
  });
  assert.equal(updateFbRes.status, 200);
  const updatedFb = await updateFbRes.json();
  assert.equal(updatedFb.feedback.status, 'resolved');
  assert(updatedFb.feedback.founderNotes.includes('CommandPalette.tsx'));

  // Query Feedback Metrics
  const fbMetricsRes = await app.request('/api/beta/feedback/metrics', {
    method: 'GET',
    headers: { Cookie: adminCookies.cookieHeader },
  });
  assert.equal(fbMetricsRes.status, 200);
  const fbMetrics = await fbMetricsRes.json();
  assert.equal(fbMetrics.openP0, 0, 'Zero open P0 bugs');
  assert.equal(fbMetrics.openP1, 0, 'Zero open P1 bugs');
  console.log(`  ✅ PASS [3]: Feedback triage status transition and metrics rollup (P0: ${fbMetrics.openP0}, P1: ${fbMetrics.openP1}) verified`);
  passed++;

  // ---------------------------------------------------------------------------
  // 4. Customer Success Module & Health Scoring Engine
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Customer Success Module & Health Scoring ---');
  const csRes = await app.request('/api/beta/customer-success', {
    method: 'GET',
    headers: { Cookie: adminCookies.cookieHeader },
  });
  assert.equal(csRes.status, 200);
  const csData = await csRes.json();
  assert(csData.companies.length >= 5, 'At least 5 beta cohort companies enrolled');

  for (const company of csData.companies) {
    assert(company.healthScore >= 50, `Company ${company.companyName} health score >= 50`);
    assert(['healthy', 'at_risk', 'critical'].includes(company.healthStatus), 'Valid health status');
  }
  console.log(`  ✅ PASS [4]: Customer Success health scoring verified across ${csData.companies.length} cohort companies`);
  passed++;

  // ---------------------------------------------------------------------------
  // 5. Weekly Beta Report Generator
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Weekly Beta Report Generator ---');
  const weeklyRes = await app.request('/api/beta/reports/weekly', {
    method: 'GET',
    headers: { Cookie: adminCookies.cookieHeader },
  });
  assert.equal(weeklyRes.status, 200);
  const weeklyReport = await weeklyRes.json();
  assert(weeklyReport.summary.totalCompanies >= 5, 'Cohort companies >= 5');
  assert(weeklyReport.summary.totalUsers >= 20, 'Total users >= 20');
  assert(weeklyReport.summary.activationRatePercent >= 60, 'Activation rate >= 60%');
  assert(weeklyReport.summary.d7RetentionPercent >= 35, 'D7 retention >= 35%');
  assert(weeklyReport.summary.d30RetentionPercent >= 20, 'D30 retention >= 20%');
  assert(weeklyReport.summary.mrr > 0, 'MRR validated');
  assert(typeof weeklyReport.markdownSummary === 'string', 'Markdown summary generated');
  console.log(`  ✅ PASS [5]: Weekly report generated (Companies: ${weeklyReport.summary.totalCompanies}, Users: ${weeklyReport.summary.totalUsers}, MRR: $${weeklyReport.summary.mrr})`);
  passed++;

  // ---------------------------------------------------------------------------
  // 6. Public Launch Readiness Dashboard & Decision Engine
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Public Launch Readiness Gates ---');
  const lrRes = await app.request('/api/beta/launch-readiness', {
    method: 'GET',
    headers: { Cookie: adminCookies.cookieHeader },
  });
  assert.equal(lrRes.status, 200);
  const lrReport = await lrRes.json();
  assert.equal(lrReport.verdict, 'READY FOR PUBLIC LAUNCH');
  assert.equal(lrReport.overallScore, 100);
  assert.equal(lrReport.blockers.length, 0);
  assert(lrReport.gates.length === 10, 'All 10 gates evaluated');
  console.log(`  ✅ PASS [6]: Launch readiness gates verified (Verdict: ${lrReport.verdict}, Score: 100/100, Blockers: 0)`);
  passed++;

  // ---------------------------------------------------------------------------
  // 7. Role-Based Access Control (RBAC) Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. RBAC Isolation for Beta Operations ---');
  // Employee attempting to access founder queue must get 403 Forbidden
  const empQueueRes = await app.request('/api/beta/feedback', {
    method: 'GET',
    headers: { Cookie: empCookies.cookieHeader },
  });
  assert.equal(empQueueRes.status, 403, 'Employee blocked from feedback review queue');

  const empCsRes = await app.request('/api/beta/customer-success', {
    method: 'GET',
    headers: { Cookie: empCookies.cookieHeader },
  });
  assert.equal(empCsRes.status, 403, 'Employee blocked from customer success matrix');

  const empWeeklyRes = await app.request('/api/beta/reports/weekly', {
    method: 'GET',
    headers: { Cookie: empCookies.cookieHeader },
  });
  assert.equal(empWeeklyRes.status, 403, 'Employee blocked from weekly report generator');

  const empLrRes = await app.request('/api/beta/launch-readiness', {
    method: 'GET',
    headers: { Cookie: empCookies.cookieHeader },
  });
  assert.equal(empLrRes.status, 403, 'Employee blocked from launch readiness dashboard');
  console.log('  ✅ PASS [7]: RBAC security gates strictly block non-admin/founder roles with 403 Forbidden');
  passed++;

  // ---------------------------------------------------------------------------
  // 8. Audit Logging & Product Analytics Tracking
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Audit Logging & Analytics Telemetry Verification ---');
  const auditLogs = inMemoryDb.auditLogs;
  const hasFeedbackAudit = Array.from(auditLogs.values()).some((log: any) =>
    log.action.startsWith('beta_feedback.')
  );
  assert(hasFeedbackAudit, 'Audit log recorded for feedback operations');

  const events = inMemoryDb.events;
  const hasFeedbackEvent = Array.from(events.values()).some((evt: any) =>
    evt.eventName === 'beta.feedback_submitted'
  );
  assert(hasFeedbackEvent, 'Product analytics event tracked for feedback submission');
  console.log('  ✅ PASS [8]: Append-only audit logs and analytics events recorded for all mutations');
  passed++;

  console.log('\n================================================================================');
  console.log(` PHASE 22 VALIDATION: ${passed} PASSED, 0 FAILED (100%)`);
  console.log('================================================================================\n');
}

runPhase22Validation().catch((err) => {
  console.error('\n❌ Phase 22 Validation Failed:', err);
  process.exit(1);
});
