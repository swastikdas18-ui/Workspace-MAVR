import { Hono } from 'hono';
import { AuthService } from '../services/auth-service';
import { authMiddleware } from '../middleware/auth';
import { env } from '../config/env';

export const authRouter = new Hono();

/**
 * POST /register - Register Admin (with new org) or Member (with workspace ID)
 */
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();

    if (body.workspaceName) {
      // Organization Admin Registration
      const result = await AuthService.registerAdmin(body);
      return c.json(result, 201);
    } else if (body.workspaceId) {
      // Invited Member Registration
      const result = await AuthService.registerMember(body);
      return c.json(result, 201);
    } else {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Must provide either workspaceName (for Admin) or workspaceId (for Member registration).',
          },
        },
        400
      );
    }
  } catch (err: any) {
    if (err.message === 'USER_EXISTS') {
      return c.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'An account with this email address already exists.',
          },
        },
        409
      );
    }
    if (err.message === 'WORKSPACE_NOT_FOUND') {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Target workspace not found.',
          },
        },
        404
      );
    }
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: err.errors?.[0]?.message || err.message || 'Registration failed.',
        },
      },
      400
    );
  }
});

/**
 * POST /login - Authenticate with email and password
 */
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = await AuthService.login(body);
    return c.json(result, 200);
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password.',
          },
        },
        401
      );
    }
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: err.errors?.[0]?.message || err.message || 'Login failed.',
        },
      },
      400
    );
  }
});

/**
 * POST /logout - Invalidate active session
 */
authRouter.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    const customHeader = c.req.header('x-session-token');
    if (customHeader) token = customHeader;
  }

  if (token) {
    await AuthService.logout(token);
  }

  return c.json({ success: true, message: 'Logged out successfully.' }, 200);
});

/**
 * GET /session - Retrieve authenticated session details
 */
authRouter.get('/session', authMiddleware, async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const token = c.get('sessionToken');

  return c.json(
    {
      user,
      workspace,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    200
  );
});
