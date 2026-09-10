import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { TaskService } from '../services/task-service';
import { UserRole } from '../types';
import { normalizeRole } from '../lib/permissions';

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
    const tasks = await TaskService.getTasks(workspace.id, user.id, role, {
      projectId,
      teamId,
      status,
      priority,
      assignedTo,
      isBlocked,
    });

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
 * POST /api/tasks - Create new task
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
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Task title is required.' } }, 400);
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

    const task = await TaskService.updateTask(workspace.id, user.id, role, taskId, body);
    return c.json({ task }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'VALIDATION_ERROR', message: err.message || 'Failed to update task.' } },
      status
    );
  }
};

taskRouter.patch('/:id', updateTaskHandler);
taskRouter.put('/:id', updateTaskHandler);

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
taskRouter.post('/:id/submit-review', async (c) => {
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
taskRouter.post('/:id/approve', async (c) => {
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
taskRouter.post('/:id/request-changes', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();

    if (!body.feedback || !body.feedback.trim()) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Feedback is required when requesting changes.' } }, 400);
    }

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
taskRouter.post('/:id/block', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();

    if (!body.reason || !body.reason.trim()) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Blocked reason is required.' } }, 400);
    }

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
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }
    const taskId = c.req.param('id');
    const activity = await TaskService.getTaskActivity(workspace.id, taskId);
    return c.json({ activity }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'TASK_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch task activity.' } },
      status
    );
  }
});

/**
 * DELETE /api/tasks/:id - Delete task
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

    if (!body.content || !body.content.trim()) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Comment content cannot be empty.' } }, 400);
    }

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

taskRouter.post('/:id/comments', postCommentHandler);
taskRouter.post('/:id/comment', postCommentHandler);

/**
 * POST /api/tasks/from-message - Create task directly from a chat message (Phase 2.1)
 */
taskRouter.post('/from-message', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json().catch(() => ({}));

    const messageId = body.messageId || body.sourceMessageId;
    if (!messageId) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'messageId is required.' } }, 400);
    }

    const { ChatService } = await import('../services/chat-service.js');
    const result = await ChatService.createMessageTask(workspace.id, messageId, user.id, role, {
      title: body.title,
      description: body.description,
      projectId: body.projectId,
      assignedTo: body.assignedTo || body.assigneeId,
      priority: body.priority,
      dueDate: body.dueDate,
    });

    return c.json({
      task: result.task,
      messageTask: result.messageTask,
      sourceMessageId: messageId,
      sourceConversationId: result.task?.sourceConversationId || result.task?.linkedConversationId,
      sourceWorkspaceId: workspace.id,
    }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message } }, status);
  }
});

/**
 * GET /api/tasks/:id/discussion - Get task discussion thread and linked chat conversation (Phase 2.2)
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
 * POST /api/tasks/:id/discussion - Post into linked discussion thread from task (Phase 2.2)
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
