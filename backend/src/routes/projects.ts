import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { ProjectService } from '../services/project-service';
import { UserRole } from '../types';

export const projectRouter = new Hono();

projectRouter.use('*', authMiddleware);

/**
 * GET /api/projects - List projects in current workspace (Admin & Employee only; Interns blocked)
 */
projectRouter.get('/', requireRole(['admin', 'employee']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = (workspace.roleInWorkspace || user.role) as UserRole;
    const projects = await ProjectService.getProjects(workspace.id, user.id, role);

    return c.json({ projects }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get projects.' } },
      500
    );
  }
});

/**
 * POST /api/projects - Create project (Admin only, blocked for Employee and Intern)
 */
projectRouter.post('/', requireRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json();
    if (!body.title) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Project title is required.' } }, 400);
    }

    const project = await ProjectService.createProject(workspace.id, user.id, body);
    return c.json({ project }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create project.' } },
      400
    );
  }
});

/**
 * PATCH /api/projects/:id - Update project (Admin & Employee only)
 */
projectRouter.patch('/:id', requireRole(['admin', 'employee']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const projectId = c.req.param('id');
    const body = await c.req.json();

    const project = await ProjectService.updateProject(workspace.id, projectId, body);
    return c.json({ project }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to update project.' } },
      400
    );
  }
});

/**
 * DELETE /api/projects/:id - Delete project (Admin only)
 */
projectRouter.delete('/:id', requireRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const projectId = c.req.param('id');
    await ProjectService.deleteProject(workspace.id, projectId);

    return c.json({ success: true, message: 'Project deleted successfully.' }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to delete project.' } },
      400
    );
  }
});
