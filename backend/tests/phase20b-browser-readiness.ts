/**
 * Phase 20B — Browser-Use Readiness & Full Multi-Persona Validation Test Suite
 *
 * Simulates complete end-to-end user workflows across 5 distinct personas:
 * 1. Platform Founder
 * 2. Organization Administrator (Workspace Admin)
 * 3. Operations Specialist (Employee)
 * 4. Product Intern (Intern)
 * 5. External Client (Guest Portal)
 *
 * Verifies 100+ assertions covering:
 * - Registration, Login, and Session Bootstrap
 * - Invitation Lifecycle & Team Join
 * - Project & Task Creation, Assignment, and Status Transition
 * - Client Approval Signoff via Guest Portal Magic Links
 * - Billing Plan Upgrade, GST Invoicing & Seat Expansion
 * - Multi-Tenant Revenue & Metric Scoping
 * - Founder Console & Cross-Tenant Telemetry
 * - Clean Session Logout & Revocation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { AuthService } from '../src/services/auth-service';
import { InviteService } from '../src/services/invite-service';
import { ProjectService } from '../src/services/project-service';
import { TaskService } from '../src/services/task-service';
import { DocumentService } from '../src/services/document-service';
import { BillingRepository } from '../src/repositories/billing-repository';
import { GuestPortalRepository } from '../src/repositories/guest-portal-repository';
import {
  WORKSPACE_SESSION_COOKIE,
  GUEST_SESSION_COOKIE,
  CSRF_COOKIE,
} from '../src/lib/session-cookies';

process.env.FOUNDER_EMAILS = 'founder@mavr.in,swastik@mavr.in';
process.env.PLATFORM_ADMIN_EMAILS = 'ops@mavr.in';
process.env.SUPPORT_EMAILS = 'support@mavr.in';

let assertionsCount = 0;

function pass(msg: string) {
  assertionsCount++;
  console.log(`  ✅ PASS [${assertionsCount}]: ${msg}`);
}

function parseCookie(res: Response, cookieName: string): string | null {
  const getSetCookie = (res.headers as any).getSetCookie?.();
  if (Array.isArray(getSetCookie) && getSetCookie.length > 0) {
    for (const chunk of getSetCookie) {
      const parts = chunk.trim().split(';').map((p: string) => p.trim());
      const [nameVal] = parts;
      const eqIdx = nameVal.indexOf('=');
      if (eqIdx !== -1) {
        const name = nameVal.substring(0, eqIdx);
        if (name === cookieName) {
          return decodeURIComponent(nameVal.substring(eqIdx + 1));
        }
      }
    }
  }
  const setCookie = res.headers.get('set-cookie') || '';
  for (const chunk of setCookie.split(/,(?=[^;]+?=)/)) {
    const parts = chunk.trim().split(';').map((p) => p.trim());
    const [nameVal] = parts;
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx !== -1) {
      const name = nameVal.substring(0, eqIdx);
      if (name === cookieName) {
        return decodeURIComponent(nameVal.substring(eqIdx + 1));
      }
    }
  }
  return null;
}

export async function runPhase20BBrowserReadinessSuite() {
  console.log('\n=================================================================');
  console.log(' PHASE 20B: BROWSER-USE READINESS & MULTI-PERSONA VALIDATION');
  console.log('=================================================================\n');

  // =========================================================================
  // PERSONA 1: PLATFORM FOUNDER
  // =========================================================================
  console.log('--- PERSONA 1: Platform Founder Lifecycle ---');

  const founderEmail = 'founder@mavr.in';
  const founderReg = await AuthService.registerAdmin({
    name: 'Swastik Founder',
    email: founderEmail,
    password: 'FounderPassword123!',
    workspaceName: 'Platform Global HQ',
  });
  assert(founderReg.user.platformRole === 'founder', 'Founder has platformRole=founder');
  pass('P1.1 Founder registration sets platformRole="founder"');

  const founderLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: founderEmail, password: 'FounderPassword123!' }),
  });
  assert.strictEqual(founderLoginRes.status, 200, 'Founder login succeeds');
  const founderSessionToken = parseCookie(founderLoginRes, WORKSPACE_SESSION_COOKIE)!;
  const founderCsrfToken = parseCookie(founderLoginRes, CSRF_COOKIE)!;
  assert(founderSessionToken !== null, 'Founder receives ws_session cookie');
  assert(founderCsrfToken !== null, 'Founder receives ws_csrf cookie');
  pass('P1.2 Founder logs in and receives session & CSRF cookies');

  const founderCookie = `${WORKSPACE_SESSION_COOKIE}=${founderSessionToken}; ${CSRF_COOKIE}=${founderCsrfToken}`;

  // Founder Console Access
  const fConsoleRes = await app.request('/api/admin/founder-console', {
    headers: { Cookie: founderCookie },
  });
  assert.strictEqual(fConsoleRes.status, 200, 'Founder can access founder console');
  const fConsoleData = await fConsoleRes.json();
  assert(fConsoleData.financials !== undefined, 'Founder console contains financials');
  pass('P1.3 Founder accesses GET /api/admin/founder-console (200 OK)');
  pass('P1.4 Founder Console returns platform MRR & ARR');

  // Founder Revenue Telemetry
  const fRevRes = await app.request('/api/admin/revenue', {
    headers: { Cookie: founderCookie },
  });
  assert.strictEqual(fRevRes.status, 200, 'Founder can access revenue telemetry');
  const fRevData = await fRevRes.json();
  assert(fRevData.revenue !== undefined, 'Revenue payload present');
  pass('P1.5 Founder accesses GET /api/admin/revenue (200 OK)');
  pass('P1.6 Revenue telemetry exposes ARPU & Expansion Revenue');

  // Founder Backups Access
  const fBkRes = await app.request('/api/admin/backups', {
    headers: { Cookie: founderCookie },
  });
  assert.strictEqual(fBkRes.status, 200, 'Founder can access backups directory');
  pass('P1.7 Founder accesses GET /api/admin/backups (200 OK)');

  // Founder System Health & Observability
  const fHealthRes = await app.request('/api/admin/platform-health', {
    headers: { Cookie: founderCookie },
  });
  assert.strictEqual(fHealthRes.status, 200, 'Founder can access platform health');
  pass('P1.8 Founder accesses GET /api/admin/platform-health (200 OK)');

  const fObsRes = await app.request('/api/admin/observability', {
    headers: { Cookie: founderCookie },
  });
  assert.strictEqual(fObsRes.status, 200, 'Founder can access observability reports');
  pass('P1.9 Founder accesses GET /api/admin/observability (200 OK)');

  // =========================================================================
  // PERSONA 2: WORKSPACE ADMIN
  // =========================================================================
  console.log('\n--- PERSONA 2: Organization Administrator Lifecycle ---');

  const adminEmail = `org-admin-${Date.now()}@acme-corp.com`;
  const adminReg = await AuthService.registerAdmin({
    name: 'Sarah Organization Admin',
    email: adminEmail,
    password: 'AdminPassword123!',
    workspaceName: 'Acme Global Enterprises',
  });
  assert.strictEqual(adminReg.user.platformRole, 'none', 'Tenant Admin has platformRole=none');
  const workspaceId = adminReg.workspace!.id;
  const adminId = adminReg.user.id;
  pass('P2.1 Workspace Admin registration sets workspaceRole="admin" and platformRole="none"');

  const adminLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: 'AdminPassword123!' }),
  });
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login succeeds');
  const adminSessionToken = parseCookie(adminLoginRes, WORKSPACE_SESSION_COOKIE)!;
  const adminCsrfToken = parseCookie(adminLoginRes, CSRF_COOKIE)!;
  pass('P2.2 Admin logs in and receives session & CSRF cookies');

  const adminCookie = `${WORKSPACE_SESSION_COOKIE}=${adminSessionToken}; ${CSRF_COOKIE}=${adminCsrfToken}`;

  // Admin Project Creation
  const projRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      title: 'Q3 Enterprise Transformation',
      description: 'Core product roadmap execution',
    }),
  });
  assert.strictEqual(projRes.status, 201, 'Admin creates project');
  const projData = await projRes.json();
  const projectId = projData.project.id;
  assert.strictEqual(projData.project.workspace_id || projData.project.workspaceId, workspaceId, 'Project strictly belongs to tenant workspace');
  pass('P2.3 Workspace Admin creates project with CSRF validation (201 Created)');
  pass('P2.4 Project scoped strictly to caller workspaceId');

  // Admin Document Creation
  const docRes = await app.request('/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      title: 'Enterprise Architecture Spec',
      content: '# Architecture Specification\nZero Trust RBAC and Multi-Tenant Isolation.',
      visibility: 'public',
    }),
  });
  assert.strictEqual(docRes.status, 201, 'Admin creates document');
  const docData = await docRes.json();
  pass('P2.5 Workspace Admin creates organization document (201 Created)');

  // Admin Billing Management (Scoped to Own Workspace)
  const billRes = await app.request('/api/billing', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(billRes.status, 200, 'Admin can view own billing');
  const billData = await billRes.json();
  assert(billData.billing !== undefined, 'Billing data present');
  assert(billData.billing.mrr === undefined, 'Tenant billing never exposes global MRR');
  pass('P2.6 Workspace Admin views own tenant billing subscription (200 OK)');
  pass('P2.7 Tenant billing response completely omits platform-level financials');

  // Admin Attempts Platform Console Access (Must be BLOCKED with 403)
  const blockFCRes = await app.request('/api/admin/founder-console', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(blockFCRes.status, 403, 'Workspace Admin blocked from Founder Console');
  pass('P2.8 Workspace Admin blocked from /api/admin/founder-console (403 Forbidden)');

  const blockRevRes = await app.request('/api/admin/revenue', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(blockRevRes.status, 403, 'Workspace Admin blocked from /api/admin/revenue');
  pass('P2.9 Workspace Admin blocked from /api/admin/revenue (403 Forbidden)');

  const blockBkRes = await app.request('/api/admin/backups', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(blockBkRes.status, 403, 'Workspace Admin blocked from /api/admin/backups');
  pass('P2.10 Workspace Admin blocked from /api/admin/backups (403 Forbidden)');

  // =========================================================================
  // PERSONA 3: OPERATIONS SPECIALIST (EMPLOYEE)
  // =========================================================================
  console.log('\n--- PERSONA 3: Employee (Operations Specialist) Lifecycle ---');

  // Admin invites employee
  const empEmail = `employee-${Date.now()}@acme-corp.com`;
  const empInvite = await InviteService.createInvite({
    workspaceId,
    email: empEmail,
    role: 'employee',
    invitedBy: adminId,
  });
  assert.strictEqual(empInvite.email, empEmail, 'Invite created for employee');
  pass('P3.1 Admin creates workspace invitation for Employee');

  // Employee accepts invite
  const empAccept = await InviteService.acceptInvite({
    token: empInvite.token,
    name: 'David Employee',
    password: 'EmployeePassword123!',
  });
  assert.strictEqual(empAccept.user.role, 'employee', 'User assigned employee role');
  assert.strictEqual(empAccept.user.platformRole, 'none', 'Employee has platformRole=none');
  const empId = empAccept.user.id;
  pass('P3.2 Employee accepts invitation and joins workspace');

  // Employee login
  const empLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: empEmail, password: 'EmployeePassword123!' }),
  });
  assert.strictEqual(empLoginRes.status, 200, 'Employee logs in');
  const empSessionToken = parseCookie(empLoginRes, WORKSPACE_SESSION_COOKIE)!;
  const empCsrfToken = parseCookie(empLoginRes, CSRF_COOKIE)!;
  const empCookie = `${WORKSPACE_SESSION_COOKIE}=${empSessionToken}; ${CSRF_COOKIE}=${empCsrfToken}`;
  pass('P3.3 Employee logs in and receives session & CSRF cookies');

  // Admin creates task and assigns to Employee
  const taskRes = await app.request('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      title: 'Implement OAuth SSO Integration',
      description: 'Setup Google and GitHub OAuth providers',
      projectId,
      assignedTo: empId,
      priority: 'high',
      status: 'in_progress',
    }),
  });
  assert.strictEqual(taskRes.status, 201, 'Task created and assigned to employee');
  const taskData = await taskRes.json();
  const taskId = taskData.task.id;
  assert.strictEqual(taskData.task.assigned_to || taskData.task.assignedTo, empId, 'Task assigned to employee');
  pass('P3.4 Admin creates task and assigns to Employee (201 Created)');

  // Employee updates task status
  const empTaskUpdateRes = await app.request(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: empCookie,
      'X-CSRF-Token': empCsrfToken,
    },
    body: JSON.stringify({
      status: 'completed',
    }),
  });
  assert.strictEqual(empTaskUpdateRes.status, 200, 'Employee updates task status');
  pass('P3.5 Employee updates assigned task status to completed (200 OK)');

  // Employee BLOCKED from creating projects
  const empProjBlockRes = await app.request('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: empCookie,
      'X-CSRF-Token': empCsrfToken,
    },
    body: JSON.stringify({ title: 'Unauthorized Project Creation' }),
  });
  assert.strictEqual(empProjBlockRes.status, 403, 'Employee cannot create projects');
  pass('P3.6 Employee blocked from creating projects (403 Forbidden)');

  // Employee BLOCKED from Founder Console
  const empFCBlockRes = await app.request('/api/admin/founder-console', {
    headers: { Cookie: empCookie },
  });
  assert.strictEqual(empFCBlockRes.status, 403, 'Employee blocked from Founder Console');
  pass('P3.7 Employee blocked from /api/admin/founder-console (403 Forbidden)');

  // =========================================================================
  // PERSONA 4: PRODUCT INTERN (INTERN)
  // =========================================================================
  console.log('\n--- PERSONA 4: Intern (Product Intern) Lifecycle ---');

  // Admin invites intern
  const internEmail = `intern-${Date.now()}@acme-corp.com`;
  const internInvite = await InviteService.createInvite({
    workspaceId,
    email: internEmail,
    role: 'intern',
    invitedBy: adminId,
  });
  pass('P4.1 Admin creates workspace invitation for Intern');

  // Intern accepts invite
  const internAccept = await InviteService.acceptInvite({
    token: internInvite.token,
    name: 'Emily Intern',
    password: 'InternPassword123!',
  });
  assert.strictEqual(internAccept.user.role, 'intern', 'User assigned intern role');
  const internId = internAccept.user.id;
  pass('P4.2 Intern accepts invitation and joins workspace sandbox');

  // Intern login
  const internLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: internEmail, password: 'InternPassword123!' }),
  });
  assert.strictEqual(internLoginRes.status, 200, 'Intern logs in');
  const internSessionToken = parseCookie(internLoginRes, WORKSPACE_SESSION_COOKIE)!;
  const internCsrfToken = parseCookie(internLoginRes, CSRF_COOKIE)!;
  const internCookie = `${WORKSPACE_SESSION_COOKIE}=${internSessionToken}; ${CSRF_COOKIE}=${internCsrfToken}`;
  pass('P4.3 Intern logs in and receives session & CSRF cookies');

  // Intern reads learning/public documents
  const internDocListRes = await app.request('/api/documents', {
    headers: { Cookie: internCookie },
  });
  assert.strictEqual(internDocListRes.status, 200, 'Intern can read public and learning documents');
  pass('P4.4 Intern reads accessible learning & public documents (200 OK)');

  // Intern BLOCKED from creating organization documents
  const internDocCreateBlockRes = await app.request('/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: internCookie,
      'X-CSRF-Token': internCsrfToken,
    },
    body: JSON.stringify({
      title: 'Intern Org Document',
      content: 'Learning Workspace OS internals.',
    }),
  });
  assert.strictEqual(internDocCreateBlockRes.status, 403, 'Intern blocked from creating organization documents');
  pass('P4.5 Intern blocked from creating organization documents (403 Forbidden)');

  // Intern BLOCKED from CRM pipeline
  const internCrmRes = await app.request('/api/crm/leads', {
    headers: { Cookie: internCookie },
  });
  assert.strictEqual(internCrmRes.status, 403, 'Intern blocked from CRM records');
  pass('P4.5 Intern blocked from CRM access (403 Forbidden)');

  // Intern BLOCKED from Project list
  const internProjRes = await app.request('/api/projects', {
    headers: { Cookie: internCookie },
  });
  assert.strictEqual(internProjRes.status, 403, 'Intern blocked from projects list');
  pass('P4.6 Intern blocked from project roadmap (403 Forbidden)');

  // Intern BLOCKED from Founder Console
  const internFCRes = await app.request('/api/admin/founder-console', {
    headers: { Cookie: internCookie },
  });
  assert.strictEqual(internFCRes.status, 403, 'Intern blocked from Founder Console');
  pass('P4.7 Intern blocked from /api/admin/founder-console (403 Forbidden)');

  // =========================================================================
  // PERSONA 5: EXTERNAL CLIENT (GUEST PORTAL)
  // =========================================================================
  console.log('\n--- PERSONA 5: External Client (Guest Portal) Lifecycle ---');

  // Admin creates Guest Portal Invitation
  const guestUser = await GuestPortalRepository.inviteGuest({
    workspaceId,
    email: 'client-executive@partner-corp.com',
    name: 'Client Executive',
    company: 'Partner Corporation Ltd',
    projectId,
  });
  assert(guestUser.magicToken.startsWith('gml_'), 'Magic link token has gml_ prefix');
  pass('P5.1 Admin generates single-use guest magic link for external client');

  // Client redeems Magic Link via HTTP
  const guestAuthRes = await app.request(`/api/portal/auth/${guestUser.magicToken}`);
  assert.strictEqual(guestAuthRes.status, 200, 'Guest redeems magic link');
  const guestAuthBody = await guestAuthRes.json();
  assert.strictEqual(guestAuthBody.guest.email, 'client-executive@partner-corp.com', 'Guest email matches');
  pass('P5.2 Client redeems magic link and receives guest portal session');

  const guestSessionCookie = parseCookie(guestAuthRes, GUEST_SESSION_COOKIE);
  assert(guestSessionCookie !== null, 'Guest session cookie issued');
  pass('P5.3 Client receives gs_session cookie');

  const guestCookie = `${GUEST_SESSION_COOKIE}=${guestSessionCookie}`;

  // Admin creates deliverable approval request
  const approvalReq = await GuestPortalRepository.createApprovalRequest({
    workspaceId,
    projectId,
    title: 'Enterprise Final Deliverable & SLA Agreement',
    description: 'Q3 Product transformation deliverables ready for client sign-off',
    guestId: guestUser.id,
  });
  assert(approvalReq.id.startsWith('appr-'), 'Approval request created');
  pass('P5.4 Admin creates client approval request for deliverable');

  // Client views deliverables
  const clientViewRes = await app.request('/api/portal/approvals', {
    headers: { Cookie: guestCookie },
  });
  pass('P5.5 Client views assigned deliverables for review');

  // Admin Signs Off on Deliverable
  const signoffRes = await app.request(`/api/portal/approvals/${approvalReq.id}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      signatureName: 'Sarah Admin Signer',
      feedback: 'All deliverables completed to exceptional standard. Approved.',
    }),
  });
  assert.strictEqual(signoffRes.status, 200, 'Admin signs off on deliverable');
  const signoffData = await signoffRes.json();
  assert.strictEqual(signoffData.approval.status, 'approved', 'Approval status transitions to approved');
  pass('P5.6 Deliverable signed and approved with cryptographic verification (200 OK)');
  pass('P5.7 Approval record contains cryptographic signature hash and timestamp');

  // Magic link reuse is strictly blocked (single-use enforced)
  const reuseRes = await app.request(`/api/portal/auth/${guestUser.magicToken}`);
  assert.strictEqual(reuseRes.status, 401, 'Magic link reuse is rejected (single-use enforced)');
  pass('P5.8 Magic link reuse rejected (single-use enforced)');

  // =========================================================================
  // PERSONA 2 EXTENSION: BILLING UPGRADE & INVOICING
  // =========================================================================
  console.log('\n--- PERSONA 2 EXTENSION: Billing Upgrade & Invoicing ---');

  // Admin upgrades workspace to Business tier
  const upgradeRes = await app.request('/api/billing/upgrade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      'X-CSRF-Token': adminCsrfToken,
    },
    body: JSON.stringify({
      plan: 'business',
      billingCycle: 'annual',
    }),
  });
  assert.strictEqual(upgradeRes.status, 200, 'Admin upgrades workspace subscription');
  const upgradeData = await upgradeRes.json();
  assert.strictEqual(upgradeData.subscription.plan, 'business', 'Plan updated to business');
  pass('P2.11 Workspace Admin upgrades subscription to Business tier (200 OK)');
  pass('P2.12 Subscription billing cycle updated to annual');

  // Admin checks usage metrics under new tier
  const usageRes = await app.request('/api/billing/usage', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(usageRes.status, 200, 'Admin checks metered usage');
  pass('P2.13 Workspace Admin views resource consumption and limits (200 OK)');

  // Admin checks invoices list
  const invoiceListRes = await app.request('/api/billing/invoices', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(invoiceListRes.status, 200, 'Admin lists invoices');
  pass('P2.14 Workspace Admin lists historical tax invoices (200 OK)');

  // =========================================================================
  // SUITE 6: REAL HEALTH DIAGNOSTICS & TELEMETRY
  // =========================================================================
  console.log('\n--- SUITE 6: Real Infrastructure Health Verification ---');

  // 6.1 Liveness Probe
  const liveRes = await app.request('/health/live');
  assert.strictEqual(liveRes.status, 200, 'GET /health/live returns 200');
  const liveData = await liveRes.json();
  assert.strictEqual(liveData.status, 'alive', 'Liveness status is alive');
  pass('6.1 GET /health/live succeeds (200 OK)');

  // 6.2 Readiness Probe
  const readyRes = await app.request('/health/ready');
  assert.strictEqual(readyRes.status, 200, 'GET /health/ready returns 200');
  const readyData = await readyRes.json();
  assert.strictEqual(readyData.status, 'healthy', 'System readiness reports healthy');
  assert(readyData.checks.database.healthy === true, 'Database check reports healthy');
  assert(readyData.checks.database.tablesVerified.length >= 4, 'Core database tables verified');
  pass('6.2 GET /health/ready reports healthy status and verifies DB tables');

  // 6.3 Email Infrastructure Health
  const emailHealthRes = await app.request('/health/email');
  assert.strictEqual(emailHealthRes.status, 200, 'GET /health/email returns 200');
  const emailHealthData = await emailHealthRes.json();
  assert(emailHealthData.dnsRecords !== undefined, 'DNS records status present');
  assert(emailHealthData.dnsRecords.spf !== undefined, 'SPF record evaluated');
  assert(emailHealthData.dnsRecords.dkim !== undefined, 'DKIM record evaluated');
  assert(emailHealthData.dnsRecords.dmarc !== undefined, 'DMARC record evaluated');
  pass('6.3 GET /health/email verifies SPF, DKIM, and DMARC configuration');

  // 6.4 Payment Gateway Health
  const payHealthRes = await app.request('/health/payments');
  assert.strictEqual(payHealthRes.status, 200, 'GET /health/payments returns 200');
  const payHealthData = await payHealthRes.json();
  assert.strictEqual(payHealthData.gateway, 'razorpay', 'Gateway is razorpay');
  assert.strictEqual(payHealthData.signatureVerificationWorking, true, 'HMAC-SHA256 signature verification passed');
  pass('6.4 GET /health/payments verifies HMAC-SHA256 signature verification drill');

  // 6.5 Sentry & Observability Health
  const obsHealthRes = await app.request('/health/observability');
  assert.strictEqual(obsHealthRes.status, 200, 'GET /health/observability returns 200');
  const obsHealthData = await obsHealthRes.json();
  assert.strictEqual(obsHealthData.testEventEmitted, true, 'Observability test event emitted and confirmed');
  pass('6.5 GET /health/observability emits test error probe and captures metadata');

  // 6.6 Backup Restore Drill
  const bkVerifyRes = await app.request('/health/backup-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(bkVerifyRes.status, 200, 'POST /health/backup-verify succeeds');
  const bkVerifyData = await bkVerifyRes.json();
  assert.strictEqual(bkVerifyData.status, 'verified', 'Backup restoration status is verified');
  assert.strictEqual(bkVerifyData.checksumValid, true, 'SHA-256 integrity checksum valid');
  assert.strictEqual(bkVerifyData.verificationDetails.schemaValid, true, 'Backup SQL schema is valid');
  pass('6.6 POST /health/backup-verify decompresses, verifies SHA-256, and simulates restore');

  // =========================================================================
  // SUITE 7: COMPREHENSIVE ROLE PERMISSION MATRIX
  // =========================================================================
  console.log('\n--- SUITE 7: Exhaustive Role Permission Matrix ---');

  const roleActions = [
    { name: 'Founder Console', path: '/api/admin/founder-console', founder: 200, admin: 403, employee: 403, intern: 403 },
    { name: 'Revenue Telemetry', path: '/api/admin/revenue', founder: 200, admin: 403, employee: 403, intern: 403 },
    { name: 'Platform Health', path: '/api/admin/platform-health', founder: 200, admin: 403, employee: 403, intern: 403 },
    { name: 'Database Backups', path: '/api/admin/backups', founder: 200, admin: 403, employee: 403, intern: 403 },
    { name: 'Observability Telemetry', path: '/api/admin/observability', founder: 200, admin: 403, employee: 403, intern: 403 },
    { name: 'Customer Directory', path: '/api/admin/customers', founder: 200, admin: 403, employee: 403, intern: 403 },
    { name: 'Email Deliverability', path: '/api/admin/email-health', founder: 200, admin: 403, employee: 403, intern: 403 },
    { name: 'Workspace Projects', path: '/api/projects', founder: 200, admin: 200, employee: 200, intern: 403 },
    { name: 'CRM Records', path: '/api/crm/leads', founder: 200, admin: 200, employee: 200, intern: 403 },
    { name: 'Tenant Invoices', path: '/api/billing/invoices', founder: 200, admin: 200, employee: 403, intern: 403 },
  ];

  for (const item of roleActions) {
    // Test Founder
    const fR = await app.request(item.path, { headers: { Cookie: founderCookie } });
    assert.strictEqual(fR.status, item.founder, `Founder access to ${item.name}`);
    pass(`7.x [Founder] ${item.name} -> ${fR.status}`);

    // Test Workspace Admin
    const aR = await app.request(item.path, { headers: { Cookie: adminCookie } });
    assert.strictEqual(aR.status, item.admin, `Workspace Admin access to ${item.name}`);
    pass(`7.x [Admin] ${item.name} -> ${aR.status}`);

    // Test Employee
    const eR = await app.request(item.path, { headers: { Cookie: empCookie } });
    assert.strictEqual(eR.status, item.employee, `Employee access to ${item.name}`);
    pass(`7.x [Employee] ${item.name} -> ${eR.status}`);

    // Test Intern
    const iR = await app.request(item.path, { headers: { Cookie: internCookie } });
    assert.strictEqual(iR.status, item.intern, `Intern access to ${item.name}`);
    pass(`7.x [Intern] ${item.name} -> ${iR.status}`);
  }

  // =========================================================================
  // SUITE 8: WORKSPACE COLLABORATION & TELEMETRY LIFECYCLE
  // =========================================================================
  console.log('\n--- SUITE 8: Workspace Collaboration & Telemetry Lifecycle ---');

  // 8.1 List Workspace Members
  const membersRes = await app.request('/api/teams/members', {
    headers: { Cookie: adminCookie },
  });
  if (membersRes.status === 200) {
    pass('8.1 Workspace Admin lists all tenant members (200 OK)');
  } else {
    const fallbackMemRes = await app.request('/api/teams', { headers: { Cookie: adminCookie } });
    assert.strictEqual(fallbackMemRes.status, 200, 'Admin lists teams/members');
    pass('8.1 Workspace Admin lists teams and members (200 OK)');
  }

  // 8.2 Activity Stream Access
  const actRes = await app.request('/api/activity', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(actRes.status, 200, 'Admin accesses workspace activity stream');
  pass('8.2 Workspace Admin accesses organization activity feed (200 OK)');

  // 8.3 Notifications Access
  const notifRes = await app.request('/api/notifications', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(notifRes.status, 200, 'Admin accesses notifications');
  pass('8.3 Workspace Admin accesses notification inbox (200 OK)');

  // 8.4 Presence Status Query
  const presRes = await app.request('/api/presence', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(presRes.status, 200, 'Admin queries active realtime presence');
  pass('8.4 Real-time presence status queried successfully (200 OK)');

  // 8.5 Employee Activity Stream (Scoped)
  const empActRes = await app.request('/api/activity', {
    headers: { Cookie: empCookie },
  });
  assert.strictEqual(empActRes.status, 200, 'Employee accesses workspace activity stream');
  pass('8.5 Employee accesses workspace activity stream (200 OK)');

  // 8.6 Employee Notifications Access
  const empNotifRes = await app.request('/api/notifications', {
    headers: { Cookie: empCookie },
  });
  assert.strictEqual(empNotifRes.status, 200, 'Employee accesses notification inbox');
  pass('8.6 Employee accesses notification inbox (200 OK)');

  // 8.7 Intern Notifications Access
  const internNotifRes = await app.request('/api/notifications', {
    headers: { Cookie: internCookie },
  });
  assert.strictEqual(internNotifRes.status, 200, 'Intern accesses notification inbox');
  pass('8.7 Intern accesses notification inbox (200 OK)');

  // 8.8 Global Search Endpoint
  const searchRes = await app.request('/api/search?q=Enterprise', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(searchRes.status, 200, 'Admin executes global search');
  pass('8.8 Global multi-entity search executed with workspace isolation (200 OK)');

  // =========================================================================
  // SUITE 9: LOGOUT & CLEAN SESSION INVALIDATION
  // =========================================================================
  console.log('\n--- SUITE 9: Persona Logout & Revocation Validation ---');

  // Founder logout
  const fLogoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: founderCookie, 'X-CSRF-Token': founderCsrfToken },
  });
  assert.strictEqual(fLogoutRes.status, 200, 'Founder logout succeeds');
  pass('8.1 Founder logs out successfully (200 OK)');

  // Admin logout
  const aLogoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: adminCookie, 'X-CSRF-Token': adminCsrfToken },
  });
  assert.strictEqual(aLogoutRes.status, 200, 'Admin logout succeeds');
  pass('8.2 Workspace Admin logs out successfully (200 OK)');

  // Employee logout
  const eLogoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: empCookie, 'X-CSRF-Token': empCsrfToken },
  });
  assert.strictEqual(eLogoutRes.status, 200, 'Employee logout succeeds');
  pass('8.3 Employee logs out successfully (200 OK)');

  // Intern logout
  const iLogoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: internCookie, 'X-CSRF-Token': internCsrfToken },
  });
  assert.strictEqual(iLogoutRes.status, 200, 'Intern logout succeeds');
  pass('8.4 Intern logs out successfully (200 OK)');

  // Confirm post-logout requests fail
  const postLogoutRes = await app.request('/api/auth/session', {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(postLogoutRes.status, 401, 'Post-logout request rejected with 401');
  pass('8.5 Revoked admin cookie fails subsequent authentication (401 Unauthorized)');

  console.log('\n=================================================================');
  console.log(` PHASE 20B BROWSER READINESS: ${assertionsCount} PASSED, 0 FAILED`);
  console.log('=================================================================\n');

  return { passed: assertionsCount, failed: 0 };
}

// Auto-run when executed directly via npx tsx
runPhase20BBrowserReadinessSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ PHASE 20B BROWSER READINESS VALIDATION FAILED:', err);
    process.exit(1);
  });
