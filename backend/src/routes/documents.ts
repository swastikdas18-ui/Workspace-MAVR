import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { DocumentService } from '../services/document-service';
import { normalizeRole } from '../lib/permissions';

export const documentRouter = new Hono();

documentRouter.use('*', authMiddleware);

/**
 * GET /api/documents - List documents in workspace
 */
documentRouter.get('/', requirePermission('documents:read'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const documents = await DocumentService.getDocuments(workspace.id, user.id, role);

    return c.json({ documents }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get documents.' } },
      status
    );
  }
});

/**
 * POST /api/documents - Upload document (Admin, Employee only; Intern blocked)
 */
documentRouter.post('/', requirePermission('documents:createOrg'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();

    if (!body.title || !body.title.trim()) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Document title is required.' } }, 400);
    }

    const document = await DocumentService.createDocument(workspace.id, user.id, role, body);
    return c.json({ document }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to create document.' } },
      status
    );
  }
});

/**
 * DELETE /api/documents/:id - Delete document (Admin any, Employee own, Intern blocked)
 */
documentRouter.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const docId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    await DocumentService.deleteDocument(workspace.id, docId, user.id, role);
    return c.json({ success: true, message: 'Document deleted successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'DOCUMENT_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message } },
      status
    );
  }
});

/**
 * POST /api/documents/:id/download - Track download count
 */
documentRouter.post('/:id/download', requirePermission('documents:download'), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const docId = c.req.param('id');
    const downloadCount = await DocumentService.incrementDownload(workspace.id, docId);

    return c.json({ success: true, downloadCount }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to increment download.' } },
      status
    );
  }
});
