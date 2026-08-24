import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { InviteService } from '../services/invite-service';

export const inviteRouter = new Hono();

/**
 * POST /api/invites - Create invite (Admin only)
 */
inviteRouter.post('/', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace found for session.' } },
        404
      );
    }

    const body = await c.req.json();
    if (!body.email) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Email address is required.' } },
        400
      );
    }

    const invite = await InviteService.createInvite({
      workspaceId: workspace.id, // Strictly derived from server session!
      email: body.email,
      role: body.role === 'intern' ? 'intern' : 'employee', // Never admin
      invitedBy: user.id,
      teamId: body.teamId || null,
    });

    return c.json({ invite }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create invite.' } },
      400
    );
  }
});

/**
 * GET /api/invites - List active invites for workspace (Admin only)
 */
inviteRouter.get('/', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace found for session.' } },
        404
      );
    }

    const invites = await InviteService.getWorkspaceInvites(workspace.id);
    return c.json({ invites }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list invites.' } },
      500
    );
  }
});

/**
 * GET /api/invites/preview/:token or GET /api/invites/:token - Public preview of invite
 */
inviteRouter.get('/preview/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const data = await InviteService.getInviteByToken(token);
    return c.json(data, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Invalid or expired invite.' } },
      400
    );
  }
});

inviteRouter.get('/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const data = await InviteService.getInviteByToken(token);
    return c.json(data, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Invalid or expired invite.' } },
      400
    );
  }
});

/**
 * POST /api/invites/accept - Public accept invite & create membership
 */
inviteRouter.post('/accept', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.token || !body.name || !body.password) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Token, name, and password are required.' } },
        400
      );
    }

    const result = await InviteService.acceptInvite({
      token: body.token,
      name: body.name,
      password: body.password,
    });

    return c.json(result, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to accept invitation.' } },
      400
    );
  }
});
