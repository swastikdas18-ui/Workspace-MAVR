import { inMemoryDb } from '../../packages/database/index.js';

export class DataTransferService {
  /**
   * 1. CSV Import Engine
   */
  public static async importCsv(
    workspaceId: string,
    entityType: 'leads' | 'tasks' | 'projects' | 'members',
    csvString: string
  ): Promise<{ importedCount: number; errors: string[] }> {
    const lines = csvString.trim().split('\n');
    if (lines.length <= 1) return { importedCount: 0, errors: ['CSV contains no data rows'] };

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const errors: string[] = [];
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
      if (row.length === 0 || !row[0]) continue;

      try {
        if (entityType === 'leads') {
          const leadId = `crm-imp-${Date.now()}-${i}`;
          inMemoryDb.crmRecords.set(leadId, {
            id: leadId,
            workspaceId,
            customerName: row[0] || 'Imported Lead',
            company: row[1] || 'Company',
            email: row[2] || `lead${i}@import.com`,
            phone: row[3] || '+91 99999 00000',
            dealValue: Number(row[4]) || 50000,
            status: 'new_lead',
            ownerId: 'usr-admin',
            createdAt: new Date(),
          });
          importedCount++;
        } else if (entityType === 'tasks') {
          const taskId = `task-imp-${Date.now()}-${i}`;
          inMemoryDb.tasks.set(taskId, {
            id: taskId,
            workspaceId,
            title: row[0] || 'Imported Task',
            description: row[1] || '',
            status: 'todo',
            priority: 'medium',
            assigned_to: 'usr-admin',
            created_at: new Date().toISOString(),
          });
          importedCount++;
        }
      } catch (err: any) {
        errors.push(`Row ${i}: ${err.message}`);
      }
    }

    return { importedCount, errors };
  }

  /**
   * 2. CSV / JSON Export Engine
   */
  public static async exportData(
    workspaceId: string,
    entityType: 'leads' | 'tasks' | 'projects' | 'documents' | 'time_entries',
    format: 'csv' | 'json' = 'csv'
  ): Promise<{ data: string; contentType: string; filename: string }> {
    let items: any[] = [];

    if (entityType === 'leads') {
      items = Array.from(inMemoryDb.crmRecords.values()).filter((r) => r.workspaceId === workspaceId);
    } else if (entityType === 'tasks') {
      items = Array.from(inMemoryDb.tasks.values()).filter((t) => t.workspaceId === workspaceId);
    } else if (entityType === 'time_entries') {
      items = Array.from(inMemoryDb.taskTimeEntries.values()).filter((e) => e.workspaceId === workspaceId);
    }

    if (format === 'json') {
      return {
        data: JSON.stringify(items, null, 2),
        contentType: 'application/json',
        filename: `${entityType}-${Date.now()}.json`,
      };
    }

    // CSV generator
    if (items.length === 0) {
      return { data: 'id,name\n', contentType: 'text/csv', filename: `${entityType}.csv` };
    }

    const keys = Object.keys(items[0]);
    const headerRow = keys.join(',');
    const rows = items.map((item) =>
      keys.map((k) => `"${String(item[k] !== undefined ? item[k] : '').replace(/"/g, '""')}"`).join(',')
    );

    const csvOutput = [headerRow, ...rows].join('\n');
    return {
      data: csvOutput,
      contentType: 'text/csv',
      filename: `${entityType}-${Date.now()}.csv`,
    };
  }
}
