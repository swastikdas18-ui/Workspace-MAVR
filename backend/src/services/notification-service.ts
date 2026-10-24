import {
  NotificationRepository,
  NotificationEntity,
  CreateNotificationParams,
  NotificationPriority,
  UserNotificationPreferences,
  GetNotificationsOptions,
} from '../repositories/notification-repository';
import { inMemoryDb, getDb, schema } from '../../packages/database/index.js';
import { EventBus } from '../realtime/event-bus';
import { RealtimeNotificationService } from './realtime-notification-service.js';

export type { NotificationPriority, UserNotificationPreferences };

export type NotificationType =
  // Standard Phase 1 Canonical Enums
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_STATUS_CHANGED'
  | 'PROJECT_ADDED'
  | 'PROJECT_ARCHIVED'
  | 'TEAM_MEMBER_ADDED'
  | 'TEAM_MEMBER_REMOVED'
  | 'LEAVE_SUBMITTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'WORKSPACE_INVITE'
  | 'ROLE_CHANGED'
  | 'COMMENT_MENTION'
  // Existing lowercase aliases
  | 'task_assigned'
  | 'task_reassigned'
  | 'task_completed'
  | 'task_overdue'
  | 'task_status_changed'
  | 'employee_invited'
  | 'employee_joined'
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'initiative_created'
  | 'initiative_assigned'
  | 'initiative_started'
  | 'initiative_review_requested'
  | 'initiative_approved'
  | 'initiative_rejected'
  | 'team_member_added'
  | 'team_member_removed'
  | 'project_added'
  | 'project_archived'
  | 'workspace_invite'
  | 'role_changed'
  | 'lead_assigned'
  | 'deal_stage_changed'
  | 'mention_received'
  | 'comment_mentioned'
  | 'wiki_created'
  | 'document_uploaded';

/**
 * Canonical Phase 1 Priority Mapping
 */
export function getNotificationPriority(type: NotificationType | string): NotificationPriority {
  switch (type) {
    case 'initiative_rejected':
      return 'urgent';
    case 'task_overdue':
    case 'leave_rejected':
    case 'initiative_assigned':
    case 'initiative_review_requested':
    case 'mention_received':
    case 'comment_mentioned':
      return 'high';
    case 'deal_stage_changed':
    case 'employee_invited':
      return 'low';
    case 'task_assigned':
    case 'task_completed':
    case 'leave_submitted':
    case 'leave_approved':
    case 'initiative_created':
    case 'initiative_started':
    case 'initiative_approved':
    case 'lead_assigned':
    case 'employee_joined':
    default:
      return 'medium';
  }
}

export interface CreateNotificationDTO {
  id?: string;
  workspaceId: string;
  recipientId: string;
  actorId?: string;
  type: NotificationType | string;
  priority?: NotificationPriority;
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
  tab?: 'unread' | 'read' | 'archived' | 'all';
  includeArchived?: boolean;
  search?: string;
  category?: string;
}

