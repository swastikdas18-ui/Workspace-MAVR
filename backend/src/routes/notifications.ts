import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { NotificationRepository } from '../repositories/notification-repository';

export const notificationRouter = new Hono();

notificationRouter.use('*', authMiddleware);

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
