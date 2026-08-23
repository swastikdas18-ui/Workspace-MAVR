import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { ActivityRepository } from '../repositories/activity-repository';

export const activityRouter = new Hono();

activityRouter.use('*', authMiddleware);

/**
 * GET /api/activity - Workspace-scoped activity feed
 */
activityRouter.get('/', async (c) => {
  try {
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0;
    const entityType = c.req.query('entityType');

    const feed = await ActivityRepository.getActivityFeed(workspace.id, {
      limit,
      offset,
      entityType,
    });

    return c.json({ activities: feed }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to fetch activity feed.' } },
      500
    );
  }
});
