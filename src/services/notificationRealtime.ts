/**
 * Workspace OS — Frontend Notification Real-Time Service
 * Dedicated real-time communication adapter for notifications.
 *
 * Responsibilities:
 * - connect(token, workspaceId)
 * - disconnect()
 * - subscribe(eventType, handler)
 * - unsubscribe(eventType, handler)
 *
 * Listens for:
 * - NOTIFICATION_CREATED (with payload: { notification })
 * - UNREAD_COUNT_UPDATED (with payload: { unreadCount })
 */

import { realtimeClient, RealtimeMessage, RealtimeEventHandler } from '../lib/realtime';

export type NotificationCreatedHandler = (notification: any, rawMessage: RealtimeMessage) => void;
export type UnreadCountUpdatedHandler = (unreadCount: number, rawMessage: RealtimeMessage) => void;

class NotificationRealtimeService {
  private activeSubscriptions = new Map<string, Set<Function>>();

  /**
   * Initialize or reuse WebSocket connection
   */
  public connect(token?: string, workspaceId?: string): void {
    if (token) {
      realtimeClient.connect(token, workspaceId);
    }
  }

  /**
   * Disconnect socket client
   */
  public disconnect(): void {
    realtimeClient.disconnect();
  }

  /**
   * Subscribe to notification events
   */
  public subscribe(eventType: 'NOTIFICATION_CREATED' | 'UNREAD_COUNT_UPDATED' | string, handler: Function): () => void {
    let handlers = this.activeSubscriptions.get(eventType);
    if (!handlers) {
      handlers = new Set();
      this.activeSubscriptions.set(eventType, handlers);
    }
    handlers.add(handler);

    // Register with underlying realtime client
    const unsub = realtimeClient.on(eventType, (data: any, msg: RealtimeMessage) => {
      handler(data, msg);
    });

    // Also register lowercase variant if canonical uppercase
    let unsubLegacy: (() => void) | null = null;
    if (eventType === 'NOTIFICATION_CREATED') {
      unsubLegacy = realtimeClient.on('notification_created', (data: any, msg: RealtimeMessage) => {
        const notif = data?.notification || (data?.id ? data : null);
        if (notif) handler({ notification: notif }, msg);
      });
    }

    return () => {
      this.unsubscribe(eventType, handler);
      unsub();
      if (unsubLegacy) unsubLegacy();
    };
  }

  /**
   * Unsubscribe a specific handler
   */
  public unsubscribe(eventType: string, handler: Function): void {
    const handlers = this.activeSubscriptions.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.activeSubscriptions.delete(eventType);
      }
    }
  }

  /**
   * Helper to subscribe specifically to NOTIFICATION_CREATED
   */
  public onNotificationCreated(handler: NotificationCreatedHandler): () => void {
    return this.subscribe('NOTIFICATION_CREATED', (payload: any, msg: RealtimeMessage) => {
      const notification = payload?.notification || payload;
      handler(notification, msg);
    });
  }

  /**
   * Helper to subscribe specifically to UNREAD_COUNT_UPDATED
   */
  public onUnreadCountUpdated(handler: UnreadCountUpdatedHandler): () => void {
    return this.subscribe('UNREAD_COUNT_UPDATED', (payload: any, msg: RealtimeMessage) => {
      const count = typeof payload === 'number' ? payload : (payload?.unreadCount ?? 0);
      handler(count, msg);
    });
  }

  /**
   * Check connection status
   */
  public isConnected(): boolean {
    return realtimeClient.isConnected;
  }
}

export const notificationRealtime = new NotificationRealtimeService();
