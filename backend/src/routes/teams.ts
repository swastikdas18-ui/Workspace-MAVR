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
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 500);
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get teams.' } },
      status
    );
  }
});

/**
 * GET /api/teams/:id - Get single team by ID with workspace isolation checks
 */
teamRouter.get('/:id', requirePermission('teams:read'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const teamId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const team = await TeamService.getTeamById(workspace.id, user.id, role, teamId);
    return c.json({ team }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TEAM_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch team.' } },
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

/**
 * POST /api/teams/:id/members - Add member to team (Admin only)
 */
teamRouter.post('/:id/members', requirePermission('teams:update'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const teamId = c.req.param('id');
    const body = await c.req.json();

    if (!body.userId && !body.user_id) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'User ID is required.' } }, 400);
    }

    const member = await TeamService.addMember(
      workspace.id,
      teamId,
      body.userId || body.user_id,
      role,
      body.role || 'member',
      user.id
    );

    return c.json({ success: true, member }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'TEAM_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to add team member.' } },
      status
    );
  }
});

/**
 * DELETE /api/teams/:id/members/:userId - Remove member from team (Admin only)
 */
teamRouter.delete('/:id/members/:userId', requirePermission('teams:update'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const teamId = c.req.param('id');
    const targetUserId = c.req.param('userId');

    await TeamService.removeMember(workspace.id, teamId, targetUserId, role);
    return c.json({ success: true, message: 'Team member removed successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'TEAM_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to remove team member.' } },
      status
    );
  }
});

