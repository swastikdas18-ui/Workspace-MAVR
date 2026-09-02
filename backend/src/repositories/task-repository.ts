import { eq, and, inArray, desc } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';
import { NotificationService } from '../services/notification-service';

export interface TaskEntity {
  id: string;
  title: string;
  description: string | null;
  status: string; // 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'completed'
  priority: string; // 'low' | 'medium' | 'high' | 'urgent' | 'critical'
  storyPoints?: number;
  estimatedHours?: number | null;
  actualHours?: number;
  assignedTo: string;
  projectId: string;
  workspaceId: string;
  teamId?: string | null;
  createdBy?: string;
  dueDate: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  blockedReason?: string | null;
  isBlocked?: boolean;
  isLearningTask?: boolean;
  createdAt: Date;
  commentsCount?: number;
  activityCount?: number;
}

export interface TaskUpdateEntity {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userAvatar?: string | null;
  userRole?: string;
  type: string; // 'status_change' | 'comment' | 'progress_update' | 'assignment' | 'blocked' | 'unblocked' | 'created' | 'approved' | 'changes_requested'
  fromStatus?: string | null;
  toStatus?: string | null;
  comment?: string | null;
  metadata?: string | null;
  createdAt: Date;
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
  storyPoints?: number;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo: string;
  projectId: string;
  teamId?: string;
  dueDate?: Date;
  isLearningTask?: boolean;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  storyPoints?: number;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  projectId?: string;
  teamId?: string | null;
  dueDate?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  blockedReason?: string | null;
  isBlocked?: boolean;
  isLearningTask?: boolean;
}

export interface ListTaskOptions {
  userId?: string;
  role?: string;
  projectId?: string;
  teamId?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  isBlocked?: boolean;
}

