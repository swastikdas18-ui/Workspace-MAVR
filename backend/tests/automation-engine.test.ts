import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { attachSessionToken } from './session-test-utils';
import { AnalyticsRepository } from '../src/repositories/analytics-repository';
import { AutomationRepository } from '../src/repositories/automation-repository';
import { AutomationService } from '../src/services/automation-service';
import { EventService } from '../src/services/event-service';

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

export async function runAutomationTests() {
  console.log('\n==================================================');
  console.log(' RUNNING PHASE 5C: WORKFLOW AUTOMATION ENGINE TESTS');
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

  // Workspace B for tenant isolation testing
  let wsBAdminToken = '';
  let wsBAdminUserId = '';
  let wsBWorkspaceId = '';

  // -------------------------------------------------------------
  // TEST SUITE 1: AUTH & RBAC SETUP
  // -------------------------------------------------------------
  console.log('\n--- 1. Workspace & RBAC User Setup ---');
  {
    const res = await testApi('POST', '/api/auth/register', {
      name: 'Automation Admin',
      email: 'auto-admin@acme.corp',
      password: 'Password123!',
      workspaceName: 'Acme Automation Workspace',
    });
    assert(res.status === 201, 'Admin registered successfully');
    adminToken = res.data.token;
    adminUserId = res.data.user.id;
    workspaceId = res.data.workspace.id;
    assert(!!adminToken && !!workspaceId, 'Admin token and workspace ID generated');
  }

  {
    const inviteRes = await testApi(
      'POST',
      '/api/invites',
      { email: 'auto-emp@acme.corp', role: 'employee' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(inviteRes.status === 201, 'Employee invited');
    const inviteToken = inviteRes.data.invite.token;

    const acceptRes = await testApi('POST', '/api/invites/accept', {
      token: inviteToken,
      name: 'Automation Employee',
      password: 'Password123!',
    });
    assert(acceptRes.status === 200, 'Employee accepted invite');
    employeeUserId = acceptRes.data.user.id;
    const empLogin = await testApi('POST', '/api/auth/login', {
      email: 'auto-emp@acme.corp',
      password: 'Password123!',
    });
    employeeToken = empLogin.data.token;
  }

  {
    const inviteRes = await testApi(
      'POST',
      '/api/invites',
      { email: 'auto-intern@acme.corp', role: 'intern' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(inviteRes.status === 201, 'Intern invited');
    const inviteToken = inviteRes.data.invite.token;

    const acceptRes = await testApi('POST', '/api/invites/accept', {
      token: inviteToken,
      name: 'Automation Intern',
      password: 'Password123!',
    });
    assert(acceptRes.status === 200, 'Intern accepted invite');
    internUserId = acceptRes.data.user.id;
    const intLogin = await testApi('POST', '/api/auth/login', {
      email: 'auto-intern@acme.corp',
      password: 'Password123!',
    });
    internToken = intLogin.data.token;
  }

  // Setup Workspace B (Tenant Isolation)
  {
    const res = await testApi('POST', '/api/auth/register', {
      name: 'Beta Admin',
      email: 'beta-admin@beta.corp',
      password: 'Password123!',
      workspaceName: 'Beta Corp Workspace',
    });
    assert(res.status === 201, 'Workspace B Admin registered');
    wsBAdminToken = res.data.token;
    wsBAdminUserId = res.data.user.id;
    wsBWorkspaceId = res.data.workspace.id;
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: AUTOMATION RULES CRUD & RBAC ACCESS
  // -------------------------------------------------------------
  console.log('\n--- 2. Automation Rules CRUD & RBAC Access Control ---');

  let taskRuleId = '';
  let crmRuleId = '';
  let teamRuleId = '';

  // 2.1 Admin creates Rule 1: WHEN Task Status = Completed -> Notify Admin & Create Activity
  {
    const res = await testApi(
      'POST',
      '/api/automations/rules',
      {
        name: 'On Task Completed Rule',
        description: 'Sends notification and logs activity when task is completed',
        entityType: 'task',
        triggerType: 'task_completed',
        isActive: true,
        actions: [
          {
            actionType: 'send_notification',
            actionConfig: {
              userId: 'admin',
              title: 'Task {{title}} Completed',
              message: 'Task "{{title}}" in project {{projectId}} has been completed.',
            },
          },
          {
            actionType: 'create_activity',
            actionConfig: {
              action: 'automation_task_completed',
              metadata: { source: 'automation_engine' },
            },
          },
          {
            actionType: 'create_audit',
            actionConfig: {
              action: 'AUTO_TASK_COMPLETED_AUDIT',
              resource: 'task',
            },
          },
        ],
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(res.status === 201, 'Admin created Task Completed rule successfully');
    assert(res.data.rule.name === 'On Task Completed Rule', 'Rule name matches');
    assert(res.data.rule.actions.length === 3, 'Rule has 3 actions attached');
    assert(res.data.rule.isActive === true, 'Rule is active');
    taskRuleId = res.data.rule.id;
  }

  // 2.2 Admin creates Rule 2: WHEN CRM Deal = Won -> Create Task & Send Notification
  {
    const res = await testApi(
      'POST',
      '/api/automations/rules',
      {
        name: 'On Deal Won Onboarding Task',
        description: 'Automatically creates an onboarding task and notifies admin when deal is won',
        entityType: 'crm',
        triggerType: 'crm_won',
        isActive: true,
        actions: [
          {
            actionType: 'create_task',
            actionConfig: {
              title: 'Onboarding for {{customerName}} ({{company}})',
              description: 'Follow up onboarding after deal won with value ${{dealValue}}',
              assignedTo: 'actor',
            },
          },
          {
            actionType: 'send_notification',
            actionConfig: {
              userId: 'admin',
              title: 'Deal Won: {{customerName}}',
              message: 'Deal with {{customerName}} at {{company}} was won! Value: ${{dealValue}}',
            },
          },
        ],
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(res.status === 201, 'Admin created Deal Won automation rule');
    crmRuleId = res.data.rule.id;
  }

  // 2.3 Admin creates Rule 3: WHEN Employee Joins Team -> Create Task & Send Notification
  {
    const res = await testApi(
      'POST',
      '/api/automations/rules',
      {
        name: 'Team Member Welcome Automation',
        description: 'Assigns welcome checklist when member joins team',
        entityType: 'team',
        triggerType: 'member_added',
        isActive: true,
        actions: [
          {
            actionType: 'create_task',
            actionConfig: {
              title: 'Welcome Onboarding Task for User {{userId}}',
              description: 'Welcome to team {{teamName}}! Complete initial workspace setup.',
              assignedTo: 'assignee',
            },
          },
          {
            actionType: 'send_notification',
            actionConfig: {
              userId: 'assignee',
              title: 'Welcome to {{teamName}}',
              message: 'You have been added to {{teamName}}. Check your new onboarding tasks.',
            },
          },
        ],
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(res.status === 201, 'Admin created Team Member Welcome rule');
    teamRuleId = res.data.rule.id;
  }

  // 2.4 Employee Role Restrictions
  {
    // Employee CANNOT view rules (Admin only requirement)
    const listRes = await testApi(
      'GET',
      '/api/automations/rules',
      undefined,
      { Authorization: `Bearer ${employeeToken}` }
    );
    assert(listRes.status === 403, 'Employee is forbidden from listing automation rules (403)');

    // Employee CANNOT create rule (403 Forbidden)
    const createRes = await testApi(
      'POST',
      '/api/automations/rules',
      {
        name: 'Unauthorized Rule',
        entityType: 'task',
        triggerType: 'task_created',
        actions: [],
      },
      { Authorization: `Bearer ${employeeToken}` }
    );
    assert(createRes.status === 403, 'Employee is forbidden from creating automation rules (403)');

    // Employee CANNOT update rule (403 Forbidden)
    const updateRes = await testApi(
      'PUT',
      `/api/automations/rules/${taskRuleId}`,
      { name: 'Hacked Name' },
      { Authorization: `Bearer ${employeeToken}` }
    );
    assert(updateRes.status === 403, 'Employee is forbidden from updating rules (403)');

    // Employee CANNOT toggle rule (403 Forbidden)
    const toggleRes = await testApi(
      'PATCH',
      `/api/automations/rules/${taskRuleId}/toggle`,
      {},
      { Authorization: `Bearer ${employeeToken}` }
    );
    assert(toggleRes.status === 403, 'Employee is forbidden from toggling rules (403)');

    // Employee CANNOT delete rule (403 Forbidden)
    const deleteRes = await testApi(
      'DELETE',
      `/api/automations/rules/${taskRuleId}`,
      undefined,
      { Authorization: `Bearer ${employeeToken}` }
    );
    assert(deleteRes.status === 403, 'Employee is forbidden from deleting rules (403)');
  }

  // 2.5 Intern Role Restrictions
  {
    // Intern CANNOT view rules (403 Forbidden)
    const listRes = await testApi(
      'GET',
      '/api/automations/rules',
      undefined,
      { Authorization: `Bearer ${internToken}` }
    );
    assert(listRes.status === 403, 'Intern is forbidden from viewing automation rules (403)');

    // Intern CANNOT view executions (403 Forbidden)
    const execRes = await testApi(
      'GET',
      '/api/automations/executions',
      undefined,
      { Authorization: `Bearer ${internToken}` }
    );
    assert(execRes.status === 403, 'Intern is forbidden from viewing execution history (403)');

    // Intern CANNOT trigger automations (403 Forbidden)
    const trigRes = await testApi(
      'POST',
      '/api/automations/trigger',
      { triggerType: 'task_completed', entityType: 'task', entityId: 't-1' },
      { Authorization: `Bearer ${internToken}` }
    );
    assert(trigRes.status === 403, 'Intern is forbidden from triggering automations (403)');
  }

  // 2.6 Admin updates and toggles rule
  {
    const updateRes = await testApi(
      'PUT',
      `/api/automations/rules/${taskRuleId}`,
      {
        name: 'Updated Task Completed Automation',
        description: 'Refined description for task completion workflow',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(updateRes.status === 200, 'Admin updated rule');
    assert(updateRes.data.rule.name === 'Updated Task Completed Automation', 'Updated rule name saved');

    // Toggle rule to inactive
    const toggleRes = await testApi(
      'PATCH',
      `/api/automations/rules/${taskRuleId}/toggle`,
      {},
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(toggleRes.status === 200, 'Admin toggled rule');
    assert(toggleRes.data.rule.isActive === false, 'Rule is now inactive');

    // Toggle back to active
    const toggleBackRes = await testApi(
      'PATCH',
      `/api/automations/rules/${taskRuleId}/toggle`,
      {},
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(toggleBackRes.status === 200, 'Admin toggled rule back');
    assert(toggleBackRes.data.rule.isActive === true, 'Rule is active again');
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: TRIGGER MATCHING & WORKFLOW EXECUTION
  // -------------------------------------------------------------
  console.log('\n--- 3. Trigger Matching & Workflow Execution ---');

  // 3.1 Setup a Project and Task
  let projectId = '';
  let taskId = '';
  {
    const projRes = await testApi(
      'POST',
      '/api/projects',
      {
        title: 'Core Engine Overhaul',
        description: 'Re-architecting the core event pipeline',
        budget: '25000',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(projRes.status === 201, 'Project created for test');
    projectId = projRes.data.project.id;

    const taskRes = await testApi(
      'POST',
      '/api/tasks',
      {
        title: 'Optimize Query Indices',
        projectId,
        assignedTo: employeeUserId,
        priority: 'high',
        status: 'review',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(taskRes.status === 201, 'Task created for test');
    taskId = taskRes.data.task.id;
  }

  // 3.2 Trigger Task Completed Event via Task Update API
  {
    const updateRes = await testApi(
      'PUT',
      `/api/tasks/${taskId}`,
      { status: 'completed' },
      { Authorization: `Bearer ${employeeToken}` }
    );
    assert(updateRes.status === 200, 'Task updated to completed by Employee');

    // Verify executions were logged in Automation Repository
    const executions = await AutomationRepository.listExecutions(workspaceId, { ruleId: taskRuleId });
    assert(executions.length > 0, 'Automation execution recorded for task_completed');
    assert(executions[0].status === 'success', 'Automation execution status is success');
    assert(executions[0].entityType === 'task', 'Execution entityType is task');
    assert(executions[0].entityId === taskId, 'Execution entityId matches completed taskId');

    // Verify Notification was generated for Admin
    const notifRes = await testApi(
      'GET',
      '/api/notifications',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(notifRes.status === 200, 'Admin fetched notifications');
    const autoNotif = notifRes.data.notifications.find((n: any) =>
      n.title.includes('Optimize Query Indices')
    );
    assert(!!autoNotif, 'Dynamic variable {{title}} interpolated in notification title');
    assert(autoNotif.message.includes(projectId), 'Dynamic variable {{projectId}} interpolated in notification body');

    // Verify Activity Feed Log
    const actRes = await testApi(
      'GET',
      '/api/activity',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(actRes.status === 200, 'Admin fetched activity feed');
    const autoActivity = actRes.data.activities.find((a: any) =>
      a.action === 'automation_task_completed'
    );
    assert(!!autoActivity, 'Activity logged by automation action');
  }

  // 3.3 Trigger CRM Won Event -> Automated Task Creation
  {
    // Create CRM Deal
    const crmRes = await testApi(
      'POST',
      '/api/crm',
      {
        customerName: 'Enterprise Global Inc',
        company: 'Enterprise Global',
        dealValue: 75000,
        status: 'negotiation',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(crmRes.status === 201, 'CRM deal created in negotiation stage');
    const crmId = crmRes.data.lead?.id || crmRes.data.record?.id;

    // Move stage to 'won'
    const winRes = await testApi(
      'PUT',
      `/api/crm/${crmId}`,
      { status: 'won' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(winRes.status === 200, 'CRM deal status moved to won');

    // Verify CRM rule execution
    const crmExecutions = await AutomationRepository.listExecutions(workspaceId, { ruleId: crmRuleId });
    assert(crmExecutions.length > 0, 'Automation execution recorded for crm_won');
    assert(crmExecutions[0].status === 'success', 'CRM automation executed successfully');

    // Verify that the Onboarding task was auto-created in tasks
    const tasksRes = await testApi(
      'GET',
      '/api/tasks',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(tasksRes.status === 200, 'Admin listed tasks');
    const autoTask = tasksRes.data.tasks.find((t: any) =>
      t.title.includes('Enterprise Global Inc')
    );
    assert(!!autoTask, 'Auto-created onboarding task created by CRM automation rule');
    assert(autoTask.description.includes('$75000'), 'Variable {{dealValue}} successfully interpolated in task description');

    // Verify Admin received deal won notification
    const notifs = await testApi(
      'GET',
      '/api/notifications',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    const dealNotif = notifs.data.notifications.find((n: any) =>
      n.title.includes('Deal Won: Enterprise Global Inc')
    );
    assert(!!dealNotif, 'Admin received Deal Won notification with interpolated details');
  }

  // 3.4 Trigger Team Member Added Event -> Automated Onboarding Checklist
  {
    // Create a team
    const teamRes = await testApi(
      'POST',
      '/api/teams',
      {
        name: 'DevOps & Reliability',
        description: 'Infrastructure and cloud operations',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(teamRes.status === 201, 'Team created');
    const teamId = teamRes.data.team.id;

    // Add employee to team
    const addMemberRes = await testApi(
      'POST',
      `/api/teams/${teamId}/members`,
      { userId: employeeUserId },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(addMemberRes.status === 200, 'Member added to team');

    // Verify Team Member rule execution
    const teamExecutions = await AutomationRepository.listExecutions(workspaceId, { ruleId: teamRuleId });
    assert(teamExecutions.length > 0, 'Automation execution recorded for member_added');
    assert(teamExecutions[0].status === 'success', 'Member added automation executed successfully');

    // Verify Employee received welcome notification
    const empNotifs = await testApi(
      'GET',
      '/api/notifications',
      undefined,
      { Authorization: `Bearer ${employeeToken}` }
    );
    const welcomeNotif = empNotifs.data.notifications.find((n: any) =>
      n.title.includes('Welcome to DevOps & Reliability')
    );
    assert(!!welcomeNotif, 'Employee received automated welcome notification with team name');
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: INACTIVE RULE ISOLATION & TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- 4. Inactive Rule & Multi-Tenant Isolation ---');

  // 4.1 Inactive Rule should NOT execute
  {
    // Create an inactive rule
    const inactiveRuleRes = await testApi(
      'POST',
      '/api/automations/rules',
      {
        name: 'Inactive Auto Rule',
        entityType: 'task',
        triggerType: 'task_created',
        isActive: false,
        actions: [
          {
            actionType: 'send_notification',
            actionConfig: { userId: 'admin', title: 'Should never trigger', message: 'Inactive test' },
          },
        ],
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(inactiveRuleRes.status === 201, 'Inactive rule created');
    const inactiveId = inactiveRuleRes.data.rule.id;

    // Create a new task
    await testApi(
      'POST',
      '/api/tasks',
      {
        title: 'Task to test inactive rule',
        projectId,
      },
      { Authorization: `Bearer ${adminToken}` }
    );

    // Verify NO execution logged for inactive rule
    const execs = await AutomationRepository.listExecutions(workspaceId, { ruleId: inactiveId });
    assert(execs.length === 0, 'Inactive rule produced zero executions');
  }

  // 4.2 Multi-Tenant Isolation (Workspace A vs Workspace B)
  {
    // Create a rule in Workspace B
    const wsBRuleRes = await testApi(
      'POST',
      '/api/automations/rules',
      {
        name: 'Workspace B Isolated Rule',
        entityType: 'task',
        triggerType: 'task_completed',
        isActive: true,
        actions: [
          {
            actionType: 'send_notification',
            actionConfig: { userId: 'admin', title: 'WS B Notif', message: 'Triggered in B' },
          },
        ],
      },
      { Authorization: `Bearer ${wsBAdminToken}` }
    );
    assert(wsBRuleRes.status === 201, 'Workspace B rule created');
    const wsBRuleId = wsBRuleRes.data.rule.id;

    // Trigger an event in Workspace A
    await EventService.emitTaskCompleted(
      { workspaceId, actorId: adminUserId },
      { id: 't-test-a', title: 'Task in A', projectId: 'p-a' }
    );

    // Verify Workspace B rule was NOT executed
    const wsBExecs = await AutomationRepository.listExecutions(wsBWorkspaceId, { ruleId: wsBRuleId });
    assert(wsBExecs.length === 0, 'Workspace B rule was not triggered by Workspace A event');

    // Verify Workspace B Admin cannot access Workspace A rules
    const wsBGetRes = await testApi(
      'GET',
      `/api/automations/rules/${taskRuleId}`,
      undefined,
      { Authorization: `Bearer ${wsBAdminToken}` }
    );
    assert(wsBGetRes.status === 404, 'Workspace B cannot access Workspace A rule (404 Not Found)');
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: RESILIENCE & ERROR HANDLING
  // -------------------------------------------------------------
  console.log('\n--- 5. Error Handling & Action Resilience ---');
  {
    // Create a rule with an intentionally unsupported action to verify graceful failure handling
    const faultRuleRes = await testApi(
      'POST',
      '/api/automations/rules',
      {
        name: 'Fault Tolerant Rule',
        entityType: 'document',
        triggerType: 'document_uploaded',
        isActive: true,
        actions: [
          {
            actionType: 'invalid_non_existent_action' as any,
            actionConfig: { dummy: 'value' },
          },
        ],
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(faultRuleRes.status === 201, 'Fault tolerant test rule created');
    const faultRuleId = faultRuleRes.data.rule.id;

    // Trigger event
    await EventService.emitDocumentUploaded(
      { workspaceId, actorId: adminUserId },
      { id: 'doc-fail-1', title: 'Architecture.pdf', visibility: 'organization' }
    );

    // Verify execution recorded as 'failed' with error message without crashing server
    const faultExecs = await AutomationRepository.listExecutions(workspaceId, { ruleId: faultRuleId });
    assert(faultExecs.length > 0, 'Fault execution recorded in history');
    assert(faultExecs[0].status === 'failed', 'Execution status marked as failed');
    assert(
      faultExecs[0].executionResult.error.includes('Unsupported action type'),
      'Error message captured in executionResult'
    );
  }

  // -------------------------------------------------------------
  // TEST SUITE 6: AUTOMATION ANALYTICS & EXECUTION METRICS
  // -------------------------------------------------------------
  console.log('\n--- 6. Automation Analytics & Execution Metrics ---');
  {
    const metricsRes = await testApi(
      'GET',
      '/api/automations/metrics',
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(metricsRes.status === 200, 'Admin fetched automation metrics');
    const metrics = metricsRes.data;
    assert(metrics.automationRules >= 4, 'Metric automationRules >= 4');
    assert(metrics.automationExecutions >= 4, 'Metric automationExecutions >= 4');
    assert(metrics.successfulExecutions >= 3, 'Metric successfulExecutions >= 3');
    assert(metrics.failedExecutions >= 1, 'Metric failedExecutions >= 1');
    assert(
      metrics.successfulExecutions + metrics.failedExecutions === metrics.automationExecutions,
      'Success + Failed = Total Executions'
    );
  }

  // -------------------------------------------------------------
  // TEST SUITE 7: RULE DELETION & CASCADE
  // -------------------------------------------------------------
  console.log('\n--- 7. Rule Deletion & Cascade Clean Up ---');
  {
    // Delete Team Rule
    const delRes = await testApi(
      'DELETE',
      `/api/automations/rules/${teamRuleId}`,
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(delRes.status === 200, 'Admin deleted team rule');

    // Verify Rule is gone
    const getRes = await testApi(
      'GET',
      `/api/automations/rules/${teamRuleId}`,
      undefined,
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(getRes.status === 404, 'Deleted rule returns 404');
  }

  // -------------------------------------------------------------
  // FINAL TEST REPORT
  // -------------------------------------------------------------
  console.log('\n==================================================');
  console.log(` PHASE 5C TEST SUMMARY:`);
  console.log(` Total Assertions: ${passCount + failCount}`);
  console.log(` Passed: ${passCount}`);
  console.log(` Failed: ${failCount}`);
  console.log('==================================================\n');

  if (failCount > 0) {
    throw new Error(`Automation Engine test suite failed with ${failCount} errors.`);
  }
}
