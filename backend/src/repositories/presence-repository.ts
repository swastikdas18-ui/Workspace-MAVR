import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';
import { UserPresence, NewUserPresence, UserRole } from '../../packages/database/types';

export interface PresenceEntry {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole | string;
  avatar?: string | null;
  workspaceId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date | string;
  connectedAt: Date | string;
  metadata?: Record<string, any> | null;
}

export class PresenceRepository {
  /**
   * Upsert a user's presence record
   */
  static async upsertPresence(data: {
    userId: string;
    workspaceId: string;
    status: 'online' | 'away' | 'offline';
    metadata?: Record<string, any> | null;
  }): Promise<PresenceEntry> {
    const now = new Date();
    const db = getDb();

    // Always update inMemoryDb
    const key = `${data.workspaceId}:${data.userId}`;
    const existing = inMemoryDb.userPresence.get(key);

    const presenceRecord: PresenceEntry = {
      id: existing?.id || `presence-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: data.userId,
      workspaceId: data.workspaceId,
      status: data.status,
      lastSeen: now,
      connectedAt: existing?.connectedAt || now,
      metadata: data.metadata || existing?.metadata || null,
    };

    inMemoryDb.userPresence.set(key, presenceRecord);

    if (db) {
      try {
        const [existingRow] = await db
          .select()
          .from(schema.userPresence)
          .where(
            and(
              eq(schema.userPresence.workspaceId, data.workspaceId),
              eq(schema.userPresence.userId, data.userId)
            )
          );

        if (existingRow) {
          const [updated] = await db
            .update(schema.userPresence)
            .set({
              status: data.status,
              lastSeen: now,
              metadata: data.metadata || existingRow.metadata,
            })
            .where(eq(schema.userPresence.id, existingRow.id))
            .returning();

          if (updated) {
            presenceRecord.id = updated.id;
          }
        } else {
          const [inserted] = await db
            .insert(schema.userPresence)
            .values({
              userId: data.userId,
              workspaceId: data.workspaceId,
              status: data.status,
              lastSeen: now,
              connectedAt: now,
              metadata: data.metadata,
            })
            .returning();

          if (inserted) {
            presenceRecord.id = inserted.id;
          }
        }
      } catch (err) {
        console.warn('[PresenceRepository.upsertPresence DB error fallback]:', err);
      }
    }

    return presenceRecord;
  }

  /**
   * Get single user presence in a workspace
   */
  static async getUserPresence(userId: string, workspaceId: string): Promise<PresenceEntry | null> {
    const key = `${workspaceId}:${userId}`;
    const inMem = inMemoryDb.userPresence.get(key);
    if (inMem) return inMem;

    const db = getDb();
    if (db) {
      try {
        const [row] = await db
          .select()
          .from(schema.userPresence)
          .where(
            and(
              eq(schema.userPresence.workspaceId, workspaceId),
              eq(schema.userPresence.userId, userId)
            )
          );

        if (row) {
          return {
            id: row.id,
            userId: row.userId,
            workspaceId: row.workspaceId,
            status: row.status as 'online' | 'away' | 'offline',
            lastSeen: row.lastSeen,
            connectedAt: row.connectedAt,
            metadata: row.metadata as Record<string, any> | null,
          };
        }
      } catch {
        // Fallback
      }
    }

    return null;
  }

  /**
   * List all user presence in a workspace with user info
   */
  static async listWorkspacePresence(workspaceId: string): Promise<PresenceEntry[]> {
    const results: PresenceEntry[] = [];
    const members = Array.from(inMemoryDb.workspaceMembers.values()).filter(
      (m) => m.workspaceId === workspaceId
    );

    for (const member of members) {
      const user = inMemoryDb.users.get(member.userId);
      const key = `${workspaceId}:${member.userId}`;
      const presence = inMemoryDb.userPresence.get(key);

      results.push({
        id: presence?.id || `presence-${member.userId}`,
        userId: member.userId,
        userName: user?.name || 'Workspace User',
        userEmail: user?.email || '',
        userRole: member.role || user?.role || 'employee',
        avatar: user?.avatar || null,
        workspaceId,
        status: presence?.status || 'offline',
        lastSeen: presence?.lastSeen || new Date(),
        connectedAt: presence?.connectedAt || new Date(),
        metadata: presence?.metadata || null,
      });
    }

    // Also include owner if not in members
    const workspace = inMemoryDb.workspaces.get(workspaceId);
    if (workspace && !results.some((r) => r.userId === workspace.ownerId)) {
      const owner = inMemoryDb.users.get(workspace.ownerId);
      const key = `${workspaceId}:${workspace.ownerId}`;
      const presence = inMemoryDb.userPresence.get(key);

      results.unshift({
        id: presence?.id || `presence-${workspace.ownerId}`,
        userId: workspace.ownerId,
        userName: owner?.name || 'Workspace Admin',
        userEmail: owner?.email || '',
        userRole: 'admin',
        avatar: owner?.avatar || null,
        workspaceId,
        status: presence?.status || 'offline',
        lastSeen: presence?.lastSeen || new Date(),
        connectedAt: presence?.connectedAt || new Date(),
        metadata: presence?.metadata || null,
      });
    }

    return results;
  }

  /**
   * Count online users in workspace
   */
  static async getOnlineCount(workspaceId: string): Promise<number> {
    const list = await this.listWorkspacePresence(workspaceId);
    return list.filter((p) => p.status === 'online').length;
  }
}
