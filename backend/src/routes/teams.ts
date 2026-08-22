import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { TeamService } from '../services/team-service';
import { normalizeRole } from '../lib/permissions';

export const teamRouter = new Hono();

teamRouter.use('*', authMiddleware);

/**
 * GET /api/teams - List teams in current workspace (Admin & Employee only; Intern blocked with 403)
 */
teamRouter.get('/', requirePermission('teams:read'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const teams = await TeamService.getTeams(workspace.id, user.id, role);
    return c.json({ teams }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get teams.' } },
      status
    );
  }
});

/**
 * POST /api/teams - Create team (Admin only; Employee & Intern blocked)
 */
teamRouter.post('/', requirePermission('teams:create'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();
    if (!body.name || !body.name.trim()) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Team name is required.' } }, 400);
    }

    const team = await TeamService.createTeam(workspace.id, user.id, role, body);
    return c.json({ team }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to create team.' } },
      status
    );
  }
});
