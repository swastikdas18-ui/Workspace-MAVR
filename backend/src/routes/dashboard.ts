import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { AnalyticsRepository } from '../repositories/analytics-repository';
import { DashboardService } from '../services/dashboard-service';
import { ProjectRepository } from '../repositories/project-repository';
import { TaskRepository } from '../repositories/task-repository';
import { WorkspaceRepository } from '../repositories/workspace-repository';
import { CRMRepository } from '../repositories/crm-repository';

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

    // Fetch via Repositories (PostgreSQL source of truth with graceful test isolation fallback)
    const [projects, tasks, members, crmRecords] = await Promise.all([
      ProjectRepository.listProjects(wsId),
      TaskRepository.listTasks(wsId),
      WorkspaceRepository.getWorkspaceMembers(wsId),
      CRMRepository.listRecords(wsId),
    ]);

    const projectsCount = projects.length;
    const tasksCount = tasks.length;
    const completedTasksCount = tasks.filter((t) => t.status === 'completed' || t.status === 'done').length;
    const membersCount = Math.max(1, members.length);
    const crmLeadsCount = crmRecords.length;

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

/**
 * GET /api/dashboard/executive - Full real-time executive dashboard aggregates
 */
const executiveHandler = async (c: any) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace?.id) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Workspace context required' } }, 404);
    }

    const data = await DashboardService.getExecutiveMetrics(workspace.id);
    return c.json(data, 200);
  } catch (err: any) {
    const correlationId = err.correlationId || c.req.header('X-Request-ID') || c.req.header('x-request-id') || ('dash-err-' + crypto.randomUUID());
    const isDbError = err.code === 'DATABASE_ERROR' || (err.message && (err.message.includes('select') || err.message.includes('PostgreSQL')));
    console.error('[Dashboard API Error] /executive error:', {
      correlationId,
      workspaceId: c.get('workspace')?.id,
      errorCode: err.code || (isDbError ? 'DATABASE_ERROR' : 'INTERNAL_ERROR'),
      message: err.message || err,
    });
    return c.json({
      error: {
        code: isDbError ? 'DATABASE_ERROR' : (err.code || 'INTERNAL_ERROR'),
        message: isDbError
          ? `Failed to load executive dashboard data from database. Reference correlation ID: ${correlationId}`
          : (err.message || 'Failed to retrieve executive metrics.'),
        correlationId,
      }
    }, 500);
  }
};

dashboardRouter.get('/executive', requireWorkspaceRole(['admin']), executiveHandler);
dashboardRouter.on('HEAD', '/executive', requireWorkspaceRole(['admin']), async (c) => c.body(null, 200));
