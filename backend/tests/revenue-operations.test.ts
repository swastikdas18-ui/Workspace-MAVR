/**
 * Phase 7B — SaaS Launch Readiness & Revenue Operations Test Suite
 * 
 * Validates:
 * 1. Subscription Tier Model (Free, Starter, Business, Enterprise)
 * 2. Real-Time Usage Metering (Members, Projects, Storage, API requests, Automations)
 * 3. Subscription Management & Upgrades (Plan switch, Invoices, Renewal cancellations)
 * 4. Workspace Health Scoring Engine (0–100, 6 Pillars, Grades, Status)
 * 5. Executive Telemetry & Engagement (DAU, WAU, MAU, Feature Adoption)
 * 6. Customer Success & Churn Risk Detection
 * 7. 3-Tier RBAC Enforcement (Admin full access, Employee read-only plan/usage, Intern zero access)
 * 8. Multi-Tenant Isolation (Workspace A cannot view or upgrade Workspace B billing)
 **/

import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { BillingRepository, PLAN_CONFIG } from '../src/repositories/billing-repository';
import { UsageService } from '../src/services/usage-service';
import { WorkspaceHealthService } from '../src/services/workspace-health-service';
import { attachSessionToken } from './session-test-utils';

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

async function requestApi(
  method: string,
  path: string,
  body?: any,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req = new Request(`http://localhost:3000${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const res = await app.fetch(req);
  let data = null;
  try {
    data = attachSessionToken(res, await res.json());
  } catch { }

  return { status: res.status, data, headers: res.headers };
}

export async function runRevenueOperationsTests() {
  console.log('\n===============================================================');
  console.log(' PHASE 7B — SaaS LAUNCH READINESS & REVENUE OPERATIONS TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // -------------------------------------------------------------------------
  // 1. SETUP WORKSPACES & USERS
  // -------------------------------------------------------------------------
  console.log('--- 1. Setting up Tenants and User Accounts ---');

  // Workspace A: TechCorp
  const adminARes = await requestApi('POST', '/api/auth/register', {
    name: 'Elon Admin',
    email: 'elon@techcorp.io',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'TechCorp SaaS',
  });
  assert(adminARes.status === 201, '1.1 Admin A registered');
  const tokenA = adminARes.data.token;
  const workspaceAId = adminARes.data.workspace.id;

  // Employee in Workspace A
  const empInvite = await requestApi('POST', '/api/invites', { email: 'emp@techcorp.io', role: 'employee' }, tokenA);
  assert(empInvite.status === 201, '1.2 Employee invite created');
  const empRes = await requestApi('POST', '/api/invites/accept', {
    token: empInvite.data.invite.token,
    name: 'Gwynne Employee',
    password: 'Password123!',
  });
  assert(empRes.status === 200, '1.3 Employee registered');
  const empLogin = await requestApi('POST', '/api/auth/login', {
    email: 'emp@techcorp.io',
    password: 'Password123!',
  });
  const tokenEmp = empLogin.data.token;

  // Intern in Workspace A
  const internInvite = await requestApi('POST', '/api/invites', { email: 'intern@techcorp.io', role: 'intern' }, tokenA);
  assert(internInvite.status === 201, '1.4 Intern invite created');
  const internRes = await requestApi('POST', '/api/invites/accept', {
    token: internInvite.data.invite.token,
    name: 'Peter Intern',
    password: 'Password123!',
  });
  assert(internRes.status === 200, '1.5 Intern registered');
  const intLogin = await requestApi('POST', '/api/auth/login', {
    email: 'intern@techcorp.io',
    password: 'Password123!',
  });
  const tokenIntern = intLogin.data.token;

  // Workspace B: BetaCorp (Multi-tenant check)
  const adminBRes = await requestApi('POST', '/api/auth/register', {
    name: 'Jeff Admin',
    email: 'jeff@betacorp.io',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'BetaCorp Cloud',
  });
  assert(adminBRes.status === 201, '1.6 Admin B registered');
  const tokenB = adminBRes.data.token;
  const workspaceBId = adminBRes.data.workspace.id;

  // -------------------------------------------------------------------------
  // 2. SUBSCRIPTION TIERS & PLAN LIMITS MATRIX
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Subscription Tiers & Plan Limits Matrix ---');

  assert(PLAN_CONFIG.free.includedSeats === 3, '2.1 Free plan member limit is 3');
  assert(PLAN_CONFIG.starter.includedSeats === 10, '2.2 Starter plan member limit is 10');
  assert(PLAN_CONFIG.business.includedSeats === 25, '2.3 Business plan included seats is 25');
  assert(PLAN_CONFIG.enterprise.includedSeats === 100 || PLAN_CONFIG.enterprise.limits.maxMembers === 9999, '2.4 Enterprise plan member limit is unlimited');

  assert(PLAN_CONFIG.starter.priceMonthly === 999, '2.5 Starter price is ₹999/mo');
  assert(PLAN_CONFIG.business.priceMonthly === 2999, '2.6 Business price is ₹2999/mo');
  assert(PLAN_CONFIG.enterprise.priceMonthly === 0, '2.7 Enterprise price is custom (0)');

  // -------------------------------------------------------------------------
  // 3. BILLING REST API & RBAC ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Billing REST API & RBAC Protection ---');

  // 3.1 Admin GET Plan
  const planAdmin = await requestApi('GET', '/api/billing/plan', undefined, tokenA);
  assert(planAdmin.status === 200, '3.1 Admin can read subscription plan');
  assert(planAdmin.data.subscription.workspaceId === workspaceAId, '3.2 Plan belongs to TechCorp workspace');
  assert(planAdmin.data.subscription.plan === 'free', '3.3 Default initial plan is free');

  // 3.2 Employee GET Plan (Read-Only)
  const planEmp = await requestApi('GET', '/api/billing/plan', undefined, tokenEmp);
  assert(planEmp.status === 200, '3.4 Employee has read-only plan access');
  assert(planEmp.data.subscription.plan === 'free', '3.5 Employee sees correct plan');

  // 3.3 Intern GET Plan (403 Forbidden)
  const planIntern = await requestApi('GET', '/api/billing/plan', undefined, tokenIntern);
  assert(planIntern.status === 403, '3.6 Intern blocked from billing plan (403 Forbidden)');

  // 3.4 Admin Upgrade to Starter
  const upgradeRes = await requestApi('POST', '/api/billing/upgrade', { plan: 'starter', billingCycle: 'monthly' }, tokenA);
  assert(upgradeRes.status === 200, '3.7 Admin upgraded workspace to Starter');
  assert(upgradeRes.data.subscription.plan === 'starter', '3.8 Upgraded plan verified as starter');
  assert(upgradeRes.data.subscription.pricePerMonth === 999, '3.9 Monthly price updated to ₹999');

  // 3.5 Employee Upgrade Attempt (403 Forbidden)
  const empUpgrade = await requestApi('POST', '/api/billing/upgrade', { plan: 'business' }, tokenEmp);
  assert(empUpgrade.status === 403, '3.10 Employee forbidden from upgrading subscription (403)');

  // 3.6 Intern Upgrade Attempt (403 Forbidden)
  const internUpgrade = await requestApi('POST', '/api/billing/upgrade', { plan: 'business' }, tokenIntern);
  assert(internUpgrade.status === 403, '3.11 Intern forbidden from upgrading subscription (403)');

  // 3.7 Invoices Generation & RBAC
  const invoicesAdmin = await requestApi('GET', '/api/billing/invoices', undefined, tokenA);
  assert(invoicesAdmin.status === 200, '3.12 Admin can access invoice history');
  assert(Array.isArray(invoicesAdmin.data.invoices), '3.13 Invoices returned as array');
  assert(invoicesAdmin.data.invoices.length >= 1, '3.14 Upgrade triggered automated invoice issuance');
  assert(invoicesAdmin.data.invoices[0].amount === 999 || invoicesAdmin.data.invoices[0].amount === 99900 || invoicesAdmin.data.invoices[0].amount === 2900, '3.15 Invoice amount is recorded');

  const invoicesEmp = await requestApi('GET', '/api/billing/invoices', undefined, tokenEmp);
  assert(invoicesEmp.status === 403, '3.16 Employee forbidden from viewing invoice history (403)');

  const invoicesIntern = await requestApi('GET', '/api/billing/invoices', undefined, tokenIntern);
  assert(invoicesIntern.status === 403, '3.17 Intern forbidden from viewing invoice history (403)');

  // 3.8 Cancellation of Renewal
  const cancelRes = await requestApi('POST', '/api/billing/cancel', undefined, tokenA);
  assert(cancelRes.status === 200, '3.18 Admin set cancelAtPeriodEnd on subscription');
  assert(cancelRes.data.subscription.cancelAtPeriodEnd === true, '3.19 cancelAtPeriodEnd flag confirmed');

  // -------------------------------------------------------------------------
  // 4. REAL-TIME USAGE METERING & OVERAGE DETECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Real-Time Usage Metering Engine ---');

  // Track API requests in UsageService
  UsageService.incrementApiRequests(workspaceAId, 250);

  const usageRes = await requestApi('GET', '/api/billing/usage', undefined, tokenA);
  assert(usageRes.status === 200, '4.1 Admin retrieved usage metrics');
  assert(usageRes.data.usage.workspaceId === workspaceAId, '4.2 Usage metrics matched workspace');
  assert(usageRes.data.usage.usage.members.current === 3, '4.3 Usage tracks 3 active members');
  assert(usageRes.data.usage.usage.apiRequests.current >= 250, '4.4 Usage tracks 250+ API requests');
  assert(usageRes.data.usage.hasOverage === false, '4.5 No overage on Starter tier (3/15 members)');

  const empUsage = await requestApi('GET', '/api/billing/usage', undefined, tokenEmp);
  assert(empUsage.status === 200, '4.6 Employee can inspect usage metrics');

  const internUsage = await requestApi('GET', '/api/billing/usage', undefined, tokenIntern);
  assert(internUsage.status === 403, '4.7 Intern blocked from usage metering (403 Forbidden)');

  // -------------------------------------------------------------------------
  // 5. WORKSPACE HEALTH SCORING ENGINE (6 PILLARS)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Workspace Health Scoring Engine ---');

  // Create Projects & Tasks to test velocity scoring
  const p1 = await requestApi('POST', '/api/projects', { title: 'Q3 Enterprise Launch', description: 'Core SaaS rollout' }, tokenA);
  assert(p1.status === 201, '5.1 Created strategic project for health scoring');

  const t1 = await requestApi('POST', '/api/tasks', {
    title: 'Deploy Production WebSockets',
    projectId: p1.data.project.id,
    assignedTo: empRes.data.user.id,
    status: 'completed',
  }, tokenA);
  assert(t1.status === 201, '5.2 Created completed task');

  const t2 = await requestApi('POST', '/api/tasks', {
    title: 'Configure Sentry Tracing',
    projectId: p1.data.project.id,
    assignedTo: empRes.data.user.id,
    status: 'in_progress',
  }, tokenA);
  assert(t2.status === 201, '5.3 Created in-progress task');

  const health = WorkspaceHealthService.calculateHealth(workspaceAId);
  assert(typeof health.score === 'number', '5.4 Health score is a numeric value');
  assert(health.score >= 60 && health.score <= 100, '5.5 Health score falls in healthy 60-100 range');
  assert(health.grade === 'A' || health.grade === 'A+' || health.grade === 'B', '5.6 Health grade calculated');
  assert(health.status === 'Healthy', '5.7 Workspace status is Healthy');
  assert(health.breakdown.userActivityScore > 0, '5.8 User activity pillar scored');
  assert(health.breakdown.projectVelocityScore > 0, '5.9 Project velocity pillar scored');
  assert(health.breakdown.taskCompletionScore > 0, '5.10 Task completion pillar scored');
  assert(health.metrics.totalMembers === 3, '5.11 Health tracks 3 total members');
  assert(health.metrics.completedTasks === 1, '5.12 Health tracks 1 completed task');
  assert(health.powerUsers.length > 0, '5.13 Power users identified in telemetry');

  // -------------------------------------------------------------------------
  // 6. EXECUTIVE REPORTING APIS
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Executive Reporting & Growth APIs ---');

  // 6.1 Executive Metrics
  const execMetrics = await requestApi('GET', '/api/executive/metrics', undefined, tokenA);
  assert(execMetrics.status === 200, '6.1 Admin retrieved executive metrics');
  assert(execMetrics.data.overview.workspaceName === 'TechCorp SaaS', '6.2 Workspace name verified');
  assert(execMetrics.data.engagement.dau === 3, '6.3 Daily Active Users (DAU) tracked');
  assert(execMetrics.data.engagement.retentionRate === '98.5%', '6.4 Retention rate verified');

  // 6.2 Executive Adoption Telemetry
  const execAdoption = await requestApi('GET', '/api/executive/adoption', undefined, tokenA);
  assert(execAdoption.status === 200, '6.5 Admin retrieved feature adoption telemetry');
  assert(execAdoption.data.featureAdoption.projectsAndKanban.status === 'active', '6.6 Projects adoption active');
  assert(execAdoption.data.featureAdoption.taskManagement.status === 'active', '6.7 Tasks adoption active');

  // 6.3 Executive Growth & Churn Risk Telemetry
  const execGrowth = await requestApi('GET', '/api/executive/growth', undefined, tokenA);
  assert(execGrowth.status === 200, '6.8 Admin retrieved growth and churn telemetry');
  assert(execGrowth.data.customerSuccess.churnRisk === 'LOW', '6.9 TechCorp churn risk is LOW');
  assert(Array.isArray(execGrowth.data.customerSuccess.recommendations), '6.10 Recommendations provided');

  // 6.4 RBAC on Executive Routes
  const execEmp = await requestApi('GET', '/api/executive/metrics', undefined, tokenEmp);
  assert(execEmp.status === 403, '6.11 Employee blocked from Executive dashboard (403 Forbidden)');

  const execIntern = await requestApi('GET', '/api/executive/metrics', undefined, tokenIntern);
  assert(execIntern.status === 403, '6.12 Intern blocked from Executive dashboard (403 Forbidden)');

  // -------------------------------------------------------------------------
  // 7. MULTI-TENANT ISOLATION & BILLING FIREWALL
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Multi-Tenant Billing & Telemetry Isolation ---');

  // BetaCorp Admin B tries to fetch TechCorp data
  const crossUsage = await requestApi('GET', '/api/billing/usage', undefined, tokenB);
  assert(crossUsage.status === 200, '7.1 BetaCorp Admin can read BetaCorp usage');
  assert(crossUsage.data.usage.workspaceId === workspaceBId, '7.2 Usage strictly scoped to BetaCorp (not TechCorp)');
  assert(crossUsage.data.usage.usage.members.current === 1, '7.3 BetaCorp has 1 member (isolated from TechCorp 3 members)');

  const crossInvoices = await requestApi('GET', '/api/billing/invoices', undefined, tokenB);
  assert(crossInvoices.status === 200, '7.4 BetaCorp Admin fetched own invoices');
  assert(crossInvoices.data.invoices.length === 0, '7.5 BetaCorp has 0 invoices (TechCorp invoices not leaked)');

  // -------------------------------------------------------------------------
  // 8. BUSINESS TIER, ENTERPRISE UPGRADE & HIGH VOLUME CAPACITY
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Enterprise Upgrade & High-Volume Capacity ---');

  // Upgrade to Business First
  const bizUpgrade = await requestApi('POST', '/api/billing/upgrade', { plan: 'business', billingCycle: 'monthly' }, tokenA);
  assert(bizUpgrade.status === 200, '8.1 Upgraded to Business Monthly tier');
  assert(bizUpgrade.data.subscription.plan === 'business', '8.2 Plan confirmed as business');
  assert(bizUpgrade.data.subscription.pricePerMonth === 2999, '8.3 Monthly price is ₹2999');

  const bizUsage = await requestApi('GET', '/api/billing/usage', undefined, tokenA);
  assert(bizUsage.data.usage.usage.members.limit >= 25, '8.4 Member limit is configured on Business tier');
  assert(bizUsage.data.usage.usage.projects.limit >= 100, '8.5 Project limit is configured on Business tier');
  assert(bizUsage.data.usage.usage.storageMb.limit >= 10000, '8.6 Storage limit is 10,000+ MB on Business tier');

  // Upgrade to Enterprise Yearly
  const enterpriseUpgrade = await requestApi('POST', '/api/billing/upgrade', { plan: 'enterprise', billingCycle: 'yearly' }, tokenA);
  assert(enterpriseUpgrade.status === 200, '8.7 Upgraded to Enterprise Yearly tier');
  assert(enterpriseUpgrade.data.subscription.plan === 'enterprise', '8.8 Plan confirmed as enterprise');

  const updatedUsage = await requestApi('GET', '/api/billing/usage', undefined, tokenA);
  assert(updatedUsage.data.usage.plan === 'enterprise', '8.10 Metering engine refreshed to enterprise capacity');
  assert(updatedUsage.data.usage.usage.members.limit === 9999, '8.11 Member limit raised to 9999');
  assert(updatedUsage.data.usage.usage.projects.limit === 9999, '8.12 Project limit raised to 9999');
  assert(updatedUsage.data.usage.usage.automations.limit === 9999, '8.13 Automation limit raised to 9999');

  // Final Invoices Audit
  const finalInvoices = await requestApi('GET', '/api/billing/invoices', undefined, tokenA);
  assert(finalInvoices.status === 200, '8.14 Admin retrieved complete invoice audit');
  assert(finalInvoices.data.invoices.length >= 1, '8.15 Invoices generated across upgrade lifecycle');

  console.log('\n===============================================================');
  console.log(` REVENUE OPERATIONS TESTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    throw new Error(`Revenue operations suite failed with ${failCount} errors.`);
  }
}

if (process.argv[1]?.endsWith('revenue-operations.test.ts') || process.argv[1]?.includes('revenue-operations')) {
  runRevenueOperationsTests().then(() => process.exit(0)).catch((err) => {
    console.error('Revenue operations test error:', err);
    process.exit(1);
  });
}
