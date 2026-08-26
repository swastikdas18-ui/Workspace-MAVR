/**
 * Phase 21B: User Onboarding API Router
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { OnboardingService } from '../services/onboarding-service';
import { ProductAnalyticsService } from '../services/product-analytics-service';

export const onboardingRouter = new Hono();

onboardingRouter.use('*', authMiddleware);

/**
 * GET /api/onboarding/status - Get onboarding progress and step list
 */
onboardingRouter.get('/status', async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const status = await OnboardingService.getStatus(workspace.id);
  return c.json(status, 200);
});

/**
 * PATCH /api/onboarding/step - Mark an onboarding step complete
 */
onboardingRouter.patch('/step', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const stepId = body.stepId;
  if (!stepId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'stepId is required' } }, 400);
  }

  const status = await OnboardingService.completeStep(workspace.id, stepId);

  // Track event
  await ProductAnalyticsService.trackEvent({
    workspaceId: workspace.id,
    userId: user.id,
    eventName: `onboarding.step_completed`,
    metadata: { stepId, progressPercent: status.progressPercent },
  });

  return c.json(status, 200);
});

/**
 * POST /api/onboarding/dismiss - Dismiss the onboarding wizard
 */
onboardingRouter.post('/dismiss', async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));
  const dismissed = body.dismissed !== false;

  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const status = await OnboardingService.setDismissed(workspace.id, dismissed);
  return c.json(status, 200);
});
