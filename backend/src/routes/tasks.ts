import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { TaskService } from '../services/task-service';
import { UserRole } from '../types';
import { normalizeRole } from '../lib/permissions';

export const taskRouter = new Hono();

taskRouter.use('*', authMiddleware);

/**
 * GET /api/tasks - List tasks for workspace (Interns only see assigned tasks)
 */
taskRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const tasks = await TaskService.getTasks(workspace.id, user.id, role);

    return c.json({ tasks }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get tasks.' } },
      status
    );
  }
});

/**
 * POST /api/tasks - Create new task (Admin & Employee only; Intern blocked)
 */
taskRouter.post('/', requirePermission('tasks:create'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();

    if (!body.title || !body.title.trim()) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Task title is required.' } }, 400);
    }

    const task = await TaskService.createTask(workspace.id, user.id, role, body);
    return c.json({ task }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to create task.' } },
      status
    );
  }
});

/**
 * PATCH /api/tasks/:id - Update task status or properties
 */
taskRouter.patch('/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const body = await c.req.json();
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const task = await TaskService.updateTask(workspace.id, user.id, role, taskId, body);
    return c.json({ task }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to update task.' } },
      status
    );
  }
});

/**
 * DELETE /api/tasks/:id - Delete task (Admin only)
 */
taskRouter.delete('/:id', requirePermission('tasks:delete'), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const taskId = c.req.param('id');
    await TaskService.deleteTask(workspace.id, user.id, role, taskId);

    return c.json({ success: true, message: 'Task deleted successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to delete task.' } },
      status
    );
  }
});

/**
 * GET /api/tasks/:id/comments - Get task comments
 */
taskRouter.get('/:id/comments', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const comments = await TaskService.getComments(workspace.id, taskId);

    return c.json({ comments }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch comments.' } },
      status
    );
  }
});

/**
 * POST /api/tasks/:id/comments - Add comment to task
 */
taskRouter.post('/:id/comments', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const body = await c.req.json();

    if (!body.content || !body.content.trim()) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Comment content cannot be empty.' } }, 400);
    }

    const comment = await TaskService.addComment(workspace.id, taskId, user.id, body.content);
    return c.json({ comment }, 201);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to post comment.' } },
      status
    );
  }
});
