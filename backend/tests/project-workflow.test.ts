/**
 * backend/tests/project-workflow.test.ts
 * 
 * Suite 22: Project Workflow Lifecycle & State Machine Tests
 * 
 * Tests:
 * 1. Project creation starts in 'planning' state
 * 2. Start Work: Team Lead / Admin moves project from Planning to In Progress (with started_at)
 * 3. Update Progress: Assigned member / Lead logs progress % and note
 * 4. Submit for Review: Moves to 'review' with submitted_for_review_at and submitted_by
 * 5. Review Workflow: Regular Employee is forbidden from approving (403), Lead / Admin approves (200, 100% progress, completed_at)
 * 6. Request Changes: Lead / Admin requests changes (moves back to in_progress with review_feedback)
 * 7. State Machine Guard: Illegal skip (e.g. Planning -> Completed) rejected with 400
 * 8. Project Timeline API: GET /api/projects/:id/updates returns complete history
 */

import assert from 'node:assert/strict';
import { app } from '../src/app';

export async function runProjectWorkflowTests() {
  console.log('===============================================================');
  console.log(' SUITE 22: PROJECT WORKFLOW LIFECYCLE & STATE MACHINE AUDIT');
  console.log('===============================================================');

  let passed = 0;
  function pass(msg: string) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }

  const timestamp = Date.now();
  const ownerEmail = `owner-flow-${timestamp}@workflow.io`;
  const leadEmail = `lead-flow-${timestamp}@workflow.io`;
  const empEmail = `emp-flow-${timestamp}@workflow.io`;
  const password = 'Password123!';

  // 1. Register Owner & Initialize Workspace
  const ownerRegRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password,
      name: 'Workflow Owner',
      workspaceName: 'Workflow HQ',
    }),
  });
  assert.equal(ownerRegRes.status, 201);
  const ownerData = await ownerRegRes.json();
  const ownerToken = ownerData.token;
  const workspaceId = ownerData.workspace.id;
  const ownerId = ownerData.user.id;
  pass('Owner registered and workspace created');

  // 2. Invite Team Lead and Employee
  const leadInviteRes = await app.request('/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ email: leadEmail, role: 'employee' }),
  });
  assert.equal(leadInviteRes.status, 201);
  const leadInviteToken = (await leadInviteRes.json()).invite.token;

  const empInviteRes = await app.request('/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ email: empEmail, role: 'employee' }),
  });
  assert.equal(empInviteRes.status, 201);
  const empInviteToken = (await empInviteRes.json()).invite.token;

  // Accept invites
  const leadAcceptRes = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: leadInviteToken, name: 'Lead Engineer', password }),
  });
  assert.equal(leadAcceptRes.status, 200);

  const leadLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: leadEmail, password }),
  });
  assert.equal(leadLoginRes.status, 200);
  const leadLoginData = await leadLoginRes.json();
  const leadToken = leadLoginData.token;
  const leadId = leadLoginData.user.id;

  const empAcceptRes = await app.request('/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: empInviteToken, name: 'Core Contributor', password }),
  });
  assert.equal(empAcceptRes.status, 200);

  const empLoginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: empEmail, password }),
  });
  assert.equal(empLoginRes.status, 200);
  const empLoginData = await empLoginRes.json();
  const empToken = empLoginData.token;
  const empId = empLoginData.user.id;
  pass('Team Lead and Employee joined workspace and authenticated');

  // 3. Create a Team with Lead as team lead
  const teamRes = await app.request('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Alpha Engineering',
      description: 'Core platform engineering',
      leadId,
      memberIds: [leadId, empId],
    }),
  });
  assert.equal(teamRes.status, 201);
  const teamId = (await teamRes.json()).team.id;
  pass('Alpha Engineering team created with Team Lead assigned');

  // 4. Create Project in Planning state
  const projCreateRes = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      title: 'Realtime Workflow Engine',
      description: 'Phase 1 operational workflow engine',
      teamIds: [teamId],
      memberIds: [empId],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    }),
  });
  assert.equal(projCreateRes.status, 201);
  const project = (await projCreateRes.json()).project;
  assert.equal(project.status, 'planning');
  assert.equal(project.progress, 0);
  pass('Project created in Planning status with 0% progress');

  // 5. Start Work: Team Lead starts project (planning -> in_progress)
  const startRes = await app.request(`/api/projects/${project.id}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${leadToken}` },
  });
  assert.equal(startRes.status, 200);
  const startedProject = (await startRes.json()).project;
  assert.equal(startedProject.status, 'in_progress');
  assert.ok(startedProject.started_at, 'started_at timestamp must be set');
  pass('Team Lead successfully started work on initiative (planning -> in_progress)');

  // 6. Update Progress: Employee updates progress and leaves note
  const progressRes = await app.request(`/api/projects/${project.id}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({
      progress: 60,
      note: 'Completed backend state machines & APIs',
    }),
  });
  assert.equal(progressRes.status, 200);
  const progressData = await progressRes.json();
  assert.equal(progressData.project.progress, 60);
  assert.equal(progressData.update.progress, 60);
  pass('Employee updated progress to 60% with note in project_updates');

  // 7. Submit for Review: Employee submits project for review
  const submitReviewRes = await app.request(`/api/projects/${project.id}/submit-review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert.equal(submitReviewRes.status, 200);
  const reviewProject = (await submitReviewRes.json()).project;
  assert.equal(reviewProject.status, 'review');
  assert.ok(reviewProject.submitted_for_review_at);
  assert.equal(reviewProject.submitted_by, empId);
  pass('Employee submitted project for review (in_progress -> review)');

  // 8. Review RBAC: Regular employee blocked from approving review
  const empApproveRes = await app.request(`/api/projects/${project.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert.equal(empApproveRes.status, 403, 'Non-lead employee must be blocked from approving review');
  pass('Server correctly rejected approval attempt by non-lead employee with 403 Forbidden');

  // 9. Request Changes: Team Lead requests changes with feedback note
  const changesRes = await app.request(`/api/projects/${project.id}/request-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leadToken}` },
    body: JSON.stringify({
      feedback: 'Please add automated test coverage for transition bounds.',
    }),
  });
  assert.equal(changesRes.status, 200);
  const changesProject = (await changesRes.json()).project;
  assert.equal(changesProject.status, 'in_progress');
  assert.equal(changesProject.review_feedback, 'Please add automated test coverage for transition bounds.');
  pass('Team Lead requested changes, moving project back to in_progress with feedback note');

  // 10. Re-submit and Lead Approves project
  await app.request(`/api/projects/${project.id}/submit-review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const approveRes = await app.request(`/api/projects/${project.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${leadToken}` },
  });
  assert.equal(approveRes.status, 200);
  const completedProject = (await approveRes.json()).project;
  assert.equal(completedProject.status, 'completed');
  assert.equal(completedProject.progress, 100);
  assert.ok(completedProject.completed_at);
  assert.equal(completedProject.approved_by, leadId);
  pass('Team Lead approved review: project marked completed with 100% progress');

  // 11. State Machine Guard: Illegal skip rejected
  const project2Res = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      title: 'Illegal Skip Test',
      memberIds: [empId],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    }),
  });
  const project2Id = (await project2Res.json()).project.id;

  const illegalRes = await app.request(`/api/projects/${project2Id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(illegalRes.status, 400, 'Skipping planning directly to completed should be rejected');
  pass('State Machine Guard strictly blocked invalid state transition skip (400)');

  // 12. GET /api/projects/:id/updates returns complete timeline audit trail
  const updatesRes = await app.request(`/api/projects/${project.id}/updates`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.equal(updatesRes.status, 200);
  const updatesList = (await updatesRes.json()).updates;
  assert.ok(Array.isArray(updatesList));
  assert.ok(updatesList.length >= 4, 'Timeline must record all workflow milestones and updates');
  pass(`Project Activity Timeline verified with ${updatesList.length} chronological audit entries`);

  console.log(`\n🎉 SUITE 22 COMPLETE: All ${passed}/12 workflow lifecycle tests passed!`);
}
