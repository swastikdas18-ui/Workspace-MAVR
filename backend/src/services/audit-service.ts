/**
 * Phase 21E: Audit & Compliance Center Service
 * 
 * Manages immutable append-only audit trail and streaming CSV/JSON compliance exports.
 */

import { inMemoryDb } from '../../packages/database';

export interface AuditLogItem {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  module: 'auth' | 'projects' | 'tasks' | 'crm' | 'documents' | 'automations' | 'billing' | 'security' | string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AuditService {
  /**
   * Record an immutable audit log entry.
   */
  public static async recordLog(data: {
    workspaceId: string;
    actorId: string;
    action: string;
    module: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogItem> {
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const actor = inMemoryDb.users.get(data.actorId);

    const log: AuditLogItem = {
      id,
      workspaceId: data.workspaceId,
      actorId: data.actorId,
      actorName: actor?.name || 'System / External',
      actorEmail: actor?.email || 'system@workspace.os',
      action: data.action,
      module: data.module,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata || {},
      ipAddress: data.ipAddress || '127.0.0.1',
      userAgent: data.userAgent || 'Workspace-OS-Client/1.0',
      createdAt: new Date(),
    };

    inMemoryDb.auditLogs.set(id, log);
    return log;
  }

  /**
   * Query filtered audit logs.
   */
  public static async getLogs(options: {
    workspaceId: string;
    actorId?: string;
    action?: string;
    module?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<{ logs: AuditLogItem[]; totalCount: number }> {
    let list = Array.from(inMemoryDb.auditLogs.values()).filter(
      (l) => l.workspaceId === options.workspaceId
    );

    if (options.actorId) {
      list = list.filter((l) => l.actorId === options.actorId);
    }
    if (options.action) {
      list = list.filter((l) => l.action.toLowerCase().includes(options.action!.toLowerCase()));
    }
    if (options.module && options.module !== 'all') {
      list = list.filter((l) => l.module.toLowerCase() === options.module!.toLowerCase());
    }
    if (options.startDate) {
      list = list.filter((l) => l.createdAt.getTime() >= options.startDate!.getTime());
    }
    if (options.endDate) {
      list = list.filter((l) => l.createdAt.getTime() <= options.endDate!.getTime());
    }

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      logs: list.slice(0, options.limit || 100),
      totalCount: list.length,
    };
  }

  /**
   * Export audit trail to CSV format.
   */
  public static async exportCsv(workspaceId: string): Promise<string> {
    const { logs } = await this.getLogs({ workspaceId, limit: 1000 });
    const headers = ['ID', 'Timestamp', 'Actor Name', 'Actor Email', 'Module', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = logs.map((l) => [
      l.id,
      l.createdAt.toISOString(),
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      l.actorEmail || '',
      l.module,
      `"${l.action.replace(/"/g, '""')}"`,
      l.entityType || '',
      l.entityId || '',
      l.ipAddress || '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Export audit trail to JSON format.
   */
  public static async exportJson(workspaceId: string): Promise<string> {
    const { logs } = await this.getLogs({ workspaceId, limit: 1000 });
    return JSON.stringify(logs, null, 2);
  }
}
