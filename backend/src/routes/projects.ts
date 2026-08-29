import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ProjectService } from '../services/project-service';
import { normalizeRole } from '../lib/permissions';

export const projectRouter = new Hono();

projectRouter.use('*', authMiddleware);

/**
 * GET /api/projects - List projects in current workspace (Admin & Employee only; Interns blocked with 403)
 */
projectRouter.get('/', requirePermission('projects:read'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const projects = await ProjectService.getProjects(workspace.id, user.id, role);

    return c.json({ projects }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 500);
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get projects.' } },
      status
    );
  }
});

/**
 * GET /api/projects/:id - Get single project by ID with workspace isolation checks
 */
projectRouter.get('/:id', requirePermission('projects:read'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const projectId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const project = await ProjectService.getProjectById(workspace.id, user.id, role, projectId);
    return c.json({ project }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'PROJECT_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch project.' } },
      status
    );
  }
});

/**
 * POST /api/projects - Create project (Admin only)
 */
projectRouter.post('/', requirePermission('projects:create'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();
    const title = (body.title || body.name || '').trim();
    if (!title) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Project title is required.' } }, 400);
    }

    const project = await ProjectService.createProject(workspace.id, user.id, role, {
      ...body,
      title,
      dueDate: body.dueDate || body.due_date || new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    return c.json({ project }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to create project.' } },
      status
    );
  }
});

/**
 * PATCH /api/projects/:id - Update project (Admin & Assigned Employee only)
 */
projectRouter.patch(
  '/:id',
  requirePermission('projects:update'),
  async (c) => {
    try {
      const user = c.get('user');
      const workspace = c.get('workspace');

      if (!workspace) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
      }

      const projectId = c.req.param('id');
      const body = await c.req.json();

      const result = await ProjectService.updateProject(
        workspace.id,
        user.id,
        user.role,
        projectId,
        body
      );

      return c.json(result);
    } catch (err: any) {
      console.error('[projects.ts] Error in patch /:id:', err.message || err, err.stack);
      const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'PROJECT_NOT_FOUND' ? 404 : 400);
      return c.json(
        { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to update project.' } },
        status
      );
    }
  }
);

/**
 * DELETE /api/projects/:id - Delete project (Admin only)
 */
projectRouter.delete('/:id', requirePermission('projects:delete'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const projectId = c.req.param('id');
    await ProjectService.deleteProject(workspace.id, user.id, role, projectId);

    return c.json({ success: true, message: 'Project deleted successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'PROJECT_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to delete project.' } },
      status
    );
  }
});
