/**
 * Phase 21G: Data Export & Portability & GDPR API Router
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { DataPortabilityService } from '../services/data-portability-service';
import { AuditService } from '../services/audit-service';

export const portabilityRouter = new Hono();

portabilityRouter.use('*', authMiddleware);

/**
 * POST /api/portability/export-workspace - Export full workspace dataset (Admin Only)
 */
portabilityRouter.post('/export-workspace', requireWorkspaceRole(['admin']), async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');

  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const archive = await DataPortabilityService.exportWorkspace(workspace.id);

  // Record immutable audit event
  await AuditService.recordLog({
    workspaceId: workspace.id,
    actorId: user.id,
    action: 'workspace.exported_full_archive',
    module: 'portability',
    metadata: { manifest: archive.manifest },
  });

  return c.json({ success: true, archive }, 200);
});

/**
 * GET /api/portability/export-user - GDPR Export User Personal Data
 */
portabilityRouter.get('/export-user', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');

  const userData = await DataPortabilityService.exportUserData(user.id);

  if (workspace) {
    await AuditService.recordLog({
      workspaceId: workspace.id,
      actorId: user.id,
      action: 'gdpr.user_data_exported',
      module: 'security',
    });
  }

  return c.json({ success: true, data: userData }, 200);
});

/**
 * POST /api/portability/gdpr-erasure - GDPR Right-to-be-Forgotten User Erasure
 */
portabilityRouter.post('/gdpr-erasure', async (c) => {
  const user = c.get('user');
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  if (body.confirmEmail !== user.email) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Confirmation email does not match authenticated user.' } }, 400);
  }

  if (workspace) {
    await AuditService.recordLog({
      workspaceId: workspace.id,
      actorId: user.id,
      action: 'gdpr.account_erasure_requested',
      module: 'security',
    });
  }

  const result = await DataPortabilityService.deleteUser(user.id);
  return c.json(result, 200);
});
