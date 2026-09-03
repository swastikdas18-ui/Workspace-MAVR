/**
 * Workspace OS — Canonical Realtime Subsystem Re-exports
 * Central barrel providing all realtime context, hooks, and types.
 */

export { RealtimeProvider, useRealtimeContext } from './realtime-provider';
export type { RealtimeProviderProps } from './realtime-provider';
export { useRealtime } from './useRealtime';
export { usePresence } from './usePresence';
export type { PresenceUser } from './usePresence';
export { useNotifications } from './useNotifications';
export { useActivityFeed } from './useActivityFeed';
export { realtimeClient, RealtimeWebSocketClient } from './websocket-client';
export type { RealtimeMessage, RealtimeEventHandler, WebSocketClientOptions } from './websocket-client';
