import { eq, and, desc } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

export interface TaskTimeEntry {
  id: string;
  workspaceId: string;
  taskId: string;
  userId: string;
  startTime: Date;
  endTime?: Date | null;
  durationMinutes: number;
  billable: boolean;
  hourlyRate: number;
  notes?: string;
  createdAt: Date;
}

export class TimeTrackingRepository {
  /**
   * Start live stopwatch timer
   */
  public static async startTimer(data: {
    workspaceId: string;
    taskId: string;
    userId: string;
    billable?: boolean;
    hourlyRate?: number;
    notes?: string;
  }): Promise<TaskTimeEntry> {
    // Stop any currently running timer for this user
    await this.stopActiveTimer(data.workspaceId, data.userId);

    const id = `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const entry: TaskTimeEntry = {
      id,
      workspaceId: data.workspaceId,
      taskId: data.taskId,
      userId: data.userId,
      startTime: now,
      endTime: null,
      durationMinutes: 0,
      billable: data.billable !== undefined ? data.billable : true,
      hourlyRate: data.hourlyRate || 1500,
      notes: data.notes || '',
      createdAt: now,
    };

    inMemoryDb.taskTimeEntries.set(id, entry);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.taskTimeEntries).values({
          id,
          workspaceId: data.workspaceId,
          taskId: data.taskId,
          userId: data.userId,
          startTime: now,
          endTime: null,
          durationMinutes: 0,
          billable: entry.billable,
          hourlyRate: entry.hourlyRate,
          notes: entry.notes,
          createdAt: now,
        });
      }
    } catch {}

    return entry;
  }

  /**
   * Stop active timer
   */
  public static async stopActiveTimer(workspaceId: string, userId: string): Promise<TaskTimeEntry | null> {
    for (const entry of inMemoryDb.taskTimeEntries.values()) {
      if (entry.workspaceId === workspaceId && entry.userId === userId && !entry.endTime) {
        const now = new Date();
        const durationMinutes = Math.max(1, Math.round((now.getTime() - entry.startTime.getTime()) / 60000));
        
        const updated: TaskTimeEntry = {
          ...entry,
          endTime: now,
          durationMinutes,
        };

        inMemoryDb.taskTimeEntries.set(entry.id, updated);

        try {
          const db = getDb();
          if (db) {
            await db
              .update(schema.taskTimeEntries)
              .set({
                endTime: now,
                durationMinutes,
              })
              .where(eq(schema.taskTimeEntries.id, entry.id));
          }
        } catch {}

        return updated;
      }
    }
    return null;
  }

  /**
   * Get active timer for user
   */
  public static async getActiveTimer(workspaceId: string, userId: string): Promise<TaskTimeEntry | null> {
    for (const entry of inMemoryDb.taskTimeEntries.values()) {
      if (entry.workspaceId === workspaceId && entry.userId === userId && !entry.endTime) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Log manual time entry
   */
  public static async logManualEntry(data: {
    workspaceId: string;
    taskId: string;
    userId: string;
    startTime: Date;
    durationMinutes: number;
    billable?: boolean;
    hourlyRate?: number;
    notes?: string;
  }): Promise<TaskTimeEntry> {
    const id = `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const endTime = new Date(data.startTime.getTime() + data.durationMinutes * 60000);
    const now = new Date();

    const entry: TaskTimeEntry = {
      id,
      workspaceId: data.workspaceId,
      taskId: data.taskId,
      userId: data.userId,
      startTime: data.startTime,
      endTime,
      durationMinutes: data.durationMinutes,
      billable: data.billable !== undefined ? data.billable : true,
      hourlyRate: data.hourlyRate || 1500,
      notes: data.notes || '',
      createdAt: now,
    };

    inMemoryDb.taskTimeEntries.set(id, entry);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.taskTimeEntries).values({
          id,
          workspaceId: data.workspaceId,
          taskId: data.taskId,
          userId: data.userId,
          startTime: data.startTime,
          endTime,
          durationMinutes: data.durationMinutes,
          billable: entry.billable,
          hourlyRate: entry.hourlyRate,
          notes: entry.notes,
          createdAt: now,
        });
      }
    } catch {}

    return entry;
  }

  /**
   * Get time entries for workspace
   */
  public static async getEntries(workspaceId: string, filters?: { userId?: string; taskId?: string }): Promise<TaskTimeEntry[]> {
    try {
      const db = getDb();
      if (db) {
        let query = db
          .select()
          .from(schema.taskTimeEntries)
          .where(
            filters?.userId && filters?.taskId
              ? and(
                  eq(schema.taskTimeEntries.workspaceId, workspaceId),
                  eq(schema.taskTimeEntries.userId, filters.userId),
                  eq(schema.taskTimeEntries.taskId, filters.taskId)
                )
              : filters?.userId
              ? and(
                  eq(schema.taskTimeEntries.workspaceId, workspaceId),
                  eq(schema.taskTimeEntries.userId, filters.userId)
                )
              : filters?.taskId
              ? and(
                  eq(schema.taskTimeEntries.workspaceId, workspaceId),
                  eq(schema.taskTimeEntries.taskId, filters.taskId)
                )
              : eq(schema.taskTimeEntries.workspaceId, workspaceId)
          )
          .orderBy(desc(schema.taskTimeEntries.startTime));

        const rows = await query;
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            taskId: r.taskId,
            userId: r.userId,
            startTime: r.startTime,
            endTime: r.endTime,
            durationMinutes: r.durationMinutes,
            billable: r.billable,
            hourlyRate: r.hourlyRate,
            notes: r.notes || '',
            createdAt: r.createdAt,
          }));
        }
      }
    } catch {}

    const list: TaskTimeEntry[] = [];
    for (const entry of inMemoryDb.taskTimeEntries.values()) {
      if (entry.workspaceId === workspaceId) {
        if (filters?.userId && entry.userId !== filters.userId) continue;
        if (filters?.taskId && entry.taskId !== filters.taskId) continue;
        list.push(entry);
      }
    }
    return list.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get Executive Timesheet & Utilization Report
   */
  public static async getUtilizationReport(workspaceId: string) {
    const entries = await this.getEntries(workspaceId);
    let totalMinutes = 0;
    let billableMinutes = 0;
    let nonBillableMinutes = 0;
    let totalRevenue = 0;

    for (const e of entries) {
      totalMinutes += e.durationMinutes;
      if (e.billable) {
        billableMinutes += e.durationMinutes;
        totalRevenue += (e.durationMinutes / 60) * e.hourlyRate;
      } else {
        nonBillableMinutes += e.durationMinutes;
      }
    }

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const billableHours = Math.round((billableMinutes / 60) * 10) / 10;
    const nonBillableHours = Math.round((nonBillableMinutes / 60) * 10) / 10;
    const utilizationPercent = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      totalRevenue: Math.round(totalRevenue),
      utilizationPercent,
      entriesCount: entries.length,
    };
  }
}
