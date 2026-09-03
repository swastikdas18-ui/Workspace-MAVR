import { inMemoryDb, getDb, schema } from '../../packages/database/index.js';
import { eq, and, ne, lt } from 'drizzle-orm';
import { NotificationService } from '../services/notification-service.js';

export class TaskOverdueWorker {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Scan for overdue tasks and generate idempotent notifications for assignees.
   * Can be called directly by unit tests or periodically by scheduler.
   */
  static async checkOverdueTasks(targetWorkspaceId?: string): Promise<{
    scannedCount: number;
    overdueCount: number;
    notificationsCreated: number;
  }> {
    if (this.isRunning) {
      return { scannedCount: 0, overdueCount: 0, notificationsCreated: 0 };
    }
    this.isRunning = true;

    let scannedCount = 0;
    let overdueCount = 0;
    let notificationsCreated = 0;
    const now = new Date();

    try {
      // 1. Scan inMemoryDb tasks
      const memoryTasks = Array.from(inMemoryDb.tasks.values()).filter((t) => {
        if (targetWorkspaceId && t.workspaceId !== targetWorkspaceId) return false;
        return t.status !== 'done' && t.status !== 'completed';
      });

      scannedCount += memoryTasks.length;

      for (const task of memoryTasks) {
        if (!task.dueDate) continue;
        const due = new Date(task.dueDate);
        if (due < now && task.assignedTo) {
          overdueCount++;
          const dueDateStr = due.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const notif = await NotificationService.createNotification({
            workspaceId: task.workspaceId,
            recipientId: task.assignedTo,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `Task "${task.title}" is overdue (was due ${dueDateStr}).`,
            entityType: 'task',
            entityId: task.id,
            link: `/tasks/${task.id}`,
          }).catch(() => null);

          if (notif && !notif.isRead) {
            notificationsCreated++;
          }
        }
      }

      // 2. Scan PostgreSQL tasks if connected
      const db = getDb();
      if (db) {
        try {
          const conditions = [
            ne(schema.tasks.status, 'done'),
            ne(schema.tasks.status, 'completed'),
            lt(schema.tasks.dueDate, now),
          ];
          if (targetWorkspaceId) {
            conditions.push(eq(schema.tasks.workspaceId, targetWorkspaceId));
          }

          const dbOverdueTasks = await db
            .select()
            .from(schema.tasks)
            .where(and(...conditions));

          for (const task of dbOverdueTasks) {
            if (task.assignedTo && task.workspaceId) {
              const due = new Date(task.dueDate);
              const dueDateStr = due.toLocaleDateString([], { month: 'short', day: 'numeric' });
              await NotificationService.createNotification({
                workspaceId: task.workspaceId,
                recipientId: task.assignedTo,
                type: 'task_overdue',
                title: 'Task Overdue',
                message: `Task "${task.title}" is overdue (was due ${dueDateStr}).`,
                entityType: 'task',
                entityId: task.id,
                link: `/tasks/${task.id}`,
              }).catch(() => null);
            }
          }
        } catch {
          // Fallback to in-memory completed
        }
      }
    } finally {
      this.isRunning = false;
    }

    return { scannedCount, overdueCount, notificationsCreated };
  }

  /**
   * Start periodic background scan for overdue tasks
   */
  static start(intervalMs: number = 60000): void {
    if (this.timer) return;
    console.log(`[TaskOverdueWorker] Starting periodic overdue worker (interval: ${intervalMs}ms)...`);
    this.timer = setInterval(() => {
      this.checkOverdueTasks().catch((err) => {
        console.warn('[TaskOverdueWorker] Background scan error:', err.message);
      });
    }, intervalMs);
    // Do not block process termination in CLI/tests
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stop periodic background scan
   */
  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[TaskOverdueWorker] Stopped periodic overdue worker.');
    }
  }
}
