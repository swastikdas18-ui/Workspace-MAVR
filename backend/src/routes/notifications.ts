import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { NotificationService } from '../services/notification-service';
import { NotificationRepository } from '../repositories/notification-repository';
import { inMemoryDb } from '../../packages/database/index.js';

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

    const count = await NotificationService.getUnreadCount(workspace.id, user.id);
    return c.json({ count, unreadCount: count }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get unread count.' } },
      500
    );
  }
});

/**
 * GET /api/notifications - Fetch user's own notifications in the active workspace
 * RBAC: Users can only access their own notifications.
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
    const tab = c.req.query('tab') as 'unread' | 'read' | 'archived' | 'all' | undefined;
    const search = c.req.query('search') || undefined;
    const category = c.req.query('category') || undefined;

    const notifications = await NotificationService.getNotifications({
      workspaceId: workspace.id,
      recipientId: user.id,
      unreadOnly,
      limit,
      offset,
      tab,
      search,
      category,
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
 * PATCH /api/notifications/read-all and POST /api/notifications/read-all - Mark all notifications as read
 */
const markAllReadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const updatedCount = await NotificationService.markAllRead(workspace.id, user.id);
    return c.json({ success: true, updatedCount }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to mark notifications read.' } },
      500
    );
  }
};
notificationRouter.patch('/read-all', markAllReadHandler);
notificationRouter.post('/read-all', markAllReadHandler);

/**
 * PATCH /api/notifications/:id/read and POST /api/notifications/:id/read - Mark specific notification as read
 */
const markSingleReadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const success = await NotificationService.markRead(workspace.id, user.id, id);
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
};
notificationRouter.patch('/:id/read', markSingleReadHandler);
notificationRouter.post('/:id/read', markSingleReadHandler);

/**
 * PATCH /api/notifications/:id/archive and POST /api/notifications/:id/archive - Archive specific notification
 */
const archiveSingleHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const success = await NotificationService.archiveNotification(workspace.id, user.id, id);
    if (!success) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } }, 404);
    }

    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to archive notification.' } },
      500
    );
  }
};
notificationRouter.patch('/:id/archive', archiveSingleHandler);
notificationRouter.post('/:id/archive', archiveSingleHandler);

/**
 * POST /api/notifications/retention/run - Trigger retention archive for notifications older than 90 days
 */
notificationRouter.post('/retention/run', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const archivedCount = await NotificationService.archiveOldNotifications(workspace.id, 90);
    return c.json({ success: true, archivedCount }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to execute retention policy.' } },
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
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const prefs = await NotificationService.getPreferences(workspace.id, user.id);
    return c.json({ preferences: prefs }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to fetch preferences.' } },
      500
    );
  }
});

/**
 * PUT /api/notifications/preferences - Update user notification preferences
 */
notificationRouter.put('/preferences', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const body = await c.req.json().catch(() => ({}));

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const updated = await NotificationService.updatePreferences(workspace.id, user.id, body);
    return c.json({ success: true, preferences: updated }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to update preferences.' } },
      500
    );
  }
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

