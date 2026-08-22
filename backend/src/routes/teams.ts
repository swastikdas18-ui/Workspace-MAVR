import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { TeamService } from '../services/team-service';

export const teamRouter = new Hono();

teamRouter.use('*', authMiddleware);

/**
 * GET /api/teams - List teams in current workspace
 */
teamRouter.get('/', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const teams = await TeamService.getTeams(workspace.id);
    return c.json({ teams }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get teams.' } },
      500
    );
  }
});

/**
 * POST /api/teams - Create team (Admin only; Employee & Intern blocked)
 */
teamRouter.post('/', requireRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json();
    if (!body.name) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Team name is required.' } }, 400);
    }

    const team = await TeamService.createTeam(workspace.id, user.id, body);
    return c.json({ team }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create team.' } },
      400
    );
  }
});
