/**
 * Workspace OS — Canonical Realtime Re-exports
 * 
 * Standardized single source of truth re-exporting from src/lib/realtime.
 * Eliminates duplicate createContext calls and ensures zero split-context bugs.
 */

export {
  RealtimeProvider,
  useRealtimeContext,
  useRealtime,
  usePresence,
  useNotifications,
  useActivityFeed,
  realtimeClient,
  RealtimeWebSocketClient,
} from '../lib/realtime';

export type {
  RealtimeProviderProps,
  PresenceUser,
  RealtimeMessage,
  RealtimeEventHandler,
  WebSocketClientOptions,
} from '../lib/realtime';
