import { UserRole } from '../types';
import { can, normalizeRole } from '../lib/permissions';
import { TaskRepository, TaskEntity, TaskCommentEntity } from '../repositories/task-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { EventService } from './event-service';
import { getDb, schema, inMemoryDb } from '../../packages/database';
import { inArray } from 'drizzle-orm';

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  assignedTo: string;
  projectId: string;
  dueDate?: string;
  isLearningTask?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  assignedTo?: string;
  projectId?: string;
  dueDate?: string;
  isLearningTask?: boolean;
}

export class TaskService {
  /**
   * Helper to batch resolve assignee user records from database/in-memory
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
        // Fallback to inMemoryDb
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
   * List tasks for the active workspace, filtered by user role
   */
  static async getTasks(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<any[]> {
    const role = normalizeRole(rawRole);
    const tasks = await TaskRepository.listTasks(workspaceId, {
      userId,
      role,
    });

    const userMap = await this.resolveAssigneeMap(tasks.map((t) => t.assignedTo));

    return tasks.map((t) => {
      const assigneeObj = userMap.get(t.assignedTo) || null;
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        assigned_to: t.assignedTo,
        assignedTo: t.assignedTo,
        assignee: assigneeObj,
        assignee_name: assigneeObj?.name || null,
        assignee_avatar: assigneeObj?.avatar || null,
        project_id: t.projectId || '',
        workspace_id: t.workspaceId,
        due_date: t.dueDate ? new Date(t.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        created_at: t.createdAt ? new Date(t.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        is_learning_task: t.isLearningTask || false,
        comments_count: t.commentsCount || 0,
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

    // Validation: title required
    if (!input.title || !input.title.trim()) {
      const error: any = new Error('Task title is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    // Validation: projectId required
    if (!input.projectId || !input.projectId.trim()) {
      const error: any = new Error('Project ID is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    // Cross-Workspace Project Validation
    const project = await ProjectRepository.getProjectById(workspaceId, input.projectId);
    if (!project) {
      const error: any = new Error('Referenced project does not belong to the active workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const task = await TaskRepository.createTask(workspaceId, userId, {
      title: input.title.trim(),
      description: input.description?.trim() || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      assignedTo: input.assignedTo,
      projectId: input.projectId,
      dueDate,
      isLearningTask: input.isLearningTask || false,
    });

    // Emit event: Task Created & Assigned
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
      assigned_to: task.assignedTo,
      assignedTo: task.assignedTo,
      assignee: assigneeObj,
      assignee_name: assigneeObj?.name || null,
      assignee_avatar: assigneeObj?.avatar || null,
      project_id: task.projectId,
      workspace_id: task.workspaceId,
      due_date: task.dueDate.toISOString().substring(0, 10),
      created_at: task.createdAt.toISOString().substring(0, 10),
      is_learning_task: task.isLearningTask || false,
      comments_count: 0,
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
      status: existing.status || 'todo',
      priority: existing.priority || 'medium',
      assigned_to: existing.assignedTo,
      assignedTo: existing.assignedTo,
      assignee: assigneeObj,
      assignee_name: assigneeObj?.name || null,
      assignee_avatar: assigneeObj?.avatar || null,
      project_id: existing.projectId || '',
      workspace_id: existing.workspaceId,
      due_date: existing.dueDate ? new Date(existing.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      created_at: existing.createdAt ? new Date(existing.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      is_learning_task: existing.isLearningTask || false,
      comments_count: existing.commentsCount || 0,
    };
  }

  /**
   * Update task details or status with strict role checks
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

    // Validation: if title is supplied, must not be empty/whitespace
    if (updates.title !== undefined && !updates.title.trim()) {
      const error: any = new Error('Task title cannot be empty.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    // RBAC: Interns forbidden from modifying tasks
    if (role === 'intern') {
      const error: any = new Error('Interns are forbidden from updating tasks.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // RBAC: Employee checks
    if (role === 'employee') {
      const project = existing.projectId
        ? await ProjectRepository.getProjectById(workspaceId, existing.projectId)
        : null;

      const isAssigned = existing.assignedTo === userId;
      const isCreator = existing.createdBy === userId;
      const isProjectMember = project ? project.memberIds.includes(userId) : false;
      const isProjectOwner = project ? project.createdBy === userId : false;

      if (!isAssigned && !isCreator && !isProjectMember && !isProjectOwner) {
        const error: any = new Error('Employees are only permitted to mutate tasks assigned to them, created by them, or within their project scope.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
    }

    // Cross-Workspace Project Validation if updating projectId
    if (updates.projectId) {
      const proj = await ProjectRepository.getProjectById(workspaceId, updates.projectId);
      if (!proj) {
        const error: any = new Error('Referenced project does not belong to the active workspace.');
        error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
        error.status = 403;
        throw error;
      }
    }

    const updatedTask = await TaskRepository.updateTask(workspaceId, taskId, {
      ...updates,
      title: updates.title !== undefined ? updates.title.trim() : undefined,
      description: updates.description !== undefined ? updates.description.trim() : undefined,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
    });

    if (!updatedTask) {
      const error: any = new Error('Task not found or update failed.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Emit event: Task Reassigned
    if (updates.assignedTo && updates.assignedTo !== existing.assignedTo) {
      await EventService.emitTaskAssigned(
        { workspaceId, actorId: userId },
        {
          id: updatedTask.id,
          title: updatedTask.title,
          projectId: updatedTask.projectId,
          previousAssignee: existing.assignedTo,
          newAssignee: updates.assignedTo,
        }
      );
    }

    // Emit event: Task Completed
    if (updates.status === 'completed' && existing.status !== 'completed') {
      await EventService.emitTaskCompleted(
        { workspaceId, actorId: userId },
        {
          id: updatedTask.id,
          title: updatedTask.title,
          projectId: updatedTask.projectId,
          creatorId: existing.createdBy,
          assignedTo: updatedTask.assignedTo,
        }
      );
    }

    const userMap = await this.resolveAssigneeMap([updatedTask.assignedTo]);
    const assigneeObj = userMap.get(updatedTask.assignedTo) || null;

    return {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description || '',
      status: updatedTask.status,
      priority: updatedTask.priority,
      assigned_to: updatedTask.assignedTo,
      assignedTo: updatedTask.assignedTo,
      assignee: assigneeObj,
      assignee_name: assigneeObj?.name || null,
      assignee_avatar: assigneeObj?.avatar || null,
      project_id: updatedTask.projectId,
      workspace_id: updatedTask.workspaceId,
      due_date: updatedTask.dueDate ? new Date(updatedTask.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      created_at: updatedTask.createdAt ? new Date(updatedTask.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      is_learning_task: updatedTask.isLearningTask || false,
      comments_count: updatedTask.commentsCount || 0,
    };
  }

  /**
   * Delete task
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

    return await TaskRepository.deleteTask(workspaceId, taskId);
  }

  /**
   * Get task comments
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

    return comments.map((c: TaskCommentEntity) => ({
      id: c.id,
      task_id: c.taskId,
      user_id: c.userId,
      user_name: c.userName,
      user_avatar: c.userAvatar,
      user_role: c.userRole,
      content: c.content,
      created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Add comment to task
   */
  static async addComment(
    workspaceId: string,
    taskId: string,
    userId: string,
    content: string,
    rawRole?: UserRole | string
  ): Promise<any> {
    const role = rawRole ? normalizeRole(rawRole) : 'employee';

    // Interns are forbidden from commenting
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
}
