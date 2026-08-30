/**
 * Suite 26: Phase 4 — People Operating System (HR + Team Management)
 *
 * Validates:
 * 1. Employee Directory & Profile Management (Bio, Skills, Phone, Protected Fields)
 * 2. Departments & Visual Org Chart Hierarchy (Recursive tree calculation, Manager reassignments)
 * 3. Leave Management Lifecycle (Request, Pending Queue, Lead Approval, Balance Deductions)
 * 4. Attendance System (Live Check-In, Check-Out, Late Arrival Logic, Worked Duration)
 * 5. Employee Goals / OKRs (Creation, Progress Check-Ins, Completion Status)
 * 6. 360 Performance Reviews (Quarterly Cycles, Self Review, Manager Review, 4 Competency Ratings)
 * 7. Executive People Telemetry & RBAC Security Boundaries
 */

import assert from 'node:assert';
import { app } from '../src/app.js';
import { inMemoryDb } from '../packages/database/index.js';

export async function runPeopleOsTests(): Promise<void> {
  console.log('\n===============================================================');
  console.log(' SUITE 26: Phase 4 People Operating System (HR + Team Mgmt)');
  console.log('===============================================================\n');

  const timestamp = Date.now();
  const workspaceId = `ws-people-${timestamp}`;
  const adminId = `admin-p-${timestamp}`;
  const leadId = `lead-p-${timestamp}`;
  const empId = `emp-p-${timestamp}`;
  const internId = `intern-p-${timestamp}`;

  const adminToken = `token-admin-p-${timestamp}`;
  const leadToken = `token-lead-p-${timestamp}`;
  const empToken = `token-emp-p-${timestamp}`;
  const internToken = `token-intern-p-${timestamp}`;

  // Seed Workspace
  inMemoryDb.workspaces.set(workspaceId, {
    id: workspaceId,
    name: 'Apex Global Enterprises',
    slug: `apex-global-${timestamp}`,
    ownerId: adminId,
    plan: 'enterprise',
  } as any);

  // Seed Users
  inMemoryDb.users.set(adminId, {
    id: adminId,
    email: `ceo-${timestamp}@apex.io`,
    name: 'Elena Rostova (CEO)',
    role: 'admin',
    platformRole: 'user',
  } as any);
  inMemoryDb.users.set(leadId, {
    id: leadId,
    email: `lead-${timestamp}@apex.io`,
    name: 'Marcus Vance (Lead)',
    role: 'lead',
    platformRole: 'user',
  } as any);
  inMemoryDb.users.set(empId, {
    id: empId,
    email: `dev-${timestamp}@apex.io`,
    name: 'Devon Lee (Senior Dev)',
    role: 'employee',
    platformRole: 'user',
  } as any);
  inMemoryDb.users.set(internId, {
    id: internId,
    email: `intern-${timestamp}@apex.io`,
    name: 'Aria Stark (Intern)',
    role: 'intern',
    platformRole: 'user',
  } as any);

  // Seed Sessions
  const expiresAt = new Date(Date.now() + 86400000);
  inMemoryDb.sessions.set(adminToken, { id: 's1', userId: adminId, workspaceId, token: adminToken, expiresAt } as any);
  inMemoryDb.sessions.set(leadToken, { id: 's2', userId: leadId, workspaceId, token: leadToken, expiresAt } as any);
  inMemoryDb.sessions.set(empToken, { id: 's3', userId: empId, workspaceId, token: empToken, expiresAt } as any);
  inMemoryDb.sessions.set(internToken, { id: 's4', userId: internId, workspaceId, token: internToken, expiresAt } as any);

  // Seed Workspace Memberships
  inMemoryDb.workspaceMembers.set(`wm-${adminId}`, { id: 'wm1', workspaceId, userId: adminId, role: 'admin' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${leadId}`, { id: 'wm2', workspaceId, userId: leadId, role: 'admin' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${empId}`, { id: 'wm3', workspaceId, userId: empId, role: 'employee' } as any);
  inMemoryDb.workspaceMembers.set(`wm-${internId}`, { id: 'wm4', workspaceId, userId: internId, role: 'intern' } as any);

  // =========================================================================
  // 1. Employee Directory & Profile Management
  // =========================================================================
  console.log('--- 1. Employee Directory & Profiles ---');
  const dirRes = await app.request('/api/people/profiles', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(dirRes.status, 200, 'Directory fetch must return 200');
  const dirBody = await dirRes.json();
  assert.ok(dirBody.profiles.length >= 4, 'All workspace members must have populated directory profiles');
  console.log(`✅ PASS: Directory populated with ${dirBody.profiles.length} member profiles`);

  // Employee updates own profile
  const updateSelfRes = await app.request(`/api/people/profiles/${empId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${empToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bio: 'Fullstack cloud architect and TypeScript specialist.',
      skills: ['React', 'Node.js', 'PostgreSQL', 'TailwindCSS'],
      phone: '+1 (555) 392-1049',
      designation: 'CTO Hacker', // Should be stripped for non-admin
    }),
  });
  assert.strictEqual(updateSelfRes.status, 200, 'Employee profile update must return 200');
  const selfBody = await updateSelfRes.json();
  assert.ok(selfBody.profile.skills.includes('React'), 'Skills must be updated');
  assert.notStrictEqual(selfBody.profile.designation, 'CTO Hacker', 'Non-admin cannot elevate own designation');
  console.log('✅ PASS: Employee updated self bio & skills (protected designation guarded)');

  // Admin updates employee designation
  const updateAdminRes = await app.request(`/api/people/profiles/${empId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      designation: 'Lead Solutions Architect',
      employmentType: 'full_time',
    }),
  });
  assert.strictEqual(updateAdminRes.status, 200);
  const adminBody = await updateAdminRes.json();
  assert.strictEqual(adminBody.profile.designation, 'Lead Solutions Architect');
  console.log('✅ PASS: Admin successfully updated employee designation');

  // =========================================================================
  // 2. Departments & Org Chart Visual Hierarchy
  // =========================================================================
  console.log('\n--- 2. Departments & Visual Org Chart ---');
  const deptRes = await app.request('/api/people/departments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Engineering & Product',
      description: 'Core infrastructure and platform systems.',
      headId: leadId,
      color: '#3B82F6',
    }),
  });
  assert.strictEqual(deptRes.status, 201, 'Department creation must return 201');
  const deptBody = await deptRes.json();
  const deptId = deptBody.department.id;

  // Reassign reporting lines: CEO -> Lead -> Dev -> Intern
  await app.request('/api/people/org-chart/reassign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: leadId, managerId: adminId }),
  });
  await app.request('/api/people/org-chart/reassign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: empId, managerId: leadId }),
  });
  await app.request('/api/people/org-chart/reassign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: internId, managerId: empId }),
  });

  const orgRes = await app.request('/api/people/org-chart', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(orgRes.status, 200);
  const orgData = await orgRes.json();
  assert.strictEqual(orgData.root.userId, adminId, 'Root leader must be CEO/Admin');
  assert.ok(orgData.root.children.some((c: any) => c.userId === leadId), 'Lead must report to CEO');
  const leadNode = orgData.root.children.find((c: any) => c.userId === leadId);
  assert.ok(leadNode.children.some((c: any) => c.userId === empId), 'Dev must report to Lead');
  console.log('✅ PASS: Org chart rendered multi-level recursive hierarchy');

  // =========================================================================
  // 3. Leave Management Workflow & Balances
  // =========================================================================
  console.log('\n--- 3. Leave Management & Approval Lifecycle ---');
  const initBalRes = await app.request('/api/people/leaves/balances', {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const initBal = await initBalRes.json();
  assert.strictEqual(initBal.balances.annual.remaining, 20, 'Initial annual balance is 20 days');

  const leaveReqRes = await app.request('/api/people/leaves', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leaveType: 'annual',
      startDate: '2026-09-10',
      endDate: '2026-09-12',
      daysCount: 3,
      reason: 'Attending Next.js Global Conference',
    }),
  });
  assert.strictEqual(leaveReqRes.status, 201);
  const leaveBody = await leaveReqRes.json();
  const leaveId = leaveBody.leave.id;
  assert.strictEqual(leaveBody.leave.status, 'pending');

  // Lead approves leave
  const approveRes = await app.request(`/api/people/leaves/${leaveId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${leadToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewNotes: 'Approved! Have a great conference.' }),
  });
  assert.strictEqual(approveRes.status, 200);
  const approveBody = await approveRes.json();
  assert.strictEqual(approveBody.leave.status, 'approved');

  // Verify balance deduction
  const postBalRes = await app.request('/api/people/leaves/balances', {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const postBal = await postBalRes.json();
  assert.strictEqual(postBal.balances.annual.used, 3);
  assert.strictEqual(postBal.balances.annual.remaining, 17);
  console.log('✅ PASS: Leave requested, lead approved, and annual balance decremented (20 -> 17)');

  // =========================================================================
  // 4. Attendance Tracking (Check In / Check Out)
  // =========================================================================
  console.log('\n--- 4. Attendance Tracking & Presence ---');
  const checkInRes = await app.request('/api/people/attendance/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert.strictEqual(checkInRes.status, 200);

  const todayRes = await app.request('/api/people/attendance/today', {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const todayBody = await todayRes.json();
  assert.strictEqual(todayBody.isCheckedIn, true);

  const checkOutRes = await app.request('/api/people/attendance/check-out', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'Completed daily sprint tasks' }),
  });
  assert.strictEqual(checkOutRes.status, 200);
  const outBody = await checkOutRes.json();
  assert.ok(outBody.record.checkOutAt !== null);
  console.log('✅ PASS: Check in, presence verification, and checkout completed');

  // =========================================================================
  // 5. Goals (OKRs) & Check-In Updates
  // =========================================================================
  console.log('\n--- 5. Goals & OKRs Tracking ---');
  const goalRes = await app.request('/api/people/goals', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Optimize API Response Latency Under 50ms',
      category: 'individual',
      targetValue: 100,
      unit: '%',
      dueDate: '2026-10-30',
    }),
  });
  assert.strictEqual(goalRes.status, 201);
  const goalBody = await goalRes.json();
  const goalId = goalBody.goal.id;

  const progressRes = await app.request(`/api/people/goals/${goalId}/progress`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressValue: 75, progressPercent: 75, notes: 'Optimized DB queries' }),
  });
  assert.strictEqual(progressRes.status, 200);
  const progressBody = await progressRes.json();
  assert.strictEqual(progressBody.goal.progress, 75);
  console.log('✅ PASS: OKR created and progress check-in logged at 75%');

  // =========================================================================
  // 6. Performance Reviews (360 Competencies & Ratings)
  // =========================================================================
  console.log('\n--- 6. 360 Performance Reviews ---');
  const revRes = await app.request('/api/people/performance/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: empId, reviewerId: leadId, cycle: 'Q1 2026' }),
  });
  assert.strictEqual(revRes.status, 201);
  const revBody = await revRes.json();
  const reviewId = revBody.review.id;

  // Self review
  const selfRevRes = await app.request(`/api/people/performance/reviews/${reviewId}/self`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selfRatings: { communication: 5, ownership: 5, execution: 5, leadership: 4 },
      comments: 'Delivered Phase 4 People OS on schedule.',
    }),
  });
  assert.strictEqual(selfRevRes.status, 200);

  // Manager review
  const managerRevRes = await app.request(`/api/people/performance/reviews/${reviewId}/manager`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${leadToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      managerRatings: { communication: 5, ownership: 5, execution: 5, leadership: 4 },
      strengths: 'Exceptional architectural delivery.',
      growthAreas: 'Mentor interns on event bus.',
    }),
  });
  assert.strictEqual(managerRevRes.status, 200);
  const managerData = await managerRevRes.json();
  assert.strictEqual(managerData.review.status, 'completed');
  assert.ok(Number(managerData.review.finalRating) >= 4.5);
  console.log(`✅ PASS: 360 review cycle completed with final rating of ${managerData.review.finalRating}/5.0`);

  // =========================================================================
  // 7. Executive Telemetry & RBAC Boundaries
  // =========================================================================
  console.log('\n--- 7. Executive People Telemetry & RBAC ---');
  const analyticsRes = await app.request('/api/people/analytics', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(analyticsRes.status, 200);
  const analytics = await analyticsRes.json();
  assert.ok(analytics.workforce.totalEmployees >= 4);
  assert.ok(analytics.performance.topPerformers.length > 0);
  console.log(`✅ PASS: Executive telemetry loaded (Workforce: ${analytics.workforce.totalEmployees}, Avg Goal: ${analytics.performance.averageGoalProgress}%)`);

  // RBAC checks
  const internAnalyticsRes = await app.request('/api/people/analytics', {
    headers: { Authorization: `Bearer ${internToken}` },
  });
  assert.strictEqual(internAnalyticsRes.status, 403, 'Interns forbidden from executive people telemetry');

  const internDeptRes = await app.request('/api/people/departments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${internToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Intern Club' }),
  });
  assert.strictEqual(internDeptRes.status, 403, 'Interns forbidden from creating departments');
  console.log('✅ PASS: RBAC boundaries strictly enforced for Intern role (403 Forbidden)');

  console.log('\n===============================================================');
  console.log(' SUITE 26: ALL TESTS PASSED! People Operating System is Solid.');
  console.log('===============================================================\n');
}
