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
  console.log(' RUNNING WORKSPACE OS FULL INTEGRATION TEST SUITE');
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

  // 1. Admin Registration
  {
    const res = await testApi('POST', '/api/auth/register', {
      name: 'Sarah Connor',
      email: 'sarah@cyberdyne.io',
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

  // 2. Admin Login
  {
    const res = await testApi('POST', '/api/auth/login', {
      email: 'sarah@cyberdyne.io',
      password: 'CyberPassword2026!',
    });

    assert(res.status === 200, '2. Admin login returns HTTP 200 OK');
    assert(res.data.user.id === adminUserId, '2. Login resolves correct user ID');
    assert(res.data.user.role === 'admin', '2. Server-side session verifies Admin role');
    assert(!!res.data.token, '2. New active session token issued');
    adminToken = res.data.token;
  }

  // 3. PHASE 2: Invite-based Membership System
  let employeeInviteToken = '';
  let internInviteToken = '';
  {
    // Admin creates employee invite
    const empInviteRes = await testApi('POST', '/api/invites', {
      email: 'john@cyberdyne.io',
      role: 'employee',
    }, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert(empInviteRes.status === 201, '3. Admin can generate employee invite token');
    assert(empInviteRes.data.invite.role === 'employee', '3. Invite role is set to "employee"');
    employeeInviteToken = empInviteRes.data.invite.token;

    // Admin creates intern invite
    const intInviteRes = await testApi('POST', '/api/invites', {
      email: 'intern@cyberdyne.io',
      role: 'intern',
    }, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert(intInviteRes.status === 201, '3. Admin can generate intern invite token');
    assert(intInviteRes.data.invite.role === 'intern', '3. Invite role is set to "intern"');
    internInviteToken = intInviteRes.data.invite.token;

    // Preview Invite
    const previewRes = await testApi('GET', `/api/invites/${employeeInviteToken}`);
    assert(previewRes.status === 200, '3. Invite token preview endpoint returns 200');
    assert(previewRes.data.workspace.id === workspaceId, '3. Preview resolves correct workspace');

    // Accept Employee Invite
    const acceptEmpRes = await testApi('POST', '/api/invites/accept', {
      token: employeeInviteToken,
      name: 'John Reese',
      password: 'Password123!',
    });

    assert(acceptEmpRes.status === 200, '3. Employee accepts invite and joins workspace');
    assert(acceptEmpRes.data.user.role === 'employee', '3. Invited user is assigned "employee" (not admin)');
    employeeToken = acceptEmpRes.data.token;
    employeeUserId = acceptEmpRes.data.user.id;

    // Accept Intern Invite
    const acceptIntRes = await testApi('POST', '/api/invites/accept', {
      token: internInviteToken,
      name: 'Harold Finch',
      password: 'Password123!',
    });

    assert(acceptIntRes.status === 200, '3. Intern accepts invite and joins workspace');
    assert(acceptIntRes.data.user.role === 'intern', '3. Invited user is assigned "intern" (not admin)');
    internToken = acceptIntRes.data.token;
    internUserId = acceptIntRes.data.user.id;

    // Intern attempts to invite someone (Must be blocked)
    const internInviteAttempt = await testApi('POST', '/api/invites', {
      email: 'rogue@cyberdyne.io',
      role: 'employee',
    }, {
      Authorization: `Bearer ${internToken}`,
    });
    assert(internInviteAttempt.status === 403, '3. Intern cannot generate workspace invitations (403)');
  }

  // 4. PHASE 1 & 3: Projects CRUD, Workspace Isolation & RBAC
  let projectId = '';
  {
    // Admin creates project
    const projRes = await testApi('POST', '/api/projects', {
      title: 'Neural Network Processor',
      description: 'Design next-generation autonomous processor.',
      status: 'in_progress',
      startDate: '2026-03-01',
      dueDate: '2026-12-31',
      budget: '$500,000',
      tags: ['Hardware', 'AI'],
    }, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert(projRes.status === 201, '4. Admin creates project in PostgreSQL');
    assert(projRes.data.project.workspace_id === workspaceId, '4. Project is linked to session workspace');
    projectId = projRes.data.project.id;

    // Intern attempts to create project (Forbidden)
    const internProjRes = await testApi('POST', '/api/projects', {
      title: 'Intern Secret Project',
      description: 'Should fail',
    }, {
      Authorization: `Bearer ${internToken}`,
    });
    assert(internProjRes.status === 403, '4. Intern cannot create projects (403)');

    // Intern attempts to list projects (Forbidden)
    const internListProj = await testApi('GET', '/api/projects', undefined, {
      Authorization: `Bearer ${internToken}`,
    });
    assert(internListProj.status === 403, '4. Intern cannot view project roadmaps (403)');

    // Employee lists projects
    const empListProj = await testApi('GET', '/api/projects', undefined, {
      Authorization: `Bearer ${employeeToken}`,
    });
    assert(empListProj.status === 200, '4. Employee can list projects (200)');
  }

  // 5. PHASE 4: Tasks, CRITICAL Priority & Task Comments
  let taskId = '';
  {
    // Admin creates CRITICAL task
    const taskRes = await testApi('POST', '/api/tasks', {
      title: 'Patch Critical Kernel Vulnerability',
      description: 'Zero-day privilege escalation patch.',
      status: 'todo',
      priority: 'critical',
      assignedTo: employeeUserId,
      projectId: projectId,
      dueDate: '2026-03-10',
    }, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert(taskRes.status === 201, '5. Task created with CRITICAL priority');
    assert(taskRes.data.task.priority === 'critical', '5. Task priority is "critical"');
    taskId = taskRes.data.task.id;

    // Employee posts comment on task
    const commentRes = await testApi('POST', `/api/tasks/${taskId}/comments`, {
      content: 'Investigation started on the kernel memory map.',
    }, {
      Authorization: `Bearer ${employeeToken}`,
    });

    assert(commentRes.status === 201, '5. Employee can post comments on task');
    assert(commentRes.data.comment.user_id === employeeUserId, '5. Comment author verified as employee');

    // Admin views task comments
    const commentsList = await testApi('GET', `/api/tasks/${taskId}/comments`, undefined, {
      Authorization: `Bearer ${adminToken}`,
    });

    assert(commentsList.status === 200, '5. Task comments retrieved successfully');
    assert(commentsList.data.comments.length === 1, '5. Comment count verified in PostgreSQL');
  }

  // 6. PHASE 3: Protected Modules RBAC (Billing, Analytics, Admin Diagnostics)
  {
    // Intern attempts to access billing (403)
    const internBilling = await testApi('GET', '/api/billing/invoices', undefined, {
      Authorization: `Bearer ${internToken}`,
    });
    assert(internBilling.status === 403, '6. Intern blocked from /api/billing (403)');

    // Employee attempts to access billing (403)
    const empBilling = await testApi('GET', '/api/billing/invoices', undefined, {
      Authorization: `Bearer ${employeeToken}`,
    });
    assert(empBilling.status === 403, '6. Employee blocked from /api/billing (403)');

    // Admin accesses billing (200)
    const adminBilling = await testApi('GET', '/api/billing/invoices', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(adminBilling.status === 200, '6. Admin granted access to /api/billing (200)');

    // Intern attempts to access analytics (403)
    const internAnalytics = await testApi('GET', '/api/analytics/metrics', undefined, {
      Authorization: `Bearer ${internToken}`,
    });
    assert(internAnalytics.status === 403, '6. Intern blocked from /api/analytics (403)');

    // Admin accesses analytics (200)
    const adminAnalytics = await testApi('GET', '/api/analytics/metrics', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(adminAnalytics.status === 200, '6. Admin granted access to /api/analytics (200)');
  }

  // 7. Workspace Isolation: Company A cannot see Company B data
  {
    // Register Company B
    const companyB = await testApi('POST', '/api/auth/register', {
      name: 'Miles Dyson',
      email: 'miles@competitor.com',
      password: 'SecretPassword99!',
      workspaceName: 'Competitor Labs',
    });
    const companyBToken = companyB.data.token;
    const companyBWorkspaceId = companyB.data.workspace.id;

    // Company B creates project
    const compBProj = await testApi('POST', '/api/projects', {
      title: 'Company B Top Secret',
      description: 'Confidential project',
    }, {
      Authorization: `Bearer ${companyBToken}`,
    });
    assert(compBProj.status === 201, '7. Company B creates separate project');

    // Company A Admin lists projects -> MUST ONLY SEE Cyberdyne Systems projects
    const compAProjects = await testApi('GET', '/api/projects', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    const hasCompanyBProject = compAProjects.data.projects.some((p: any) => p.workspace_id === companyBWorkspaceId);
    assert(!hasCompanyBProject, '7. Workspace Isolation: Company A cannot see Company B projects');

    // Company B Admin lists projects -> MUST ONLY SEE Competitor Labs projects
    const compBProjects = await testApi('GET', '/api/projects', undefined, {
      Authorization: `Bearer ${companyBToken}`,
    });
    const hasCompanyAProject = compBProjects.data.projects.some((p: any) => p.workspace_id === workspaceId);
    assert(!hasCompanyAProject, '7. Workspace Isolation: Company B cannot see Company A projects');
  }

  // 8. CORS Preflight
  {
    const vercelOrigin = 'https://workspace-mavr-qq0whm00k-swastikdas18-1844s-projects.vercel.app';
    const preflightReq = new Request('http://localhost:3000/api/auth/register', {
      method: 'OPTIONS',
      headers: {
        Origin: vercelOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, authorization, x-session-token',
      },
    });

    const res = await app.fetch(preflightReq);
    assert(
      res.status === 204 || res.status === 200,
      '8. CORS preflight OPTIONS returns 204 No Content or 200 OK'
    );
    assert(
      res.headers.get('access-control-allow-origin') === vercelOrigin,
      '8. Access-Control-Allow-Origin dynamically reflects Vercel preview origin'
    );
  }

  console.log('\n==================================================');
  console.log(` TEST RUN COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================\n');

  if (failCount > 0) {
    throw new Error(`${failCount} tests failed.`);
  }
}
