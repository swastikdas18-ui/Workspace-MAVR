/**
 * Phase 21E: Audit & Compliance Center API Router
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { AuditService } from '../services/audit-service';

export const auditRouter = new Hono();

// Audit logs are strictly Administrator-only
auditRouter.use('*', authMiddleware, requireWorkspaceRole(['admin']));

/**
 * GET /api/audit/logs - Filter and list immutable audit trail
 */
auditRouter.get('/logs', async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const actorId = c.req.query('actorId');
  const action = c.req.query('action');
  const module = c.req.query('module');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;

  const result = await AuditService.getLogs({
    workspaceId: workspace.id,
    actorId,
    action,
    module,
    limit,
  });

  return c.json(result, 200);
});

/**
 * GET /api/audit/export/csv - Stream CSV audit export
 */
auditRouter.get('/export/csv', async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const csvData = await AuditService.exportCsv(workspace.id);
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="audit_trail_${workspace.id}_${Date.now()}.csv"`);
  return c.text(csvData, 200);
});

/**
 * GET /api/audit/export/json - Export JSON compliance records
 */
auditRouter.get('/export/json', async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const jsonData = await AuditService.exportJson(workspace.id);
  c.header('Content-Type', 'application/json');
  c.header('Content-Disposition', `attachment; filename="audit_trail_${workspace.id}_${Date.now()}.json"`);
  return c.text(jsonData, 200);
});

/**
 * GET /api/audit - Audit trail summary & overview
 */
auditRouter.get('/', async (c) => {
  const workspace = c.get('workspace');
  if (!workspace) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
  }

  const result = await AuditService.getLogs({
    workspaceId: workspace.id,
    limit: 50,
  });

  return c.json({ status: 'active', ...result }, 200);
});

