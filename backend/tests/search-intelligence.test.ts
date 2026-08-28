import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { attachSessionToken } from './session-test-utils';
import { AnalyticsRepository } from '../src/repositories/analytics-repository';

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
  const data = attachSessionToken(res, await res.json());
  return { status: res.status, data };
}

export async function runSearchTests() {
  console.log('\n==================================================');
  console.log(' RUNNING PHASE 5B: GLOBAL SEARCH & WORKSPACE INTELLIGENCE TESTS');
  console.log('==================================================\n');

  // Reset database for clean isolated test state
  inMemoryDb.reset();

  let adminToken = '';
  let adminUserId = '';
  let workspaceId = '';
  let employeeToken = '';
  let employeeUserId = '';
  let internToken = '';
  let internUserId = '';

  // 1. Setup Workspace & Admin
  {
    const res = await testApi('POST', '/api/auth/register', {
      name: 'Search Admin',
      email: 'search-admin@acme.corp',
      password: 'Password123!',
      workspaceName: 'Acme Search Intelligence',
    });
    assert(res.status === 201, 'Admin registered successfully');
    adminToken = res.data.token;
    adminUserId = res.data.user.id;
    workspaceId = res.data.workspace.id;
  }

  // 2. Setup Employee
  {
    const inviteRes = await testApi(
      'POST',
      '/api/invites',
      { email: 'search-emp@acme.corp', role: 'employee' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(inviteRes.status === 201, 'Employee invited');
    const inviteToken = inviteRes.data.invite.token;

    const acceptRes = await testApi('POST', '/api/invites/accept', {
      token: inviteToken,
      name: 'Search Employee',
      password: 'Password123!',
    });
    assert(acceptRes.status === 200, 'Employee accepted invite');
    employeeUserId = acceptRes.data.user.id;
    const empLogin = await testApi('POST', '/api/auth/login', {
      email: 'search-emp@acme.corp',
      password: 'Password123!',
    });
    employeeToken = empLogin.data.token;
  }

  // 3. Setup Intern
  {
    const inviteRes = await testApi(
      'POST',
      '/api/invites',
      { email: 'search-intern@acme.corp', role: 'intern' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(inviteRes.status === 201, 'Intern invited');
    const inviteToken = inviteRes.data.invite.token;

    const acceptRes = await testApi('POST', '/api/invites/accept', {
      token: inviteToken,
      name: 'Search Intern',
      password: 'Password123!',
    });
    assert(acceptRes.status === 200, 'Intern accepted invite');
    internUserId = acceptRes.data.user.id;
    const intLogin = await testApi('POST', '/api/auth/login', {
      email: 'search-intern@acme.corp',
      password: 'Password123!',
    });
    internToken = intLogin.data.token;
  }

  // 4. Seed Data across Domains for Search Testing
  let alphaProjectId = '';
  let betaProjectId = '';
  let task1Id = '';
  let learningTaskId = '';
  let devTeamId = '';
  let publicDocId = '';
  let privateDocId = '';
  let crmRecordAdminId = '';
  let crmRecordEmpId = '';

  // 4a. Create Projects
  {
    // Project 1 (Admin created, includes employee)
    const p1Res = await testApi(
      'POST',
      '/api/projects',
      {
        title: 'Project Alpha Rocket',
        description: 'Deep space search mission alpha',
        memberIds: [employeeUserId],
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(p1Res.status === 201, 'Created Project Alpha Rocket');
    alphaProjectId = p1Res.data.project.id;

    // Project 2 (Admin created, Admin only)
    const p2Res = await testApi(
      'POST',
      '/api/projects',
      {
        title: 'Project Beta Confidential',
        description: 'Classified executive search initiative',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(p2Res.status === 201, 'Created Project Beta Confidential');
    betaProjectId = p2Res.data.project.id;
  }

  // 4b. Create Tasks
  {
    // Task 1: Regular task assigned to employee
    const t1Res = await testApi(
      'POST',
      '/api/tasks',
      {
        title: 'Search Index Optimization Task',
        description: 'Optimize backend full-text queries',
        projectId: alphaProjectId,
        assignedTo: employeeUserId,
        priority: 'high',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(t1Res.status === 201, 'Created Search Index Optimization Task');
    task1Id = t1Res.data.task.id;

    // Task 2: Learning task assigned to intern
    const t2Res = await testApi(
      'POST',
      '/api/tasks',
      {
        title: 'Search Onboarding Learning Tutorial',
        description: 'Read the search platform documentation',
        projectId: alphaProjectId,
        assignedTo: internUserId,
        isLearningTask: true,
        priority: 'low',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(t2Res.status === 201, 'Created Search Onboarding Learning Tutorial');
    learningTaskId = t2Res.data.task.id;
  }

  // 4c. Create Teams
  {
    const teamRes = await testApi(
      'POST',
      '/api/teams',
      {
        name: 'Search Core Engineering Team',
        description: 'Engineers responsible for search infrastructure',
        leadId: adminUserId,
        memberIds: [employeeUserId],
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(teamRes.status === 201, 'Created Search Core Engineering Team');
    devTeamId = teamRes.data.team.id;
  }

  // 4d. Create Documents
  {
    const d1Res = await testApi(
      'POST',
      '/api/documents',
      {
        title: 'Search Architecture Whitepaper',
        fileUrl: 'https://cdn.example.com/search-whitepaper.pdf',
        fileType: 'pdf',
        fileSize: 102400,
        visibility: 'public',
        category: 'Engineering',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(d1Res.status === 201, 'Created public search whitepaper');
    publicDocId = d1Res.data.document.id;

    const d2Res = await testApi(
      'POST',
      '/api/documents',
      {
        title: 'Search Monetization Secret Roadmap',
        fileUrl: 'https://cdn.example.com/search-secret.pdf',
        fileType: 'pdf',
        fileSize: 204800,
        visibility: 'private',
        category: 'Executive',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(d2Res.status === 201, 'Created private secret roadmap');
    privateDocId = d2Res.data.document.id;
  }

  // 4e. Create CRM Records
  {
    const c1Res = await testApi(
      'POST',
      '/api/crm',
      {
        customerName: 'SearchCorp Global Enterprise',
        company: 'SearchCorp',
        email: 'sales@searchcorp.com',
        dealValue: 50000,
        notes: 'High intent enterprise search deployment customer',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(c1Res.status === 201, 'Created Admin CRM Record');
    crmRecordAdminId = c1Res.data.lead.id;

    const c2Res = await testApi(
      'POST',
      '/api/crm',
      {
        customerName: 'AlphaSearch Partner',
        company: 'Alpha Inc',
        email: 'contact@alphasearch.com',
        dealValue: 12000,
        ownerId: employeeUserId,
        notes: 'Employee managed account',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(c2Res.status === 201, 'Created Employee CRM Record');
    crmRecordEmpId = c2Res.data.lead.id;
  }

  // =========================================================================
  // TEST SUITE 1: ADMIN GLOBAL SEARCH
  // =========================================================================
  console.log('\n--- Test Suite 1: Admin Global Search ---');
  {
    const res = await testApi(
      'GET',
      '/api/search?q=Search',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(res.status === 200, 'Admin global search returned 200');
    assert(res.data.meta.query === 'Search', 'Meta query matches Search');
    assert(res.data.meta.totalResults > 0, 'Total results > 0 for Admin');
    assert(Array.isArray(res.data.projects), 'Projects array returned');
    assert(Array.isArray(res.data.tasks), 'Tasks array returned');
    assert(Array.isArray(res.data.teams), 'Teams array returned');
    assert(Array.isArray(res.data.documents), 'Documents array returned');
    assert(Array.isArray(res.data.crm), 'CRM array returned');
    assert(Array.isArray(res.data.users), 'Users array returned');

    // Admin should see both private and public docs
    const foundDocTitles = res.data.documents.map((d: any) => d.title);
    assert(
      foundDocTitles.includes('Search Architecture Whitepaper') &&
      foundDocTitles.includes('Search Monetization Secret Roadmap'),
      'Admin sees all documents including private ones'
    );
  }

  // =========================================================================
  // TEST SUITE 2: EMPLOYEE GLOBAL SEARCH & RBAC RESTRICTIONS
  // =========================================================================
  console.log('\n--- Test Suite 2: Employee Global Search & Scoping ---');
  {
    const res = await testApi(
      'GET',
      '/api/search?q=Search',
      undefined,
      { Authorization: `Bearer ${employeeToken}` }
    );
    assert(res.status === 200, 'Employee global search returned 200');

    // Employee should NOT see private doc owned by admin
    const foundDocTitles = res.data.documents.map((d: any) => d.title);
    assert(
      foundDocTitles.includes('Search Architecture Whitepaper'),
      'Employee sees public search doc'
    );
    assert(
      !foundDocTitles.includes('Search Monetization Secret Roadmap'),
      'Employee does NOT see private doc owned by Admin'
    );

    // Employee should only see CRM record they own
    const foundCrmNames = res.data.crm.map((c: any) => c.customerName);
    assert(
      !foundCrmNames.includes('SearchCorp Global Enterprise'),
      'Employee does NOT see Admin CRM record'
    );
  }

  // =========================================================================
  // TEST SUITE 3: INTERN SEARCH & RESTRICTIONS
  // =========================================================================
  console.log('\n--- Test Suite 3: Intern Search Restrictions ---');
  {
    const res = await testApi(
      'GET',
      '/api/search?q=Search',
      undefined,
      { Authorization: `Bearer ${internToken}` }
    );
    assert(res.status === 200, 'Intern global search returned 200');
    assert(res.data.projects.length === 0, 'Intern receives 0 projects');
    assert(res.data.teams.length === 0, 'Intern receives 0 teams');
    assert(res.data.crm.length === 0, 'Intern receives 0 CRM records');

    // Tasks: Intern should ONLY see learning tasks assigned to them
    const foundTasks = res.data.tasks;
    assert(
      foundTasks.every((t: any) => t.isLearningTask && t.assignedTo === internUserId),
      'Intern only sees assigned learning tasks'
    );

    // Users: Intern only sees own user
    assert(
      res.data.users.length === 1 && res.data.users[0].id === internUserId,
      'Intern only sees self in user search'
    );
  }

  // =========================================================================
  // TEST SUITE 4: INDIVIDUAL ENTITY SEARCH ENDPOINTS
  // =========================================================================
  console.log('\n--- Test Suite 4: Entity-Specific Search Endpoints ---');
  {
    // 4a. /api/search/projects
    const projRes = await testApi(
      'GET',
      '/api/search/projects?q=Rocket',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(projRes.status === 200, 'Search projects returned 200');
    assert(projRes.data.projects.length === 1, 'Found Project Alpha Rocket');
    assert(projRes.data.projects[0].title === 'Project Alpha Rocket', 'Correct project matched');

    // 4b. /api/search/tasks
    const taskRes = await testApi(
      'GET',
      '/api/search/tasks?q=Optimization',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(taskRes.status === 200, 'Search tasks returned 200');
    assert(taskRes.data.tasks.length === 1, 'Found Search Index Optimization Task');

    // 4c. /api/search/teams
    const teamRes = await testApi(
      'GET',
      '/api/search/teams?q=Core',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(teamRes.status === 200, 'Search teams returned 200');
    assert(teamRes.data.teams.length === 1, 'Found Search Core Engineering Team');

    // 4d. /api/search/documents
    const docRes = await testApi(
      'GET',
      '/api/search/documents?q=Whitepaper',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(docRes.status === 200, 'Search documents returned 200');
    assert(docRes.data.documents.length === 1, 'Found Search Architecture Whitepaper');

    // 4e. /api/search/crm
    const crmRes = await testApi(
      'GET',
      '/api/search/crm?q=SearchCorp',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(crmRes.status === 200, 'Search CRM returned 200');
    assert(crmRes.data.crm.length === 1, 'Found SearchCorp CRM Record');

    // 4f. /api/search/users
    const userRes = await testApi(
      'GET',
      '/api/search/users?q=Admin',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(userRes.status === 200, 'Search users returned 200');
    assert(userRes.data.users.length >= 1, 'Found Search Admin User');
  }

  // =========================================================================
  // TEST SUITE 5: PAGINATION & PARAMETER SAFETY
  // =========================================================================
  console.log('\n--- Test Suite 5: Pagination & Limit Safety ---');
  {
    const pageRes = await testApi(
      'GET',
      '/api/search?q=Search&page=1&pageSize=2',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(pageRes.status === 200, 'Pagination query returned 200');
    assert(pageRes.data.meta.pageSize === 2, 'Meta pageSize is 2');
    assert(pageRes.data.meta.page === 1, 'Meta page is 1');

    // Over-limit pageSize should cap at 100
    const overLimitRes = await testApi(
      'GET',
      '/api/search?q=Search&pageSize=500',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(overLimitRes.data.meta.pageSize === 100, 'Overlimit pageSize capped to 100');
  }

  // =========================================================================
  // TEST SUITE 6: MULTI-TENANT WORKSPACE ISOLATION
  // =========================================================================
  console.log('\n--- Test Suite 6: Multi-Tenant Workspace Isolation ---');
  {
    // Register Tenant B
    const tenantBRes = await testApi('POST', '/api/auth/register', {
      name: 'Tenant B Admin',
      email: 'tenantb@othercorp.com',
      password: 'Password123!',
      workspaceName: 'Tenant B Workspace',
    });
    assert(tenantBRes.status === 201, 'Tenant B registered');
    const tenantBToken = tenantBRes.data.token;

    // Search from Tenant B should find ZERO items from Tenant A
    const tenantBSearch = await testApi(
      'GET',
      '/api/search?q=Search',
      undefined,
      { Authorization: `Bearer ${tenantBToken}` }
    );
    assert(tenantBSearch.status === 200, 'Tenant B search returned 200');
    assert(tenantBSearch.data.projects.length === 0, 'Tenant B sees 0 Tenant A projects');
    assert(tenantBSearch.data.tasks.length === 0, 'Tenant B sees 0 Tenant A tasks');
    assert(tenantBSearch.data.documents.length === 0, 'Tenant B sees 0 Tenant A documents');
    assert(tenantBSearch.data.crm.length === 0, 'Tenant B sees 0 Tenant A CRM records');
  }

  // =========================================================================
  // TEST SUITE 7: SEARCH METRICS & INTELLIGENCE ANALYTICS
  // =========================================================================
  console.log('\n--- Test Suite 7: Search Intelligence Analytics ---');
  {
    const metricsRes = await testApi(
      'GET',
      '/api/analytics/search-metrics',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(metricsRes.status === 200, 'Search metrics endpoint returned 200');
    assert(
      metricsRes.data.searchMetrics.totalSearches > 0,
      'Total searches tracked in analytics'
    );
    assert(
      Array.isArray(metricsRes.data.searchMetrics.topQueries),
      'topQueries array returned'
    );
  }

  console.log('\n==================================================');
  console.log(` ALL PHASE 5B SEARCH TESTS PASSED: ${passCount} Passed, ${failCount} Failed`);
  console.log('==================================================\n');
}
