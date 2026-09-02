import { NotificationRepository, NotificationEntity, CreateNotificationParams } from '../repositories/notification-repository';
import { EventBus } from '../realtime/event-bus';

export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_mentioned'
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'wiki_created'
  | 'document_uploaded';

export interface CreateNotificationDTO {
  id?: string;
  workspaceId: string;
  recipientId: string;
  actorId?: string;
  type: NotificationType | string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  link?: string;
  metadata?: Record<string, any> | null;
}

export interface GetNotificationsDTO {
  workspaceId: string;
  recipientId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export class NotificationService {
  /**
   * Create a new notification for a specific recipient and emit real-time event.
   */
  static async createNotification(dto: CreateNotificationDTO): Promise<NotificationEntity> {
    if (!dto.workspaceId || !dto.recipientId || !dto.title || !dto.message) {
      throw new Error('Missing required fields for notification creation.');
    }

    const notificationParams: CreateNotificationParams = {
      id: dto.id,
      workspaceId: dto.workspaceId,
      recipientId: dto.recipientId,
      userId: dto.recipientId,
      actorId: dto.actorId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      entityType: dto.entityType,
      entityId: dto.entityId,
      link: dto.link,
      metadata: dto.metadata || null,
      isRead: false,
      createdAt: new Date(),
    };

    const notification = await NotificationRepository.createNotification(notificationParams);

    // Emit realtime event: notification.created
    try {
      EventBus.publishWorkspaceEvent(
        dto.workspaceId,
        'notification.created',
        notification,
        {
          targetUserId: dto.recipientId,
          actorId: dto.actorId,
          entityType: dto.entityType || 'notification',
          entityId: notification.id,
        }
      );
      // Also publish notification_created for legacy listeners
      EventBus.publishWorkspaceEvent(
        dto.workspaceId,
        'notification_created',
        notification,
        {
          targetUserId: dto.recipientId,
          actorId: dto.actorId,
          entityType: dto.entityType || 'notification',
          entityId: notification.id,
        }
      );
    } catch (err) {
      console.warn('[NotificationService] EventBus publish error:', err);
    }

    return notification;
  }

  /**
   * Fetch notifications for a recipient in a workspace.
   * RBAC Isolation: Users can ONLY access their own notifications.
   */
  static async getNotifications(dto: GetNotificationsDTO): Promise<NotificationEntity[]> {
    return await NotificationRepository.getNotifications(
      dto.workspaceId,
      dto.recipientId,
      {
        limit: dto.limit || 50,
        offset: dto.offset || 0,
        unreadOnly: dto.unreadOnly || false,
      }
    );
  }

  /**
   * Mark a single notification as read for a recipient.
   */
  static async markRead(workspaceId: string, recipientId: string, notificationId: string): Promise<boolean> {
    return await NotificationRepository.markAsRead(workspaceId, recipientId, notificationId);
  }

  /**
   * Mark all notifications as read for a recipient.
   */
  static async markAllRead(workspaceId: string, recipientId: string): Promise<number> {
    return await NotificationRepository.markAllAsRead(workspaceId, recipientId);
  }

  /**
   * Get unread notification count for a recipient.
   */
  static async getUnreadCount(workspaceId: string, recipientId: string): Promise<number> {
    return await NotificationRepository.getUnreadCount(workspaceId, recipientId);
  }
}
