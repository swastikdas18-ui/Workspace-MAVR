import { UserRole } from '../types';
import { can, normalizeRole } from '../lib/permissions';
import { TaskRepository, TaskEntity, TaskCommentEntity, TaskUpdateEntity } from '../repositories/task-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { NotificationRepository } from '../repositories/notification-repository';
import { NotificationService } from './notification-service';
import { EventService } from './event-service';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';
import { inArray } from 'drizzle-orm';

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  storyPoints?: number;
  story_points?: number;
  estimatedHours?: number;
  estimated_hours?: number;
  assignedTo?: string;
  assigned_to?: string;
  projectId?: string;
  project_id?: string;
  teamId?: string;
  team_id?: string;
  dueDate?: string;
  due_date?: string;
  isLearningTask?: boolean;
  is_learning_task?: boolean;
  sourceMessageId?: string | null;
  source_message_id?: string | null;
  sourceConversationId?: string | null;
  source_conversation_id?: string | null;
  linkedConversationId?: string | null;
  linked_conversation_id?: string | null;
  linkedMessageId?: string | null;
  linked_message_id?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  storyPoints?: number;
  story_points?: number;
  estimatedHours?: number;
  estimated_hours?: number;
  actualHours?: number;
  actual_hours?: number;
  assignedTo?: string;
  assigned_to?: string;
  projectId?: string;
  project_id?: string;
  teamId?: string;
  team_id?: string;
  dueDate?: string;
  due_date?: string;
  isBlocked?: boolean;
  is_blocked?: boolean;
  blockedReason?: string;
  blocked_reason?: string;
  isLearningTask?: boolean;
  is_learning_task?: boolean;
  sourceMessageId?: string | null;
  source_message_id?: string | null;
  sourceConversationId?: string | null;
  source_conversation_id?: string | null;
  linkedConversationId?: string | null;
  linked_conversation_id?: string | null;
  linkedMessageId?: string | null;
  linked_message_id?: string | null;
}

