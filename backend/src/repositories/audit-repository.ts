import { eq, desc } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';

export interface AuditLogEntity {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface AuditLogItemWithUser extends AuditLogEntity {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateAuditParams {
  id?: string;
  workspaceId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}

export interface GetAuditLogsOptions {
  limit?: number;
  offset?: number;
  resource?: string;
}

export class AuditRepository {
  /**
   * Log an audit event
   */
  static async logAudit(
    data: CreateAuditParams,
    tx?: any
  ): Promise<AuditLogEntity> {
    const id = data.id || 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const now = data.createdAt || new Date();

    const record: AuditLogEntity = {
      id,
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      oldValues: data.oldValues || null,
      newValues: data.newValues || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      createdAt: now,
    };

    inMemoryDb.auditLogs.set(id, record);

    try {
      const runner = tx || getDb();
      if (runner) {
        await runner.insert(schema.auditLogs).values({
          id,
          workspaceId: data.workspaceId,
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          oldValues: data.oldValues || null,
          newValues: data.newValues || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          createdAt: now,
        });
      }
    } catch {
      // In-memory record retained
    }

    return record;
  }

  /**
   * Fetch audit logs for a workspace (Admin access only)
   */
  static async getAuditLogs(
    workspaceId: string,
    options: GetAuditLogsOptions = {}
  ): Promise<AuditLogItemWithUser[]> {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select({
            id: schema.auditLogs.id,
            workspaceId: schema.auditLogs.workspaceId,
            action: schema.auditLogs.action,
            resource: schema.auditLogs.resource,
            resourceId: schema.auditLogs.resourceId,
            oldValues: schema.auditLogs.oldValues,
            newValues: schema.auditLogs.newValues,
            ipAddress: schema.auditLogs.ipAddress,
            userAgent: schema.auditLogs.userAgent,
            createdAt: schema.auditLogs.createdAt,
            userId: schema.auditLogs.userId,
            userName: schema.users.name,
            userEmail: schema.users.email,
          })
          .from(schema.auditLogs)
          .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
          .where(eq(schema.auditLogs.workspaceId, workspaceId))
          .orderBy(desc(schema.auditLogs.createdAt))
          .limit(limit)
          .offset(offset);

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            userId: r.userId,
            action: r.action,
            resource: r.resource,
            resourceId: r.resourceId,
            oldValues: (r.oldValues as Record<string, any>) || null,
            newValues: (r.newValues as Record<string, any>) || null,
            ipAddress: r.ipAddress,
            userAgent: r.userAgent,
            createdAt: r.createdAt,
            user: {
              id: r.userId,
              name: r.userName || 'System/Admin',
              email: r.userEmail || '',
            },
          }));
        }
      }
    } catch {
      // Fallback
    }

    const list = Array.from(inMemoryDb.auditLogs.values())
      .filter((a) => a.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.slice(offset, offset + limit).map((a) => {
      const user = inMemoryDb.users.get(a.userId);
      return {
        ...a,
        user: {
          id: a.userId,
          name: user?.name || 'Admin User',
          email: user?.email || '',
        },
      };
    });
  }
}
