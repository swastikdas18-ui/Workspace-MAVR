import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { RealtimeWebSocketClient, realtimeClient, RealtimeMessage } from './websocket-client';
import { getStoredSessionToken } from '../api';

interface RealtimeContextType {
  client: RealtimeWebSocketClient;
  isConnected: boolean;
  onlineCount: number;
  lastMessage: RealtimeMessage | null;
  setPresenceStatus: (status: 'online' | 'away' | 'offline') => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export interface RealtimeProviderProps {
  children: React.ReactNode;
  workspaceId?: string;
  token?: string | null;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({
  children,
  workspaceId,
  token,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);

  useEffect(() => {
    const activeToken = token || getStoredSessionToken();
    if (activeToken) {
      realtimeClient.connect(activeToken, workspaceId);
    }

    const unsubState = realtimeClient.onStateChange((connected) => {
      setIsConnected(connected);
    });

    const unsubAll = realtimeClient.on('*', (payload, msg) => {
      setLastMessage(msg);
    });

    const unsubAuthSuccess = realtimeClient.on('auth_success', (payload: any) => {
      if (payload?.onlineUsers !== undefined) {
        setOnlineCount(payload.onlineUsers);
      }
    });

    const unsubPresence = realtimeClient.on('presence_updated', (payload: any) => {
      if (payload?.onlineUsers !== undefined) {
        setOnlineCount(payload.onlineUsers);
      }
    });

    return () => {
      unsubState();
      unsubAll();
      unsubAuthSuccess();
      unsubPresence();
      realtimeClient.disconnect();
    };
  }, [workspaceId, token]);

  const value = useMemo(
    () => ({
      client: realtimeClient,
      isConnected,
      onlineCount,
      lastMessage,
      setPresenceStatus: (status: 'online' | 'away' | 'offline') =>
        realtimeClient.setPresenceStatus(status),
    }),
    [isConnected, onlineCount, lastMessage]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
}
