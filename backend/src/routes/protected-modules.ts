import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { inMemoryDb } from '../../packages/database';

export const analyticsRouter = new Hono();
export const billingRouter = new Hono();
export const adminRouter = new Hono();

// Analytics (Admin only)
analyticsRouter.use('*', authMiddleware, requireRole(['admin']));
analyticsRouter.get('/', async (c) => {
  const workspace = c.get('workspace');
  return c.json({
    analytics: {
      activeMembers: inMemoryDb.workspaceMembers.size,
      totalProjects: inMemoryDb.projects.size,
      totalTasks: inMemoryDb.tasks.size,
      completionRate: 88.5,
      mrr: '$12,450',
    },
  });
});

analyticsRouter.get('/metrics', async (c) => {
  const workspace = c.get('workspace');
  return c.json({
    metrics: {
      activeMembers: inMemoryDb.workspaceMembers.size,
      totalProjects: inMemoryDb.projects.size,
      totalTasks: inMemoryDb.tasks.size,
      completionRate: 88.5,
      mrr: '$12,450',
    },
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
    tables: ['users', 'workspaces', 'workspace_members', 'projects', 'tasks', 'teams', 'documents', 'workspace_invites', 'task_comments'],
  });
});

adminRouter.get('/tools', async (c) => {
  return c.json({
    status: 'healthy',
    database: 'connected',
    tables: ['users', 'workspaces', 'workspace_members', 'projects', 'tasks', 'teams', 'documents', 'workspace_invites', 'task_comments'],
  });
});
