import { eq, and, desc } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';
import { EventBus } from '../realtime/event-bus';

export interface NotificationEntity {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateNotificationParams {
  id?: string;
  workspaceId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead?: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export class NotificationRepository {
  /**
   * Create a new notification for a user in a workspace
   */
  static async createNotification(
    data: CreateNotificationParams,
    tx?: any
  ): Promise<NotificationEntity> {
    const id = data.id || 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const now = data.createdAt || new Date();

    const record: NotificationEntity = {
      id,
      workspaceId: data.workspaceId,
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      isRead: data.isRead ?? false,
      metadata: data.metadata || null,
      createdAt: now,
    };

    // Store in-memory for resilience
    inMemoryDb.notifications.set(id, record);

    try {
      const runner = tx || getDb();
      if (runner) {
        await runner.insert(schema.notifications).values({
          id,
          workspaceId: data.workspaceId,
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          isRead: data.isRead ?? false,
          metadata: data.metadata || null,
          createdAt: now,
        });
      }
    } catch (err: any) {
      // In-memory record retained
    }

    // Publish to Realtime EventBus for immediate delivery to connected user/workspace
    try {
      EventBus.publishWorkspaceEvent(
        data.workspaceId,
        'notification_created',
        record,
        { targetUserId: data.userId, entityType: 'notification', entityId: id }
      );
    } catch (busErr) {
      console.warn('[NotificationRepository] EventBus publish error:', busErr);
    }

    return record;
  }

  /**
   * Fetch notifications for a user within a workspace
   */
  static async getNotifications(
    workspaceId: string,
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<NotificationEntity[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      const db = getDb();
      if (db) {
        const conditions = [
          eq(schema.notifications.workspaceId, workspaceId),
          eq(schema.notifications.userId, userId),
        ];

        if (options.unreadOnly) {
          conditions.push(eq(schema.notifications.isRead, false));
        }

        const rows = await db
          .select()
          .from(schema.notifications)
          .where(and(...conditions))
          .orderBy(desc(schema.notifications.createdAt))
          .limit(limit)
          .offset(offset);

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            userId: r.userId,
            title: r.title,
            message: r.message,
            type: r.type,
            isRead: r.isRead,
            metadata: (r.metadata as Record<string, any>) || null,
            createdAt: r.createdAt,
          }));
        }
      }
    } catch {
      // Fallback
    }

    // Fallback to inMemoryDb
    let list = Array.from(inMemoryDb.notifications.values()).filter(
      (n) => n.workspaceId === workspaceId && n.userId === userId
    );

    if (options.unreadOnly) {
      list = list.filter((n) => !n.isRead);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(offset, offset + limit);
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(
    workspaceId: string,
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    const memoryItem = inMemoryDb.notifications.get(notificationId);
    if (memoryItem && memoryItem.workspaceId === workspaceId && memoryItem.userId === userId) {
      memoryItem.isRead = true;
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(schema.notifications.id, notificationId),
              eq(schema.notifications.workspaceId, workspaceId),
              eq(schema.notifications.userId, userId)
            )
          );
        return true;
      }
    } catch {
      // Handled
    }

    return !!memoryItem;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(workspaceId: string, userId: string): Promise<number> {
    let count = 0;
    for (const notif of inMemoryDb.notifications.values()) {
      if (notif.workspaceId === workspaceId && notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        count++;
      }
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(schema.notifications.workspaceId, workspaceId),
              eq(schema.notifications.userId, userId),
              eq(schema.notifications.isRead, false)
            )
          );
      }
    } catch {
      // Handled
    }

    return count;
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(
    workspaceId: string,
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    const memoryItem = inMemoryDb.notifications.get(notificationId);
    let deleted = false;
    if (memoryItem && memoryItem.workspaceId === workspaceId && memoryItem.userId === userId) {
      inMemoryDb.notifications.delete(notificationId);
      deleted = true;
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.notifications)
          .where(
            and(
              eq(schema.notifications.id, notificationId),
              eq(schema.notifications.workspaceId, workspaceId),
              eq(schema.notifications.userId, userId)
            )
          );
        return true;
      }
    } catch {
      // Handled
    }

    return deleted;
  }

  /**
   * Get unread notification count for a user in a workspace
   */
  static async getUnreadCount(workspaceId: string, userId: string): Promise<number> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.notifications)
          .where(
            and(
              eq(schema.notifications.workspaceId, workspaceId),
              eq(schema.notifications.userId, userId),
              eq(schema.notifications.isRead, false)
            )
          );
        return rows.length;
      }
    } catch {
      // Fallback
    }

    return Array.from(inMemoryDb.notifications.values()).filter(
      (n) => n.workspaceId === workspaceId && n.userId === userId && !n.isRead
    ).length;
  }
}
