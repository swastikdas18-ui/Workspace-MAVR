/**
 * Production Billing & Subscription Management Router
 * 
 * Endpoints:
 * - GET  /api/billing/plan     - Read current plan, limits, and pricing (Admin + Employee read-only)
 * - GET  /api/billing/usage    - Read real-time metered consumption and overages (Admin + Employee)
 * - GET  /api/billing/invoices - Invoice payment history (Admin only)
 * - POST /api/billing/upgrade  - Upgrade or switch subscription tier (Admin only)
 * - POST /api/billing/cancel   - Cancel subscription renewal (Admin only)
 * 
 * RBAC Rules:
 * - Admin: Full access (plan, usage, upgrade, cancel, invoices)
 * - Employee: Read-only access to plan and usage. Blocked from mutation & invoices.
 * - Intern: Zero access (403 Forbidden on all billing routes).
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { BillingRepository, PLAN_CONFIG, PlanTier } from '../repositories/billing-repository';
import { UsageService } from '../services/usage-service';

export const billingRouter = new Hono();

// All billing endpoints require verified session authentication
billingRouter.use('*', authMiddleware);

/**
 * GET /api/billing/plan - Plan details & limits (Admin & Employee)
 */
billingRouter.get('/plan', requireRole(['admin', 'employee']), async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Workspace context missing' } }, 404);
  }

  const subscription = await BillingRepository.getSubscription(workspace.id);
  const planTier = (subscription.plan as PlanTier) || 'free';
  const planInfo = PLAN_CONFIG[planTier] || PLAN_CONFIG.free;

  return c.json(
    {
      subscription: {
        ...subscription,
        planName: planInfo.name,
        limits: planInfo.limits,
      },
      availablePlans: PLAN_CONFIG,
    },
    200
  );
});

/**
 * GET /api/billing/usage - Real-time metered resource consumption (Admin & Employee)
 */
billingRouter.get('/usage', requireRole(['admin', 'employee']), async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Workspace context missing' } }, 404);
  }

  const usage = await UsageService.getWorkspaceUsage(workspace.id);
  return c.json({ usage }, 200);
});

/**
 * GET /api/billing/invoices - Invoice payment history (Admin ONLY)
 */
billingRouter.get('/invoices', requireRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Workspace context missing' } }, 404);
  }

  const invoices = await BillingRepository.getInvoices(workspace.id);
  return c.json({ invoices }, 200);
});

/**
 * POST /api/billing/upgrade - Upgrade or change subscription tier (Admin ONLY)
 */
billingRouter.post('/upgrade', requireRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Workspace context missing' } }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const { plan, billingCycle = 'monthly' } = body;

  if (!plan || !['free', 'starter', 'business', 'enterprise'].includes(plan)) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'Plan must be one of: free, starter, business, enterprise' } },
      400
    );
  }

  const updatedSub = await BillingRepository.updateSubscription(workspace.id, plan, billingCycle);
  return c.json({ success: true, subscription: updatedSub }, 200);
});

/**
 * POST /api/billing/cancel - Cancel subscription (Admin ONLY)
 */
billingRouter.post('/cancel', requireRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Workspace context missing' } }, 404);
  }

  const canceled = await BillingRepository.cancelSubscription(workspace.id);
  return c.json({ success: true, subscription: canceled }, 200);
});

/**
 * Legacy root GET /api/billing
 */
billingRouter.get('/', requireRole(['admin', 'employee']), async (c) => {
  const workspace = c.get('workspace');
  const sub = await BillingRepository.getSubscription(workspace.id);
  return c.json({ billing: sub }, 200);
});
