import { app } from '../src/app';
import { inMemoryDb } from '../packages/database/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

export async function runExecutiveDashboardV2Tests() {
  console.log('\n===============================================================');
  console.log(' SUITE 23: Executive Dashboard V2 & Real-Time Aggregations');
  console.log('===============================================================\n');

  const wsId = 'ws-exec-v2-' + Date.now();
  const adminId = 'admin-exec-' + Date.now();
  const token = 'tok-exec-' + Date.now();

  // Seed Workspace & Admin Session
  inMemoryDb.workspaces.set(wsId, {
    id: wsId,
    name: 'Apex Innovations',
    slug: 'apex-innovations',
    ownerId: adminId,
    plan: 'enterprise',
  } as any);

  inMemoryDb.users.set(adminId, {
    id: adminId,
    name: 'Executive Leader',
    email: 'leader@apex.io',
    password: 'hash',
    role: 'admin',
    platformRole: 'admin',
  } as any);

  inMemoryDb.workspaceMembers.set('wm-1', {
    id: 'wm-1',
    workspaceId: wsId,
    userId: adminId,
    role: 'admin',
  } as any);

  inMemoryDb.sessions.set(token, {
    id: 's-1',
    userId: adminId,
    workspaceId: wsId,
    token,
    expiresAt: new Date(Date.now() + 86400000),
  } as any);

  // Seed Team
  const teamId = 'team-eng-' + Date.now();
  inMemoryDb.teams.set(teamId, {
    id: teamId,
    name: 'Engineering',
    workspaceId: wsId,
    leadId: adminId,
  });

  // Seed Projects (1 in_progress, 1 planning, 1 overdue)
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  inMemoryDb.projects.set('proj-1', {
    id: 'proj-1',
    workspaceId: wsId,
    title: 'Core Engine Platform',
    status: 'in_progress',
    progress: 50,
    dueDate: futureDate,
    createdBy: adminId,
  });

  inMemoryDb.projects.set('proj-2', {
    id: 'proj-2',
    workspaceId: wsId,
    title: 'Overdue Mobile App',
    status: 'in_progress',
    progress: 30,
    dueDate: pastDate,
    createdBy: adminId,
  });

  // Seed Tasks
  inMemoryDb.tasks.set('task-1', {
    id: 'task-1',
    workspaceId: wsId,
    title: 'Design Architecture',
    status: 'completed',
    teamId,
    assignedTo: adminId,
    updatedAt: new Date(),
  });

  inMemoryDb.tasks.set('task-2', {
    id: 'task-2',
    workspaceId: wsId,
    title: 'Implement Auth',
    status: 'in_progress',
    teamId,
    assignedTo: adminId,
    dueDate: futureDate,
  });

  // Seed CRM
  inMemoryDb.crmRecords.set('crm-1', {
    id: 'crm-1',
    workspaceId: wsId,
    name: 'Acme Corp Deal',
    deal_value: 75000,
    status: 'proposal_sent',
  });

  inMemoryDb.crmRecords.set('crm-2', {
    id: 'crm-2',
    workspaceId: wsId,
    name: 'Beta Global Deal',
    deal_value: 50000,
    status: 'won',
  });

  // Execute GET /api/dashboard/executive
  const res = await app.request('/api/dashboard/executive', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': wsId,
    },
  });

  assert(res.status === 200, 'GET /api/dashboard/executive returns 200 OK');
  const data = await res.json();

  assert(data.memberCount === 1, 'Correct live memberCount (1)');
  assert(data.activeProjects === 2, 'Correct activeProjects count (2)');
  assert(data.openTasks === 1, 'Correct openTasks count (1)');
  assert(data.completedTasks === 1, 'Correct completedTasks count (1)');
  assert(data.pipelineValue === 75000, 'Correct pipelineValue (75,000)');
  assert(data.wonRevenue === 50000, 'Correct wonRevenue (50,000)');
  assert(data.projectsAtRisk.length === 1, 'Correctly detected 1 Project At Risk (past due date)');
  assert(data.projectsAtRisk[0].id === 'proj-2', 'Overdue Mobile App flagged in projectsAtRisk');
  assert(data.teamWorkload.length >= 1, 'Team workload calculated per department');
  assert(data.recentActivity.length >= 1, 'Chronological activity stream populated');
  assert(data.member_limit === undefined, 'No member_limit present in payload');
  assert(data.seat_limit === undefined, 'No seat_limit present in payload');

  console.log('\n===============================================================');
  console.log(' SUITE 23 COMPLETE: All 12/12 Executive Dashboard V2 tests passed!');
  console.log('===============================================================\n');
}
