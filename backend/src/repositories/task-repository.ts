import { eq, and, inArray, desc } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';

export interface TaskEntity {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string;
  projectId: string;
  workspaceId: string;
  createdBy?: string;
  dueDate: Date;
  isLearningTask?: boolean;
  createdAt: Date;
  commentsCount?: number;
}

export interface TaskCommentEntity {
  id: string;
  taskId: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  userRole?: string;
  content: string;
  createdAt: Date;
}

export interface CreateTaskParams {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo: string;
  projectId: string;
  dueDate?: Date;
  isLearningTask?: boolean;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  projectId?: string;
  dueDate?: Date;
  isLearningTask?: boolean;
}

export interface ListTaskOptions {
  userId?: string;
  role?: string;
}

export class TaskRepository {
  /**
   * List tasks within a workspace with optional RBAC scoping
   */
  static async listTasks(
    workspaceId: string,
    options?: ListTaskOptions
  ): Promise<TaskEntity[]> {
    const { userId, role } = options || {};

    try {
      const db = getDb();
      if (db) {
        let taskRows = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.workspaceId, workspaceId));

        if (taskRows.length > 0) {
          // Fetch comment counts
          const taskIds = taskRows.map((t) => t.id);
          const comments = await db
            .select()
            .from(schema.taskComments)
            .where(
              and(
                eq(schema.taskComments.workspaceId, workspaceId),
                inArray(schema.taskComments.taskId, taskIds)
              )
            );

          const commentCounts = new Map<string, number>();
          comments.forEach((c) => {
            commentCounts.set(c.taskId, (commentCounts.get(c.taskId) || 0) + 1);
          });

          if (role === 'intern' && userId) {
            taskRows = taskRows.filter((t) => t.assignedTo === userId);
          } else if (role === 'employee' && userId) {
            // Find projects the employee belongs to
            const memberRows = await db
              .select()
              .from(schema.projectMembers)
              .where(eq(schema.projectMembers.userId, userId));
            const memberProjectIds = new Set(memberRows.map((m) => m.projectId));

            const ownedProjects = await db
              .select()
              .from(schema.projects)
              .where(
                and(
                  eq(schema.projects.workspaceId, workspaceId),
                  eq(schema.projects.createdBy, userId)
                )
              );
            ownedProjects.forEach((p) => memberProjectIds.add(p.id));

            taskRows = taskRows.filter((t) => {
              const isAssigned = t.assignedTo === userId;
              const isProjectMember = t.projectId ? memberProjectIds.has(t.projectId) : false;
              return isAssigned || isProjectMember;
            });
          }

          return taskRows.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            assignedTo: t.assignedTo,
            projectId: t.projectId,
            workspaceId: t.workspaceId || workspaceId,
            dueDate: t.dueDate,
            isLearningTask: t.isLearningTask || false,
            createdAt: t.createdAt,
            commentsCount: commentCounts.get(t.id) || 0,
          }));
        }
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    let allTasks = Array.from(inMemoryDb.tasks.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    if (role === 'intern' && userId) {
      allTasks = allTasks.filter((t) => t.assignedTo === userId);
    } else if (role === 'employee' && userId) {
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
        assignedTo: t.assignedTo,
        projectId: t.projectId || '',
        workspaceId: t.workspaceId,
        dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
        isLearningTask: t.isLearningTask || false,
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        commentsCount,
      };
    });
  }

  /**
   * Get single task by ID within workspace
   */
  static async getTaskById(
    workspaceId: string,
    taskId: string
  ): Promise<TaskEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [task] = await db
          .select()
          .from(schema.tasks)
          .where(
            and(
              eq(schema.tasks.id, taskId),
              eq(schema.tasks.workspaceId, workspaceId)
            )
          );

        if (task) {
          const comments = await db
            .select()
            .from(schema.taskComments)
            .where(
              and(
                eq(schema.taskComments.taskId, taskId),
                eq(schema.taskComments.workspaceId, workspaceId)
              )
            );

          return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignedTo: task.assignedTo,
            projectId: task.projectId,
            workspaceId: task.workspaceId || workspaceId,
            dueDate: task.dueDate,
            isLearningTask: task.isLearningTask || false,
            createdAt: task.createdAt,
            commentsCount: comments.length,
          };
        }
      }
    } catch {
      // Fallback
    }

    const t = inMemoryDb.tasks.get(taskId);
    if (!t || t.workspaceId !== workspaceId) return null;

    const commentsCount = Array.from(inMemoryDb.taskComments.values()).filter(
      (c) => c.taskId === taskId
    ).length;

    return {
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status || 'todo',
      priority: t.priority || 'medium',
      assignedTo: t.assignedTo,
      projectId: t.projectId || '',
      workspaceId: t.workspaceId,
      createdBy: (t as any).createdBy,
      dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
      isLearningTask: t.isLearningTask || false,
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
      commentsCount,
    };
  }

  /**
   * Create task in PostgreSQL + Drizzle
   */
  static async createTask(
    workspaceId: string,
    userId: string,
    data: CreateTaskParams
  ): Promise<TaskEntity> {
    const taskId = data.id || 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const dueDate = data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const assignedTo = data.assignedTo && data.assignedTo.trim() ? data.assignedTo.trim() : userId;

    const newTaskRecord = {
      id: taskId,
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assignedTo,
      projectId: data.projectId,
      workspaceId,
      createdBy: userId,
      dueDate,
      isLearningTask: data.isLearningTask || false,
      createdAt: now,
    };

    inMemoryDb.tasks.set(taskId, newTaskRecord);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.tasks).values({
          id: taskId,
          title: data.title,
          description: data.description || '',
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          assignedTo,
          projectId: data.projectId,
          workspaceId,
          dueDate,
          isLearningTask: data.isLearningTask || false,
          createdAt: now,
        });
      }
    } catch {
      // In memory already saved
    }

    return {
      id: taskId,
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assignedTo,
      projectId: data.projectId,
      workspaceId,
      createdBy: userId,
      dueDate,
      isLearningTask: data.isLearningTask || false,
      createdAt: now,
      commentsCount: 0,
    };
  }

  /**
   * Update task in PostgreSQL + Drizzle
   */
  static async updateTask(
    workspaceId: string,
    taskId: string,
    updates: UpdateTaskParams
  ): Promise<TaskEntity | null> {
    const existing = inMemoryDb.tasks.get(taskId);
    if (!existing || existing.workspaceId !== workspaceId) {
      try {
        const db = getDb();
        if (db) {
          const [dbTask] = await db
            .select()
            .from(schema.tasks)
            .where(
              and(
                eq(schema.tasks.id, taskId),
                eq(schema.tasks.workspaceId, workspaceId)
              )
            );
          if (!dbTask) return null;
        } else {
          return null;
        }
      } catch {
        return null;
      }
    }

    const updated = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? updates.title : existing?.title || '',
      description: updates.description !== undefined ? updates.description : existing?.description || '',
      status: updates.status || existing?.status || 'todo',
      priority: updates.priority || existing?.priority || 'medium',
      assignedTo: updates.assignedTo || existing?.assignedTo || '',
      projectId: updates.projectId || existing?.projectId || '',
      workspaceId,
      dueDate: updates.dueDate || existing?.dueDate || new Date(),
      isLearningTask: updates.isLearningTask !== undefined ? updates.isLearningTask : existing?.isLearningTask || false,
    };

    inMemoryDb.tasks.set(taskId, updated);

    try {
      const db = getDb();
      if (db) {
        const setValues: any = {};
        if (updates.title !== undefined) setValues.title = updates.title;
        if (updates.description !== undefined) setValues.description = updates.description;
        if (updates.status !== undefined) setValues.status = updates.status;
        if (updates.priority !== undefined) setValues.priority = updates.priority;
        if (updates.assignedTo !== undefined) setValues.assignedTo = updates.assignedTo;
        if (updates.projectId !== undefined) setValues.projectId = updates.projectId;
        if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;
        if (updates.isLearningTask !== undefined) setValues.isLearningTask = updates.isLearningTask;

        if (Object.keys(setValues).length > 0) {
          await db
            .update(schema.tasks)
            .set(setValues)
            .where(
              and(
                eq(schema.tasks.id, taskId),
                eq(schema.tasks.workspaceId, workspaceId)
              )
            );
        }
      }
    } catch {
      // In-memory handled
    }

    const commentsCount = Array.from(inMemoryDb.taskComments.values()).filter(
      (c) => c.taskId === taskId
    ).length;

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description || '',
      status: updated.status,
      priority: updated.priority,
      assignedTo: updated.assignedTo,
      projectId: updated.projectId,
      workspaceId: updated.workspaceId,
      createdBy: (updated as any).createdBy,
      dueDate: updated.dueDate ? new Date(updated.dueDate) : new Date(),
      isLearningTask: updated.isLearningTask,
      createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
      commentsCount,
    };
  }

  /**
   * Delete task and associated comments
   */
  static async deleteTask(workspaceId: string, taskId: string): Promise<boolean> {
    const existing = inMemoryDb.tasks.get(taskId);
    if (existing && existing.workspaceId === workspaceId) {
      inMemoryDb.tasks.delete(taskId);
      Array.from(inMemoryDb.taskComments.entries()).forEach(([id, c]) => {
        if (c.taskId === taskId) inMemoryDb.taskComments.delete(id);
      });
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.taskComments)
          .where(
            and(
              eq(schema.taskComments.taskId, taskId),
              eq(schema.taskComments.workspaceId, workspaceId)
            )
          );

        await db
          .delete(schema.tasks)
          .where(
            and(
              eq(schema.tasks.id, taskId),
              eq(schema.tasks.workspaceId, workspaceId)
            )
          );
      }
    } catch {
      // In-memory handled
    }

    return true;
  }

  /**
   * Add a comment to a task
   */
  static async addComment(
    taskId: string,
    userId: string,
    content: string,
    workspaceId: string
  ): Promise<TaskCommentEntity> {
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

    let authorName = 'Workspace Member';
    let authorAvatar: string | null = null;
    let authorRole = 'employee';

    const author = inMemoryDb.users.get(userId);
    if (author) {
      authorName = author.name;
      authorAvatar = author.avatar || null;
      authorRole = author.role;
    }

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.taskComments).values({
          id: commentId,
          taskId,
          workspaceId,
          userId,
          content: content.trim(),
          createdAt: now,
        });

        const [userRow] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, userId));

        if (userRow) {
          authorName = userRow.name;
          authorAvatar = userRow.avatar || null;
          authorRole = userRow.role;
        }
      }
    } catch {
      // In-memory handled
    }

    return {
      id: commentId,
      taskId,
      workspaceId,
      userId,
      userName: authorName,
      userAvatar: authorAvatar,
      userRole: authorRole,
      content: content.trim(),
      createdAt: now,
    };
  }

  /**
   * Get all comments for a task
   */
  static async getComments(
    taskId: string,
    workspaceId: string
  ): Promise<TaskCommentEntity[]> {
    try {
      const db = getDb();
      if (db) {
        const commentRows = await db
          .select({
            id: schema.taskComments.id,
            taskId: schema.taskComments.taskId,
            workspaceId: schema.taskComments.workspaceId,
            userId: schema.taskComments.userId,
            content: schema.taskComments.content,
            createdAt: schema.taskComments.createdAt,
            userName: schema.users.name,
            userAvatar: schema.users.avatar,
            userRole: schema.users.role,
          })
          .from(schema.taskComments)
          .leftJoin(schema.users, eq(schema.taskComments.userId, schema.users.id))
          .where(
            and(
              eq(schema.taskComments.taskId, taskId),
              eq(schema.taskComments.workspaceId, workspaceId)
            )
          )
          .orderBy(schema.taskComments.createdAt);

        if (commentRows.length > 0) {
          return commentRows.map((c) => ({
            id: c.id,
            taskId: c.taskId,
            workspaceId: c.workspaceId,
            userId: c.userId,
            userName: c.userName || 'Workspace Member',
            userAvatar: c.userAvatar || null,
            userRole: c.userRole || 'employee',
            content: c.content,
            createdAt: c.createdAt,
          }));
        }
      }
    } catch {
      // Fallback
    }

    const comments = Array.from(inMemoryDb.taskComments.values()).filter(
      (c) => c.taskId === taskId && c.workspaceId === workspaceId
    );

    return comments.map((c) => {
      const author = inMemoryDb.users.get(c.userId);
      return {
        id: c.id,
        taskId: c.taskId,
        workspaceId: c.workspaceId,
        userId: c.userId,
        userName: author?.name || 'Workspace Member',
        userAvatar: author?.avatar || null,
        userRole: author?.role || 'employee',
        content: c.content,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      };
    });
  }
}
