import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validator';
import {
  createTaskSchema,
  updateTaskSchema,
  submitTaskReviewSchema,
  approveTaskSchema,
  requestTaskChangesSchema,
  blockTaskSchema,
  taskCommentSchema,
} from '../schemas';
import { TaskService } from '../services/task-service';
import { UserRole } from '../types';
import { normalizeRole, can } from '../lib/permissions';

export const taskRouter = new Hono();

taskRouter.use('*', authMiddleware);

/**
 * GET /api/tasks - List tasks for workspace with optional filtering
 */
taskRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const projectId = c.req.query('projectId') || c.req.query('project_id');
    const teamId = c.req.query('teamId') || c.req.query('team_id');
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const assignedTo = c.req.query('assignedTo') || c.req.query('assigned_to');
    const isBlockedQuery = c.req.query('isBlocked') || c.req.query('is_blocked');
    const isBlocked = isBlockedQuery !== undefined ? isBlockedQuery === 'true' : undefined;

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const start = Date.now();
    const tasks = await TaskService.getTasks(workspace.id, user.id, role, {
      projectId,
      teamId,
      status,
      priority,
      assignedTo,
      isBlocked,
    });

    console.info('[Tasks API] List tasks', {
      op: 'list_tasks',
      workspaceId: workspace.id,
      userId: user.id,
      role,
      count: tasks.length,
      durationMs: Date.now() - start,
    });

    return c.json({ tasks }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    console.error('[Tasks API Error] List tasks failed', {
      op: 'list_tasks',
      workspaceId: c.get('workspace')?.id,
      userId: c.get('user')?.id,
      errorCode: err.code || 'INTERNAL_SERVER_ERROR',
      status,
    });
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get tasks.' } },
      status
    );
  }
});

/**
 * POST /api/tasks - Create new task
 */
taskRouter.post('/', validateBody(createTaskSchema), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    
    // Check permission: either standard role permission OR user is department lead in workspace
    const isAllowed = can(role, 'tasks:create', undefined, { userId: user.id, workspaceId: workspace.id });
    if (!isAllowed) {
      const leadDept = await TaskService.getLeadDepartment(workspace.id, user.id);
      if (!leadDept) {
        return c.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: `Access denied. Workspace role [${role.toUpperCase()}] is not permitted for action [tasks:create].`,
            },
          },
          403
        );
      }
    }

    const body = await c.req.json();
    const start = Date.now();

    const task = await TaskService.createTask(workspace.id, user.id, role, body);

    console.info('[Tasks API] Created task', {
      op: 'create_task',
      workspaceId: workspace.id,
      taskId: task.id,
      userId: user.id,
      role,
      durationMs: Date.now() - start,
    });

    return c.json({ task }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : 400);
    console.error('[Tasks API Error] Create task failed', {
      op: 'create_task',
      workspaceId: c.get('workspace')?.id,
      userId: c.get('user')?.id,
      errorCode: err.code || 'BAD_REQUEST',
      status,
    });
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to create task.' } },
      status
    );
  }
});

/**
 * GET /api/tasks/:id - Get single task by ID with workspace isolation checks
 */
taskRouter.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const task = await TaskService.getTaskById(workspace.id, user.id, role, taskId);
    return c.json({ task }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    console.error('[Tasks API Error] Get task failed', {
      op: 'get_task',
      workspaceId: c.get('workspace')?.id,
      taskId: c.req.param('id'),
      userId: c.get('user')?.id,
      errorCode: err.code || 'BAD_REQUEST',
      status,
    });
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch task.' } },
      status
    );
  }
});

/**
 * PUT & PATCH /api/tasks/:id - Update task status or properties
 */
const updateTaskHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const body = await c.req.json();
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const start = Date.now();

    const task = await TaskService.updateTask(workspace.id, user.id, role, taskId, body);

    console.info('[Tasks API] Updated task', {
      op: 'update_task',
      workspaceId: workspace.id,
      taskId,
      userId: user.id,
      role,
      durationMs: Date.now() - start,
    });

    return c.json({ task }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    console.error('[Tasks API Error] Update task failed', {
      op: 'update_task',
      workspaceId: c.get('workspace')?.id,
      taskId: c.req.param('id'),
      userId: c.get('user')?.id,
      errorCode: err.code || 'VALIDATION_ERROR',
      status,
    });
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to update task.' } },
      status
    );
  }
};

taskRouter.patch('/:id', validateBody(updateTaskSchema), updateTaskHandler);
taskRouter.put('/:id', validateBody(updateTaskSchema), updateTaskHandler);

/**
 * POST /api/tasks/:id/start - Transition Todo -> In Progress
 */
taskRouter.post('/:id/start', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const task = await TaskService.startTask(workspace.id, user.id, role, taskId);
    return c.json({ task, message: 'Task started successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to start task.' } },
      status
    );
  }
});

/**
 * POST /api/tasks/:id/submit-review - Transition In Progress -> Review
 */
