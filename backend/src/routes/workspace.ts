import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { resolveMembershipRole } from '../middleware/rbac';
import { WorkspaceService } from '../services/workspace-service';
import { WorkspaceRepository } from '../repositories/workspace-repository';

export const workspaceRouter = new Hono();

// All workspace routes require authentication
workspaceRouter.use('*', authMiddleware);

/**
 * GET /workspace/all or /workspaces - Fetch all workspaces user belongs to
 */
workspaceRouter.get('/all', async (c) => {
  try {
    const user = c.get('user');
    const workspaces = await WorkspaceService.getUserWorkspaces(user.id);
    return c.json({ workspaces }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to fetch user workspaces.' } },
      400
    );
  }
});

workspaceRouter.get('/list', async (c) => {
  try {
    const user = c.get('user');
    const workspaces = await WorkspaceService.getUserWorkspaces(user.id);
    return c.json({ workspaces }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to fetch user workspaces.' } },
      400
    );
  }
});

/**
 * GET /workspace/current - Fetch currently active workspace and role
 */
workspaceRouter.get('/current', async (c) => {
  try {
    const user = c.get('user');
    const sessionWorkspace = c.get('workspace');
    const requestedWsId = sessionWorkspace?.id || c.req.query('workspaceId');

    const workspace = await WorkspaceService.getWorkspace(user.id, requestedWsId);
    return c.json({ workspace, role: workspace.roleInWorkspace || 'employee' }, 200);
  } catch (err: any) {
    console.error('[Workspace API Error] /current error:', {
      message: err.message,
      userId: c.get('user')?.id,
      sessionWsId: c.get('workspace')?.id,
      queryWsId: c.req.query('workspaceId'),
    });
    if (err.message === 'NO_ACTIVE_WORKSPACE') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace found for user.',
          },
        },
        404
      );
    }
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: err.message || 'Failed to fetch active workspace.',
        },
      },
      400
    );
  }
});

/**
 * GET /workspace - Fetch current active workspace (or all if queried)
 */
workspaceRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const requestedWsId = c.req.query('workspaceId');
    const listAll = c.req.query('all') === 'true' || c.req.path.includes('/workspaces');

    const workspaces = await WorkspaceService.getUserWorkspaces(user.id);

    if (listAll && !requestedWsId) {
      return c.json({ workspaces }, 200);
    }

    let workspace;
    try {
      workspace = await WorkspaceService.getWorkspace(user.id, requestedWsId);
    } catch {
      if (workspaces.length > 0) {
        workspace = workspaces[0];
      }
    }

    return c.json({ workspace, workspaces }, 200);
  } catch (err: any) {
    if (err.message === 'ACCESS_DENIED_WORKSPACE_MEMBERSHIP_REQUIRED') {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a member of the requested workspace.',
          },
        },
        403
      );
    }
    if (err.message === 'WORKSPACE_NOT_FOUND' || err.message === 'NO_ACTIVE_WORKSPACE') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Workspace not found.',
          },
        },
        404
      );
    }
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: err.message || 'Failed to fetch workspace.',
        },
      },
      400
    );
  }
});

/**
 * POST /workspace/switch or /select - Switch active workspace
 */
const switchHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const sessionToken = c.get('sessionToken');
    const body = await c.req.json().catch(() => ({}));
    const targetWsId = body.workspaceId || body.id;

    if (!targetWsId) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'workspaceId is required.' } },
        400
      );
    }

    const workspace = await WorkspaceService.switchWorkspace(user.id, sessionToken, targetWsId);
    return c.json({ success: true, workspace }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: err.message || 'Failed to switch workspace.' } },
      403
    );
  }
};
workspaceRouter.post('/switch', switchHandler);
workspaceRouter.post('/select', switchHandler);

/**
 * POST /workspace - Create new workspace (Admin only)
 */
workspaceRouter.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { role: effectiveRole } = await resolveMembershipRole(c);

    if (effectiveRole === 'employee' || effectiveRole === 'intern') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: `Role [${effectiveRole.toUpperCase()}] is forbidden from creating workspaces.` } },
        403
      );
    }

    const body = await c.req.json();
    if (!body.name || !body.name.trim()) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Workspace name is required.' } },
        400
      );
    }

    const workspace = await WorkspaceService.createWorkspace(user.id, {
      name: body.name.trim(),
      slug: body.slug?.trim(),
      plan: body.plan,
    });

    // Also switch session to the newly created workspace
    const sessionToken = c.get('sessionToken');
    if (sessionToken) {
      await WorkspaceService.switchWorkspace(user.id, sessionToken, workspace.id);
    }

    return c.json({ workspace }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create workspace.' } },
      400
    );
  }
});

/**
 * PATCH /workspace/settings or /settings - Update workspace settings (Admin only)
 */
const updateSettingsHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspaceCtx = c.get('workspace');
    const { role: effectiveRole } = await resolveMembershipRole(c);

    if (effectiveRole === 'employee' || effectiveRole === 'intern') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: `Role [${effectiveRole.toUpperCase()}] is forbidden from updating workspace settings.` } },
        403
      );
    }

    if (!workspaceCtx) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace found for session.' } },
        404
      );
    }

    const body = await c.req.json();
    const updated = await WorkspaceRepository.updateWorkspace(workspaceCtx.id, {
      name: body.name?.trim(),
      slug: body.slug?.trim(),
      plan: body.plan,
      logo: body.logo,
    });

    return c.json({ success: true, workspace: updated }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to update workspace settings.' } },
      400
    );
  }
};

workspaceRouter.patch('/settings', updateSettingsHandler);
workspaceRouter.patch('/', updateSettingsHandler);

/**
 * DELETE /workspace/members/:id - Remove member from workspace (Admin only)
 */
const deleteMemberHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspaceCtx = c.get('workspace');
    const { role: effectiveRole } = await resolveMembershipRole(c);

    if (effectiveRole === 'employee' || effectiveRole === 'intern') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: `Role [${effectiveRole.toUpperCase()}] is forbidden from removing workspace members.` } },
        403
      );
    }

    if (!workspaceCtx) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace found for session.' } },
        404
      );
    }

    const targetUserId = c.req.param('id');
    if (!targetUserId) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Target user ID is required.' } },
        400
      );
    }

    await WorkspaceRepository.removeWorkspaceMember(workspaceCtx.id, targetUserId);
    return c.json({ success: true, message: 'Member removed from workspace successfully.' }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to remove member.' } },
      400
    );
  }
};

workspaceRouter.delete('/members/:id', deleteMemberHandler);

/**
 * GET /workspace/members - List members of current workspace
 */
workspaceRouter.get('/members', async (c) => {

  try {
    const user = c.get('user');
    let workspace = c.get('workspace');

    if (!workspace) {
      const userWorkspaces = await WorkspaceService.getUserWorkspaces(user.id);
      if (userWorkspaces.length > 0) {
        workspace = userWorkspaces[0];
      }
    }

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const members = await WorkspaceService.getWorkspaceMembers(user.id, workspace.id);
    return c.json({ members }, 200);
  } catch (err: any) {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: err.message || 'Failed to retrieve workspace members.',
        },
      },
      403
    );
  }
});

