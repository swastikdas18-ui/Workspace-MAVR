/**
 * Phase 22: Closed Beta API Router
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { FeedbackService } from '../services/feedback-service';
import { CustomerSuccessService } from '../services/customer-success-service';
import { BetaReportService } from '../services/beta-report-service';
import { LaunchReadinessService } from '../services/launch-readiness-service';

export const betaRouter = new Hono();

betaRouter.use('*', authMiddleware);

/**
 * POST /api/beta/feedback - Submit Beta Feedback (All logged in users)
 */
betaRouter.post('/feedback', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  if (!body.title || !body.description) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Title and description are required' } }, 400);
  }

  const record = await FeedbackService.submitFeedback({
    workspaceId: workspace?.id || 'ws-default',
    userId: user?.id,
    category: body.category || 'bug',
    severity: body.severity || 'p2_major',
    title: body.title,
    description: body.description,
    screenshotUrl: body.screenshotUrl,
  });

  return c.json({ success: true, feedback: record }, 201);
});

/**
 * GET /api/beta/feedback/metrics - Feedback Metrics Summary (Admin/Founder)
 */
betaRouter.get('/feedback/metrics', requireWorkspaceRole(['admin']), async (c) => {
  const metrics = await FeedbackService.getFeedbackMetrics();
  return c.json(metrics, 200);
});

/**
 * GET /api/beta/feedback - Feedback Review Queue (Admin/Founder)
 */
betaRouter.get('/feedback', requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const category = c.req.query('category');
  const severity = c.req.query('severity');
  const status = c.req.query('status');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;

  const items = await FeedbackService.getFeedbackList({
    workspaceId: c.req.query('crossWorkspace') === 'true' ? undefined : workspace?.id,
    category,
    severity,
    status,
    limit,
  });

  return c.json({ feedback: items }, 200);
});

/**
 * PATCH /api/beta/feedback/:id - Update Feedback Status & Founder Notes (Admin/Founder)
 */
betaRouter.patch('/feedback/:id', requireWorkspaceRole(['admin']), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const updated = await FeedbackService.updateFeedbackStatus(
    id,
    {
      status: body.status,
      founderNotes: body.founderNotes,
    },
    user?.id
  );

  if (!updated) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Feedback record not found.' } }, 404);
  }

  return c.json({ success: true, feedback: updated }, 200);
});

/**
 * GET /api/beta/customer-success - Customer Success Health Matrix (Admin/Founder)
 */
betaRouter.get('/customer-success', requireWorkspaceRole(['admin']), async (c) => {
  const profiles = await CustomerSuccessService.getAllCompanyProfiles();
  return c.json({ companies: profiles }, 200);
});

/**
 * POST /api/beta/customer-success - Upsert Company Profile (Admin/Founder)
 */
betaRouter.post('/customer-success', requireWorkspaceRole(['admin']), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.workspaceId || !body.companyName) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'workspaceId and companyName are required' } }, 400);
  }

  const profile = await CustomerSuccessService.upsertCompanyProfile(body);
  return c.json({ success: true, profile }, 200);
});

/**
 * GET /api/beta/reports/weekly - Weekly Beta Operations Report (Admin/Founder)
 */
betaRouter.get('/reports/weekly', requireWorkspaceRole(['admin']), async (c) => {
  const report = await BetaReportService.generateWeeklyReport();
  return c.json(report, 200);
});

/**
 * GET /api/beta/launch-readiness - Public Launch Readiness Scoreboard (Admin/Founder)
 */
betaRouter.get('/launch-readiness', requireWorkspaceRole(['admin']), async (c) => {
  const readiness = await LaunchReadinessService.evaluateLaunchReadiness();
  return c.json(readiness, 200);
});
