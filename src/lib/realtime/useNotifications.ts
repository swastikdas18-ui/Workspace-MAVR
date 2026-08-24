import { useState, useEffect, useCallback } from 'react';
import { useRealtimeContext } from './realtime-provider';

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export function useNotifications() {
  const { client } = useRealtimeContext();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubCreated = client.on('notification_created', (payload: any) => {
      if (payload) {
        const notif: RealtimeNotification = {
          id: payload.id || `notif-${Date.now()}`,
          title: payload.title || 'New Notification',
          message: payload.message || '',
          type: payload.type || 'system',
          isRead: false,
          metadata: payload.metadata,
          createdAt: payload.createdAt || new Date().toISOString(),
        };

        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      unsubCreated();
    };
  }, [client]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setNotifications,
  };
}
