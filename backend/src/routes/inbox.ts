import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { WorkInboxService } from '../services/work-inbox-service.js';

export const inboxRouter = new Hono();

inboxRouter.use('*', authMiddleware);

/**
 * GET /api/inbox - Fetch aggregated Work Inbox items categorized by urgency
 */
inboxRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = workspace.roleInWorkspace || user.role || 'employee';
    const inbox = await WorkInboxService.getWorkInbox(workspace.id, user.id, role);

    return c.json(inbox, 200);
  } catch (err: any) {
    console.error('[inboxRouter.get] Error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch work inbox.' } }, 500);
  }
});

/**
 * POST /api/inbox/quick-action - Execute inline quick actions directly from card
 */
inboxRouter.post('/quick-action', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const { action, payload } = body;

    if (!action) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'action is required.' } }, 400);
    }

    const result = await WorkInboxService.executeQuickAction(
      workspace.id,
      user.id,
      action,
      payload || {}
    );

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[inboxRouter.quickAction] Error:', err);
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to execute quick action.' } }, 400);
  }
});