export class TaskRepository {
  /**
   * List tasks within a workspace with optional RBAC scoping and filters
   */
  static async listTasks(
    workspaceId: string,
    options?: ListTaskOptions
  ): Promise<TaskEntity[]> {
    const { userId, role, projectId, teamId, status, priority, assignedTo, isBlocked } = options || {};

    try {
      const db = getDb();
      if (db) {
        let taskRows = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.workspaceId, workspaceId));

        if (taskRows.length > 0) {
          const taskIds = taskRows.map((t) => t.id);

          // Fetch comment counts
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

          // Fetch activity counts
          const updates = await db
            .select()
            .from(schema.taskUpdates)
            .where(inArray(schema.taskUpdates.taskId, taskIds));

          const activityCounts = new Map<string, number>();
          updates.forEach((u) => {
            activityCounts.set(u.taskId, (activityCounts.get(u.taskId) || 0) + 1);
          });

          // RBAC Filtering
          if (role === 'intern' && userId) {
            taskRows = taskRows.filter((t) => t.assignedTo === userId);
          } else if (role === 'employee' && userId) {
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

          // Optional query filters
          if (projectId) {
            taskRows = taskRows.filter((t) => t.projectId === projectId);
          }
          if (teamId) {
            taskRows = taskRows.filter((t) => (t as any).teamId === teamId);
          }
          if (status) {
            const targetStatus = status.toLowerCase() === 'completed' ? 'done' : status.toLowerCase();
            taskRows = taskRows.filter((t) => {
              const taskStatus = t.status.toLowerCase() === 'completed' ? 'done' : t.status.toLowerCase();
              return taskStatus === targetStatus;
            });
          }
          if (priority) {
            taskRows = taskRows.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
          }
          if (assignedTo) {
            taskRows = taskRows.filter((t) => t.assignedTo === assignedTo);
          }
          if (isBlocked !== undefined) {
            taskRows = taskRows.filter((t) => (t as any).isBlocked === isBlocked);
          }

          return taskRows.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status === 'completed' ? 'done' : t.status,
            priority: t.priority,
            storyPoints: (t as any).storyPoints || 1,
            estimatedHours: (t as any).estimatedHours || null,
            actualHours: (t as any).actualHours || 0,
            assignedTo: t.assignedTo,
            projectId: t.projectId,
            workspaceId: t.workspaceId || workspaceId,
            teamId: (t as any).teamId || null,
            dueDate: t.dueDate,
            startedAt: (t as any).startedAt || null,
            completedAt: (t as any).completedAt || null,
            reviewedBy: (t as any).reviewedBy || null,
            reviewedAt: (t as any).reviewedAt || null,
            blockedReason: (t as any).blockedReason || null,
            isBlocked: (t as any).isBlocked || false,
            isLearningTask: t.isLearningTask || false,
            createdAt: t.createdAt,
            commentsCount: commentCounts.get(t.id) || 0,
            activityCount: activityCounts.get(t.id) || 0,
          }));
        } else {
          return [];
        }
      }
    } catch {
      // Fallback to in-memory
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

    if (projectId) {
      allTasks = allTasks.filter((t) => t.projectId === projectId);
    }
    if (teamId) {
      allTasks = allTasks.filter((t) => (t as any).teamId === teamId);
    }
    if (status) {
      const targetStatus = status.toLowerCase() === 'completed' ? 'done' : status.toLowerCase();
      allTasks = allTasks.filter((t) => {
        const taskStatus = (t.status || 'todo').toLowerCase() === 'completed' ? 'done' : (t.status || 'todo').toLowerCase();
        return taskStatus === targetStatus;
      });
    }
    if (priority) {
      allTasks = allTasks.filter((t) => (t.priority || 'medium').toLowerCase() === priority.toLowerCase());
    }
    if (assignedTo) {
      allTasks = allTasks.filter((t) => t.assignedTo === assignedTo);
    }
    if (isBlocked !== undefined) {
      allTasks = allTasks.filter((t) => (t as any).isBlocked === isBlocked);
    }

    return allTasks.map((t) => {
      const commentsCount = Array.from(inMemoryDb.taskComments.values()).filter(
        (c) => c.taskId === t.id
      ).length;
      const activityCount = Array.from(inMemoryDb.taskUpdates?.values() || []).filter(
        (u: any) => u.taskId === t.id
      ).length;

      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status === 'completed' ? 'done' : (t.status || 'todo'),
        priority: t.priority || 'medium',
        storyPoints: (t as any).storyPoints || 1,
        estimatedHours: (t as any).estimatedHours || null,
        actualHours: (t as any).actualHours || 0,
        assignedTo: t.assignedTo,
        projectId: t.projectId || '',
        workspaceId: t.workspaceId,
        teamId: (t as any).teamId || null,
        createdBy: (t as any).createdBy,
        dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
        startedAt: (t as any).startedAt ? new Date((t as any).startedAt) : null,
        completedAt: (t as any).completedAt ? new Date((t as any).completedAt) : null,
        reviewedBy: (t as any).reviewedBy || null,
        reviewedAt: (t as any).reviewedAt ? new Date((t as any).reviewedAt) : null,
        blockedReason: (t as any).blockedReason || null,
        isBlocked: (t as any).isBlocked || false,
        isLearningTask: t.isLearningTask || false,
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        commentsCount,
        activityCount,
      };
    });
  }

  /**
   * Get all tasks by project ID
   */
  static async getTasksByProject(
    workspaceId: string,
    projectId: string
  ): Promise<TaskEntity[]> {
    return this.listTasks(workspaceId, { projectId });
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

          const updates = await db
            .select()
            .from(schema.taskUpdates)
            .where(eq(schema.taskUpdates.taskId, taskId));

          return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status === 'completed' ? 'done' : task.status,
            priority: task.priority,
            storyPoints: (task as any).storyPoints || 1,
            estimatedHours: (task as any).estimatedHours || null,
            actualHours: (task as any).actualHours || 0,
            assignedTo: task.assignedTo,
            projectId: task.projectId,
            workspaceId: task.workspaceId || workspaceId,
            teamId: (task as any).teamId || null,
            dueDate: task.dueDate,
            startedAt: (task as any).startedAt || null,
            completedAt: (task as any).completedAt || null,
            reviewedBy: (task as any).reviewedBy || null,
            reviewedAt: (task as any).reviewedAt || null,
            blockedReason: (task as any).blockedReason || null,
            isBlocked: (task as any).isBlocked || false,
            isLearningTask: task.isLearningTask || false,
            createdAt: task.createdAt,
            commentsCount: comments.length,
            activityCount: updates.length,
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
    const activityCount = Array.from(inMemoryDb.taskUpdates?.values() || []).filter(
      (u: any) => u.taskId === taskId
    ).length;

    return {
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status === 'completed' ? 'done' : (t.status || 'todo'),
      priority: t.priority || 'medium',
      storyPoints: (t as any).storyPoints || 1,
      estimatedHours: (t as any).estimatedHours || null,
      actualHours: (t as any).actualHours || 0,
      assignedTo: t.assignedTo,
      projectId: t.projectId || '',
      workspaceId: t.workspaceId,
      teamId: (t as any).teamId || null,
      createdBy: (t as any).createdBy,
      dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
      startedAt: (t as any).startedAt ? new Date((t as any).startedAt) : null,
      completedAt: (t as any).completedAt ? new Date((t as any).completedAt) : null,
      reviewedBy: (t as any).reviewedBy || null,
      reviewedAt: (t as any).reviewedAt ? new Date((t as any).reviewedAt) : null,
      blockedReason: (t as any).blockedReason || null,
      isBlocked: (t as any).isBlocked || false,
      isLearningTask: t.isLearningTask || false,
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
      commentsCount,
      activityCount,
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
    const initialStatus = data.status === 'completed' ? 'done' : (data.status || 'todo');

    const newTaskRecord = {
      id: taskId,
      title: data.title,
      description: data.description || '',
      status: initialStatus,
      priority: data.priority || 'medium',
      storyPoints: data.storyPoints || 1,
      estimatedHours: data.estimatedHours || null,
      actualHours: data.actualHours || 0,
      assignedTo,
      projectId: data.projectId,
      workspaceId,
      teamId: data.teamId || null,
      createdBy: userId,
      dueDate,
      isBlocked: false,
      blockedReason: null,
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
          status: initialStatus,
          priority: data.priority || 'medium',
          storyPoints: data.storyPoints || 1,
          estimatedHours: data.estimatedHours || null,
          actualHours: data.actualHours || 0,
          assignedTo,
          projectId: data.projectId,
          workspaceId,
          teamId: data.teamId || null,
          dueDate,
          isBlocked: false,
          blockedReason: null,
          isLearningTask: data.isLearningTask || false,
          createdAt: now,
        });
      }
    } catch {
      // In memory already saved
    }

    // Log creation activity
    await this.addTaskUpdate(taskId, userId, {
      type: 'created',
      toStatus: initialStatus,
      comment: `Task created and assigned to ${assignedTo}`,
    }, workspaceId);

    return {
      id: taskId,
      title: data.title,
      description: data.description || '',
      status: initialStatus,
      priority: data.priority || 'medium',
      storyPoints: data.storyPoints || 1,
      estimatedHours: data.estimatedHours || null,
      actualHours: data.actualHours || 0,
      assignedTo,
      projectId: data.projectId,
      workspaceId,
      teamId: data.teamId || null,
      createdBy: userId,
      dueDate,
      isBlocked: false,
      blockedReason: null,
      isLearningTask: data.isLearningTask || false,
      createdAt: now,
      commentsCount: 0,
      activityCount: 1,
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

    const normStatus = updates.status !== undefined 
      ? (updates.status === 'completed' ? 'done' : updates.status) 
      : existing?.status || 'todo';

    const updated = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? updates.title : existing?.title || '',
      description: updates.description !== undefined ? updates.description : existing?.description || '',
      status: normStatus,
      priority: updates.priority || existing?.priority || 'medium',
      storyPoints: updates.storyPoints !== undefined ? updates.storyPoints : (existing?.storyPoints || 1),
      estimatedHours: updates.estimatedHours !== undefined ? updates.estimatedHours : (existing?.estimatedHours || null),
      actualHours: updates.actualHours !== undefined ? updates.actualHours : (existing?.actualHours || 0),
      assignedTo: updates.assignedTo || existing?.assignedTo || '',
      projectId: updates.projectId || existing?.projectId || '',
      teamId: updates.teamId !== undefined ? updates.teamId : (existing?.teamId || null),
      workspaceId,
      dueDate: updates.dueDate || existing?.dueDate || new Date(),
      startedAt: updates.startedAt !== undefined ? updates.startedAt : existing?.startedAt,
      completedAt: updates.completedAt !== undefined ? updates.completedAt : existing?.completedAt,
      reviewedBy: updates.reviewedBy !== undefined ? updates.reviewedBy : existing?.reviewedBy,
      reviewedAt: updates.reviewedAt !== undefined ? updates.reviewedAt : existing?.reviewedAt,
      blockedReason: updates.blockedReason !== undefined ? updates.blockedReason : existing?.blockedReason,
      isBlocked: updates.isBlocked !== undefined ? updates.isBlocked : (existing?.isBlocked || false),
      isLearningTask: updates.isLearningTask !== undefined ? updates.isLearningTask : existing?.isLearningTask || false,
    };

    inMemoryDb.tasks.set(taskId, updated);

    try {
      const db = getDb();
      if (db) {
        const setValues: any = {};
        if (updates.title !== undefined) setValues.title = updates.title;
        if (updates.description !== undefined) setValues.description = updates.description;
        if (updates.status !== undefined) setValues.status = normStatus;
        if (updates.priority !== undefined) setValues.priority = updates.priority;
        if (updates.storyPoints !== undefined) setValues.storyPoints = updates.storyPoints;
        if (updates.estimatedHours !== undefined) setValues.estimatedHours = updates.estimatedHours;
        if (updates.actualHours !== undefined) setValues.actualHours = updates.actualHours;
        if (updates.assignedTo !== undefined) setValues.assignedTo = updates.assignedTo;
        if (updates.projectId !== undefined) setValues.projectId = updates.projectId;
        if (updates.teamId !== undefined) setValues.teamId = updates.teamId;
        if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;
        if (updates.startedAt !== undefined) setValues.startedAt = updates.startedAt;
        if (updates.completedAt !== undefined) setValues.completedAt = updates.completedAt;
        if (updates.reviewedBy !== undefined) setValues.reviewedBy = updates.reviewedBy;
        if (updates.reviewedAt !== undefined) setValues.reviewedAt = updates.reviewedAt;
        if (updates.blockedReason !== undefined) setValues.blockedReason = updates.blockedReason;
        if (updates.isBlocked !== undefined) setValues.isBlocked = updates.isBlocked;
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
    const activityCount = Array.from(inMemoryDb.taskUpdates?.values() || []).filter(
      (u: any) => u.taskId === taskId
    ).length;

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description || '',
      status: updated.status,
      priority: updated.priority,
      storyPoints: updated.storyPoints,
      estimatedHours: updated.estimatedHours,
      actualHours: updated.actualHours,
      assignedTo: updated.assignedTo,
      projectId: updated.projectId,
      workspaceId: updated.workspaceId,
      teamId: updated.teamId,
      createdBy: (updated as any).createdBy,
      dueDate: updated.dueDate ? new Date(updated.dueDate) : new Date(),
      startedAt: updated.startedAt ? new Date(updated.startedAt) : null,
      completedAt: updated.completedAt ? new Date(updated.completedAt) : null,
      reviewedBy: updated.reviewedBy || null,
      reviewedAt: updated.reviewedAt ? new Date(updated.reviewedAt) : null,
      blockedReason: updated.blockedReason || null,
      isBlocked: updated.isBlocked || false,
      isLearningTask: updated.isLearningTask,
      createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
      commentsCount,
      activityCount,
    };
  }

  /**
   * Delete task and associated comments & updates
   */
  static async deleteTask(workspaceId: string, taskId: string): Promise<boolean> {
    const existing = inMemoryDb.tasks.get(taskId);
    if (existing && existing.workspaceId === workspaceId) {
      inMemoryDb.tasks.delete(taskId);
      Array.from(inMemoryDb.taskComments.entries()).forEach(([id, c]) => {
        if (c.taskId === taskId) inMemoryDb.taskComments.delete(id);
      });
      Array.from(inMemoryDb.taskUpdates.entries()).forEach(([id, u]) => {
        if (u.taskId === taskId) inMemoryDb.taskUpdates.delete(id);
      });
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.taskUpdates)
          .where(eq(schema.taskUpdates.taskId, taskId));

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
   * Log task update / activity event
   */
  static async addTaskUpdate(
    taskId: string,
    userId: string,
    data: {
      type: string;
      fromStatus?: string;
      toStatus?: string;
      comment?: string;
      metadata?: string;
    },
    workspaceId?: string
  ): Promise<TaskUpdateEntity> {
    const updateId = 'update-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const now = new Date();

    const record: TaskUpdateEntity = {
      id: updateId,
      taskId,
      userId,
      type: data.type,
      fromStatus: data.fromStatus || null,
      toStatus: data.toStatus || null,
      comment: data.comment || null,
      metadata: data.metadata || null,
      createdAt: now,
    };

    inMemoryDb.taskUpdates.set(updateId, record);

    let userName = 'Workspace Member';
    let userAvatar: string | null = null;
    let userRole = 'employee';

    const author = inMemoryDb.users.get(userId);
    if (author) {
      userName = author.name;
      userAvatar = (author as any).avatar || null;
      userRole = author.role;
    }

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.taskUpdates).values({
          id: updateId,
          taskId,
          userId,
          type: data.type,
          fromStatus: data.fromStatus || null,
          toStatus: data.toStatus || null,
          comment: data.comment || null,
          metadata: data.metadata || null,
          createdAt: now,
        });

        const [userRow] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, userId));

        if (userRow) {
          userName = userRow.name;
          userAvatar = userRow.avatar || null;
          userRole = userRow.role;
        }
      }
    } catch {
      // In-memory handled
    }

    return {
      ...record,
      userName,
      userAvatar,
      userRole,
    };
  }

  /**
   * Get activity timeline for a task
   */
  static async getTaskActivity(
    taskId: string,
    workspaceId: string
  ): Promise<TaskUpdateEntity[]> {
    try {
      const db = getDb();
      if (db) {
        const updateRows = await db
          .select({
            id: schema.taskUpdates.id,
            taskId: schema.taskUpdates.taskId,
            userId: schema.taskUpdates.userId,
            type: schema.taskUpdates.type,
            fromStatus: schema.taskUpdates.fromStatus,
            toStatus: schema.taskUpdates.toStatus,
            comment: schema.taskUpdates.comment,
            metadata: schema.taskUpdates.metadata,
            createdAt: schema.taskUpdates.createdAt,
            userName: schema.users.name,
            userAvatar: schema.users.avatar,
            userRole: schema.users.role,
          })
          .from(schema.taskUpdates)
          .leftJoin(schema.users, eq(schema.taskUpdates.userId, schema.users.id))
          .where(eq(schema.taskUpdates.taskId, taskId))
          .orderBy(desc(schema.taskUpdates.createdAt));

        if (updateRows.length > 0) {
          return updateRows.map((u) => ({
            id: u.id,
            taskId: u.taskId,
            userId: u.userId,
            userName: u.userName || 'Workspace Member',
            userAvatar: u.userAvatar || null,
            userRole: u.userRole || 'employee',
            type: u.type,
            fromStatus: u.fromStatus,
            toStatus: u.toStatus,
            comment: u.comment,
            metadata: u.metadata,
            createdAt: u.createdAt,
          }));
        }
      }
    } catch {
      // Fallback
    }

    const updates = Array.from(inMemoryDb.taskUpdates.values())
      .filter((u: any) => u.taskId === taskId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return updates.map((u: any) => {
      const author = inMemoryDb.users.get(u.userId);
      return {
        id: u.id,
        taskId: u.taskId,
        userId: u.userId,
        userName: author?.name || 'Workspace Member',
        userAvatar: (author as any)?.avatar || null,
        userRole: author?.role || 'employee',
        type: u.type,
        fromStatus: u.fromStatus || null,
        toStatus: u.toStatus || null,
        comment: u.comment || null,
        metadata: u.metadata || null,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      };
    });
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
      authorAvatar = (author as any).avatar || null;
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

    // Log comment activity
    await this.addTaskUpdate(taskId, userId, {
      type: 'comment',
      comment: content.trim(),
    }, workspaceId);

    // Trigger comment_mentioned notification to task assignee if different from commenter
    try {
      const task = inMemoryDb.tasks.get(taskId);
      if (task && task.assignedTo && task.assignedTo !== userId) {
        await NotificationService.createNotification({
          workspaceId,
          recipientId: task.assignedTo,
          actorId: userId,
          type: 'comment_mentioned',
          title: 'New Comment on Task',
          message: `${authorName} commented on task "${task.title}": "${content.slice(0, 60)}"`,
          entityType: 'task',
          entityId: taskId,
          link: `/tasks/${taskId}`,
        });
      }
    } catch {}

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
        userAvatar: (author as any)?.avatar || null,
        userRole: author?.role || 'employee',
        content: c.content,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      };
    });
  }
}