taskRouter.post('/:id/submit-review', validateBody(submitTaskReviewSchema), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    let notes: string | undefined;
    try {
      const body = await c.req.json();
      notes = body.notes;
    } catch {
      // Optional notes
    }

    const task = await TaskService.submitReview(workspace.id, user.id, role, taskId, notes);
    return c.json({ task, message: 'Task submitted for review successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to submit task for review.' } },
      status
    );
  }
});

/**
 * POST /api/tasks/:id/approve - Transition Review -> Done
 */
taskRouter.post('/:id/approve', validateBody(approveTaskSchema), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    let feedback: string | undefined;
    try {
      const body = await c.req.json();
      feedback = body.feedback;
    } catch {
      // Optional feedback
    }

    const task = await TaskService.approveTask(workspace.id, user.id, role, taskId, feedback);
    return c.json({ task, message: 'Task approved and completed.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to approve task.' } },
      status
    );
  }
});

/**
 * POST /api/tasks/:id/request-changes - Transition Review -> In Progress
 */
taskRouter.post('/:id/request-changes', validateBody(requestTaskChangesSchema), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();

    const task = await TaskService.requestChanges(workspace.id, user.id, role, taskId, body.feedback);
    return c.json({ task, message: 'Changes requested on task.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to request changes.' } },
      status
    );
  }
});

/**
 * POST /api/tasks/:id/block - Block task with reason
 */
taskRouter.post('/:id/block', validateBody(blockTaskSchema), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();

    const task = await TaskService.blockTask(workspace.id, user.id, role, taskId, body.reason);
    return c.json({ task, message: 'Task marked as blocked.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to block task.' } },
      status
    );
  }
});

/**
 * POST /api/tasks/:id/unblock - Unblock task
 */
taskRouter.post('/:id/unblock', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const task = await TaskService.unblockTask(workspace.id, user.id, role, taskId);
    return c.json({ task, message: 'Task unblocked successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to unblock task.' } },
      status
    );
  }
});

/**
 * GET /api/tasks/:id/activity - Get task activity timeline
 */
taskRouter.get('/:id/activity', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    // Verify task view authorization
    await TaskService.getTaskById(workspace.id, user.id, role, taskId);

    const activity = await TaskService.getTaskActivity(workspace.id, taskId);
    return c.json({ activity }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch task activity.' } },
      status
    );
  }
});

/**
 * DELETE /api/tasks/:id - Delete task
 */
taskRouter.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    // Allow if has tasks:delete permission OR is a department lead (service will enforce workspace-wide & department restrictions)
    const isAllowed = can(role, 'tasks:delete', undefined, { userId: user.id, workspaceId: workspace.id });
    if (!isAllowed) {
      const leadDept = await TaskService.getLeadDepartment(workspace.id, user.id);
      if (!leadDept) {
        return c.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: `Access denied. Workspace role [${role.toUpperCase()}] is not permitted for action [tasks:delete].`,
            },
          },
          403
        );
      }
    }

    const taskId = c.req.param('id');
    const start = Date.now();
    await TaskService.deleteTask(workspace.id, user.id, role, taskId);

    console.info('[Tasks API] Deleted task', {
      op: 'delete_task',
      workspaceId: workspace.id,
      taskId,
      userId: user.id,
      role,
      durationMs: Date.now() - start,
    });

    return c.json({ success: true, message: 'Task deleted successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    console.error('[Tasks API Error] Delete task failed', {
      op: 'delete_task',
      workspaceId: c.get('workspace')?.id,
      taskId: c.req.param('id'),
      userId: c.get('user')?.id,
      errorCode: err.code || 'BAD_REQUEST',
      status,
    });
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
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    // Verify task view authorization
    await TaskService.getTaskById(workspace.id, user.id, role, taskId);

    const comments = await TaskService.getComments(workspace.id, taskId);

    return c.json({ comments }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch comments.' } },
      status
    );
  }
});

/**
 * POST /api/tasks/:id/comment & /api/tasks/:id/comments - Add comment to task
 */
const postCommentHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const body = await c.req.json();
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const comment = await TaskService.addComment(workspace.id, taskId, user.id, body.content, role);
    return c.json({ comment }, 201);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to post comment.' } },
      status
    );
  }
};

taskRouter.post('/:id/comments', validateBody(taskCommentSchema), postCommentHandler);
taskRouter.post('/:id/comment', validateBody(taskCommentSchema), postCommentHandler);


/**
 * GET /api/tasks/:id/discussion - Get task discussion thread
 */
taskRouter.get('/:id/discussion', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    const discussion = await TaskService.getTaskDiscussion(workspace.id, user.id, role, taskId);
    return c.json(discussion, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message } }, status);
  }
});

/**
 * POST /api/tasks/:id/discussion - Post comment into task discussion
 */
taskRouter.post('/:id/discussion', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json().catch(() => ({}));

    if (!body.content || !body.content.trim()) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Discussion content cannot be empty.' } }, 400);
    }

    const result = await TaskService.postTaskDiscussion(workspace.id, user.id, role, taskId, body.content);
    return c.json(result, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' || err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message } }, status);
  }
});
