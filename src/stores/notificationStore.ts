/**
 * Workspace OS — Notification Store
 * Global state store for managing live notification feeds, unread counters,
 * connection status, and offline recovery merges.
 *
 * State:
 * - notifications[]
 * - unreadCount
 * - connected
 * - lastEventAt
 *
 * Actions:
 * - addNotification(notification)
 * - markRead(id)
 * - markAllRead()
 * - setUnreadCount(count)
 * - setConnected(connected)
 * - syncLatest()
 */

import { api } from '../lib/api';
import { notificationRealtime } from '../services/notificationRealtime';
import { realtimeClient } from '../lib/realtime';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  entityType?: string;
  entityId?: string;
  link?: string;
  isRead: boolean;
  archived?: boolean;
  createdAt: string | Date;
  metadata?: Record<string, any> | null;
}

export interface NotificationStoreState {
  notifications: NotificationItem[];
  unreadCount: number;
  connected: boolean;
  lastEventAt: Date | null;
}

type Listener = (state: NotificationStoreState) => void;

class NotificationStore {
  private state: NotificationStoreState = {
    notifications: [],
    unreadCount: 0,
    connected: false,
    lastEventAt: null,
  };

  private listeners = new Set<Listener>();
  private initialized = false;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    // Listen to realtime socket state changes
    realtimeClient.onStateChange((connected) => {
      this.setConnected(connected);
      if (connected) {
        // Offline recovery: sync latest notifications and unread count
        this.syncLatest();
      }
    });
  }

  /**
   * Initialize notification store listeners and fetch initial snapshot
   */
  public init(): () => void {
    if (this.initialized) return () => {};
    this.initialized = true;

    // Listen to NOTIFICATION_CREATED
    const unsubNotif = notificationRealtime.onNotificationCreated((notification: any) => {
      if (notification) {
        this.addNotification({
          id: notification.id || `notif-${Date.now()}`,
          title: notification.title || 'Workspace Update',
          message: notification.message || '',
          type: notification.type || 'system',
          priority: notification.priority || 'medium',
          entityType: notification.entityType || notification.entity_type,
          entityId: notification.entityId || notification.entity_id,
          link: notification.link,
          isRead: notification.isRead ?? false,
          archived: notification.archived ?? false,
          createdAt: notification.createdAt || new Date(),
          metadata: notification.metadata,
        });
      }
    });

    // Listen to UNREAD_COUNT_UPDATED
    const unsubCount = notificationRealtime.onUnreadCountUpdated((count: number) => {
      this.setUnreadCount(count);
    });

    this.unsubscribers.push(unsubNotif, unsubCount);

    // Initial snapshot fetch
    this.syncLatest();

    return () => {
      this.unsubscribers.forEach((u) => u());
      this.unsubscribers = [];
      this.initialized = false;
    };
  }

  /**
   * Subscribe React components to store changes
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current store snapshot
   */
  public getState(): NotificationStoreState {
    return this.state;
  }

  /**
   * Add newly arrived notification to state (safely avoid duplicates, unread first, newest first)
   */
  public addNotification(notif: NotificationItem): void {
    const exists = this.state.notifications.some((n) => n.id === notif.id);
    let updatedList: NotificationItem[];
    if (exists) {
      updatedList = this.state.notifications.map((n) => (n.id === notif.id ? { ...n, ...notif } : n));
    } else {
      updatedList = [notif, ...this.state.notifications];
    }

    const unreadCount = !notif.isRead && !notif.archived && !exists
      ? this.state.unreadCount + 1
      : this.calculateUnreadCount(updatedList);

    this.setState({
      notifications: updatedList,
      unreadCount,
      lastEventAt: new Date(),
    });
  }

  /**
   * Mark a single notification as read
   */
  public async markRead(id: string): Promise<void> {
    const updated = this.state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    const newCount = Math.max(0, this.state.unreadCount - 1);

    this.setState({
      notifications: updated,
      unreadCount: newCount,
      lastEventAt: new Date(),
    });

    try {
      await api.markNotificationRead(id);
    } catch (err) {
      console.warn('[NotificationStore] Failed to mark as read on server:', err);
    }
  }

  /**
   * Mark all notifications as read
   */
  public async markAllRead(): Promise<void> {
    const updated = this.state.notifications.map((n) => ({ ...n, isRead: true }));

    this.setState({
      notifications: updated,
      unreadCount: 0,
      lastEventAt: new Date(),
    });

    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      console.warn('[NotificationStore] Failed to mark all as read on server:', err);
    }
  }

  /**
   * Set unread count explicitly
   */
  public setUnreadCount(count: number): void {
    this.setState({
      unreadCount: Math.max(0, count),
      lastEventAt: new Date(),
    });
  }

  /**
   * Set connection status
   */
  public setConnected(connected: boolean): void {
    if (this.state.connected !== connected) {
      this.setState({ connected });
    }
  }

  /**
   * Offline recovery / Sync latest snapshot from PostgreSQL API
   */
  public async syncLatest(): Promise<void> {
    try {
      // 1. Fetch unread count
      const countRes = await api.getNotificationUnreadCount().catch(() => null);
      const serverUnreadCount = countRes?.count !== undefined ? countRes.count : (countRes?.unreadCount !== undefined ? countRes.unreadCount : null);

      // 2. Fetch recent notifications
      const notifsRes = await api.getNotifications({ limit: 50 }).catch(() => null);

      if (notifsRes && Array.isArray(notifsRes.notifications)) {
        const fetched: NotificationItem[] = notifsRes.notifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          priority: n.priority || 'medium',
          entityType: n.entityType || n.entity_type,
          entityId: n.entityId || n.entity_id,
          link: n.link,
          isRead: n.isRead || n.read || false,
          archived: n.archived || false,
          createdAt: n.createdAt || n.created_at || new Date(),
          metadata: n.metadata,
        }));

        // Merge existing local with server list safely (avoid duplicates)
        const map = new Map<string, NotificationItem>();
        for (const item of fetched) {
          map.set(item.id, item);
        }
        for (const local of this.state.notifications) {
          if (!map.has(local.id)) {
            map.set(local.id, local);
          }
        }

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        this.setState({
          notifications: merged,
          unreadCount: serverUnreadCount !== null ? serverUnreadCount : this.calculateUnreadCount(merged),
        });
      } else if (serverUnreadCount !== null) {
        this.setUnreadCount(serverUnreadCount);
      }
    } catch (err) {
      console.warn('[NotificationStore] syncLatest error:', err);
    }
  }

  private calculateUnreadCount(list: NotificationItem[]): number {
    return list.filter((n) => !n.isRead && !n.archived).length;
  }

  private setState(partial: Partial<NotificationStoreState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[NotificationStore] Listener error:', err);
      }
    }
  }
}

export const notificationStore = new NotificationStore();
