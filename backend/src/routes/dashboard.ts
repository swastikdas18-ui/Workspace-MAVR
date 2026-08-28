import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { inMemoryDb, getDb, schema } from '../../packages/database';
import { eq } from 'drizzle-orm';
import { AnalyticsRepository } from '../repositories/analytics-repository';

export const dashboardRouter = new Hono();

dashboardRouter.use('*', authMiddleware);

/**
 * GET /api/dashboard - Aggregated Workspace Metrics & Dashboard State
 */
dashboardRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace?.id) {
      return c.json(
        {
          metrics: {
            projectsCount: 0,
            tasksCount: 0,
            completedTasksCount: 0,
            membersCount: 1,
            crmLeadsCount: 0,
            healthScore: 50,
          },
          recentActivity: [],
          zeroState: true,
        },
        200
      );
    }

    const wsId = workspace.id;

    // 1. Projects
    let projectsCount = 0;
    // 2. Tasks
    let tasksCount = 0;
    let completedTasksCount = 0;
    // 3. Members
    let membersCount = 0;
    // 4. CRM
    let crmLeadsCount = 0;

    const db = getDb();
    if (db) {
      try {
        const [projRows, taskRows, memberRows, crmRows] = await Promise.all([
          db.select().from(schema.projects).where(eq(schema.projects.workspaceId, wsId)),
          db.select().from(schema.tasks).where(eq(schema.tasks.workspaceId, wsId)),
          db.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.workspaceId, wsId)),
          db.select().from(schema.crmRecords).where(eq(schema.crmRecords.workspaceId, wsId)),
        ]);

        projectsCount = projRows.length;
        tasksCount = taskRows.length;
        completedTasksCount = taskRows.filter((t) => t.status === 'completed').length;
        membersCount = memberRows.length;
        crmLeadsCount = crmRows.length;
      } catch (err: any) {
        console.warn('[Dashboard API] DB aggregation fallback to memory:', err.message);
      }
    }

    if (projectsCount === 0 && tasksCount === 0 && membersCount === 0) {
      projectsCount = Array.from(inMemoryDb.projects.values()).filter((p) => p.workspaceId === wsId).length;
      const memTasks = Array.from(inMemoryDb.tasks.values()).filter((t) => t.workspaceId === wsId);
      tasksCount = memTasks.length;
      completedTasksCount = memTasks.filter((t) => t.status === 'completed').length;
      membersCount = Array.from(inMemoryDb.workspaceMembers.values()).filter((m) => m.workspaceId === wsId).length || 1;
      crmLeadsCount = Array.from(inMemoryDb.crmRecords.values()).filter((r) => r.workspaceId === wsId).length;
    }

    const engagement = await AnalyticsRepository.getEngagementSummary(wsId);
    const recentActivity = await AnalyticsRepository.getEvents(wsId, 10);

    return c.json(
      {
        metrics: {
          projectsCount,
          tasksCount,
          completedTasksCount,
          membersCount: Math.max(1, membersCount),
          crmLeadsCount,
          healthScore: engagement.healthScore.score,
        },
        engagement,
        recentActivity: recentActivity || [],
        zeroState: projectsCount === 0 && tasksCount === 0,
      },
      200
    );
  } catch (err: any) {
    console.error('[Dashboard API Error] / error:', {
      message: err.message,
      stack: err.stack,
      userId: c.get('user')?.id,
      workspaceId: c.get('workspace')?.id,
    });
    return c.json(
      {
        metrics: {
          projectsCount: 0,
          tasksCount: 0,
          completedTasksCount: 0,
          membersCount: 1,
          crmLeadsCount: 0,
          healthScore: 50,
        },
        recentActivity: [],
        zeroState: true,
      },
      200
    );
  }
});
