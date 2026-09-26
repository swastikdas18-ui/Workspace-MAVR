import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole, requirePlatformAdmin } from '../middleware/rbac';
import { AnalyticsRepository } from '../repositories/analytics-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { ProductAnalyticsService } from '../services/product-analytics-service';
import { MetricLineageService } from '../services/metric-lineage-service';

export const analyticsRouter = new Hono();
export const billingRouter = new Hono();
export const adminRouter = new Hono();

// Analytics (Admin only)
analyticsRouter.use('*', authMiddleware, requireWorkspaceRole(['admin']));

/**
 * POST /api/analytics/events - Track product lifecycle event
 */
analyticsRouter.post('/events', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));
  const { eventName, entityType, entityId, metadata } = body;

  if (!eventName) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'eventName is required' } }, 400);
  }

  const record = await ProductAnalyticsService.trackEvent({
    workspaceId: workspace?.id || 'ws-default',
    userId: user?.id,
    eventName,
    entityType,
    entityId,
    metadata,
  });

  return c.json({ success: true, event: record }, 201);
});

/**
 * GET /api/analytics/events - Query event telemetry streams
 */
analyticsRouter.get('/events', async (c) => {
  const workspace = c.get('workspace');
  const eventName = c.req.query('eventName');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;

  const events = await ProductAnalyticsService.getEvents({
    workspaceId: workspace?.id,
    eventName,
    limit,
  });

  return c.json({ events }, 200);
});

/**
 * GET /api/analytics/lineage - Metric Provenance, Source Tables & Confidence Lineage
 */
analyticsRouter.get('/lineage', async (c) => {
  const lineage = await MetricLineageService.getLineageReport();
  return c.json(lineage, 200);
});

/**
 * GET /api/analytics/founder - Founder Usage & Cohort Intelligence
 */
analyticsRouter.get('/founder', requirePlatformAdmin(), async (c) => {
  const analytics = await ProductAnalyticsService.getFounderAnalytics();
  return c.json(analytics, 200);
});

analyticsRouter.post('/track', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));
  const { eventName, metadata } = body;

  if (!eventName) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'eventName is required' } }, 400);
  }

  const event = await AnalyticsRepository.trackEvent(
    eventName,
    workspace?.id || 'ws-default',
    user?.id || 'usr-system',
    metadata
  );

  return c.json({ success: true, event }, 201);
});

const ZERO_STATE_ENGAGEMENT = {
  dau: 0,
  wau: 0,
  mau: 0,
  activationRate: {
    activatedUsers: 0,
    totalEligibleUsers: 1,
    ratePercent: 0,
  },
  healthScore: {
    score: 50,
    rating: 'Fair' as const,
    breakdown: {
      projectScore: 0,
      taskScore: 0,
      documentScore: 0,
      memberScore: 0,
    },
  },
};

analyticsRouter.get('/engagement', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace?.id) {
      return c.json({ engagement: ZERO_STATE_ENGAGEMENT }, 200);
    }
    const engagement = await AnalyticsRepository.getEngagementSummary(workspace.id);
    return c.json({ engagement: engagement || ZERO_STATE_ENGAGEMENT }, 200);
  } catch (err: any) {
    console.error('[Analytics API Error] /engagement error:', err);
    return c.json({ engagement: ZERO_STATE_ENGAGEMENT }, 200);
  }
});

analyticsRouter.get('/', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace?.id) {
      return c.json({ analytics: ZERO_STATE_ENGAGEMENT }, 200);
    }
    const engagement = await AnalyticsRepository.getEngagementSummary(workspace.id);
    return c.json({
      analytics: engagement || ZERO_STATE_ENGAGEMENT,
    }, 200);
  } catch (err: any) {
    console.error('[Analytics API Error] / error:', err);
    return c.json({ analytics: ZERO_STATE_ENGAGEMENT }, 200);
  }
});

analyticsRouter.get('/metrics', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace?.id) {
      return c.json({ metrics: ZERO_STATE_ENGAGEMENT }, 200);
    }
    const engagement = await AnalyticsRepository.getEngagementSummary(workspace.id);
    return c.json({
      metrics: engagement || ZERO_STATE_ENGAGEMENT,
    }, 200);
  } catch (err: any) {
    console.error('[Analytics API Error] /metrics error:', err);
    return c.json({ metrics: ZERO_STATE_ENGAGEMENT }, 200);
  }
});

analyticsRouter.get('/search-metrics', async (c) => {
  try {
    const workspace = c.get('workspace');
    const searchMetrics = AnalyticsRepository.getSearchMetrics(workspace?.id || '');
    return c.json({
      searchMetrics: searchMetrics || {},
    }, 200);
  } catch (err: any) {
    console.error('[Analytics API Error] /search-metrics error:', err);
    return c.json({ searchMetrics: {} }, 200);
  }
});

// Billing (Admin only) — per-route auth so phase14Router's /billing/webhook
// is not intercepted by a catch-all middleware in this sub-router.
billingRouter.get('/', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  return c.json({
    billing: {
      plan: workspace?.plan || 'free',
      status: 'active',
      currentPeriodEnd: '2026-12-31',
      invoices: [],
    },
  }, 200);
});

billingRouter.get('/invoices', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  return c.json({
    invoices: [
      { id: 'inv-001', amount: '$499.00', status: 'paid', date: '2026-02-01' },
      { id: 'inv-002', amount: '$499.00', status: 'paid', date: '2026-01-01' },
    ],
  });
});

// Admin Tools (Admin only for tenant tools; Founder / Platform Admin for platform console)
import { founderConsoleRouter } from './phase16-routes';
adminRouter.route('/', founderConsoleRouter);

adminRouter.get('/', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  return c.json({
    status: 'healthy',
    database: 'connected',
    tables: [
      'users',
      'workspaces',
      'workspace_members',
      'projects',
      'tasks',
      'teams',
      'documents',
      'crm_records',
      'workspace_invites',
      'task_comments',
    ],
  });
});

adminRouter.get('/tools', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  return c.json({
    status: 'healthy',
    database: 'connected',
    tables: [
      'users',
      'workspaces',
      'workspace_members',
      'projects',
      'tasks',
      'teams',
      'documents',
      'crm_records',
      'workspace_invites',
      'task_comments',
      'notifications',
      'activity_logs',
      'audit_logs',
    ],
  });
});

/**
 * GET /api/admin/audit - Access audit trail (ADMIN ONLY)
 */
adminRouter.get('/audit', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0;
    const resource = c.req.query('resource');

    const logs = await AuditRepository.getAuditLogs(workspace.id, {
      limit,
      offset,
      resource,
    });

    return c.json({ auditLogs: logs }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to fetch audit logs.' } },
      500
    );
  }
});
