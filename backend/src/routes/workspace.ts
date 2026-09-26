import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { resolveMembershipRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validator';
import {
  switchWorkspaceSchema,
  createWorkspaceSchema,
  updateWorkspaceSettingsSchema,
} from '../schemas';
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
    const listAll = c.req.query('all') === 'true';

    const workspaces = await WorkspaceService.getUserWorkspaces(user.id);

    if (listAll && !requestedWsId) {
      return c.json({ workspaces }, 200);
    }

    const { role } = await resolveMembershipRole(c);
    if (role === 'intern') {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Intern sandbox accounts cannot access workspace configuration.' } }, 403);
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

    const workspace = await WorkspaceService.switchWorkspace(user.id, sessionToken, targetWsId);
    return c.json({ success: true, workspace }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: err.message || 'Failed to switch workspace.' } },
      403
    );
  }
};
workspaceRouter.post('/switch', validateBody(switchWorkspaceSchema), switchHandler);
workspaceRouter.post('/select', validateBody(switchWorkspaceSchema), switchHandler);

/**
 * POST /workspace - Create new workspace (Admin only)
 */
workspaceRouter.post('/', validateBody(createWorkspaceSchema), async (c) => {
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

workspaceRouter.patch('/settings', validateBody(updateWorkspaceSettingsSchema), updateSettingsHandler);
workspaceRouter.patch('/', validateBody(updateWorkspaceSettingsSchema), updateSettingsHandler);

/**
 * DELETE /:workspaceId/members/:memberId or /members/:id - Remove member from workspace (Admin only)
 */
const deleteWorkspaceMemberRouteHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const sessionWorkspace = c.get('workspace');
    const paramWorkspaceId = c.req.param('workspaceId');
    const targetWorkspaceId = paramWorkspaceId || sessionWorkspace?.id;

    if (!targetWorkspaceId) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace specified or found for session.' } },
        404
      );
    }

    // Role check: Admin only in target workspace
    const { role: effectiveRole, workspaceId: verifiedWsId } = await resolveMembershipRole(c);

    // If paramWorkspaceId is specified, check caller's membership in that specific workspace
    let callerRole = effectiveRole;
    if (paramWorkspaceId && verifiedWsId !== paramWorkspaceId) {
      const callerMembership = await WorkspaceRepository.getWorkspaceMember(paramWorkspaceId, user.id);
      callerRole = callerMembership ? callerMembership.role : 'employee';
      if (!callerMembership) {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'You are not a member of the requested workspace.' } },
          403
        );
      }
    }

    if (callerRole !== 'admin') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: `Role [${callerRole.toUpperCase()}] is forbidden from removing workspace members.` } },
        403
      );
    }

    const targetUserId = c.req.param('memberId') || c.req.param('id');
    if (!targetUserId) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Target member ID is required.' } },
        400
      );
    }

    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null;
    const userAgent = c.req.header('user-agent') || null;

    await WorkspaceRepository.removeWorkspaceMember(targetWorkspaceId, targetUserId, user.id, {
      ipAddress,
      userAgent,
    });

    return c.json({ success: true, message: 'Member removed from workspace successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'MEMBER_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to remove member.' } },
      status
    );
  }
};

workspaceRouter.delete('/:workspaceId/members/:memberId', deleteWorkspaceMemberRouteHandler);
workspaceRouter.delete('/members/:id', deleteWorkspaceMemberRouteHandler);

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

