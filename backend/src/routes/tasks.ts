import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { TaskService } from '../services/task-service';
import { UserRole } from '../types';

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

    const role = (workspace.roleInWorkspace || user.role) as UserRole;
    const tasks = await TaskService.getTasks(workspace.id, user.id, role);

    return c.json({ tasks }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get tasks.' } },
      500
    );
  }
});

/**
 * POST /api/tasks - Create new task (Admin & Employee only; Intern blocked)
 */
taskRouter.post('/', requireRole(['admin', 'employee']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = (workspace.roleInWorkspace || user.role) as UserRole;
    const body = await c.req.json();

    if (!body.title) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Task title is required.' } }, 400);
    }

    const task = await TaskService.createTask(workspace.id, user.id, role, body);
    return c.json({ task }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create task.' } },
      400
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
    const role = (workspace.roleInWorkspace || user.role) as UserRole;

    // Intern can only update status of their assigned tasks
    if (role === 'intern') {
      const allowedKeys = Object.keys(body);
      if (allowedKeys.some((k) => k !== 'status')) {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'Interns can only update task status.' } },
          403
        );
      }
    }

    const task = await TaskService.updateTask(workspace.id, taskId, body);
    return c.json({ task }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to update task.' } },
      400
    );
  }
});

/**
 * DELETE /api/tasks/:id - Delete task (Admin only)
 */
taskRouter.delete('/:id', requireRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    await TaskService.deleteTask(workspace.id, taskId);

    return c.json({ success: true, message: 'Task deleted successfully.' }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to delete task.' } },
      400
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
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to fetch comments.' } },
      400
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
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to post comment.' } },
      400
    );
  }
});
