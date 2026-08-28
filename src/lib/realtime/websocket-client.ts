/**
 * Workspace OS — Frontend WebSocket Client
 * Production-grade client with automatic reconnection, heartbeat keepalive,
 * workspace-scoped channel subscriptions, and event routing.
 */

import { getWebSocketUrl } from '../api';

export interface RealtimeMessage<T = any> {
  id?: string;
  type: string;
  channel?: string;
  workspaceId?: string;
  targetUserId?: string;
  payload?: T;
  timestamp?: string;
  error?: string;
  code?: string;
  message?: string;
  status?: string;
  [key: string]: any;
}

export type RealtimeEventHandler<T = any> = (payload: T, message: RealtimeMessage<T>) => void;

export interface WebSocketClientOptions {
  url?: string;
  token?: string | null;
  workspaceId?: string | null;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class RealtimeWebSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private workspaceId: string | null = null;
  private autoReconnect = true;
  private reconnectInterval = 2000;
  private maxReconnectAttempts = 10;
  private reconnectAttempts = 0;
  private reconnectTimeout: any = null;
  private heartbeatIntervalTime = 25000;
  private heartbeatTimer: any = null;
  private isExplicitlyClosed = false;

  // Subscribed channels: channelName -> Set of listeners
  private channelSubscriptions = new Set<string>();
  // Event listeners: eventType -> Set of handlers
  private eventHandlers = new Map<string, Set<RealtimeEventHandler>>();
  // Connection state listeners
  private stateListeners = new Set<(connected: boolean) => void>();

  public isConnected = false;

  constructor(options?: WebSocketClientOptions) {
    if (options?.token) this.token = options.token;
    if (options?.workspaceId) this.workspaceId = options.workspaceId;
    if (options?.autoReconnect !== undefined) this.autoReconnect = options.autoReconnect;
    if (options?.reconnectInterval !== undefined) this.reconnectInterval = options.reconnectInterval;
    if (options?.maxReconnectAttempts !== undefined) this.maxReconnectAttempts = options.maxReconnectAttempts;
    if (options?.heartbeatInterval !== undefined) this.heartbeatIntervalTime = options.heartbeatInterval;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(token?: string, workspaceId?: string): void {
    if (token) this.token = token;
    if (workspaceId) this.workspaceId = workspaceId;

    if (!this.token) {
      console.warn('[WebSocketClient] Cannot connect without auth token');
      return;
    }

    this.isExplicitlyClosed = false;
    this.cleanupSocket();

    const wsUrl = getWebSocketUrl(this.token, this.workspaceId || undefined);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyState(true);
        this.startHeartbeat();

        // Resubscribe to existing channels
        for (const channel of this.channelSubscriptions) {
          this.send({ type: 'subscribe', channel });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: RealtimeMessage = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (err) {
          console.warn('[WebSocketClient] Error parsing message:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.notifyState(false);

        if (!this.isExplicitlyClosed && this.autoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocketClient] Socket error:', err);
      };
    } catch (err) {
      console.error('[WebSocketClient] Failed to initialize WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect gracefully
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanupSocket();
    this.isConnected = false;
    this.notifyState(false);
  }

  /**
   * Send arbitrary message through socket
   */
  public send(msg: RealtimeMessage | object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  /**
   * Subscribe to specific event type
   */
  public on<T = any>(eventType: string, handler: RealtimeEventHandler<T>): () => void {
    let handlers = this.eventHandlers.get(eventType);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(eventType, handlers);
    }
    handlers.add(handler);

    return () => {
      handlers?.delete(handler);
      if (handlers?.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    };
  }

  /**
   * Subscribe to channel (e.g. `workspace:abc-123`)
   */
  public subscribeChannel(channel: string): void {
    this.channelSubscriptions.add(channel);
    if (this.isConnected) {
      this.send({ type: 'subscribe', channel });
    }
  }

  /**
   * Unsubscribe from channel
   */
  public unsubscribeChannel(channel: string): void {
    this.channelSubscriptions.delete(channel);
    if (this.isConnected) {
      this.send({ type: 'unsubscribe', channel });
    }
  }

  /**
   * Update user presence status ('online' | 'away' | 'offline')
   */
  public setPresenceStatus(status: 'online' | 'away' | 'offline'): void {
    this.send({ type: 'presence:status', status });
  }

  /**
   * Listen for connection state changes
   */
  public onStateChange(listener: (connected: boolean) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private handleIncomingMessage(msg: RealtimeMessage): void {
    // Heartbeat ping from server
    if (msg.type === 'ping') {
      this.send({ type: 'pong' });
      return;
    }

    // Trigger handlers for specific message type
    const handlers = this.eventHandlers.get(msg.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(msg.payload ?? msg, msg);
        } catch (err) {
          console.error(`[WebSocketClient] Handler error for event ${msg.type}:`, err);
        }
      }
    }

    // Trigger wildcard handlers
    const allHandlers = this.eventHandlers.get('*');
    if (allHandlers) {
      for (const handler of allHandlers) {
        try {
          handler(msg.payload ?? msg, msg);
        } catch (err) {}
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, this.heartbeatIntervalTime);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocketClient] Max reconnect attempts reached');
      return;
    }

    const backoff = Math.min(this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, backoff);
  }

  private notifyState(connected: boolean): void {
    for (const listener of this.stateListeners) {
      try {
        listener(connected);
      } catch {}
    }
  }

  private cleanupSocket(): void {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}

export const realtimeClient = new RealtimeWebSocketClient();
