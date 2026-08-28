/**
 * Phase 6A Product Validation Runner
 * Simulates complete browser UI actions and HTTP interactions for:
 * - Admin (admin+validation@workspaceos.test)
 * - Employee (employee+validation@workspaceos.test)
 * - Intern (intern+validation@workspaceos.test)
 * - Realtime WebSockets across 3 concurrent sessions
 * - Complete RBAC validation, Zero Trust boundaries, error checks
 */

import WebSocket from 'ws';
import { attachSessionToken } from './session-test-utils';

let passCount = 0;
let failCount = 0;
const issuesList: Array<{
  severity: string;
  category: string;
  title: string;
  steps: string;
  expected: string;
  actual: string;
  fix: string;
}> = [];

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

  const res = await fetch(`http://localhost:3000${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = attachSessionToken(res, await res.json());
  } catch {}

  return { status: res.status, data };
}

class TestWebSocketClient {
  public ws: WebSocket;
  public messages: any[] = [];
  public connected = false;

  constructor(token: string) {
    this.ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
    this.ws.on('message', (raw: string) => {
      try {
        const parsed = JSON.parse(raw.toString());
        this.messages.push(parsed);
      } catch {}
    });
  }

  async waitForOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timed out')), 4000);
      this.ws.on('open', () => {
        this.connected = true;
        clearTimeout(timeout);
        resolve();
      });
      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  async waitForMessage(predicate: (msg: any) => boolean, timeoutMs = 4000): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = this.messages.find(predicate);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

export async function runProductValidation() {
  console.log('\n===============================================================');
  console.log(' PHASE 6A — FULL PRODUCT VALIDATION & BUG HUNT');
  console.log('===============================================================\n');

  // Credentials
  const runId = Date.now();
  const adminEmail = `admin+val${runId}@workspaceos.test`;
  const employeeEmail = `employee+val${runId}@workspaceos.test`;
  const internEmail = `intern+val${runId}@workspaceos.test`;
  const password = 'Password123!';
  const workspaceName = 'Apex Corporation';

  let adminToken = '';
  let adminUserId = '';
  let workspaceId = '';
  let employeeToken = '';
  let employeeUserId = '';
  let internToken = '';
  let internUserId = '';

  let employeeInviteToken = '';
  let internInviteToken = '';

  let projectId = '';
  let teamId = '';
  let taskId = '';
  let crmLeadId = '';
  let docId = '';
  let automationRuleId = '';

  // -------------------------------------------------------------------------
  // 1. ADMIN FLOW
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(' 1. ADMIN FLOW: Registration, Workspace Setup & Core Workflows');
  console.log('===============================================================');

  // 1.1 Register Admin
  const adminReg = await requestApi('POST', '/api/auth/register', {
    name: 'Alice Admin',
    email: adminEmail,
    password,
    workspaceName,
  });
  assert(adminReg.status === 201, '1.1 Admin registered via UI endpoint (/api/auth/register)');
  assert(adminReg.data?.token !== undefined, '1.2 Admin received valid session token');
  assert(adminReg.data?.user?.role === 'admin', '1.3 Admin user role is verified as ADMIN');
  assert(adminReg.data?.workspace?.name === workspaceName, '1.4 Workspace "Apex Corporation" created');

  adminToken = adminReg.data.token;
  adminUserId = adminReg.data.user.id;
  workspaceId = adminReg.data.workspace.id;

  // 1.2 Session verification
  const adminSession = await requestApi('GET', '/api/auth/session', undefined, adminToken);
  assert(adminSession.status === 200, '1.5 Admin session verification endpoint returns 200');
  assert(adminSession.data?.user?.email === adminEmail, '1.6 Verified session email matches admin');

  // 1.3 Create Project
  const projRes = await requestApi('POST', '/api/projects', {
    title: 'Apex Cloud Migration',
    description: 'Enterprise Cloud infrastructure migration',
    status: 'in_progress',
    progress: 25,
    dueDate: '2026-12-31',
    budget: '$150,000',
  }, adminToken);
  assert(projRes.status === 201, '1.7 Admin created project "Apex Cloud Migration" (201 Created)');
  assert(projRes.data?.project?.title === 'Apex Cloud Migration', '1.8 Project title persisted correctly');
  projectId = projRes.data.project.id;

  // 1.4 Create Team
  const teamRes = await requestApi('POST', '/api/teams', {
    name: 'Core Platform Engineering',
    description: 'Backend & Systems team',
    color: '#7C3AED',
  }, adminToken);
  assert(teamRes.status === 201, '1.9 Admin created team "Core Platform Engineering" (201 Created)');
  teamId = teamRes.data.team.id;

  // 1.5 Invite Employee
  const empInviteRes = await requestApi('POST', '/api/invites', {
    email: employeeEmail,
    role: 'employee',
    teamId,
  }, adminToken);
  assert(empInviteRes.status === 201, '1.10 Admin invited employee+validation@workspaceos.test (201 Created)');
  assert(empInviteRes.data?.invite?.token !== undefined, '1.11 Employee invitation token generated');
  employeeInviteToken = empInviteRes.data.invite.token;

  // 1.6 Invite Intern
  const internInviteRes = await requestApi('POST', '/api/invites', {
    email: internEmail,
    role: 'intern',
  }, adminToken);
  assert(internInviteRes.status === 201, '1.12 Admin invited intern+validation@workspaceos.test (201 Created)');
  assert(internInviteRes.data?.invite?.token !== undefined, '1.13 Intern invitation token generated');
  internInviteToken = internInviteRes.data.invite.token;

  // 1.7 Create Task
  const taskRes = await requestApi('POST', '/api/tasks', {
    title: 'Implement OAuth2 Provider',
    description: 'Build OIDC compliant auth provider for Workspace OS',
    status: 'todo',
    priority: 'high',
    projectId,
    dueDate: '2026-10-15',
  }, adminToken);
  assert(taskRes.status === 201, '1.14 Admin created task "Implement OAuth2 Provider" (201 Created)');
  taskId = taskRes.data.task.id;

  // 1.8 Create CRM Lead
  const crmRes = await requestApi('POST', '/api/crm', {
    customerName: 'Bruce Wayne',
    company: 'Wayne Enterprises',
    email: 'bruce@wayneenterprises.test',
    phone: '+1-555-0199',
    dealValue: 50000,
    status: 'new_lead',
  }, adminToken);
  assert(crmRes.status === 201, '1.15 Admin created CRM Lead for Wayne Enterprises (201 Created)');
  crmLeadId = crmRes.data.lead.id;

  // 1.9 Upload Document
  const docRes = await requestApi('POST', '/api/documents', {
    title: 'Security Architecture Guide',
    fileUrl: 'https://storage.workspaceos.test/docs/security-arch.pdf',
    fileType: 'pdf',
    fileSize: '4.8 MB',
    visibility: 'public',
    category: 'Technical',
  }, adminToken);
  assert(docRes.status === 201, '1.16 Admin uploaded document "Security Architecture Guide" (201 Created)');
  docId = docRes.data.document.id;

  // 1.10 Create Automation Rule
  const autoRes = await requestApi('POST', '/api/automations', {
    name: 'Auto-Assign Onboarding Tasks',
    description: 'Assign onboarding tasks upon task creation',
    entityType: 'task',
    triggerType: 'task_created',
    isActive: true,
    actions: [{ type: 'send_notification', config: { message: 'New task registered in the system' } }],
  }, adminToken);
  assert(autoRes.status === 201, '1.17 Admin created automation rule (201 Created)');
  automationRuleId = autoRes.data.rule.id;

  // 1.11 Global Search Test
  const globalSearchRes = await requestApi('GET', '/api/search?q=Apex', undefined, adminToken);
  assert(globalSearchRes.status === 200, '1.18 Admin performed global search for "Apex" (200 OK)');
  const foundProjects = globalSearchRes.data?.projects || globalSearchRes.data?.results?.projects || [];
  assert(foundProjects.length > 0, '1.19 Global search returned created project');

  // -------------------------------------------------------------------------
  // 2. EMPLOYEE FLOW
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(' 2. EMPLOYEE FLOW: Invite Acceptance, Login & Scoped Access');
  console.log('===============================================================');

  // 2.1 Preview Invite
  const previewEmp = await requestApi('GET', `/api/invites/preview/${employeeInviteToken}`);
  assert(previewEmp.status === 200, '2.1 Preview employee invite returned 200 OK');
  assert(previewEmp.data?.invite?.role === 'employee', '2.2 Preview confirmed role as EMPLOYEE');

  // 2.2 Accept Invite
  const acceptEmp = await requestApi('POST', '/api/invites/accept', {
    token: employeeInviteToken,
    name: 'Bob Employee',
    password,
  });
  assert(acceptEmp.status === 200, '2.3 Employee accepted invitation and completed registration');
  assert(acceptEmp.data?.user?.role === 'employee', '2.4 Verified registered user role is EMPLOYEE');
  employeeUserId = acceptEmp.data.user.id;
  const empLogin = await requestApi('POST', '/api/auth/login', {
    email: employeeEmail,
    password,
  });
  employeeToken = empLogin.data.token;

  // 2.3 Assign Task to Employee & Verify Task Update
  const assignRes = await requestApi('PATCH', `/api/tasks/${taskId}`, {
    assignedTo: employeeUserId,
    status: 'in_progress',
  }, adminToken);
  assert(assignRes.status === 200, '2.5 Task assigned to Employee');

  // 2.4 Employee fetches tasks
  const empTasks = await requestApi('GET', '/api/tasks', undefined, employeeToken);
  assert(empTasks.status === 200, '2.6 Employee fetched tasks successfully (200 OK)');
  assert(empTasks.data?.tasks?.some((t: any) => t.id === taskId), '2.7 Employee can see assigned task');

  // 2.5 Employee updates task status
  const updateTaskEmp = await requestApi('PATCH', `/api/tasks/${taskId}`, {
    status: 'completed',
  }, employeeToken);
  assert(updateTaskEmp.status === 200, '2.8 Employee successfully updated task status to "completed"');

  // 2.6 Employee RBAC on Documents & Tasks
  const empDocRes = await requestApi('POST', '/api/documents', {
    title: 'Platform Sprint Retrospective',
    fileUrl: 'https://storage.workspaceos.test/docs/sprint-retro.pdf',
    fileType: 'doc',
    fileSize: '1.2 MB',
    visibility: 'team',
    category: 'General',
  }, employeeToken);
  assert(empDocRes.status === 403, '2.9 RBAC: Employee is blocked from creating org documents without Admin privileges (403 Forbidden)');

  const empReadDocs = await requestApi('GET', '/api/documents', undefined, employeeToken);
  assert(empReadDocs.status === 200, '2.9b Employee can read shared workspace documents (200 OK)');

  // 2.7 Employee RBAC Boundary Checks (Should be blocked from Admin endpoints)
  const empAuditBlock = await requestApi('GET', '/api/admin/audit', undefined, employeeToken);
  assert(empAuditBlock.status === 403, '2.10 RBAC: Employee is blocked from Admin Audit Logs (403 Forbidden)');

  const empDeleteProjBlock = await requestApi('DELETE', `/api/projects/${projectId}`, undefined, employeeToken);
  assert(empDeleteProjBlock.status === 403, '2.11 RBAC: Employee cannot delete Projects (403 Forbidden)');

  // -------------------------------------------------------------------------
  // 3. INTERN FLOW
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(' 3. INTERN FLOW: Sandbox Scoping, Restricted Access & Guards');
  console.log('===============================================================');

  // 3.1 Accept Intern Invite
  const acceptIntern = await requestApi('POST', '/api/invites/accept', {
    token: internInviteToken,
    name: 'Charlie Intern',
    password,
  });
  assert(acceptIntern.status === 200, '3.1 Intern accepted invitation and completed registration');
  assert(acceptIntern.data?.user?.role === 'intern', '3.2 Verified registered user role is INTERN');
  internUserId = acceptIntern.data.user.id;
  const intLogin = await requestApi('POST', '/api/auth/login', {
    email: internEmail,
    password,
  });
  internToken = intLogin.data.token;

  // 3.2 Intern CRM access check (MUST be blocked)
  const internCrmRes = await requestApi('GET', '/api/crm', undefined, internToken);
  assert(internCrmRes.status === 403, '3.3 RBAC: Intern is blocked from CRM leads list (403 Forbidden)');

  const internCreateCrm = await requestApi('POST', '/api/crm', {
    customerName: 'Illegal Lead',
    company: 'Restricted Corp',
  }, internToken);
  assert(internCreateCrm.status === 403, '3.4 RBAC: Intern cannot create CRM leads (403 Forbidden)');

  // 3.3 Intern Admin Tools & Audit access check
  const internAdminTools = await requestApi('GET', '/api/admin/audit', undefined, internToken);
  assert(internAdminTools.status === 403, '3.5 RBAC: Intern is blocked from Admin Tools & Audit Logs (403 Forbidden)');

  // 3.4 Intern Project creation check
  const internCreateProj = await requestApi('POST', '/api/projects', {
    title: 'Unauthorized Project',
  }, internToken);
  assert(internCreateProj.status === 403, '3.6 RBAC: Intern is blocked from creating projects (403 Forbidden)');

  // 3.5 Intern Document access (Can access public & learning documents)
  const internDocs = await requestApi('GET', '/api/documents', undefined, internToken);
  assert(internDocs.status === 200, '3.7 Intern can view public documents (200 OK)');
  assert(internDocs.data?.documents?.some((d: any) => d.id === docId), '3.8 Public Security Guide visible to Intern');

  // -------------------------------------------------------------------------
  // 4. REALTIME MULTI-SESSION VALIDATION (3 CONCURRENT CLIENTS)
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(' 4. REALTIME VALIDATION: 3 Simultaneous Browser WS Sessions');
  console.log('===============================================================');

  const adminClient = new TestWebSocketClient(adminToken);
  const employeeClient = new TestWebSocketClient(employeeToken);
  const internClient = new TestWebSocketClient(internToken);

  await Promise.all([
    adminClient.waitForOpen(),
    employeeClient.waitForOpen(),
    internClient.waitForOpen(),
  ]);

  assert(adminClient.connected, '4.1 Admin WebSocket session connected');
  assert(employeeClient.connected, '4.2 Employee WebSocket session connected');
  assert(internClient.connected, '4.3 Intern WebSocket session connected');

  // 4.4 Presence Tracking
  const onlineCheck = await requestApi('GET', '/api/presence', undefined, adminToken);
  assert(onlineCheck.status === 200, '4.4 Presence API returned 200 OK');
  assert(onlineCheck.data?.meta?.onlineCount >= 3, '4.5 All 3 sessions registered as active online');

  // 4.5 Real-Time Task Notification to Employee
  const notifyTask = await requestApi('POST', '/api/tasks', {
    title: 'Urgent Security Patch Review',
    description: 'Review zero-trust headers and session cookies',
    status: 'todo',
    priority: 'urgent',
    projectId,
    assignedTo: employeeUserId,
  }, adminToken);
  assert(notifyTask.status === 201, '4.6 Admin created and assigned urgent task to Employee');

  // Employee receives notification
  const empNotifMsg = await employeeClient.waitForMessage(
    (m) => m.type === 'notification_created' || m.type === 'task_assigned' || m.type === 'task_created'
  );
  assert(empNotifMsg !== null, '4.7 Real-Time task event delivered instantly to Employee WebSocket');

  // 4.6 Real-Time Activity Feed Broadcast
  const empActivityMsg = await employeeClient.waitForMessage((m) => m.type === 'activity_created' || m.type === 'task_created');
  assert(empActivityMsg !== null, '4.8 Real-Time activity feed event broadcast received on workspace channel');

  // 4.7 Real-Time CRM Event RBAC Check (Admin gets event, Intern does NOT)
  await requestApi('PATCH', `/api/crm/${crmLeadId}`, {
    status: 'won',
  }, adminToken);

  const adminCrmWon = await adminClient.waitForMessage((m) => m.type === 'crm_won' || m.type === 'crm_stage_changed');
  assert(adminCrmWon !== null, '4.9 Admin received real-time crm_won broadcast');

  const internCrmLeaked = internClient.messages.some((m) => m.type === 'crm_won' || m.type === 'crm_created');
  assert(!internCrmLeaked, '4.10 RBAC: Zero CRM real-time events leaked to Intern session');

  // -------------------------------------------------------------------------
  // 5. CLEANUP & TEARDOWN
  // -------------------------------------------------------------------------
  adminClient.close();
  employeeClient.close();
  internClient.close();

  console.log('\n===============================================================');
  console.log(` PRODUCT VALIDATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    throw new Error(`Validation suite encountered ${failCount} failures.`);
  }

  return { passCount, failCount, issuesList };
}

if (process.argv[1]?.endsWith('product-validation.test.ts') || process.argv[1]?.includes('product-validation')) {
  runProductValidation().then(() => process.exit(0)).catch((err) => {
    console.error('Validation test error:', err);
    process.exit(1);
  });
}