export class NotificationService {
  /**
   * Create a new notification for a specific recipient and emit real-time event.
   * Fully idempotent: duplicate calls for same (workspace, recipient, type, entityId) will not write duplicates.
   * Respects user notification preferences: suppresses write if category toggle is disabled.
   */
  static async createNotification(dto: CreateNotificationDTO): Promise<NotificationEntity | null> {
    if (!dto.workspaceId || !dto.recipientId || !dto.title || !dto.message) {
      throw new Error('Missing required fields for notification creation.');
    }

    // Preference check: Respect user notification toggles
    const isAllowed = await NotificationRepository.isNotificationAllowed(
      dto.workspaceId,
      dto.recipientId,
      dto.type
    );
    if (!isAllowed) {
      return null;
    }

    // Deduplication check: return existing without double-writing or duplicate broadcasts
    if (dto.entityId) {
      const existing = await NotificationRepository.findDuplicate(
        dto.workspaceId,
        dto.recipientId,
        dto.type,
        dto.entityId
      );
      if (existing) {
        return existing;
      }
    }

    const priority = dto.priority || getNotificationPriority(dto.type);

    const notificationParams: CreateNotificationParams = {
      id: dto.id,
      workspaceId: dto.workspaceId,
      recipientId: dto.recipientId,
      userId: dto.recipientId,
      actorId: dto.actorId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      priority,
      entityType: dto.entityType,
      entityId: dto.entityId,
      link: dto.link,
      metadata: dto.metadata || null,
      isRead: false,
      archived: false,
      createdAt: new Date(),
    };

    const notification = await NotificationRepository.createNotification(notificationParams);

    // Audit Log: [NOTIFICATION_CREATED]
    console.log(
      `[NOTIFICATION_CREATED] notificationId=${notification.id} recipientId=${notification.recipientId} actorId=${notification.actorId || 'system'} type=${notification.type} workspaceId=${notification.workspaceId}`
    );

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

    // Phase 2 Real-Time Delivery: Publish NOTIFICATION_CREATED & UNREAD_COUNT_UPDATED
    try {
      await RealtimeNotificationService.publishNotification(notification);
      await RealtimeNotificationService.publishUnreadCount(dto.recipientId, dto.workspaceId);
    } catch (err) {
      console.warn('[NotificationService] Realtime delivery error:', err);
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
        tab: dto.tab,
        includeArchived: dto.includeArchived,
        search: dto.search,
        category: dto.category,
      }
    );
  }

  /**
   * getUserNotifications alias matching specification
   */
  static async getUserNotifications(
    userId: string,
    workspaceId?: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<NotificationEntity[]> {
    return await NotificationRepository.getNotifications(
      workspaceId || '',
      userId,
      options
    );
  }

  /**
   * Mark a single notification as read for a recipient.
   */
  static async markRead(workspaceId: string, recipientId: string, notificationId: string): Promise<boolean> {
    const success = await NotificationRepository.markAsRead(workspaceId, recipientId, notificationId);
    if (success) {
      console.log(
        `[NOTIFICATION_READ] notificationId=${notificationId} recipientId=${recipientId} workspaceId=${workspaceId}`
      );
      try {
        await RealtimeNotificationService.publishUnreadCount(recipientId, workspaceId);
      } catch {}
    }
    return success;
  }

  /**
   * markAsRead alias matching specification
   */
  static async markAsRead(notificationId: string, userId: string, workspaceId?: string): Promise<boolean> {
    return await this.markRead(workspaceId || '', userId, notificationId);
  }

  /**
   * Mark all notifications as read for a recipient.
   */
  static async markAllRead(workspaceId: string, recipientId: string): Promise<number> {
    const count = await NotificationRepository.markAllAsRead(workspaceId, recipientId);
    console.log(
      `[NOTIFICATION_BULK_READ] recipientId=${recipientId} workspaceId=${workspaceId} updatedCount=${count}`
    );
    try {
      await RealtimeNotificationService.publishUnreadCount(recipientId, workspaceId);
    } catch {}
    return count;
  }

  /**
   * markAllAsRead alias matching specification
   */
  static async markAllAsRead(userId: string, workspaceId?: string): Promise<number> {
    return await this.markAllRead(workspaceId || '', userId);
  }

  /**
   * Archive a single notification
   */
  static async archiveNotification(workspaceId: string, recipientId: string, notificationId: string): Promise<boolean> {
    return await NotificationRepository.archiveNotification(workspaceId, recipientId, notificationId);
  }

  /**
   * Retention Rule: Archive notifications older than cutoffDays (default 90 days)
   */
  static async archiveOldNotifications(workspaceId?: string, cutoffDays = 90): Promise<number> {
    return await NotificationRepository.archiveOldNotifications(workspaceId, cutoffDays);
  }

  /**
   * Get unread notification count for a recipient.
   */
  static async getUnreadCount(workspaceId: string, recipientId?: string): Promise<number> {
    if (!recipientId) {
      // If called with (userId)
      return await NotificationRepository.getUnreadCount('', workspaceId);
    }
    return await NotificationRepository.getUnreadCount(workspaceId, recipientId);
  }

  /**
   * Get user notification preferences
   */
  static async getPreferences(workspaceId: string, userId: string): Promise<UserNotificationPreferences> {
    return await NotificationRepository.getPreferences(workspaceId, userId);
  }

  /**
   * Update user notification preferences
   */
  static async updatePreferences(
    workspaceId: string,
    userId: string,
    updates: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferences> {
    return await NotificationRepository.updatePreferences(workspaceId, userId, updates);
  }

  /**
   * Parse @username / @name mentions in text and dispatch mention_received notifications
   */
  static async dispatchMentions(params: {
    workspaceId: string;
    actorId: string;
    text: string;
    entityType: string;
    entityId: string;
    link?: string;
  }): Promise<NotificationEntity[]> {
    const { workspaceId, actorId, text, entityType, entityId, link } = params;
    if (!text || !text.includes('@')) return [];

    try {
      const members: Array<{ id: string; name: string; email: string }> = [];

      // In-memory lookup
      for (const m of inMemoryDb.workspaceMembers.values()) {
        const wsId = m.workspaceId || (m as any).workspace_id;
        if (wsId === workspaceId) {
          const uId = m.userId || (m as any).user_id;
          const u = inMemoryDb.users.get(uId);
          if (u) members.push({ id: u.id, name: u.name, email: u.email });
        }
      }

      // In-memory fallback if workspaceMembers not linked
      if (members.length === 0) {
        for (const u of inMemoryDb.users.values()) {
          members.push({ id: u.id, name: u.name, email: u.email });
        }
      }

      // DB lookup if in-memory empty
      if (members.length === 0) {
        const db = getDb();
        if (db) {
          const { eq } = await import('drizzle-orm');
          const rows = await db
            .select({
              id: schema.users.id,
              name: schema.users.name,
              email: schema.users.email,
            })
            .from(schema.workspaceMembers)
            .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
            .where(eq(schema.workspaceMembers.workspaceId, workspaceId));
          members.push(...(rows as any));
        }
      }

      const actor = members.find((m) => m.id === actorId) || (inMemoryDb.users.get(actorId));
      const actorName = actor?.name || 'A team member';

      // Match mentions: @[a-zA-Z0-9._-]+
      const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
      const matches = Array.from(text.matchAll(mentionRegex), (m) => m[1].toLowerCase());
      if (matches.length === 0) return [];

      const targetUsers = members.filter((m) => {
        if (m.id === actorId) return false;
        const normalizedName = m.name.toLowerCase().replace(/\s+/g, '');
        const emailPrefix = m.email.split('@')[0].toLowerCase();
        const firstWord = m.name.toLowerCase().split(/\s+/)[0];
        return matches.some(
          (match) =>
            normalizedName.includes(match) ||
            emailPrefix.includes(match) ||
            firstWord === match ||
            match === m.id
        );
      });

      const results: NotificationEntity[] = [];
      const cleanSnippet = text.length > 100 ? `${text.slice(0, 97)}...` : text;

      for (const target of targetUsers) {
        const notif = await this.createNotification({
          workspaceId,
          recipientId: target.id,
          actorId,
          type: 'mention_received',
          priority: 'high',
          title: `You were mentioned by ${actorName}`,
          message: cleanSnippet,
          entityType,
          entityId,
          link: link || `/${entityType}s/${entityId}`,
        });
        if (notif) {
          results.push(notif);
        }
      }

      return results;
    } catch (err) {
      console.warn('[NotificationService.dispatchMentions] Error dispatching mentions:', err);
      return [];
    }
  }
}
