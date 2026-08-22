import { inMemoryDb } from '../../packages/database';
import { UserRole } from '../types';

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
  static async getTasks(workspaceId: string, userId: string, role: UserRole): Promise<any[]> {
    let allTasks = Array.from(inMemoryDb.tasks.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    // Intern: only see assigned tasks
    if (role === 'intern') {
      allTasks = allTasks.filter((t) => t.assignedTo === userId);
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
    role: UserRole,
    input: CreateTaskInput
  ): Promise<any> {
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
    taskId: string,
    updates: Partial<CreateTaskInput & { status?: string }>
  ): Promise<any> {
    const existing = inMemoryDb.tasks.get(taskId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('TASK_NOT_FOUND');
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

  static async deleteTask(workspaceId: string, taskId: string): Promise<boolean> {
    const existing = inMemoryDb.tasks.get(taskId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('TASK_NOT_FOUND');
    }

    inMemoryDb.tasks.delete(taskId);
    // Also remove comments
    Array.from(inMemoryDb.taskComments.entries()).forEach(([id, c]) => {
      if (c.taskId === taskId) inMemoryDb.taskComments.delete(id);
    });
    return true;
  }

  // Task Comments
  static async getComments(workspaceId: string, taskId: string): Promise<any[]> {
    const task = inMemoryDb.tasks.get(taskId);
    if (!task || task.workspaceId !== workspaceId) {
      throw new Error('TASK_NOT_FOUND');
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
      throw new Error('TASK_NOT_FOUND');
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
