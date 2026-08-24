import { PresenceRepository, PresenceEntry } from '../repositories/presence-repository';
import { EventBus } from './event-bus';
import { UserRole } from '../../packages/database/types';
import { ChannelManager } from './channel-manager';

export interface UserPresenceState {
  userId: string;
  workspaceId: string;
  userName?: string;
  userEmail?: string;
  role?: UserRole | string;
  avatar?: string | null;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  connectedAt: Date;
  socketIds: Set<string>;
  metadata?: Record<string, any> | null;
}

export class PresenceManagerEngine {
  // Map of `${workspaceId}:${userId}` -> UserPresenceState
  private presenceStates = new Map<string, UserPresenceState>();
  private peakConnectionsCount = 0;

  /**
   * Set user online on socket connection
   */
  public async setUserOnline(
    userId: string,
    workspaceId: string,
    socketId: string,
    userInfo?: { name?: string; email?: string; role?: UserRole | string; avatar?: string | null },
    metadata?: Record<string, any>
  ): Promise<UserPresenceState> {
    const key = `${workspaceId}:${userId}`;
    const now = new Date();

    let state = this.presenceStates.get(key);
    if (!state) {
      state = {
        userId,
        workspaceId,
        userName: userInfo?.name,
        userEmail: userInfo?.email,
        role: userInfo?.role || 'employee',
        avatar: userInfo?.avatar,
        status: 'online',
        lastSeen: now,
        connectedAt: now,
        socketIds: new Set([socketId]),
        metadata: metadata || null,
      };
      this.presenceStates.set(key, state);
    } else {
      state.status = 'online';
      state.lastSeen = now;
      state.socketIds.add(socketId);
      if (userInfo?.name) state.userName = userInfo.name;
      if (userInfo?.email) state.userEmail = userInfo.email;
      if (userInfo?.role) state.role = userInfo.role;
      if (userInfo?.avatar !== undefined) state.avatar = userInfo.avatar;
      if (metadata) state.metadata = { ...state.metadata, ...metadata };
    }

    // Update peak connections count
    const totalActiveSockets = ChannelManager.getActiveConnectionCount();
    if (totalActiveSockets > this.peakConnectionsCount) {
      this.peakConnectionsCount = totalActiveSockets;
    }

    // Persist to repository (non-blocking for instant <100ms real-time event dispatch)
    PresenceRepository.upsertPresence({
      userId,
      workspaceId,
      status: 'online',
      metadata: state.metadata,
    }).catch(() => {});

    // Broadcast presence update event to workspace
    EventBus.publishWorkspaceEvent(workspaceId, 'user_online', {
      userId,
      workspaceId,
      status: 'online',
      lastSeen: now.toISOString(),
      connectedAt: state.connectedAt.toISOString(),
      userName: state.userName,
      userRole: state.role,
      avatar: state.avatar,
    });

    EventBus.publishWorkspaceEvent(workspaceId, 'presence_updated', {
      userId,
      workspaceId,
      status: 'online',
      lastSeen: now.toISOString(),
      connectedAt: state.connectedAt.toISOString(),
      userName: state.userName,
      userRole: state.role,
      avatar: state.avatar,
    });

    return state;
  }

  /**
   * Update user status (e.g. 'away' or 'online')
   */
  public async setStatus(
    userId: string,
    workspaceId: string,
    status: 'online' | 'away' | 'offline'
  ): Promise<UserPresenceState | null> {
    const key = `${workspaceId}:${userId}`;
    const state = this.presenceStates.get(key);
    const now = new Date();

    if (state) {
      state.status = status;
      state.lastSeen = now;

      PresenceRepository.upsertPresence({
        userId,
        workspaceId,
        status,
        metadata: state.metadata,
      }).catch(() => {});

      EventBus.publishWorkspaceEvent(workspaceId, 'status_changed', {
        userId,
        workspaceId,
        status,
        lastSeen: now.toISOString(),
        userName: state.userName,
        userRole: state.role,
      });

      EventBus.publishWorkspaceEvent(workspaceId, 'presence_updated', {
        userId,
        workspaceId,
        status,
        lastSeen: now.toISOString(),
        userName: state.userName,
        userRole: state.role,
      });

      return state;
    }

    // If not in memory yet, persist and publish
    PresenceRepository.upsertPresence({
      userId,
      workspaceId,
      status,
    }).catch(() => {});

    EventBus.publishWorkspaceEvent(workspaceId, 'status_changed', {
      userId,
      workspaceId,
      status,
      lastSeen: now.toISOString(),
    });

    EventBus.publishWorkspaceEvent(workspaceId, 'presence_updated', {
      userId,
      workspaceId,
      status,
      lastSeen: now.toISOString(),
    });

    return null;
  }

  /**
   * Handle socket disconnect
   */
  public async handleDisconnect(
    userId: string,
    workspaceId: string,
    socketId: string
  ): Promise<void> {
    const key = `${workspaceId}:${userId}`;
    const state = this.presenceStates.get(key);
    const now = new Date();

    if (state) {
      state.socketIds.delete(socketId);

      // If user has no more open sockets in this workspace, mark offline
      if (state.socketIds.size === 0) {
        state.status = 'offline';
        state.lastSeen = now;

        PresenceRepository.upsertPresence({
          userId,
          workspaceId,
          status: 'offline',
          metadata: state.metadata,
        }).catch(() => {});

        EventBus.publishWorkspaceEvent(workspaceId, 'user_offline', {
          userId,
          workspaceId,
          status: 'offline',
          lastSeen: now.toISOString(),
          userName: state.userName,
          userRole: state.role,
        });

        EventBus.publishWorkspaceEvent(workspaceId, 'presence_updated', {
          userId,
          workspaceId,
          status: 'offline',
          lastSeen: now.toISOString(),
          userName: state.userName,
          userRole: state.role,
        });
      }
    }
  }

