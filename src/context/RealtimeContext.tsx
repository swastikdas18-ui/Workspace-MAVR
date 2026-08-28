import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getStoredSessionToken, getWebSocketUrl } from '../lib/api';

export interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  connected?: boolean;
}

export interface RealtimeEvent {
  id: string;
  type: string;
  payload: any;
  context: {
    actorId: string;
    workspaceId: string;
    timestamp: string;
    entityType?: string;
    entityId?: string;
  };
}

interface RealtimeContextType {
  isConnected: boolean;
  isConnecting: boolean;
  presenceUsers: PresenceUser[];
  recentEvents: RealtimeEvent[];
  lastEvent: RealtimeEvent | null;
  setStatus: (status: 'online' | 'away' | 'offline') => void;
  sendCustomEvent: (type: string, payload: any) => void;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode; workspaceId?: string }> = ({
  children,
  workspaceId,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [recentEvents, setRecentEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    const token = getStoredSessionToken();
    if (!token) {
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setIsConnecting(true);

    try {
      const wsUrl = getWebSocketUrl(token);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setIsConnecting(false);

        // Start heartbeat ping every 25 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            // Initial connection confirmation
          } else if (msg.type === 'pong') {
            // Heartbeat response
          } else if (msg.type === 'presence_snapshot') {
            if (Array.isArray(msg.payload)) {
              setPresenceUsers(msg.payload);
            }
          } else if (msg.type === 'user_online' || msg.type === 'user_offline' || msg.type === 'status_changed') {
            setPresenceUsers((prev) => {
              const updatedUser = msg.payload;
              const idx = prev.findIndex((u) => u.userId === updatedUser.userId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], ...updatedUser };
                return next;
              }
              return [...prev, updatedUser];
            });
          } else {
            // Domain event or broadcast
            const realtimeEvt: RealtimeEvent = {
              id: msg.id || `evt-${Date.now()}-${Math.random()}`,
              type: msg.type,
              payload: msg.payload,
              context: msg.context || {
                actorId: 'system',
                workspaceId: workspaceId || 'workspace',
                timestamp: new Date().toISOString(),
              },
            };

            setLastEvent(realtimeEvt);
            setRecentEvents((prev) => [realtimeEvt, ...prev.slice(0, 49)]);
          }
        } catch (err) {
          console.warn('[Realtime Context] Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        setIsConnecting(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Attempt reconnect in 3s
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && getStoredSessionToken()) {
            connect();
          }
        }, 3000);
      };

      socket.onerror = (err) => {
        console.warn('[Realtime Context] WebSocket error:', err);
        socket.close();
      };
    } catch (err) {
      console.warn('[Realtime Context] Connection creation failed:', err);
      setIsConnecting(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const setStatus = useCallback((status: 'online' | 'away' | 'offline') => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'presence_update', status }));
    }
  }, []);

  const sendCustomEvent = useCallback((type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        isConnecting,
        presenceUsers,
        recentEvents,
        lastEvent,
        setStatus,
        sendCustomEvent,
        reconnect: connect,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
