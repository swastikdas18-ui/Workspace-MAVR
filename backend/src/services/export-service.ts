/**
 * ExportService — One-Click Data Export Engine
 *
 * Generates CSV exports and JSON workspace backup archives
 * for Projects, Tasks, CRM, Documents, Time Entries.
 *
 * RBAC: Admin only
 */

import { inMemoryDb } from '../../packages/database';

export class ExportService {
  private static csvRow(values: any[]): string {
    return values.map((v) => {
      const str = v === null || v === undefined ? '' : String(v);
      // Escape quotes and wrap in quotes if contains comma/newline/quote
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  }

  private static csvHeader(cols: string[]): string {
    return this.csvRow(cols);
  }

  private static buildCsv(headers: string[], rows: any[][]): string {
    const lines = [this.csvHeader(headers), ...rows.map((r) => this.csvRow(r))];
    return lines.join('\n');
  }

  /**
   * Export all projects to CSV
   */
  static exportProjectsCSV(workspaceId: string): string {
    const headers = ['id', 'name', 'status', 'priority', 'progress', 'startDate', 'endDate', 'createdAt'];
    const rows: any[][] = [];

    for (const p of inMemoryDb.projects.values()) {
      if (p.workspaceId !== workspaceId) continue;
      rows.push([p.id, p.name, p.status, p.priority, p.progress, p.startDate, p.endDate, p.createdAt]);
    }

    return this.buildCsv(headers, rows);
  }

  /**
   * Export all tasks to CSV
   */
  static exportTasksCSV(workspaceId: string): string {
    const headers = ['id', 'title', 'status', 'priority', 'assignedTo', 'dueDate', 'projectId', 'estimatedHours', 'createdAt'];
    const rows: any[][] = [];

    for (const t of inMemoryDb.tasks.values()) {
      if (t.workspaceId !== workspaceId) continue;
      const assignee = t.assignedTo ? (inMemoryDb.users.get(t.assignedTo)?.name || t.assignedTo) : '';
      rows.push([t.id, t.title, t.status, t.priority, assignee, t.dueDate, t.projectId, t.estimatedHours, t.createdAt]);
    }

    return this.buildCsv(headers, rows);
  }

  /**
   * Export all CRM leads to CSV
   */
  static exportCRMCSV(workspaceId: string): string {
    const headers = ['id', 'name', 'email', 'phone', 'company', 'status', 'stage', 'dealValue', 'currency', 'source', 'assignedTo', 'createdAt'];
    const rows: any[][] = [];

    for (const r of inMemoryDb.crmRecords.values()) {
      if (r.workspaceId !== workspaceId) continue;
      const assignee = r.assignedTo ? (inMemoryDb.users.get(r.assignedTo)?.name || r.assignedTo) : '';
      rows.push([r.id, r.name, r.email, r.phone, r.company, r.status, r.stage, r.dealValue, r.currency || 'INR', r.source, assignee, r.createdAt]);
    }

    return this.buildCsv(headers, rows);
  }

  /**
   * Export document metadata to CSV
   */
  static exportDocumentsMetaCSV(workspaceId: string): string {
    const headers = ['id', 'name', 'mimeType', 'sizeBytes', 'uploadedBy', 'folder', 'isPublic', 'downloadCount', 'createdAt'];
    const rows: any[][] = [];

    for (const d of inMemoryDb.documents.values()) {
      if (d.workspaceId !== workspaceId) continue;
      const uploader = d.uploadedBy ? (inMemoryDb.users.get(d.uploadedBy)?.name || d.uploadedBy) : '';
      rows.push([d.id, d.name, d.mimeType, d.sizeBytes, uploader, d.folder || '', d.isPublic, d.downloadCount || 0, d.createdAt]);
    }

    return this.buildCsv(headers, rows);
  }

  /**
   * Export time entries to CSV
   */
  static exportTimeEntriesCSV(workspaceId: string): string {
    const headers = ['id', 'taskId', 'taskTitle', 'userId', 'userName', 'description', 'startTime', 'endTime', 'durationMinutes', 'billable', 'hourlyRate', 'currency'];
    const rows: any[][] = [];

    for (const entry of inMemoryDb.taskTimeEntries.values()) {
      if (entry.workspaceId !== workspaceId) continue;
      const user = entry.userId ? (inMemoryDb.users.get(entry.userId)?.name || entry.userId) : '';
      const task = entry.taskId ? inMemoryDb.tasks.get(entry.taskId) : null;
      const durationMin = entry.endTime
        ? Math.round((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 60000)
        : (entry.durationMinutes || 0);
      rows.push([
        entry.id, entry.taskId, task?.title || '',
        entry.userId, user, entry.description || '',
        entry.startTime, entry.endTime || '', durationMin,
        entry.billable ? 'Yes' : 'No', entry.hourlyRate || '', entry.currency || 'INR',
      ]);
    }

    return this.buildCsv(headers, rows);
  }

  /**
   * Export full workspace snapshot as JSON
   */
  static exportWorkspaceBackupJSON(workspaceId: string): object {
    const workspace = inMemoryDb.workspaces.get(workspaceId);
    if (!workspace) throw new Error('WORKSPACE_NOT_FOUND');

    const members = Array.from(inMemoryDb.workspaceMembers.values())
      .filter((m) => m.workspaceId === workspaceId)
      .map((m) => {
        const user = inMemoryDb.users.get(m.userId);
        return { ...m, user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null };
      });

    const projects = Array.from(inMemoryDb.projects.values()).filter((p) => p.workspaceId === workspaceId);
    const tasks = Array.from(inMemoryDb.tasks.values()).filter((t) => t.workspaceId === workspaceId);
    const documents = Array.from(inMemoryDb.documents.values())
      .filter((d) => d.workspaceId === workspaceId)
      .map(({ content, ...rest }) => rest); // strip raw content from backup
    const crmLeads = Array.from(inMemoryDb.crmRecords.values()).filter((r) => r.workspaceId === workspaceId);
    const timeEntries = Array.from(inMemoryDb.taskTimeEntries.values()).filter((e) => e.workspaceId === workspaceId);
    const wikiPages = Array.from(inMemoryDb.wikiPages.values()).filter((p) => p.workspaceId === workspaceId);

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        createdAt: workspace.createdAt,
      },
      summary: {
        members: members.length,
        projects: projects.length,
        tasks: tasks.length,
        documents: documents.length,
        crmLeads: crmLeads.length,
        timeEntries: timeEntries.length,
        wikiPages: wikiPages.length,
      },
      data: {
        members,
        projects,
        tasks,
        documents,
        crmLeads,
        timeEntries,
        wikiPages,
      },
    };
  }
}
