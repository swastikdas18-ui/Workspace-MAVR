import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { DocumentService } from '../services/document-service';
import { ObjectStorageService } from '../services/object-storage-service';
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
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 500);
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get documents.' } },
      status
    );
  }
});

/**
 * GET /api/documents/vault/* - Direct stream from Object Storage
 */
documentRouter.get('/vault/*', async (c) => {
  try {
    const key = c.req.path.replace(/^\/api\/documents\/vault\//, '');
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const decodedKey = decodeURIComponent(key);
    const obj = await ObjectStorageService.getObject(workspace.id, decodedKey);
    c.header('Content-Type', obj.contentType);
    c.header('Content-Length', String(obj.contentLength));
    return c.body(obj.body as any);
  } catch (err: any) {
    return c.json({ error: { code: 'NOT_FOUND', message: err.message || 'Object not found.' } }, 404);
  }
});

/**
 * GET /api/documents/download-stream - Attachment download stream
 */
documentRouter.get('/download-stream', async (c) => {
  try {
    const key = c.req.query('key');
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace || !key) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid download parameters.' } }, 400);
    }
    const decodedKey = decodeURIComponent(key);
    const obj = await ObjectStorageService.getObject(workspace.id, decodedKey);
    c.header('Content-Type', obj.contentType);
    c.header('Content-Length', String(obj.contentLength));
    const filename = decodedKey.split('/').pop() || 'document';
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    return c.body(obj.body as any);
  } catch (err: any) {
    return c.json({ error: { code: 'NOT_FOUND', message: err.message || 'Object not found.' } }, 404);
  }
});

/**
 * GET /api/documents/:id - Get single document with workspace isolation checks
 */
documentRouter.get('/:id', requirePermission('documents:read'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const docId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const document = await DocumentService.getDocumentById(workspace.id, docId, user.id, role);
    return c.json({ document }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'DOCUMENT_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch document.' } },
      status
    );
  }
});

/**
 * POST /api/documents (and POST /api/documents/upload) - Real multipart & JSON upload handler
 */
const uploadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    let title = '';
    let category = 'General';
    let visibility: any = 'team';
    let fileType = 'pdf';
    let mimeType = 'application/pdf';
    let buffer: Buffer | undefined;
    let sizeBytes: number | undefined;
    let fileSize: string | undefined;

    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      title = (formData.get('title') as string) || (file ? file.name.replace(/\.[^/.]+$/, '') : '');
      category = (formData.get('category') as string) || 'General';
      visibility = (formData.get('visibility') as string) || 'team';

      if (file && typeof file.arrayBuffer === 'function') {
        const ab = await file.arrayBuffer();
        buffer = Buffer.from(ab);
        sizeBytes = buffer.length;
        mimeType = file.type || 'application/octet-stream';
        const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        fileType = ext;
        fileSize = sizeBytes > 1024 * 1024 ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` : `${(sizeBytes / 1024).toFixed(1)} KB`;
      }
    } else {
      const body = await c.req.json();
      title = body.title;
      category = body.category || 'General';
      visibility = body.visibility || 'team';
      fileType = body.fileType || body.file_type || 'pdf';
      mimeType = body.mimeType || body.mime_type || (fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream');
      fileSize = body.fileSize || body.file_size;
      sizeBytes = body.fileSizeBytes || body.file_size_bytes;
      if (body.content) {
        buffer = typeof body.content === 'string' && body.content.startsWith('data:')
          ? Buffer.from(body.content.split(',')[1], 'base64')
          : Buffer.from(body.content);
        sizeBytes = buffer.length;
      }
    }

    if (!title || !title.trim()) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Document title is required.' } }, 400);
    }

    const document = await DocumentService.createDocument(workspace.id, user.id, role, {
      title,
      category,
      visibility,
      fileType,
      mimeType,
      fileSize,
      fileSizeBytes: sizeBytes,
      content: buffer,
    });

    return c.json({ document }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to create document.' } },
      status
    );
  }
};

documentRouter.post('/', requirePermission('documents:createOrg'), uploadHandler);
documentRouter.post('/upload', requirePermission('documents:createOrg'), uploadHandler);

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
 * GET and POST /api/documents/:id/download - Track download and return download payload
 */
const downloadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const docId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user?.role);
    const result = await DocumentService.incrementDownload(workspace.id, docId, user?.id, role);

    return c.json({ success: true, ...result }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'DOCUMENT_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to download document.' } },
      status
    );
  }
};

documentRouter.get('/:id/download', requirePermission('documents:download'), downloadHandler);
documentRouter.post('/:id/download', requirePermission('documents:download'), downloadHandler);
