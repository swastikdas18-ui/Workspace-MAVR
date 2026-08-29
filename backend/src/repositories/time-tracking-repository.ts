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

export interface EmployeeBillingProfile {
  id: string;
  workspaceId: string;
  userId: string;
  costRate: number;
  billableRate: number;
  utilizationTarget: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TimeTrackingRepository {
  /**
   * Get employee billing profile (with fallback default rates)
   */
  public static async getEmployeeBillingProfile(workspaceId: string, userId: string): Promise<EmployeeBillingProfile> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.employeeBillingProfiles)
          .where(
            and(
              eq(schema.employeeBillingProfiles.workspaceId, workspaceId),
              eq(schema.employeeBillingProfiles.userId, userId)
            )
          )
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            workspaceId: r.workspaceId,
            userId: r.userId,
            costRate: r.costRate,
            billableRate: r.billableRate,
            utilizationTarget: r.utilizationTarget,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
        }
      }
    } catch {}

    const key = `${workspaceId}:${userId}`;
    const mem = inMemoryDb.employeeBillingProfiles.get(key);
    if (mem) return mem;

    // Default fallback profile
    const now = new Date();
    return {
      id: `profile-${userId}`,
      workspaceId,
      userId,
      costRate: 1000,
      billableRate: 2000,
      utilizationTarget: 75,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update or create employee billing profile (Admin only)
   */
  public static async updateEmployeeBillingProfile(data: {
    workspaceId: string;
    userId: string;
    costRate?: number;
    billableRate?: number;
    utilizationTarget?: number;
  }): Promise<EmployeeBillingProfile> {
    const existing = await this.getEmployeeBillingProfile(data.workspaceId, data.userId);
    const now = new Date();
    const updated: EmployeeBillingProfile = {
      id: existing.id || `profile-${data.userId}`,
      workspaceId: data.workspaceId,
      userId: data.userId,
      costRate: data.costRate !== undefined ? Number(data.costRate) : existing.costRate,
      billableRate: data.billableRate !== undefined ? Number(data.billableRate) : existing.billableRate,
      utilizationTarget: data.utilizationTarget !== undefined ? Number(data.utilizationTarget) : existing.utilizationTarget,
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    const key = `${data.workspaceId}:${data.userId}`;
    inMemoryDb.employeeBillingProfiles.set(key, updated);

    try {
      const db = getDb();
      if (db) {
        await db
          .insert(schema.employeeBillingProfiles)
          .values({
            id: updated.id,
            workspaceId: updated.workspaceId,
            userId: updated.userId,
            costRate: updated.costRate,
            billableRate: updated.billableRate,
            utilizationTarget: updated.utilizationTarget,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          })
          .onConflictDoUpdate({
            target: [schema.employeeBillingProfiles.workspaceId, schema.employeeBillingProfiles.userId],
            set: {
              costRate: updated.costRate,
              billableRate: updated.billableRate,
              utilizationTarget: updated.utilizationTarget,
              updatedAt: updated.updatedAt,
            },
          });
      }
    } catch {}

    return updated;
  }

  /**
   * Get all employee billing profiles for workspace
   */
  public static async getWorkspaceBillingProfiles(workspaceId: string): Promise<EmployeeBillingProfile[]> {
    const list: EmployeeBillingProfile[] = [];
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.employeeBillingProfiles)
          .where(eq(schema.employeeBillingProfiles.workspaceId, workspaceId));

        if (rows && rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            userId: r.userId,
            costRate: r.costRate,
            billableRate: r.billableRate,
            utilizationTarget: r.utilizationTarget,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          }));
        }
      }
    } catch {}

    for (const [key, profile] of inMemoryDb.employeeBillingProfiles.entries()) {
      if (profile.workspaceId === workspaceId) {
        list.push(profile);
      }
    }
    return list;
  }

  /**
   * Start live stopwatch timer (automatically fetches configured server-side billable rate)
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

    // Fetch server-side configured billing profile
    const profile = await this.getEmployeeBillingProfile(data.workspaceId, data.userId);

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
      hourlyRate: profile.billableRate, // Enforce server-side rate
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
    const profile = await this.getEmployeeBillingProfile(data.workspaceId, data.userId);

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
      hourlyRate: profile.billableRate, // Enforce server-side configured rate
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
   * Get single time entry by ID
   */
  public static async getEntryById(entryId: string): Promise<TaskTimeEntry | null> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.taskTimeEntries)
          .where(eq(schema.taskTimeEntries.id, entryId))
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
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
          };
        }
      }
    } catch {}

    const memEntry = inMemoryDb.taskTimeEntries.get(entryId);
    return memEntry || null;
  }

  /**
   * Delete time entry by ID
   */
  public static async deleteEntry(entryId: string): Promise<boolean> {
    inMemoryDb.taskTimeEntries.delete(entryId);
    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.taskTimeEntries)
          .where(eq(schema.taskTimeEntries.id, entryId));
      }
    } catch {}
    return true;
  }

  /**
   * Get Executive Timesheet & Enterprise Utilization Analytics
   */
  public static async getUtilizationReport(workspaceId: string) {
    const entries = await this.getEntries(workspaceId);
    const profiles = await this.getWorkspaceBillingProfiles(workspaceId);

    const profileMap = new Map<string, EmployeeBillingProfile>();
    for (const p of profiles) {
      profileMap.set(p.userId, p);
    }

    let totalMinutes = 0;
    let billableMinutes = 0;
    let nonBillableMinutes = 0;
    let totalRevenue = 0;
    let totalPayrollCost = 0;

    // Per-employee aggregations
    const userAggregates = new Map<string, {
      userId: string;
      totalMinutes: number;
      billableMinutes: number;
      revenue: number;
      cost: number;
      entriesCount: number;
    }>();

    for (const e of entries) {
      totalMinutes += e.durationMinutes;

      // Resolve profile rates
      const userProf = profileMap.get(e.userId) || {
        costRate: 1000,
        billableRate: e.hourlyRate || 2000,
        utilizationTarget: 75,
      };

      const entryHours = e.durationMinutes / 60;
      const entryCost = entryHours * userProf.costRate;
      totalPayrollCost += entryCost;

      let entryRevenue = 0;
      if (e.billable) {
        billableMinutes += e.durationMinutes;
        entryRevenue = entryHours * (e.hourlyRate || userProf.billableRate);
        totalRevenue += entryRevenue;
      } else {
        nonBillableMinutes += e.durationMinutes;
      }

      const existingUser = userAggregates.get(e.userId) || {
        userId: e.userId,
        totalMinutes: 0,
        billableMinutes: 0,
        revenue: 0,
        cost: 0,
        entriesCount: 0,
      };

      existingUser.totalMinutes += e.durationMinutes;
      if (e.billable) existingUser.billableMinutes += e.durationMinutes;
      existingUser.revenue += entryRevenue;
      existingUser.cost += entryCost;
      existingUser.entriesCount += 1;
      userAggregates.set(e.userId, existingUser);
    }

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const billableHours = Math.round((billableMinutes / 60) * 10) / 10;
    const nonBillableHours = Math.round((nonBillableMinutes / 60) * 10) / 10;
    const teamUtilizationPercent = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;
    const grossMargin = Math.round(totalRevenue - totalPayrollCost);
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0;

    // Build ranked employee performance list
    const employeeRankings = Array.from(userAggregates.values()).map((u) => {
      const uTotalHours = Math.round((u.totalMinutes / 60) * 10) / 10;
      const uBillableHours = Math.round((u.billableMinutes / 60) * 10) / 10;
      const uUtilization = u.totalMinutes > 0 ? Math.round((u.billableMinutes / u.totalMinutes) * 100) : 0;
      const uMargin = Math.round(u.revenue - u.cost);
      const prof = profileMap.get(u.userId);

      return {
        userId: u.userId,
        totalHours: uTotalHours,
        billableHours: uBillableHours,
        utilizationPercent: uUtilization,
        targetUtilization: prof?.utilizationTarget || 75,
        revenue: Math.round(u.revenue),
        payrollCost: Math.round(u.cost),
        grossMargin: uMargin,
        entriesCount: u.entriesCount,
      };
    }).sort((a, b) => b.revenue - a.revenue || b.utilizationPercent - a.utilizationPercent);

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      revenueGenerated: Math.round(totalRevenue),
      totalRevenue: Math.round(totalRevenue),
      payrollCost: Math.round(totalPayrollCost),
      grossMargin,
      grossMarginPercent,
      teamUtilizationPercent,
      utilizationPercent: teamUtilizationPercent,
      entriesCount: entries.length,
      employeeRankings,
    };
  }
}
