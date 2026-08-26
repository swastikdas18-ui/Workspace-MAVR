import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { AuthService } from '../services/auth-service';
import { EventBus, RealtimeEvent } from './event-bus';
import { ChannelManager, RealtimeClient } from './channel-manager';
import { PresenceManager } from './presence-manager';
import { UserRole } from '../../packages/database/types';

export interface WebSocketServerOptions {
  server?: HttpServer;
  port?: number;
  path?: string;
}

export class WorkspaceWebSocketServer {
  private wss: WebSocketServer | null = null;
  private isAttached = false;
  private unsubscribeEventBus: (() => void) | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(options?: WebSocketServerOptions) {
    if (options?.server) {
      this.attach(options.server, options.path || '/ws');
    } else if (options?.port) {
      this.listen(options.port, options.path || '/ws');
    }
  }

  /**
   * Attach WebSocket server to an existing Node.js HTTP server
   */
  public attach(httpServer: HttpServer, path = '/ws'): void {
    if (this.isAttached && this.wss) {
      return;
    }

    this.wss = new WebSocketServer({
      server: httpServer,
      path,
      maxPayload: 1024 * 1024, // 1MB payload limit
    });

    this.setupServer();
    this.isAttached = true;
  }

  /**
   * Listen on a standalone port (useful for tests or dedicated socket processes)
   */
  public listen(port: number, path = '/ws'): Promise<void> {
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({
        port,
        path,
        maxPayload: 1024 * 1024,
      }, () => {
        this.setupServer();
        this.isAttached = true;
        resolve();
      });
    });
  }

  /**
   * Initialize server listeners, event forwarding, and heartbeat sweeps
   */
  private setupServer(): void {
    if (!this.wss) return;

    // Listen for WebSocket client connections
    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      this.handleConnection(socket, req);
    });

    // Forward events from EventBus to WebSocket channels
    this.unsubscribeEventBus = EventBus.subscribeAll((event: RealtimeEvent) => {
      this.handleEventBusMessage(event);
    });

    // Heartbeat ping interval every 30 seconds to clean up dead TCP sockets
    this.heartbeatInterval = setInterval(() => {
      const allClients = ChannelManager.getAllClients();
      for (const client of allClients) {
        if (!client.isAlive) {
          try {
            client.close();
          } catch {}
          ChannelManager.unregisterClient(client);
          PresenceManager.handleDisconnect(client.userId, client.workspaceId, client.id);
        } else {
          client.isAlive = false;
          try {
            client.send(JSON.stringify({ type: 'ping' }));
          } catch {}
        }
      }
    }, 30000);
    if (this.heartbeatInterval && typeof this.heartbeatInterval.unref === 'function') {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Handle incoming WebSocket connection
   */
  private async handleConnection(socket: WebSocket, req: IncomingMessage): Promise<void> {
    const socketId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token =
      url.searchParams.get('token') ||
      req.headers['x-session-token']?.toString() ||
      this.extractBearerToken(req.headers['authorization']) ||
      this.extractCookieToken(req.headers['cookie']);

    let authenticatedClient: RealtimeClient | null = null;

    // Set connection alive flag
    let isAlive = true;
    socket.on('pong', () => {
      isAlive = true;
      if (authenticatedClient) authenticatedClient.isAlive = true;
    });

    // If token provided during handshake, authenticate immediately
    if (token) {
      authenticatedClient = await this.authenticateSocket(socket, socketId, token, req);
    }

    // Message listener
    socket.on('message', async (rawData: RawData) => {
      try {
        const text = rawData.toString();
        const data = JSON.parse(text);

        // 1. Auth message
        if (data.type === 'auth') {
          if (!authenticatedClient && data.token) {
            authenticatedClient = await this.authenticateSocket(socket, socketId, data.token, req);
          }
          return;
        }

        // Keepalive pong
        if (data.type === 'pong') {
          isAlive = true;
          if (authenticatedClient) authenticatedClient.isAlive = true;
          return;
        }

        // Ping -> Pong
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          return;
        }

        // Require authentication for all subsequent operations
        if (!authenticatedClient) {
          socket.send(
            JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: 'Authentication required. Send { type: "auth", token: "..." } first.',
            })
          );
          return;
        }

        authenticatedClient.lastActive = new Date();
        authenticatedClient.isAlive = true;

        // 2. Channel Subscribe
        if (data.type === 'subscribe' && data.channel) {
          const success = ChannelManager.subscribe(data.channel, authenticatedClient);
          if (success) {
            socket.send(JSON.stringify({ type: 'subscribed', channel: data.channel }));
          } else {
            socket.send(
              JSON.stringify({
                type: 'error',
                code: 'FORBIDDEN',
                message: `Forbidden: Cannot subscribe to channel ${data.channel}`,
              })
            );
          }
          return;
        }

        // 3. Channel Unsubscribe
        if (data.type === 'unsubscribe' && data.channel) {
          ChannelManager.unsubscribe(data.channel, authenticatedClient);
          socket.send(JSON.stringify({ type: 'unsubscribed', channel: data.channel }));
          return;
        }

        // 4. Presence Status Update
        if (
          (data.type === 'presence:status' ||
            data.type === 'presence_update' ||
            data.type === 'presence:update' ||
            data.type === 'status_update') &&
          data.status
        ) {
          await PresenceManager.setStatus(
            authenticatedClient.userId,
            authenticatedClient.workspaceId,
            data.status
          );
          socket.send(JSON.stringify({ type: 'presence:updated', status: data.status }));
          return;
        }

        // 5. Presence Heartbeat
        if (data.type === 'presence:heartbeat') {
          await PresenceManager.heartbeat(
            authenticatedClient.userId,
            authenticatedClient.workspaceId
          );
          socket.send(JSON.stringify({ type: 'presence:ack', timestamp: new Date().toISOString() }));
          return;
        }

        // 6. Broadcast Ephemeral Event (typing indicators, cursors, etc.)
        if (data.type === 'broadcast' && data.event) {
          const eventPayload = {
            type: data.event,
            workspaceId: authenticatedClient.workspaceId,
            senderId: authenticatedClient.userId,
            senderName: authenticatedClient.name,
            payload: data.payload,
            timestamp: new Date().toISOString(),
          };

          if (data.channel) {
            ChannelManager.broadcastToChannel(data.channel, eventPayload, {
              excludeClientId: socketId,
            });
          } else {
            ChannelManager.broadcastToWorkspace(authenticatedClient.workspaceId, eventPayload, {
              excludeClientId: socketId,
            });
          }
        }
      } catch (err: any) {
        socket.send(
          JSON.stringify({
            type: 'error',
            code: 'BAD_REQUEST',
            message: err.message || 'Invalid message format',
          })
        );
      }
    });

    // Cleanup on disconnect
    socket.on('close', async () => {
      if (authenticatedClient) {
        ChannelManager.unregisterClient(authenticatedClient);
        await PresenceManager.handleDisconnect(
          authenticatedClient.userId,
          authenticatedClient.workspaceId,
          socketId
        );
      }
    });

    socket.on('error', async (err) => {
      console.warn(`[WebSocket Error] Socket ${socketId}:`, err.message);
      if (authenticatedClient) {
        ChannelManager.unregisterClient(authenticatedClient);
        await PresenceManager.handleDisconnect(
          authenticatedClient.userId,
          authenticatedClient.workspaceId,
          socketId
        );
      }
    });
  }

  /**
   * Authenticate socket and register in channel & presence managers
   */
  private async authenticateSocket(
    socket: WebSocket,
    socketId: string,
    token: string,
    req: IncomingMessage
  ): Promise<RealtimeClient | null> {
    try {
      const session = await AuthService.getSession(token);
      if (!session || !session.user) {
        socket.send(
          JSON.stringify({
            type: 'auth_error',
            code: 'UNAUTHORIZED',
            message: 'Session has expired or is invalid.',
          })
        );
        socket.close(4401, 'Unauthorized');
        return null;
      }

      const workspaceId = session.workspace?.id || session.user.id;
      const role = session.workspace?.roleInWorkspace || session.user.role || 'employee';

      const client: RealtimeClient = {
        id: socketId,
        userId: session.user.id,
        workspaceId,
        role,
        name: session.user.name,
        email: session.user.email,
        connectedAt: new Date(),
        lastActive: new Date(),
        isAlive: true,
        send: (data: string) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(data);
          }
        },
        close: () => {
          try {
            socket.close();
          } catch {}
        },
      };

      // Register in ChannelManager
      ChannelManager.registerClient(client);

      // Register in PresenceManager
      await PresenceManager.setUserOnline(
        session.user.id,
        workspaceId,
        socketId,
        {
          name: session.user.name,
          email: session.user.email,
          role,
          avatar: session.user.avatar,
        },
        {
          userAgent: req.headers['user-agent'],
          ip: req.socket.remoteAddress,
        }
      );

      // Send connection acknowledgement
      const onlineCount = PresenceManager.getOnlineUsersCount(workspaceId);
      client.send(
        JSON.stringify({
          type: 'connected',
          socketId,
          userId: session.user.id,
          workspaceId,
          role,
          userName: session.user.name,
          onlineUsers: onlineCount,
          channels: [`workspace:${workspaceId}`, `user:${session.user.id}`],
          timestamp: new Date().toISOString(),
        })
      );

      return client;
    } catch (err: any) {
      socket.send(
        JSON.stringify({
          type: 'auth_error',
          code: 'AUTH_FAILED',
          message: err.message || 'Authentication failed',
        })
      );
      socket.close(4401, 'Authentication Failed');
      return null;
    }
  }

  /**
   * Forward EventBus messages to corresponding WebSocket channels
   */
  private handleEventBusMessage(event: RealtimeEvent): void {
    if (!event.workspaceId) return;

    // Direct user targeting
    if (event.targetUserId) {
      ChannelManager.sendToUser(event.targetUserId, event);
      return;
    }

    // Role-based visibility check for certain events
    let roleFilter: ((role: string) => boolean) | undefined;
    if (event.type.startsWith('crm_') || event.type.startsWith('crm:')) {
      roleFilter = (role: string) => role === 'admin' || role === 'employee';
    }

    // Broadcast to workspace channel
    ChannelManager.broadcastToWorkspace(event.workspaceId, event, {
      roleFilter,
    });
  }

  /**
   * Helper: Extract Bearer token from header
   */
  private extractBearerToken(authHeader?: string): string | null {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return null;
  }

  /**
   * Helper: Extract session token from cookie header
   */
  private extractCookieToken(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/ws_session=([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Broadcast message to a specific workspace
   */
  public broadcastToWorkspace(workspaceId: string, event: any, options?: any): number {
    return ChannelManager.broadcastToWorkspace(workspaceId, event, options);
  }

  /**
   * Send message to a specific user
   */
  public sendToUser(userId: string, event: any): number {
    return ChannelManager.sendToUser(userId, event);
  }

  /**
   * Get server metrics
   */
  public getMetrics(workspaceId?: string) {
    return {
      activeConnections: ChannelManager.getActiveConnectionCount(),
      workspaceConnections: workspaceId ? ChannelManager.getWorkspaceConnectionCount(workspaceId) : undefined,
      peakConnections: PresenceManager.getPeakConnections(),
      onlineUsers: PresenceManager.getOnlineUsersCount(workspaceId),
      dailyEvents: EventBus.getDailyEvents(),
      broadcastCount: EventBus.getBroadcastCount(),
    };
  }

  /**
   * Close WebSocket server and cleanup all resources
   */
  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.unsubscribeEventBus) {
      this.unsubscribeEventBus();
      this.unsubscribeEventBus = null;
    }

    ChannelManager.clear();
    PresenceManager.reset();

    if (this.wss) {
      try {
        for (const client of this.wss.clients) {
          try {
            client.terminate();
          } catch {}
        }
      } catch {}

      await new Promise<void>((resolve) => {
        this.wss?.close(() => resolve());
        setTimeout(resolve, 200);
      });
      this.wss = null;
    }
    this.isAttached = false;
  }
}

export const wsServer = new WorkspaceWebSocketServer();