export class TaskService {
  /**
   * Allowed state machine transitions:
   * Backlog -> Todo
   * Todo -> In Progress
   * In Progress -> Review
   * Review -> Done
   * Review -> In Progress
   */
  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    backlog: ['todo'],
    todo: ['in_progress'],
    in_progress: ['review'],
    review: ['done', 'in_progress'],
    done: [],
  };

  /**
   * Validates state transition according to Phase 2 State Machine rules
   */
  public static validateStatusTransition(currentStatus: string, nextStatus: string): void {
    const from = currentStatus.toLowerCase() === 'completed' ? 'done' : currentStatus.toLowerCase();
    const to = nextStatus.toLowerCase() === 'completed' ? 'done' : nextStatus.toLowerCase();

    if (from === to) return;

    const allowedNext = this.ALLOWED_TRANSITIONS[from] || [];
    if (!allowedNext.includes(to)) {
      const error: any = new Error(
        `Invalid task status transition from '${from}' to '${to}'. Allowed transitions from '${from}' are: [${allowedNext.join(', ') || 'none'}].`
      );
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }
  }

  /**
   * Helper to recalculate project progress from its tasks automatically
   */
  public static async recalculateProjectProgress(workspaceId: string, projectId: string): Promise<number> {
    if (!projectId) return 0;
    try {
      const projectTasks = await TaskRepository.getTasksByProject(workspaceId, projectId);
      const totalCount = projectTasks.length;
      if (totalCount === 0) {
        await ProjectRepository.updateProject(workspaceId, projectId, { progress: 0 });
        return 0;
      }
      const doneCount = projectTasks.filter(
        (t) => t.status === 'done' || t.status === 'completed'
      ).length;
      const progress = Math.round((doneCount / totalCount) * 100);
      await ProjectRepository.updateProject(workspaceId, projectId, { progress });
      return progress;
    } catch {
      return 0;
    }
  }

  /**
   * Helper to batch resolve assignee user records
   */
  private static async resolveAssigneeMap(
    userIds: string[]
  ): Promise<Map<string, { id: string; name: string; email: string; role: string; avatar?: string | null }>> {
    const userMap = new Map<string, any>();
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return userMap;

    const db = getDb();
    if (db) {
      try {
        const rows = await db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            role: schema.users.role,
            avatar: schema.users.avatar,
          })
          .from(schema.users)
          .where(inArray(schema.users.id, uniqueIds));

        rows.forEach((r) => userMap.set(r.id, r));
      } catch {
        // Fallback
      }
    }

    uniqueIds.forEach((id) => {
      if (!userMap.has(id)) {
        const memUser = inMemoryDb.users.get(id);
        if (memUser) {
          userMap.set(id, {
            id: memUser.id,
            name: memUser.name,
            email: memUser.email,
            role: memUser.role,
            avatar: (memUser as any).avatar || null,
          });
        }
      }
    });

    return userMap;
  }

  /**
   * List tasks for the active workspace, filtered by user role and query parameters
   */
  static async getTasks(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    filters?: {
      projectId?: string;
      teamId?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
      isBlocked?: boolean;
    }
  ): Promise<any[]> {
    const role = normalizeRole(rawRole);
    const tasks = await TaskRepository.listTasks(workspaceId, {
      userId,
      role,
      ...filters,
    });

    const userMap = await this.resolveAssigneeMap(tasks.map((t) => t.assignedTo));

    return tasks.map((t) => {
      const assigneeObj = userMap.get(t.assignedTo) || null;
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status === 'completed' ? 'done' : t.status,
        priority: t.priority || 'medium',
        story_points: t.storyPoints || 1,
        storyPoints: t.storyPoints || 1,
        estimated_hours: t.estimatedHours || null,
        estimatedHours: t.estimatedHours || null,
        actual_hours: t.actualHours || 0,
        actualHours: t.actualHours || 0,
        assigned_to: t.assignedTo,
        assignedTo: t.assignedTo,
        assignee: assigneeObj,
        assignee_name: assigneeObj?.name || null,
        assignee_avatar: assigneeObj?.avatar || null,
        project_id: t.projectId || '',
        projectId: t.projectId || '',
        team_id: t.teamId || null,
        teamId: t.teamId || null,
        workspace_id: t.workspaceId,
        due_date: t.dueDate ? new Date(t.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        started_at: t.startedAt ? new Date(t.startedAt).toISOString() : null,
        completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null,
        reviewed_by: t.reviewedBy || null,
        reviewed_at: t.reviewedAt ? new Date(t.reviewedAt).toISOString() : null,
        is_blocked: t.isBlocked || false,
        isBlocked: t.isBlocked || false,
        blocked_reason: t.blockedReason || null,
        blockedReason: t.blockedReason || null,
        created_at: t.createdAt ? new Date(t.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        is_learning_task: t.isLearningTask || false,
        source_message_id: t.sourceMessageId || null,
        sourceMessageId: t.sourceMessageId || null,
        source_conversation_id: t.sourceConversationId || null,
        sourceConversationId: t.sourceConversationId || null,
        linked_conversation_id: t.linkedConversationId || null,
        linkedConversationId: t.linkedConversationId || null,
        linked_message_id: t.linkedMessageId || null,
        linkedMessageId: t.linkedMessageId || null,
        comments_count: t.commentsCount || 0,
        activity_count: t.activityCount || 0,
      };
    });
  }

  /**
   * Create a new task within a workspace
   */
  static async createTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    input: CreateTaskInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);

    // RBAC check: Interns forbidden from creating tasks
    if (role === 'intern' || !can(role, 'tasks:create', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from creating tasks.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (!input.title || !input.title.trim()) {
      const error: any = new Error('Task title is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const projectId = input.projectId || input.project_id;
    if (!projectId || !projectId.trim()) {
      const error: any = new Error('Project ID is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    // Cross-Workspace Project Validation
    const project = await ProjectRepository.getProjectById(workspaceId, projectId.trim());
    if (!project) {
      const error: any = new Error('Referenced project does not belong to the active workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const dueDateStr = input.dueDate || input.due_date;
    const dueDate = dueDateStr ? new Date(dueDateStr) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const assignedToRaw = input.assignedTo || input.assigned_to;
    const assignedTo = assignedToRaw && assignedToRaw.trim() ? assignedToRaw.trim() : userId;

    const rawStatus = input.status || 'todo';
    const status = rawStatus === 'completed' ? 'done' : rawStatus;

    const task = await TaskRepository.createTask(workspaceId, userId, {
      title: input.title.trim(),
      description: input.description?.trim() || '',
      status,
      priority: input.priority || 'medium',
      storyPoints: input.storyPoints || input.story_points || 1,
      estimatedHours: input.estimatedHours || input.estimated_hours,
      assignedTo,
      projectId: projectId.trim(),
      teamId: input.teamId || input.team_id,
      dueDate,
      isLearningTask: input.isLearningTask || input.is_learning_task || false,
      sourceMessageId: input.sourceMessageId || input.source_message_id || null,
      sourceConversationId: input.sourceConversationId || input.source_conversation_id || null,
      linkedConversationId: input.linkedConversationId || input.linked_conversation_id || null,
      linkedMessageId: input.linkedMessageId || input.linked_message_id || null,
    });

    // Auto-calculate project progress
    await this.recalculateProjectProgress(workspaceId, task.projectId);

    // Dispatch Notification to Assignee if different from creator
    if (assignedTo !== userId) {
      await NotificationService.createNotification({
        workspaceId,
        recipientId: assignedTo,
        actorId: userId,
        title: 'New Task Assigned',
        message: `You have been assigned task "${task.title}" on project "${project.title}".`,
        type: 'task_assigned',
        entityType: 'task',
        entityId: task.id,
        link: `/tasks/${task.id}`,
      }).catch(() => null);
    }

    // Emit event: Task Created
    await EventService.emitTaskCreated(
      { workspaceId, actorId: userId },
      {
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        assignedTo: task.assignedTo,
        isLearningTask: task.isLearningTask,
      }
    );

    const userMap = await this.resolveAssigneeMap([task.assignedTo]);
    const assigneeObj = userMap.get(task.assignedTo) || null;

    return {
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      story_points: task.storyPoints || 1,
      storyPoints: task.storyPoints || 1,
      estimated_hours: task.estimatedHours || null,
      estimatedHours: task.estimatedHours || null,
      actual_hours: task.actualHours || 0,
      actualHours: task.actualHours || 0,
      assigned_to: task.assignedTo,
      assignedTo: task.assignedTo,
      assignee: assigneeObj,
      assignee_name: assigneeObj?.name || null,
      assignee_avatar: assigneeObj?.avatar || null,
      project_id: task.projectId,
      projectId: task.projectId,
      team_id: task.teamId || null,
      teamId: task.teamId || null,
      workspace_id: task.workspaceId,
      due_date: task.dueDate.toISOString().substring(0, 10),
      created_at: task.createdAt.toISOString().substring(0, 10),
      createdAt: task.createdAt.toISOString().substring(0, 10),
      is_learning_task: task.isLearningTask || false,
      is_blocked: false,
      isBlocked: false,
      source_message_id: task.sourceMessageId || null,
      sourceMessageId: task.sourceMessageId || null,
      source_conversation_id: task.sourceConversationId || null,
      sourceConversationId: task.sourceConversationId || null,
      linked_conversation_id: task.linkedConversationId || null,
      linkedConversationId: task.linkedConversationId || null,
      linked_message_id: task.linkedMessageId || null,
      linkedMessageId: task.linkedMessageId || null,
      comments_count: 0,
      activity_count: 1,
    };
  }

  /**
   * Get single task by ID with workspace isolation checks
   */
  static async getTaskById(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    const existing = await TaskRepository.getTaskById(workspaceId, taskId);

    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: task belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (role === 'intern' && existing.assignedTo !== userId) {
      const error: any = new Error('Interns are not authorized to view unassigned tasks.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (role === 'employee') {
      const project = existing.projectId
        ? await ProjectRepository.getProjectById(workspaceId, existing.projectId)
        : null;

      const isAssigned = existing.assignedTo === userId;
      const isCreator = existing.createdBy === userId;
      const isProjectMember = project ? project.memberIds.includes(userId) : false;
      const isProjectOwner = project ? project.createdBy === userId : false;

      if (!isAssigned && !isCreator && !isProjectMember && !isProjectOwner) {
        const error: any = new Error('Unauthorized to view unassigned task.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
    }

    const userMap = await this.resolveAssigneeMap([existing.assignedTo]);
    const assigneeObj = userMap.get(existing.assignedTo) || null;

    return {
      id: existing.id,
      title: existing.title,
      description: existing.description || '',
      status: existing.status === 'completed' ? 'done' : existing.status,
      priority: existing.priority || 'medium',
      story_points: existing.storyPoints || 1,
      storyPoints: existing.storyPoints || 1,
      estimated_hours: existing.estimatedHours || null,
      estimatedHours: existing.estimatedHours || null,
      actual_hours: existing.actualHours || 0,
      actualHours: existing.actualHours || 0,
      assigned_to: existing.assignedTo,
      assignedTo: existing.assignedTo,
      assignee: assigneeObj,
      assignee_name: assigneeObj?.name || null,
      assignee_avatar: assigneeObj?.avatar || null,
      project_id: existing.projectId || '',
      projectId: existing.projectId || '',
      team_id: existing.teamId || null,
      teamId: existing.teamId || null,
      workspace_id: existing.workspaceId,
      due_date: existing.dueDate ? new Date(existing.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      started_at: existing.startedAt ? new Date(existing.startedAt).toISOString() : null,
      completed_at: existing.completedAt ? new Date(existing.completedAt).toISOString() : null,
      reviewed_by: existing.reviewedBy || null,
      reviewed_at: existing.reviewedAt ? new Date(existing.reviewedAt).toISOString() : null,
      is_blocked: existing.isBlocked || false,
      isBlocked: existing.isBlocked || false,
      blocked_reason: existing.blockedReason || null,
      blockedReason: existing.blockedReason || null,
      created_at: existing.createdAt ? new Date(existing.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      createdAt: existing.createdAt ? new Date(existing.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      is_learning_task: existing.isLearningTask || false,
      source_message_id: existing.sourceMessageId || null,
      sourceMessageId: existing.sourceMessageId || null,
      source_conversation_id: existing.sourceConversationId || null,
      sourceConversationId: existing.sourceConversationId || null,
      linked_conversation_id: existing.linkedConversationId || null,
      linkedConversationId: existing.linkedConversationId || null,
      linked_message_id: existing.linkedMessageId || null,
      linkedMessageId: existing.linkedMessageId || null,
      comments_count: existing.commentsCount || 0,
      activity_count: existing.activityCount || 0,
    };
  }

  /**
   * Update task details or status with state machine checks
   */
  static async updateTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string,
    updates: UpdateTaskInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    const existing = await TaskRepository.getTaskById(workspaceId, taskId);

    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: task belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (updates.title !== undefined && !updates.title.trim()) {
      const error: any = new Error('Task title cannot be empty.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    // RBAC: Interns forbidden from generic updating (only status actions permitted via dedicated endpoints)
    if (role === 'intern') {
      const error: any = new Error('Interns are forbidden from updating task properties.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (role === 'employee') {
      const project = existing.projectId
        ? await ProjectRepository.getProjectById(workspaceId, existing.projectId)
        : null;

      const isAssigned = existing.assignedTo === userId;
      const isCreator = existing.createdBy === userId;
      const isProjectMember = project ? project.memberIds.includes(userId) : false;
      const isProjectOwner = project ? project.createdBy === userId : false;

      if (!isAssigned && !isCreator && !isProjectMember && !isProjectOwner) {
        const error: any = new Error('Unauthorized to mutate unassigned task.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
    }

    // State machine check if status changed
    let targetStatus = existing.status;
    if (updates.status !== undefined) {
      const mappedStatus = updates.status === 'completed' ? 'done' : updates.status;
      if (mappedStatus !== existing.status) {
        this.validateStatusTransition(existing.status, mappedStatus);
        targetStatus = mappedStatus;
      }
    }

    const updatedTask = await TaskRepository.updateTask(workspaceId, taskId, {
      title: updates.title !== undefined ? updates.title.trim() : undefined,
      description: updates.description !== undefined ? updates.description.trim() : undefined,
      status: targetStatus,
      priority: updates.priority,
      storyPoints: updates.storyPoints || updates.story_points,
      estimatedHours: updates.estimatedHours || updates.estimated_hours,
      actualHours: updates.actualHours || updates.actual_hours,
      assignedTo: updates.assignedTo || updates.assigned_to,
      projectId: updates.projectId || updates.project_id,
      teamId: updates.teamId || updates.team_id,
      dueDate: (updates.dueDate || updates.due_date) ? new Date(updates.dueDate || updates.due_date!) : undefined,
      isBlocked: updates.isBlocked !== undefined ? updates.isBlocked : updates.is_blocked,
      blockedReason: updates.blockedReason !== undefined ? updates.blockedReason : updates.blocked_reason,
      isLearningTask: updates.isLearningTask !== undefined ? updates.isLearningTask : updates.is_learning_task,
    });

    if (!updatedTask) {
      const error: any = new Error('Task not found or update failed.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Log status change activity if changed
    if (targetStatus !== existing.status) {
      await TaskRepository.addTaskUpdate(taskId, userId, {
        type: 'status_change',
        fromStatus: existing.status,
        toStatus: targetStatus,
        comment: `Status updated from ${existing.status} to ${targetStatus}`,
      }, workspaceId);

      // Recalculate project progress
      await this.recalculateProjectProgress(workspaceId, updatedTask.projectId);

      // Emit event: Task Completed for Automation Engine
      if (targetStatus === 'done' || targetStatus === 'completed') {
        await EventService.emitTaskCompleted(
          { workspaceId, actorId: userId },
          {
            id: updatedTask.id,
            title: updatedTask.title,
            projectId: updatedTask.projectId,
            assignedTo: updatedTask.assignedTo,
          }
        );

        // Notify task creator and workspace admins
        try {
          const { inMemoryDb } = await import('../../packages/database/index.js');
          const completer = inMemoryDb.users.get(userId);
          const admins = Array.from(inMemoryDb.workspaceMembers.values()).filter(
            (wm) => wm.workspaceId === workspaceId && wm.role === 'admin' && wm.userId !== userId
          );
          const notifyList = new Set<string>(admins.map((a) => a.userId));
          if (updatedTask.createdBy && updatedTask.createdBy !== userId) {
            notifyList.add(updatedTask.createdBy);
          }

          for (const recipientId of notifyList) {
            await NotificationService.createNotification({
              workspaceId,
              recipientId,
              actorId: userId,
              type: 'task_completed',
              title: 'Task Completed',
              message: `Task "${updatedTask.title}" was completed by ${completer?.name || 'a team member'}.`,
              entityType: 'task',
              entityId: updatedTask.id,
              link: `/tasks/${updatedTask.id}`,
            }).catch(() => null);
          }
        } catch {}
      }

      // Dispatch Notification for status change
      if (updatedTask.assignedTo && updatedTask.assignedTo !== userId) {
        await NotificationService.createNotification({
          workspaceId,
          recipientId: updatedTask.assignedTo,
          actorId: userId,
          type: 'task_status_changed',
          title: 'Task Status Updated',
          message: `Task "${updatedTask.title}" status changed to ${targetStatus}.`,
          entityType: 'task',
          entityId: updatedTask.id,
          link: `/tasks/${updatedTask.id}`,
        }).catch(() => null);
      }

      // Realtime: Broadcast status changes into linked chat conversation
      try {
        const linkedConvId = updatedTask.linkedConversationId || updatedTask.sourceConversationId;
        const linkedMsgId = updatedTask.linkedMessageId || updatedTask.sourceMessageId;

        const statusPayload = {
          workspaceId,
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          fromStatus: existing.status,
          toStatus: targetStatus,
          status: targetStatus,
          updatedBy: userId,
          assignedTo: updatedTask.assignedTo,
          linkedConversationId: linkedConvId || null,
          linkedMessageId: linkedMsgId || null,
          updatedAt: new Date().toISOString(),
        };

        const { EventBus } = await import('../realtime/event-bus.js');
        EventBus.publishWorkspaceEvent(
          workspaceId,
          'chat.task.status_changed',
          statusPayload,
          {
            actorId: userId,
            entityType: 'task',
            entityId: updatedTask.id,
            meta: {
              conversationId: linkedConvId,
              messageId: linkedMsgId,
              taskId: updatedTask.id,
              status: targetStatus,
            },
          }
        );
      } catch (err: any) {
        console.warn('[TaskService.updateTask] chat.task.status_changed broadcast error:', err?.message);
      }
    }

    // Reassignment log & notification
    const newAssignee = updates.assignedTo || updates.assigned_to;
    if (newAssignee && newAssignee !== existing.assignedTo) {
      await TaskRepository.addTaskUpdate(taskId, userId, {
        type: 'assignment',
        comment: `Task reassigned from ${existing.assignedTo} to ${newAssignee}`,
      }, workspaceId);

      await NotificationService.createNotification({
        workspaceId,
        recipientId: newAssignee,
        actorId: userId,
        title: 'Task Assigned to You',
        message: `You have been assigned task "${updatedTask.title}".`,
        type: 'task_assigned',
        entityType: 'task',
        entityId: updatedTask.id,
        link: `/tasks/${updatedTask.id}`,
      }).catch(() => null);
    }

    const userMap = await this.resolveAssigneeMap([updatedTask.assignedTo]);
    const assigneeObj = userMap.get(updatedTask.assignedTo) || null;

    return {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description || '',
      status: updatedTask.status,
      priority: updatedTask.priority,
      story_points: updatedTask.storyPoints || 1,
      storyPoints: updatedTask.storyPoints || 1,
      estimated_hours: updatedTask.estimatedHours || null,
      estimatedHours: updatedTask.estimatedHours || null,
      actual_hours: updatedTask.actualHours || 0,
      actualHours: updatedTask.actualHours || 0,
      assigned_to: updatedTask.assignedTo,
      assignedTo: updatedTask.assignedTo,
      assignee: assigneeObj,
      assignee_name: assigneeObj?.name || null,
      assignee_avatar: assigneeObj?.avatar || null,
      project_id: updatedTask.projectId,
      projectId: updatedTask.projectId,
      team_id: updatedTask.teamId || null,
      teamId: updatedTask.teamId || null,
      workspace_id: updatedTask.workspaceId,
      due_date: updatedTask.dueDate ? new Date(updatedTask.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      started_at: updatedTask.startedAt ? new Date(updatedTask.startedAt).toISOString() : null,
      completed_at: updatedTask.completedAt ? new Date(updatedTask.completedAt).toISOString() : null,
      reviewed_by: updatedTask.reviewedBy || null,
      reviewed_at: updatedTask.reviewedAt ? new Date(updatedTask.reviewedAt).toISOString() : null,
      is_blocked: updatedTask.isBlocked || false,
      isBlocked: updatedTask.isBlocked || false,
      blocked_reason: updatedTask.blockedReason || null,
      blockedReason: updatedTask.blockedReason || null,
      created_at: updatedTask.createdAt ? new Date(updatedTask.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      createdAt: updatedTask.createdAt ? new Date(updatedTask.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      is_learning_task: updatedTask.isLearningTask || false,
      source_message_id: updatedTask.sourceMessageId || null,
      sourceMessageId: updatedTask.sourceMessageId || null,
      source_conversation_id: updatedTask.sourceConversationId || null,
      sourceConversationId: updatedTask.sourceConversationId || null,
      linked_conversation_id: updatedTask.linkedConversationId || null,
      linkedConversationId: updatedTask.linkedConversationId || null,
      linked_message_id: updatedTask.linkedMessageId || null,
      linkedMessageId: updatedTask.linkedMessageId || null,
      comments_count: updatedTask.commentsCount || 0,
      activity_count: updatedTask.activityCount || 0,
    };
  }

  /**
   * Action: Start Task (Transitions Todo -> In Progress)
   */
  static async startTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string
  ): Promise<any> {
    const existing = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    this.validateStatusTransition(existing.status, 'in_progress');

    const startedAt = new Date();
    const updatedTask = await TaskRepository.updateTask(workspaceId, taskId, {
      status: 'in_progress',
      startedAt,
    });

    await TaskRepository.addTaskUpdate(taskId, userId, {
      type: 'status_change',
      fromStatus: existing.status,
      toStatus: 'in_progress',
      comment: 'Task execution started',
    }, workspaceId);

    await this.recalculateProjectProgress(workspaceId, existing.projectId);

    return this.getTaskById(workspaceId, userId, rawRole, taskId);
  }

  /**
   * Action: Submit Task for Review (Transitions In Progress -> Review)
   */
  static async submitReview(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string,
    notes?: string
  ): Promise<any> {
    const existing = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    this.validateStatusTransition(existing.status, 'review');

    const updatedTask = await TaskRepository.updateTask(workspaceId, taskId, {
      status: 'review',
    });

    await TaskRepository.addTaskUpdate(taskId, userId, {
      type: 'status_change',
      fromStatus: existing.status,
      toStatus: 'review',
      comment: notes ? `Submitted for review: ${notes}` : 'Submitted for review',
    }, workspaceId);

    // Notify project creator / owner
    const project = await ProjectRepository.getProjectById(workspaceId, existing.projectId);
    if (project && project.createdBy !== userId) {
      await NotificationRepository.createNotification({
        workspaceId,
        userId: project.createdBy,
        title: 'Task Review Requested',
        message: `Task "${existing.title}" is ready for review.`,
        type: 'review_requested',
        metadata: { taskId, projectId: existing.projectId },
      });
    }

    await this.recalculateProjectProgress(workspaceId, existing.projectId);

    return this.getTaskById(workspaceId, userId, rawRole, taskId);
  }

  /**
   * Action: Approve Task (Transitions Review -> Done)
   */
  static async approveTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string,
    feedback?: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns are not authorized to approve tasks.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    this.validateStatusTransition(existing.status, 'done');

    const completedAt = new Date();
    const reviewedAt = new Date();

    const updatedTask = await TaskRepository.updateTask(workspaceId, taskId, {
      status: 'done',
      completedAt,
      reviewedBy: userId,
      reviewedAt,
    });

    await TaskRepository.addTaskUpdate(taskId, userId, {
      type: 'approved',
      fromStatus: 'review',
      toStatus: 'done',
      comment: feedback ? `Task approved: ${feedback}` : 'Task approved and completed',
    }, workspaceId);

    // Notify assignee
    if (existing.assignedTo !== userId) {
      await NotificationRepository.createNotification({
        workspaceId,
        userId: existing.assignedTo,
        title: 'Task Approved',
        message: `Your task "${existing.title}" has been approved.`,
        type: 'task_approved',
        metadata: { taskId, projectId: existing.projectId },
      });
    }

    await this.recalculateProjectProgress(workspaceId, existing.projectId);

    // Emit events: Task Approved & Task Completed
    if (updatedTask) {
      await EventService.emitTaskApproved(
        { workspaceId, actorId: userId },
        {
          id: updatedTask.id,
          title: updatedTask.title,
          projectId: updatedTask.projectId,
          assignedTo: updatedTask.assignedTo,
          priority: updatedTask.priority,
        }
      );

      await EventService.emitTaskCompleted(
        { workspaceId, actorId: userId },
        {
          id: updatedTask.id,
          title: updatedTask.title,
          projectId: updatedTask.projectId,
          assignedTo: updatedTask.assignedTo,
          priority: updatedTask.priority,
        }
      );

      // Notify creator & admins of task completion
      try {
        const { NotificationService } = await import('./notification-service.js');
        const { inMemoryDb } = await import('../../packages/database/index.js');
        const completer = inMemoryDb.users.get(existing.assignedTo || userId);
        const admins = Array.from(inMemoryDb.workspaceMembers.values()).filter(
          (wm) => wm.workspaceId === workspaceId && wm.role === 'admin' && wm.userId !== existing.assignedTo
        );
        const notifyList = new Set<string>(admins.map((a) => a.userId));
        if (existing.createdBy && existing.createdBy !== existing.assignedTo) {
          notifyList.add(existing.createdBy);
        }

        for (const recipientId of notifyList) {
          await NotificationService.createNotification({
            workspaceId,
            recipientId,
            actorId: existing.assignedTo || userId,
            type: 'task_completed',
            title: 'Task Completed',
            message: `Task "${existing.title}" was completed by ${completer?.name || 'a team member'}.`,
            entityType: 'task',
            entityId: taskId,
            link: `/tasks/${taskId}`,
          }).catch(() => null);
        }
      } catch {}
    }

    return this.getTaskById(workspaceId, userId, rawRole, taskId);
  }

  /**
   * Action: Request Changes on Task (Transitions Review -> In Progress)
   */
  static async requestChanges(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string,
    feedback: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns are not authorized to review tasks.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (!feedback || !feedback.trim()) {
      const error: any = new Error('Feedback is required when requesting changes.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const existing = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    this.validateStatusTransition(existing.status, 'in_progress');

    await TaskRepository.updateTask(workspaceId, taskId, {
      status: 'in_progress',
    });

    await TaskRepository.addTaskUpdate(taskId, userId, {
      type: 'changes_requested',
      fromStatus: 'review',
      toStatus: 'in_progress',
      comment: `Changes requested: ${feedback.trim()}`,
    }, workspaceId);

    // Notify assignee
    if (existing.assignedTo !== userId) {
      await NotificationRepository.createNotification({
        workspaceId,
        userId: existing.assignedTo,
        title: 'Changes Requested on Task',
        message: `Feedback on "${existing.title}": ${feedback.trim()}`,
        type: 'task_assigned',
        metadata: { taskId, projectId: existing.projectId },
      });
    }

    await this.recalculateProjectProgress(workspaceId, existing.projectId);

    return this.getTaskById(workspaceId, userId, rawRole, taskId);
  }

  /**
   * Action: Block Task with Reason
   */
  static async blockTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string,
    reason: string
  ): Promise<any> {
    if (!reason || !reason.trim()) {
      const error: any = new Error('Blocked reason is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const existing = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    await TaskRepository.updateTask(workspaceId, taskId, {
      isBlocked: true,
      blockedReason: reason.trim(),
    });

    await TaskRepository.addTaskUpdate(taskId, userId, {
      type: 'blocked',
      comment: `Task blocked: ${reason.trim()}`,
    }, workspaceId);

    // Notify project creator
    const project = await ProjectRepository.getProjectById(workspaceId, existing.projectId);
    if (project && project.createdBy !== userId) {
      await NotificationRepository.createNotification({
        workspaceId,
        userId: project.createdBy,
        title: 'Task Blocked',
        message: `Task "${existing.title}" is blocked: ${reason.trim()}`,
        type: 'task_blocked',
        metadata: { taskId, projectId: existing.projectId },
      });
    }

    return this.getTaskById(workspaceId, userId, rawRole, taskId);
  }

  /**
   * Action: Unblock Task
   */
  static async unblockTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string
  ): Promise<any> {
    const existing = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    await TaskRepository.updateTask(workspaceId, taskId, {
      isBlocked: false,
      blockedReason: null,
    });

    await TaskRepository.addTaskUpdate(taskId, userId, {
      type: 'unblocked',
      comment: 'Task unblocked',
    }, workspaceId);

    return this.getTaskById(workspaceId, userId, rawRole, taskId);
  }

  /**
   * Action: Delete Task
   */
  static async deleteTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'tasks:delete', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from deleting tasks.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!existing) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: task belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    // If employee, can only delete tasks created by them
    if (role === 'employee' && existing.createdBy !== userId) {
      const error: any = new Error('Employees may only delete tasks created by them.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const deleted = await TaskRepository.deleteTask(workspaceId, taskId);
    await this.recalculateProjectProgress(workspaceId, existing.projectId);
    return deleted;
  }

  /**
   * Action: Get Task Activity Timeline
   */
  static async getTaskActivity(
    workspaceId: string,
    taskId: string
  ): Promise<any[]> {
    const task = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!task) {
      const error: any = new Error('Task not found.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const updates = await TaskRepository.getTaskActivity(taskId, workspaceId);

    return updates.map((u) => ({
      id: u.id,
      task_id: u.taskId,
      user_id: u.userId,
      user_name: u.userName,
      user_avatar: u.userAvatar,
      user_role: u.userRole,
      type: u.type,
      from_status: u.fromStatus,
      to_status: u.toStatus,
      comment: u.comment,
      metadata: u.metadata,
      created_at: u.createdAt.toISOString(),
    }));
  }

  /**
   * Action: Add Comment to Task
   */
  static async addComment(
    workspaceId: string,
    taskId: string,
    userId: string,
    content: string,
    rawRole?: UserRole | string
  ): Promise<any> {
    const role = rawRole ? normalizeRole(rawRole) : 'employee';

    if (role === 'intern') {
      const error: any = new Error('Interns are forbidden from posting comments.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const task = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!task || task.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!content || !content.trim()) {
      const error: any = new Error('Comment content cannot be empty.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const comment = await TaskRepository.addComment(taskId, userId, content.trim(), workspaceId);

    // Scan and dispatch @mentions
    try {
      const { NotificationService } = await import('./notification-service.js');
      await NotificationService.dispatchMentions({
        workspaceId,
        actorId: userId,
        text: content.trim(),
        entityType: 'task',
        entityId: taskId,
        link: `/tasks/${taskId}`,
      });
    } catch {}

    return {
      id: comment.id,
      task_id: comment.taskId,
      user_id: comment.userId,
      user_name: comment.userName,
      user_avatar: comment.userAvatar,
      user_role: comment.userRole,
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
    };
  }

  /**
   * Action: Get Task Comments
   */
  static async getComments(
    workspaceId: string,
    taskId: string
  ): Promise<any[]> {
    const task = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!task || task.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const comments = await TaskRepository.getComments(taskId, workspaceId);

    return comments.map((c) => ({
      id: c.id,
      task_id: c.taskId,
      user_id: c.userId,
      user_name: c.userName,
      user_avatar: c.userAvatar,
      user_role: c.userRole,
      content: c.content,
      created_at: c.createdAt.toISOString(),
    }));
  }

  /**
   * Phase 2.2: Get Task Discussion
   * Retrieves the linked chat conversation details, source message, and conversation thread history.
   */
  static async getTaskDiscussion(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string
  ): Promise<{
    task: any;
    conversation: any | null;
    sourceMessage: any | null;
    messages: any[];
    linkedConversationId: string | null;
    linkedMessageId: string | null;
  }> {
    const role = normalizeRole(rawRole);
    const task = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!task || task.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Role-based visibility check
    if (role === 'intern' && task.assignedTo !== userId) {
      const error: any = new Error('Interns are not authorized to view unassigned task discussions.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    let linkedConversationId = task.linkedConversationId || task.sourceConversationId || null;
    let linkedMessageId = task.linkedMessageId || task.sourceMessageId || null;

    // Fallback: check message_tasks relational link
    if (!linkedConversationId || !linkedMessageId) {
      const { inMemoryDb } = await import('../../packages/database/index.js');
      const messageTask = Array.from(inMemoryDb.messageTasks.values()).find(
        (mt) => mt.taskId === taskId && mt.workspaceId === workspaceId
      );
      if (messageTask) {
        linkedMessageId = messageTask.messageId;
        const msg = inMemoryDb.messages.get(messageTask.messageId);
        if (msg) {
          linkedConversationId = msg.conversationId;
        }
      }
    }

    if (!linkedConversationId) {
      return {
        task,
        conversation: null,
        sourceMessage: null,
        messages: [],
        linkedConversationId: null,
        linkedMessageId: null,
      };
    }

    const { ChatRepository } = await import('../repositories/chat-repository.js');
    const conversation = await ChatRepository.getConversationById(workspaceId, linkedConversationId);
    let sourceMessage = linkedMessageId ? await ChatRepository.getMessageById(linkedMessageId) : null;
    const messages = await ChatRepository.listMessages(linkedConversationId, 50);

    return {
      task,
      conversation,
      sourceMessage,
      messages,
      linkedConversationId,
      linkedMessageId,
    };
  }

  /**
   * Phase 2.2: Post into Task Discussion (linked chat conversation)
   */
  static async postTaskDiscussion(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string,
    content: string
  ): Promise<{ message: any; task: any }> {
    const role = normalizeRole(rawRole);
    const task = await TaskRepository.getTaskById(workspaceId, taskId);
    if (!task || task.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Role-based check
    if (role === 'intern' && task.assignedTo !== userId) {
      const error: any = new Error('Interns are not authorized to participate in unassigned task discussions.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    let linkedConversationId = task.linkedConversationId || task.sourceConversationId || null;

    if (!linkedConversationId) {
      const { inMemoryDb } = await import('../../packages/database/index.js');
      const messageTask = Array.from(inMemoryDb.messageTasks.values()).find(
        (mt) => mt.taskId === taskId && mt.workspaceId === workspaceId
      );
      if (messageTask) {
        const msg = inMemoryDb.messages.get(messageTask.messageId);
        if (msg) {
          linkedConversationId = msg.conversationId;
        }
      }
    }

    if (!linkedConversationId) {
      const error: any = new Error('Task does not have a linked chat conversation.');
      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const { ChatService } = await import('./chat-service.js');
    const message = await ChatService.sendMessage(
      workspaceId,
      linkedConversationId,
      userId,
      role,
      content.trim()
    );

    // Also log comment on task for internal activity tracking
    await TaskRepository.addComment(workspaceId, taskId, userId, content.trim()).catch(() => null);

    return { message, task };
  }
}
