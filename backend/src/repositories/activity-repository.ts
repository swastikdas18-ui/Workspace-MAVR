import { eq, desc } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';
import { EventBus } from '../realtime/event-bus';

export interface ActivityLogEntity {
  id: string;
  workspaceId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface ActivityFeedItem {
  id: string;
  workspaceId: string;
  type: string; // Action + entityType or action (e.g. task_completed, project_created)
  action: string;
  entityType: string;
  entityId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateActivityParams {
  id?: string;
  workspaceId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export interface GetActivityFeedOptions {
  limit?: number;
  offset?: number;
  entityType?: string;
}

export class ActivityRepository {
  /**
   * Log an activity record in a workspace
   */
  static async logActivity(
    data: CreateActivityParams,
    tx?: any
  ): Promise<ActivityLogEntity> {
    const id = data.id || 'act-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const now = data.createdAt || new Date();

    const record: ActivityLogEntity = {
      id,
      workspaceId: data.workspaceId,
      userId: data.userId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      metadata: data.metadata || null,
      createdAt: now,
    };

    inMemoryDb.activityLogs.set(id, record);

    try {
      const runner = tx || getDb();
      if (runner) {
        await runner.insert(schema.activityLogs).values({
          id,
          workspaceId: data.workspaceId,
          userId: data.userId,
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          metadata: data.metadata || null,
          createdAt: now,
        });
      }
    } catch {
      // In-memory record retained
    }

    // Publish to Realtime EventBus for instant activity feed updates
    try {
      EventBus.publishWorkspaceEvent(
        data.workspaceId,
        'activity_created',
        record,
        { actorId: data.userId, entityType: data.entityType, entityId: data.entityId }
      );
    } catch (busErr) {
      console.warn('[ActivityRepository] EventBus publish error:', busErr);
    }

    return record;
  }

  /**
   * Fetch activity feed for a workspace with user details
   */
  static async getActivityFeed(
    workspaceId: string,
    options: GetActivityFeedOptions = {}
  ): Promise<ActivityFeedItem[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select({
            id: schema.activityLogs.id,
            workspaceId: schema.activityLogs.workspaceId,
            entityType: schema.activityLogs.entityType,
            entityId: schema.activityLogs.entityId,
            action: schema.activityLogs.action,
            metadata: schema.activityLogs.metadata,
            createdAt: schema.activityLogs.createdAt,
            userId: schema.activityLogs.userId,
            userName: schema.users.name,
            userEmail: schema.users.email,
            userAvatar: schema.users.avatar,
          })
          .from(schema.activityLogs)
          .leftJoin(schema.users, eq(schema.activityLogs.userId, schema.users.id))
          .where(eq(schema.activityLogs.workspaceId, workspaceId))
          .orderBy(desc(schema.activityLogs.createdAt))
          .limit(limit)
          .offset(offset);

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            type: `${r.entityType}_${r.action}`,
            action: r.action,
            entityType: r.entityType,
            entityId: r.entityId,
            user: {
              id: r.userId,
              name: r.userName || 'Unknown User',
              email: r.userEmail || '',
              avatar: r.userAvatar || null,
            },
            metadata: (r.metadata as Record<string, any>) || null,
            createdAt: r.createdAt,
          }));
        }
      }
    } catch {
      // Fallback to in-memory
    }

    // Fallback
    const list = Array.from(inMemoryDb.activityLogs.values())
      .filter((a) => a.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.slice(offset, offset + limit).map((a) => {
      const user = inMemoryDb.users.get(a.userId);
      return {
        id: a.id,
        workspaceId: a.workspaceId,
        type: `${a.entityType}_${a.action}`,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        user: {
          id: a.userId,
          name: user?.name || 'Workspace User',
          email: user?.email || '',
          avatar: user?.avatar || null,
        },
        metadata: a.metadata || null,
        createdAt: a.createdAt,
      };
    });
  }
}
