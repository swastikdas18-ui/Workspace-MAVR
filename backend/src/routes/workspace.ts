import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { WorkspaceService } from '../services/workspace-service';

export const workspaceRouter = new Hono();

// All workspace routes require authentication
workspaceRouter.use('*', authMiddleware);

/**
 * GET /workspace - Fetch current active workspace
 */
workspaceRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const requestedWsId = c.req.query('workspaceId');

    const workspace = await WorkspaceService.getWorkspace(user.id, requestedWsId);

    return c.json({ workspace }, 200);
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
    if (err.message === 'WORKSPACE_NOT_FOUND') {
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
 * GET /workspace/members - List members of current workspace
 */
workspaceRouter.get('/members', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

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
