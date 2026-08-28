import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { InviteService } from '../services/invite-service';
import { generateSecureToken } from '../lib/secure-token';
import {
  WORKSPACE_SESSION_COOKIE,
  CSRF_COOKIE,
  isSecureRequestContext,
} from '../lib/session-cookies';
import type { Context } from 'hono';

export const inviteRouter = new Hono();

/**
 * Dual Transport Authentication:
 * Session tokens are set as httpOnly cookies AND returned in the JSON payload
 * to guarantee session resilience across all browser environments, serverless proxies,
 * and iframe previews.
 */
function issueSessionCookies(c: Context, result: { token: string; expiresAt: string }): string {
  const isSecure = isSecureRequestContext(c);
  const maxAge = Math.max(
    60,
    Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000)
  );

  setCookie(c, WORKSPACE_SESSION_COOKIE, result.token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'None' : 'Lax',
    maxAge,
  });

  const csrfToken = generateSecureToken();
  setCookie(c, CSRF_COOKIE, csrfToken, {
    path: '/',
    httpOnly: false,
    secure: isSecure,
    sameSite: isSecure ? 'None' : 'Lax',
    maxAge,
  });

  return csrfToken;
}

/**
 * POST /api/invites - Create invite (Admin only)
 */
inviteRouter.post('/', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
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

    const allowedRoles = ['admin', 'employee', 'intern'];
    const assignedRole = allowedRoles.includes(body.role) ? body.role : 'employee';

    const invite = await InviteService.createInvite({
      workspaceId: workspace.id, // Strictly derived from server session!
      email: body.email,
      role: assignedRole,
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
 * GET /api/invites - List active invites for workspace (Admin only, graceful [] for others)
 */
inviteRouter.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const effectiveRole = (workspace?.roleInWorkspace || user?.role || 'employee').toLowerCase();

    if (effectiveRole !== 'admin') {
      return c.json({ invites: [] }, 200);
    }

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace found for session.' } },
        404
      );
    }

    const invites = await InviteService.getWorkspaceInvites(workspace.id);
    return c.json({ invites: invites || [] }, 200);
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
 * POST /api/invites/accept - Public accept invite & provision membership (No auto-login session)
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

    console.log('[INVITE-ACCEPT]', {
      inviteId: result.inviteId,
      workspaceId: result.workspaceId || result.workspace?.id,
      email: result.email,
      userId: result.userId || result.user?.id,
      sessionIssued: false,
      cookiesModified: false,
    });

    return c.json(
      {
        success: true,
        accepted: true,
        requiresLogin: true,
        email: result.email,
        user: result.user,
        workspace: result.workspace,
      },
      200
    );
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to accept invitation.' } },
      400
    );
  }
});

/**
 * POST /api/invites/:id/resend - Resend invite email (Admin only, max 3 times)
 */
inviteRouter.post('/:id/resend', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace found.' } }, 404);
    }

    const result = await InviteService.resendInvite(id, workspace.id);
    return c.json(result, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to resend invitation.' } },
      400
    );
  }
});

/**
 * GET /api/invites/analytics - Invite funnel analytics (Admin only)
 */
inviteRouter.get('/analytics', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const analytics = InviteService.getInviteAnalytics(workspace.id);
    return c.json({ analytics }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to fetch invite analytics.' } },
      500
    );
  }
});

/**
 * DELETE /api/invites/:id - Cancel an invite (Admin only)
 */
inviteRouter.delete('/:id', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    const id = c.req.param('id');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const result = await InviteService.cancelInvite(id, workspace.id);
    return c.json(result, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to cancel invitation.' } },
      400
    );
  }
});

/**
 * POST /api/invites/expire-stale - Expire old invites (Admin housekeeping)
 */
inviteRouter.post('/expire-stale', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const result = InviteService.expireStaleInvites(workspace.id);
    return c.json(result, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to expire stale invites.' } },
      500
    );
  }
});