  /**
   * Record heartbeat / keepalive
   */
  public async heartbeat(userId: string, workspaceId: string): Promise<void> {
    const key = `${workspaceId}:${userId}`;
    const state = this.presenceStates.get(key);
    const now = new Date();

    if (state) {
      state.lastSeen = now;
      if (state.status === 'away') {
        state.status = 'online';
      }
    }

    await PresenceRepository.upsertPresence({
      userId,
      workspaceId,
      status: state?.status || 'online',
    });
  }

  /**
   * Get workspace presence list filtered by RBAC
   */
  public async getWorkspacePresence(
    workspaceId: string,
    requesterRole: UserRole | string = 'employee'
  ): Promise<PresenceEntry[]> {
    const baseList = await PresenceRepository.listWorkspacePresence(workspaceId);

    // Merge with in-memory live states
    return baseList.map((entry) => {
      const liveState = this.presenceStates.get(`${workspaceId}:${entry.userId}`);
      const effectiveStatus = liveState ? liveState.status : entry.status;
      const effectiveLastSeen = liveState ? liveState.lastSeen : entry.lastSeen;

      if (requesterRole === 'intern') {
        // Intern gets restricted view: basic status and name, no admin metadata
        return {
          id: entry.id,
          userId: entry.userId,
          userName: entry.userName,
          userRole: entry.userRole,
          avatar: entry.avatar,
          workspaceId: entry.workspaceId,
          status: effectiveStatus,
          lastSeen: effectiveLastSeen,
          connectedAt: entry.connectedAt,
        };
      }

      if (requesterRole === 'employee') {
        return {
          id: entry.id,
          userId: entry.userId,
          userName: entry.userName,
          userEmail: entry.userEmail,
          userRole: entry.userRole,
          avatar: entry.avatar,
          workspaceId: entry.workspaceId,
          status: effectiveStatus,
          lastSeen: effectiveLastSeen,
          connectedAt: entry.connectedAt,
        };
      }

      // Admin gets full presence details with metadata and socket count
      return {
        id: entry.id,
        userId: entry.userId,
        userName: entry.userName,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        avatar: entry.avatar,
        workspaceId: entry.workspaceId,
        status: effectiveStatus,
        lastSeen: effectiveLastSeen,
        connectedAt: entry.connectedAt,
        metadata: {
          ...entry.metadata,
          socketCount: liveState?.socketIds.size || 0,
        },
      };
    });
  }

  /**
   * Get count of unique online users in a workspace
   */
  public getOnlineUsersCount(workspaceId?: string): number {
    let count = 0;
    for (const [key, state] of this.presenceStates.entries()) {
      if (workspaceId && !key.startsWith(`${workspaceId}:`)) continue;
      if (state.status === 'online') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get active users count
   */
  public getActiveUsersCount(workspaceId?: string): number {
    let count = 0;
    for (const [key, state] of this.presenceStates.entries()) {
      if (workspaceId && !key.startsWith(`${workspaceId}:`)) continue;
      if (state.status === 'online' || state.status === 'away') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get peak connections metric
   */
  public getPeakConnections(): number {
    return this.peakConnectionsCount;
  }

  /**
   * Get total active sockets across all presence states
   */
  public getTotalSocketCount(): number {
    let total = 0;
    for (const state of this.presenceStates.values()) {
      total += state.socketIds.size;
    }
    return total;
  }

  /**
   * Check if user is online in workspace
   */
  public isUserOnline(userId: string, workspaceId: string): boolean {
    const key = `${workspaceId}:${userId}`;
    const state = this.presenceStates.get(key);
    return !!state && (state.status === 'online' || state.status === 'away') && state.socketIds.size > 0;
  }

  /**
   * Alias for step requirements: userConnected()
   */
  public async userConnected(
    userId: string,
    workspaceId: string,
    socketId: string,
    userInfo?: { name?: string; email?: string; role?: UserRole | string; avatar?: string | null },
    metadata?: Record<string, any>
  ): Promise<UserPresenceState> {
    return this.setUserOnline(userId, workspaceId, socketId, userInfo, metadata);
  }

  /**
   * Alias for step requirements: userDisconnected()
   */
  public async userDisconnected(
    userId: string,
    workspaceId: string,
    socketId: string
  ): Promise<void> {
    return this.handleDisconnect(userId, workspaceId, socketId);
  }

  /**
   * Alias for step requirements: setAway()
   */
  public async setAway(userId: string, workspaceId: string): Promise<UserPresenceState | null> {
    return this.setStatus(userId, workspaceId, 'away');
  }

  /**
   * Cleanup stale connections older than maxAgeMs
   */
  public async cleanupStaleConnections(maxAgeMs = 120000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, state] of this.presenceStates.entries()) {
      const timeSinceLastSeen = now - state.lastSeen.getTime();
      if (timeSinceLastSeen > maxAgeMs) {
        state.status = 'offline';
        state.socketIds.clear();
        cleaned++;

        PresenceRepository.upsertPresence({
          userId: state.userId,
          workspaceId: state.workspaceId,
          status: 'offline',
          metadata: state.metadata,
        }).catch(() => {});

        EventBus.publishWorkspaceEvent(state.workspaceId, 'user_offline', {
          userId: state.userId,
          workspaceId: state.workspaceId,
          status: 'offline',
          lastSeen: new Date().toISOString(),
        });
      }
    }

    return cleaned;
  }

  /**
   * Reset presence state for test isolation
   */
  public reset(): void {
    this.presenceStates.clear();
    this.peakConnectionsCount = 0;
  }

  public clear(): void {
    this.reset();
  }
}

export const PresenceManager = new PresenceManagerEngine();
