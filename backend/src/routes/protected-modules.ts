import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { AnalyticsRepository } from '../repositories/analytics-repository';
import { AuditRepository } from '../repositories/audit-repository';

export const analyticsRouter = new Hono();
export const billingRouter = new Hono();
export const adminRouter = new Hono();

// Analytics (Admin only)
analyticsRouter.use('*', authMiddleware, requireRole(['admin']));
analyticsRouter.get('/', async (c) => {
  const workspace = c.get('workspace');
  const metrics = await AnalyticsRepository.getWorkspaceMetrics(workspace?.id || '');
  return c.json({
    analytics: metrics,
  });
});

analyticsRouter.get('/metrics', async (c) => {
  const workspace = c.get('workspace');
  const metrics = await AnalyticsRepository.getWorkspaceMetrics(workspace?.id || '');
  return c.json({
    metrics,
  });
});

analyticsRouter.get('/search-metrics', async (c) => {
  const workspace = c.get('workspace');
  const searchMetrics = await AnalyticsRepository.getSearchMetrics(workspace?.id || '');
  return c.json({
    searchMetrics,
  });
});

// Billing (Admin only)
billingRouter.use('*', authMiddleware, requireRole(['admin']));
billingRouter.get('/', async (c) => {
  const workspace = c.get('workspace');
  return c.json({
    billing: {
      plan: workspace?.plan || 'pro',
      status: 'active',
      currentPeriodEnd: '2026-12-31',
      invoices: [],
    },
  });
});

billingRouter.get('/invoices', async (c) => {
  const workspace = c.get('workspace');
  return c.json({
    invoices: [
      { id: 'inv-001', amount: '$499.00', status: 'paid', date: '2026-02-01' },
      { id: 'inv-002', amount: '$499.00', status: 'paid', date: '2026-01-01' },
    ],
  });
});

// Admin Tools (Admin only)
adminRouter.use('*', authMiddleware, requireRole(['admin']));
adminRouter.get('/', async (c) => {
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

adminRouter.get('/tools', async (c) => {
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
adminRouter.get('/audit', async (c) => {
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
