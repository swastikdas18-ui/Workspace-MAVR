import { inMemoryDb } from '../../packages/database';
import { UserRole } from '../types';
import { WorkspaceBoundaryValidator } from '../lib/validation';
import { can, normalizeRole } from '../lib/permissions';

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  assignedTo: string;
  projectId?: string;
  dueDate: string;
  isLearningTask?: boolean;
}

export class TaskService {
  static async getTasks(workspaceId: string, userId: string, rawRole: UserRole | string): Promise<any[]> {
    const role = normalizeRole(rawRole);
    let allTasks = Array.from(inMemoryDb.tasks.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    // Intern: strictly only see assigned tasks
    if (role === 'intern') {
      allTasks = allTasks.filter((t) => t.assignedTo === userId);
    } else if (role === 'employee') {
      // Employee: assigned tasks, created tasks, team tasks, or project tasks
      const userProjectIds = new Set(
        Array.from(inMemoryDb.projectMembers.values())
          .filter((pm) => pm.userId === userId)
          .map((pm) => pm.projectId)
      );
      Array.from(inMemoryDb.projects.values()).forEach((p) => {
        if (p.workspaceId === workspaceId && p.createdBy === userId) {
          userProjectIds.add(p.id);
        }
      });

      const userTeamIds = new Set(
        Array.from(inMemoryDb.teamMembers.values())
          .filter((tm) => tm.userId === userId)
          .map((tm) => tm.teamId)
      );
      Array.from(inMemoryDb.teams.values()).forEach((t) => {
        if (t.leadId === userId) userTeamIds.add(t.id);
      });

      allTasks = allTasks.filter((t) => {
        const isAssigned = t.assignedTo === userId;
        const isCreator = (t as any).createdBy === userId;
        const isProjectMember = t.projectId ? userProjectIds.has(t.projectId) : false;
        const isTeamTask = (t as any).teamId ? userTeamIds.has((t as any).teamId) : false;
        return isAssigned || isCreator || isProjectMember || isTeamTask;
      });
    }

    return allTasks.map((t) => {
      const commentsCount = Array.from(inMemoryDb.taskComments.values()).filter(
        (c) => c.taskId === t.id
      ).length;

      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        assigned_to: t.assignedTo,
        project_id: t.projectId || '',
        workspace_id: t.workspaceId,
        due_date: t.dueDate ? new Date(t.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        created_at: t.createdAt ? new Date(t.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        is_learning_task: t.isLearningTask || false,
        comments_count: commentsCount,
      };
    });
  }

  static async createTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    input: CreateTaskInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);

    if (!can(role, 'tasks:create', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from creating tasks.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // Cross-Workspace Boundary Validation
    if (input.projectId) {
      WorkspaceBoundaryValidator.validateProject(workspaceId, input.projectId);
    }
    if (input.assignedTo) {
      WorkspaceBoundaryValidator.validateWorkspaceMember(workspaceId, input.assignedTo);
    }

    const taskId = 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const assignedUser = inMemoryDb.users.get(input.assignedTo);
    const isLearning = input.isLearningTask ?? (assignedUser?.role === 'intern');

    const newTask = {
      id: taskId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      assignedTo: input.assignedTo,
      projectId: input.projectId || null,
      workspaceId,
      dueDate: input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isLearningTask: isLearning,
      createdAt: now,
    };

    inMemoryDb.tasks.set(taskId, newTask);

    return {
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      assigned_to: newTask.assignedTo,
      project_id: newTask.projectId,
      workspace_id: newTask.workspaceId,
      due_date: newTask.dueDate.toISOString().substring(0, 10),
      created_at: newTask.createdAt.toISOString().substring(0, 10),
      is_learning_task: newTask.isLearningTask,
      comments_count: 0,
    };
  }

  static async updateTask(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    taskId: string,
    updates: Partial<CreateTaskInput & { status?: string }>
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    const existing = inMemoryDb.tasks.get(taskId);
    if (!existing || existing.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Check permissions
    if (role === 'intern') {
      // Interns can only update status of tasks assigned to them
      if (existing.assignedTo !== userId) {
        const error: any = new Error('Interns cannot modify tasks assigned to other members.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
      // If intern tries to change anything other than status, reject
      const allowedKeys = ['status'];
      const attemptedKeys = Object.keys(updates);
      const isOnlyStatus = attemptedKeys.every((k) => allowedKeys.includes(k));
      if (!isOnlyStatus) {
        const error: any = new Error('Interns are only permitted to update task status.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
    } else if (role === 'employee') {
      const project = existing.projectId ? inMemoryDb.projects.get(existing.projectId) : null;
      const projectMembers = existing.projectId
        ? Array.from(inMemoryDb.projectMembers.values())
            .filter((pm) => pm.projectId === existing.projectId)
            .map((pm) => pm.userId)
        : [];

      const enrichedTask = {
        ...existing,
        projectOwnerId: project?.createdBy,
        projectMemberIds: projectMembers,
      };

      if (!can(role, 'tasks:update', enrichedTask, { userId, workspaceId })) {
        const error: any = new Error('Employees are only permitted to mutate tasks assigned to them, created by them, or within their project scope.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
    }

    // Cross-Workspace Boundary Validation on updates
    if (updates.projectId) {
      WorkspaceBoundaryValidator.validateProject(workspaceId, updates.projectId);
    }
    if (updates.assignedTo) {
      WorkspaceBoundaryValidator.validateWorkspaceMember(workspaceId, updates.assignedTo);
    }

    const updated = {
      ...existing,
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : existing.dueDate,
    };

    inMemoryDb.tasks.set(taskId, updated);

    const commentsCount = Array.from(inMemoryDb.taskComments.values()).filter(
      (c) => c.taskId === taskId
    ).length;

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      assigned_to: updated.assignedTo,
      project_id: updated.projectId,
      workspace_id: updated.workspaceId,
      due_date: updated.dueDate ? new Date(updated.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      created_at: updated.createdAt ? new Date(updated.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      is_learning_task: updated.isLearningTask,
      comments_count: commentsCount,
    };
  }

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

    const existing = inMemoryDb.tasks.get(taskId);
    if (!existing || existing.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    inMemoryDb.tasks.delete(taskId);
    Array.from(inMemoryDb.taskComments.entries()).forEach(([id, c]) => {
      if (c.taskId === taskId) inMemoryDb.taskComments.delete(id);
    });
    return true;
  }

  // Task Comments
  static async getComments(workspaceId: string, taskId: string): Promise<any[]> {
    const task = inMemoryDb.tasks.get(taskId);
    if (!task || task.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const comments = Array.from(inMemoryDb.taskComments.values()).filter(
      (c) => c.taskId === taskId && c.workspaceId === workspaceId
    );

    return comments.map((c) => {
      const author = inMemoryDb.users.get(c.userId);
      return {
        id: c.id,
        task_id: c.taskId,
        user_id: c.userId,
        user_name: author?.name || 'Workspace Member',
        user_avatar: author?.avatar || null,
        user_role: author?.role || 'employee',
        content: c.content,
        created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      };
    });
  }

  static async addComment(
    workspaceId: string,
    taskId: string,
    userId: string,
    content: string
  ): Promise<any> {
    const task = inMemoryDb.tasks.get(taskId);
    if (!task || task.workspaceId !== workspaceId) {
      const error: any = new Error('Task not found in active workspace.');
      error.code = 'TASK_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const commentId = 'comment-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const newComment = {
      id: commentId,
      taskId,
      workspaceId,
      userId,
      content: content.trim(),
      createdAt: now,
    };

    inMemoryDb.taskComments.set(commentId, newComment);

    const author = inMemoryDb.users.get(userId);

    return {
      id: newComment.id,
      task_id: newComment.taskId,
      user_id: newComment.userId,
      user_name: author?.name || 'Workspace Member',
      user_avatar: author?.avatar || null,
      user_role: author?.role || 'employee',
      content: newComment.content,
      created_at: newComment.createdAt.toISOString(),
    };
  }
}
