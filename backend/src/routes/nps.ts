/**
 * Phase 23C: NPS Survey API Router
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { NpsService } from '../services/nps-service';

export const npsRouter = new Hono();

npsRouter.use('*', authMiddleware);

/**
 * POST /api/nps/submit - Submit an NPS survey response (Any logged-in user)
 */
npsRouter.post('/submit', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  if (body.score === undefined || body.score === null) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'NPS score (0-10) is required' } }, 400);
  }

  const score = parseInt(body.score, 10);
  if (isNaN(score) || score < 0 || score > 10) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'NPS score must be an integer between 0 and 10' } }, 400);
  }

  try {
    const record = await NpsService.submitSurvey({
      workspaceId: workspace?.id || 'ws-default',
      userId: user?.id,
      score,
      comment: body.comment,
    });

    return c.json({ success: true, survey: record }, 201);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message } }, 400);
  }
});

/**
 * GET /api/nps/metrics - Get computed NPS score and distribution (Admin/Founder)
 */
npsRouter.get('/metrics', requireWorkspaceRole(['admin']), async (c) => {
  const minRequired = c.req.query('minRequired') ? parseInt(c.req.query('minRequired')!, 10) : 20;
  const metrics = await NpsService.getMetrics(minRequired);
  return c.json(metrics, 200);
});
