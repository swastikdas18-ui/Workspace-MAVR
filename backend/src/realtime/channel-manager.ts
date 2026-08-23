import { UserRole } from '../../packages/database/types';

export interface RealtimeClient {
  id: string;
  userId: string;
  workspaceId: string;
  role: UserRole | string;
  name?: string;
  email?: string;
  connectedAt: Date;
  lastActive: Date;
  send: (data: string) => void;
  close: () => void;
  isAlive: boolean;
}

export interface BroadcastOptions {
  excludeClientId?: string;
  targetUserId?: string;
  roleFilter?: (role: string) => boolean;
  minRole?: UserRole | string;
}

export class ChannelManagerEngine {
  // Map of channelName -> Set of RealtimeClient
  private channels = new Map<string, Set<RealtimeClient>>();
  // Map of clientId -> Set of channelNames
  private clientChannels = new Map<string, Set<string>>();
  // Map of clientId -> RealtimeClient
  private clients = new Map<string, RealtimeClient>();

  /**
   * Register a new connected client
   */
  public registerClient(client: RealtimeClient): void {
    this.clients.set(client.id, client);
    this.clientChannels.set(client.id, new Set());

    // Auto-subscribe client to their default workspace channel and user channel
    if (client.workspaceId) {
      this.subscribe(`workspace:${client.workspaceId}`, client);
    }
    if (client.userId) {
      this.subscribe(`user:${client.userId}`, client);
    }
  }

  /**
   * Remove and clean up a client on disconnect (0 memory leaks)
   */
  public unregisterClient(clientOrId: RealtimeClient | string): void {
    const clientId = typeof clientOrId === 'string' ? clientOrId : clientOrId.id;
    const client = this.clients.get(clientId);

    if (!client) return;

    // Unsubscribe from all channels
    const subscribedChannels = this.clientChannels.get(clientId);
    if (subscribedChannels) {
      for (const channel of subscribedChannels) {
        const set = this.channels.get(channel);
        if (set) {
          set.delete(client);
          if (set.size === 0) {
            this.channels.delete(channel);
          }
        }
      }
      this.clientChannels.delete(clientId);
    }

    this.clients.delete(clientId);
  }

  /**
   * Subscribe client to a channel with workspace boundary isolation
   */
  public subscribe(channel: string, client: RealtimeClient): boolean {
    if (!channel || !client) return false;

    // Multi-tenant boundary check:
    // If subscribing to workspace:X, client MUST belong to workspace X
    if (channel.startsWith('workspace:')) {
      const targetWorkspaceId = channel.split(':')[1];
      if (client.workspaceId !== targetWorkspaceId) {
        // Forbidden cross-workspace subscription
        return false;
      }
    }

    // User channel check
    if (channel.startsWith('user:')) {
      const targetUserId = channel.split(':')[1];
      if (client.userId !== targetUserId) {
        return false;
      }
    }

    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(client);

    let clientSet = this.clientChannels.get(client.id);
    if (!clientSet) {
      clientSet = new Set();
      this.clientChannels.set(client.id, clientSet);
    }
    clientSet.add(channel);

    return true;
  }

  /**
   * Unsubscribe client from a channel
   */
  public unsubscribe(channel: string, client: RealtimeClient): boolean {
    const set = this.channels.get(channel);
    let removed = false;
    if (set) {
      removed = set.delete(client);
      if (set.size === 0) {
        this.channels.delete(channel);
      }
    }

    const clientSet = this.clientChannels.get(client.id);
    if (clientSet) {
      clientSet.delete(channel);
    }

    return removed;
  }

  /**
   * Broadcast message to all clients in a channel
   */
  public broadcastToChannel(channel: string, message: any, options?: BroadcastOptions): number {
    const set = this.channels.get(channel);
    if (!set || set.size === 0) return 0;

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    let deliveredCount = 0;

    for (const client of set) {
      if (options?.excludeClientId && client.id === options.excludeClientId) {
        continue;
      }
      if (options?.targetUserId && client.userId !== options.targetUserId) {
        continue;
      }
      if (options?.roleFilter && !options.roleFilter(client.role)) {
        continue;
      }

      try {
        client.send(payload);
        deliveredCount++;
      } catch (err) {
        console.warn(`[ChannelManager] Failed to send message to client ${client.id}:`, err);
      }
    }

    return deliveredCount;
  }

  /**
   * Broadcast to workspace channel with RBAC & target filters
   */
  public broadcastToWorkspace(workspaceId: string, message: any, options?: BroadcastOptions): number {
    return this.broadcastToChannel(`workspace:${workspaceId}`, message, options);
  }

  /**
   * Send directly to a user's connections
   */
  public sendToUser(userId: string, message: any): number {
    return this.broadcastToChannel(`user:${userId}`, message);
  }

  /**
   * Get all active clients in a workspace
   */
  public getWorkspaceClients(workspaceId: string): RealtimeClient[] {
    const set = this.channels.get(`workspace:${workspaceId}`);
    if (!set) return [];
    return Array.from(set);
  }

  /**
   * Get client by ID
   */
  public getClient(clientId: string): RealtimeClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all active clients across all workspaces
   */
  public getAllClients(): RealtimeClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get total count of active connections
   */
  public getActiveConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Get active connection count for a specific workspace
   */
  public getWorkspaceConnectionCount(workspaceId: string): number {
    const set = this.channels.get(`workspace:${workspaceId}`);
    return set ? set.size : 0;
  }

  /**
   * Clear all connections and subscriptions (for test isolation)
   */
  public clear(): void {
    for (const client of this.clients.values()) {
      try {
        client.close();
      } catch {}
    }
    this.channels.clear();
    this.clientChannels.clear();
    this.clients.clear();
  }
}

export const ChannelManager = new ChannelManagerEngine();
