import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { PresenceManager } from '../realtime/presence-manager';
import { AnalyticsRepository } from '../repositories/analytics-repository';
import { EventBus } from '../realtime/event-bus';

export const presenceRouter = new Hono();

// Apply auth middleware to all presence routes
presenceRouter.use('*', authMiddleware);

const updateStatusSchema = z.object({
  status: z.enum(['online', 'away', 'offline']),
});

/**
 * GET /api/presence
 * List all users' presence in the current workspace with RBAC filtering
 */
presenceRouter.get('/', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');

  const workspaceId = workspace?.id || user.id;
  const userRole = workspace?.roleInWorkspace || user.role || 'employee';

  const presenceList = await PresenceManager.getWorkspacePresence(workspaceId, userRole);
  const activeCount = presenceList.filter((p) => p.status === 'online' || p.status === 'away').length;

  return c.json({
    data: presenceList,
    meta: {
      workspaceId,
      total: presenceList.length,
      onlineCount: activeCount,
      requesterRole: userRole,
    },
  });
});

/**
 * POST /api/presence/status
 * Update current user's presence status
 */
presenceRouter.post('/status', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const workspaceId = workspace?.id || user.id;

  const body = await c.req.json();
  const parsed = updateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status. Must be one of: online, away, offline.',
          details: parsed.error.issues,
        },
      },
      400
    );
  }

  const updatedState = await PresenceManager.setStatus(
    user.id,
    workspaceId,
    parsed.data.status
  );

  return c.json({
    data: {
      userId: user.id,
      workspaceId,
      status: parsed.data.status,
      lastSeen: new Date().toISOString(),
    },
    message: `Presence status updated to ${parsed.data.status}`,
  });
});

/**
 * POST /api/presence/heartbeat
 * Keepalive heartbeat
 */
presenceRouter.post('/heartbeat', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const workspaceId = workspace?.id || user.id;

  await PresenceManager.heartbeat(user.id, workspaceId);

  return c.json({
    data: {
      userId: user.id,
      workspaceId,
      timestamp: new Date().toISOString(),
    },
    message: 'Presence heartbeat recorded',
  });
});

/**
 * GET /api/presence/stats
 * Real-time connection and presence statistics
 */
presenceRouter.get('/stats', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const workspaceId = workspace?.id || user.id;

  const metrics = AnalyticsRepository.getRealtimeMetrics(workspaceId);

  return c.json({
    data: metrics,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/presence/events
 * Recent event history in workspace
 */
presenceRouter.get('/events', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const workspaceId = workspace?.id || user.id;

  const limitParam = c.req.query('limit');
  const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 30;

  const history = EventBus.getHistory(limit, workspaceId);

  return c.json({
    data: history,
    meta: {
      workspaceId,
      count: history.length,
      limit,
    },
  });
});
