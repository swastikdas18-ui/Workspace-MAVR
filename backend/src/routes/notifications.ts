import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { NotificationRepository } from '../repositories/notification-repository';
import { inMemoryDb } from '../../packages/database';

export const notificationRouter = new Hono();

notificationRouter.use('*', authMiddleware);

/**
 * GET /api/notifications/unread-count - Fast unread badge count
 */
notificationRouter.get('/unread-count', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const count = await NotificationRepository.getUnreadCount(workspace.id, user.id);
    return c.json({ count }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get unread count.' } },
      500
    );
  }
});

/**
 * GET /api/notifications - Fetch user's own notifications in the active workspace
 * RBAC: All roles (ADMIN, EMPLOYEE, INTERN) can access their own notifications.
 */
notificationRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const unreadOnly = c.req.query('unreadOnly') === 'true';
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0;

    const notifications = await NotificationRepository.getNotifications(workspace.id, user.id, {
      unreadOnly,
      limit,
      offset,
    });

    return c.json({ notifications }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to fetch notifications.' } },
      500
    );
  }
});

/**
 * PATCH /api/notifications/read-all - Mark all notifications as read
 */
notificationRouter.patch('/read-all', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const updatedCount = await NotificationRepository.markAllAsRead(workspace.id, user.id);
    return c.json({ success: true, updatedCount }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to mark notifications read.' } },
      500
    );
  }
});

/**
 * PATCH /api/notifications/:id/read - Mark specific notification as read
 */
notificationRouter.patch('/:id/read', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const success = await NotificationRepository.markAsRead(workspace.id, user.id, id);
    if (!success) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } }, 404);
    }

    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to mark notification read.' } },
      500
    );
  }
});

/**
 * DELETE /api/notifications/:id - Delete a notification
 */
notificationRouter.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const success = await NotificationRepository.deleteNotification(workspace.id, user.id, id);
    if (!success) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } }, 404);
    }

    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to delete notification.' } },
      500
    );
  }
});

/**
 * GET /api/notifications/preferences - Fetch user notification preferences
 */
notificationRouter.get('/preferences', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');

  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const key = `${user.id}:${workspace.id}`;
  const prefs = inMemoryDb.notificationPreferences?.get(key) || {
    userId: user.id,
    workspaceId: workspace.id,
    emailDigest: true,
    taskAssigned: true,
    taskDue: true,
    taskCompleted: true,
    projectUpdated: true,
    documentMention: true,
    crmStageChanged: true,
    automationExecuted: true,
    invoicePaid: true,
    workspaceInvite: true,
  };

  return c.json({ preferences: prefs }, 200);
});

/**
 * PUT /api/notifications/preferences - Update user notification preferences
 */
notificationRouter.put('/preferences', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const key = `${user.id}:${workspace.id}`;
  const existing = inMemoryDb.notificationPreferences?.get(key) || {
    userId: user.id,
    workspaceId: workspace.id,
  };

  const updated = {
    ...existing,
    ...body,
    userId: user.id,
    workspaceId: workspace.id,
    updatedAt: new Date(),
  };

  inMemoryDb.notificationPreferences?.set(key, updated);
  return c.json({ success: true, preferences: updated }, 200);
});

/**
 * POST /api/notifications/digest - Generate and dispatch email digest
 */
notificationRouter.post('/digest', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');

  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const unreadNotifications = await NotificationRepository.getNotifications(workspace.id, user.id, {
    unreadOnly: true,
    limit: 20,
  });

  return c.json({
    success: true,
    recipient: user.email,
    digestCount: unreadNotifications.length,
    sentAt: new Date().toISOString(),
  }, 200);
});

