import { useState, useEffect, useCallback } from 'react';
import { useRealtimeContext } from './realtime-provider';

export interface PresenceUser {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  avatar?: string | null;
  workspaceId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string | Date;
  connectedAt?: string | Date;
  metadata?: any;
}

export function usePresence() {
  const { client, setPresenceStatus, isConnected, onlineCount } = useRealtimeContext();
  const [presenceList, setPresenceList] = useState<PresenceUser[]>([]);

  useEffect(() => {
    // Listen for single user status changes
    const unsubStatus = client.on('status_changed', (payload: any) => {
      if (payload?.userId) {
        setPresenceList((prev) =>
          prev.map((user) =>
            user.userId === payload.userId
              ? {
                  ...user,
                  status: payload.status,
                  lastSeen: payload.lastSeen || new Date().toISOString(),
                }
              : user
          )
        );
      }
    });

    // Listen for user coming online
    const unsubOnline = client.on('user_online', (payload: any) => {
      if (payload?.userId) {
        setPresenceList((prev) => {
          const exists = prev.find((u) => u.userId === payload.userId);
          if (exists) {
            return prev.map((u) =>
              u.userId === payload.userId
                ? {
                    ...u,
                    status: 'online',
                    lastSeen: payload.lastSeen || new Date().toISOString(),
                  }
                : u
            );
          }
          return [
            ...prev,
            {
              id: `pres-${payload.userId}`,
              userId: payload.userId,
              userName: payload.userName,
              userRole: payload.userRole,
              avatar: payload.avatar,
              workspaceId: payload.workspaceId,
              status: 'online',
              lastSeen: payload.lastSeen || new Date().toISOString(),
              connectedAt: payload.connectedAt || new Date().toISOString(),
            },
          ];
        });
      }
    });

    // Listen for user going offline
    const unsubOffline = client.on('user_offline', (payload: any) => {
      if (payload?.userId) {
        setPresenceList((prev) =>
          prev.map((user) =>
            user.userId === payload.userId
              ? {
                  ...user,
                  status: 'offline',
                  lastSeen: payload.lastSeen || new Date().toISOString(),
                }
              : user
          )
        );
      }
    });

    return () => {
      unsubStatus();
      unsubOnline();
      unsubOffline();
    };
  }, [client]);

  const updateStatus = useCallback(
    (status: 'online' | 'away' | 'offline') => {
      setPresenceStatus(status);
    },
    [setPresenceStatus]
  );

  return {
    presenceList,
    onlineCount,
    isConnected,
    updateStatus,
    setPresenceList,
  };
}
