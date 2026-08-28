import { inMemoryDb } from '../../packages/database/index.js';

export interface TaskRecurrenceRule {
  id: string;
  workspaceId: string;
  taskId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
  nextRunAt: Date;
  paused: boolean;
  createdAt: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  createdAt: Date;
}

export class TaskExtensionRepository {
  /**
   * 1. Multi-Assignees Management
   */
  public static async assignUsersToTask(taskId: string, userIds: string[]): Promise<string[]> {
    // Clear old assignees in memory
    for (const [id, a] of inMemoryDb.taskAssignees.entries()) {
      if (a.taskId === taskId) inMemoryDb.taskAssignees.delete(id);
    }

    for (const uId of userIds) {
      const id = `ta-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      inMemoryDb.taskAssignees.set(id, { id, taskId, userId: uId, assignedAt: new Date() });
    }

    return userIds;
  }

  public static async getTaskAssignees(taskId: string): Promise<string[]> {
    const list: string[] = [];
    for (const a of inMemoryDb.taskAssignees.values()) {
      if (a.taskId === taskId) list.push(a.userId);
    }
    return list;
  }

  /**
   * 2. Task Recurrence Engine
   */
  public static async createRecurrenceRule(data: {
    workspaceId: string;
    taskId: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    interval?: number;
    nextRunAt?: Date;
  }): Promise<TaskRecurrenceRule> {
    const id = `trr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = Date.now();
    let nextRun = data.nextRunAt || new Date(now + 7 * 86400000); // 7 days default

    const rule: TaskRecurrenceRule = {
      id,
      workspaceId: data.workspaceId,
      taskId: data.taskId,
      frequency: data.frequency,
      interval: data.interval || 1,
      nextRunAt: nextRun,
      paused: false,
      createdAt: new Date(),
    };

    inMemoryDb.taskRecurrenceRules.set(id, rule);
    return rule;
  }

  public static async processRecurringTasksWorker(): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    for (const rule of inMemoryDb.taskRecurrenceRules.values()) {
      if (!rule.paused && rule.nextRunAt <= now) {
        // Clone and spawn next task instance
        const baseTask = inMemoryDb.tasks.get(rule.taskId);
        if (baseTask) {
          const nextTaskId = `task-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newTask = {
            ...baseTask,
            id: nextTaskId,
            title: `[Recurring] ${baseTask.title}`,
            status: 'todo',
            createdAt: new Date().toISOString(),
          };
          inMemoryDb.tasks.set(nextTaskId, newTask);

          // Advance nextRunAt
          let deltaDays = 7;
          if (rule.frequency === 'daily') deltaDays = 1;
          if (rule.frequency === 'monthly') deltaDays = 30;
          if (rule.frequency === 'quarterly') deltaDays = 90;
          if (rule.frequency === 'yearly') deltaDays = 365;

          rule.nextRunAt = new Date(now.getTime() + deltaDays * 86400000 * rule.interval);
          inMemoryDb.taskRecurrenceRules.set(rule.id, rule);
          processedCount++;
        }
      }
    }

    return processedCount;
  }

  /**
   * 3. Task Dependencies Engine
   */
  public static async addDependency(data: {
    taskId: string;
    dependsOnTaskId: string;
    type?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  }): Promise<TaskDependency> {
    const id = `tdep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dep: TaskDependency = {
      id,
      taskId: data.taskId,
      dependsOnTaskId: data.dependsOnTaskId,
      type: data.type || 'finish_to_start',
      createdAt: new Date(),
    };

    inMemoryDb.taskDependencies.set(id, dep);
    return dep;
  }

  public static async canCompleteTask(taskId: string): Promise<{ canComplete: boolean; blockingTaskTitle?: string }> {
    for (const dep of inMemoryDb.taskDependencies.values()) {
      if (dep.taskId === taskId && dep.type === 'finish_to_start') {
        const blockingTask = inMemoryDb.tasks.get(dep.dependsOnTaskId);
        if (blockingTask && blockingTask.status !== 'completed') {
          return {
            canComplete: false,
            blockingTaskTitle: blockingTask.title,
          };
        }
      }
    }
    return { canComplete: true };
  }
}
