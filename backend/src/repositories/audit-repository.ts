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
  // V2 search + filter options
  search?: string;
  actor?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  module?: string;
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
   * Fetch audit logs for a workspace with full search & filtering (V2)
   */
  static async getAuditLogs(
    workspaceId: string,
    options: GetAuditLogsOptions = {}
  ): Promise<AuditLogItemWithUser[]> {
    return this.searchAuditLogs(workspaceId, options);
  }

  /**
   * Search & filter audit logs:
   * - keyword search (action, resource, resourceId)
   * - actor filter (userId)
   * - module filter (resource type)
   * - date range filter
   */
  static async searchAuditLogs(
    workspaceId: string,
    options: GetAuditLogsOptions = {}
  ): Promise<AuditLogItemWithUser[]> {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    let list = Array.from(inMemoryDb.auditLogs.values())
      .filter((a) => a.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Keyword search across action, resource, resourceId
    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter((a) =>
        a.action.toLowerCase().includes(q) ||
        a.resource.toLowerCase().includes(q) ||
        a.resourceId.toLowerCase().includes(q)
      );
    }

    // Actor filter (userId)
    if (options.actor) {
      list = list.filter((a) => a.userId === options.actor);
    }

    // Module filter (resource type, e.g. 'task', 'crm', 'document')
    if (options.module) {
      list = list.filter((a) => a.resource.toLowerCase() === options.module!.toLowerCase());
    }

    // Date range filter
    if (options.startDate) {
      const start = new Date(options.startDate);
      list = list.filter((a) => new Date(a.createdAt) >= start);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      list = list.filter((a) => new Date(a.createdAt) <= end);
    }

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
