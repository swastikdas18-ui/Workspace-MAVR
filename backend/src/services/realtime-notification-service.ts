/**
 * Workspace OS — Real-Time Notification Service
 * Dedicated real-time delivery layer for notifications.
 *
 * Responsibilities:
 * - registerConnection(userId, connectionId)
 * - unregisterConnection(userId, connectionId)
 * - publishNotification(notification)
 * - publishUnreadCount(userId, workspaceId?)
 * - getConnectedUsers()
 *
 * Security:
 * - Direct user-targeted routing only (notification.recipientId === currentUser.id)
 * - Workspace isolation enforcement
 * - Multi-tab connection support via Map<userId, Set<connectionId>>
 */

import { ChannelManager } from '../realtime/channel-manager.js';
import { NotificationRepository, NotificationEntity } from '../repositories/notification-repository.js';

export class RealtimeNotificationService {
  // Track connections per user to support multiple tabs
  // Map<userId, Set<connectionId>>
  private static userConnections = new Map<string, Set<string>>();

  /**
   * Register a user connection (socketId / connectionId)
   */
  public static registerConnection(userId: string, connectionId: string): void {
    if (!userId || !connectionId) return;

    let conns = this.userConnections.get(userId);
    if (!conns) {
      conns = new Set<string>();
      this.userConnections.set(userId, conns);
    }
    conns.add(connectionId);

    console.log(`[NOTIFICATION_SOCKET_CONNECTED] userId=${userId} connectionId=${connectionId} totalUserConnections=${conns.size}`);
  }

  /**
   * Unregister a user connection on socket close / disconnect
   */
  public static unregisterConnection(userId: string, connectionId: string): void {
    if (!userId || !connectionId) return;

    const conns = this.userConnections.get(userId);
    if (conns) {
      conns.delete(connectionId);
      console.log(`[NOTIFICATION_SOCKET_DISCONNECTED] userId=${userId} connectionId=${connectionId} remainingConnections=${conns.size}`);
      if (conns.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  /**
   * Return set/array of currently connected user IDs
   */
  public static getConnectedUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  /**
   * Check if a specific user has active connections
   */
  public static isUserConnected(userId: string): boolean {
    const conns = this.userConnections.get(userId);
    return !!conns && conns.size > 0;
  }

  /**
   * Get active connection count for a user (multiple tabs)
   */
  public static getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Publish a newly created notification directly to the recipient's connections.
   * Event type: NOTIFICATION_CREATED
   * Payload: { notification }
   */
  public static async publishNotification(notification: NotificationEntity): Promise<boolean> {
    if (!notification || !notification.recipientId) {
      console.warn('[NOTIFICATION_PUSH_FAILED] notification missing or has no recipientId');
      return false;
    }

    try {
      const payload = {
        type: 'NOTIFICATION_CREATED',
        channel: `user:${notification.recipientId}`,
        workspaceId: notification.workspaceId,
        recipientId: notification.recipientId,
        timestamp: new Date().toISOString(),
        payload: {
          notification,
        },
      };

      // Deliver canonical Phase 2 NOTIFICATION_CREATED event directly to recipient
      const deliveredCount = ChannelManager.sendToUser(notification.recipientId, payload);

      console.log(
        `[NOTIFICATION_PUSH_SENT] notificationId=${notification.id} recipientId=${notification.recipientId} type=${notification.type} deliveredClients=${deliveredCount}`
      );
      return deliveredCount > 0;
    } catch (err: any) {
      console.error(`[NOTIFICATION_PUSH_FAILED] notificationId=${notification.id} recipientId=${notification.recipientId}:`, err.message || err);
      return false;
    }
  }

  /**
   * Publish unread notification count update directly to recipient.
   * Event type: UNREAD_COUNT_UPDATED
   * Payload: { unreadCount }
   */
  public static async publishUnreadCount(userId: string, workspaceId?: string): Promise<number> {
    if (!userId) return 0;

    try {
      // Calculate latest unread count from source of truth repository
      const unreadCount = await NotificationRepository.getUnreadCount(workspaceId || '', userId);

      const payload = {
        type: 'UNREAD_COUNT_UPDATED',
        channel: `user:${userId}`,
        workspaceId: workspaceId || '',
        recipientId: userId,
        timestamp: new Date().toISOString(),
        payload: {
          unreadCount,
        },
      };

      ChannelManager.sendToUser(userId, payload);
      return unreadCount;
    } catch (err: any) {
      console.warn(`[NOTIFICATION_PUSH_FAILED] publishUnreadCount failed for user ${userId}:`, err.message || err);
      return 0;
    }
  }

  /**
   * Reset internal map for test isolation
   */
  public static resetForTest(): void {
    this.userConnections.clear();
  }
}
