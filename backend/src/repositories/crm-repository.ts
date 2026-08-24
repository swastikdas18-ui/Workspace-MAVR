import { eq, and } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';

export interface CrmRecordEntity {
  id: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  dealValue: number;
  status: string;
  ownerId: string;
  workspaceId: string;
  notes?: string | null;
  createdAt: Date;
  lastContacted: Date;
}

export interface CreateCrmRecordParams {
  id?: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  dealValue?: number;
  status?: string;
  ownerId: string;
  workspaceId: string;
  notes?: string;
}

export interface UpdateCrmRecordParams {
  customerName?: string;
  company?: string;
  email?: string;
  phone?: string;
  dealValue?: number;
  status?: string;
  ownerId?: string;
  notes?: string;
}

export class CRMRepository {
  /**
   * List CRM records in workspace (optionally filtered by ownerId)
   */
  static async listRecords(
    workspaceId: string,
    options?: { ownerId?: string }
  ): Promise<CrmRecordEntity[]> {
    try {
      const db = getDb();
      if (db) {
        let query = db
          .select()
          .from(schema.crmRecords)
          .where(
            options?.ownerId
              ? and(
                  eq(schema.crmRecords.workspaceId, workspaceId),
                  eq(schema.crmRecords.ownerId, options.ownerId)
                )
              : eq(schema.crmRecords.workspaceId, workspaceId)
          );

        const rows = await query;
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            customerName: r.customerName,
            company: r.company,
            email: r.email,
            phone: r.phone,
            dealValue: r.dealValue || 0,
            status: r.status || 'new_lead',
            ownerId: r.ownerId,
            workspaceId: r.workspaceId || workspaceId,
            notes: r.notes,
            createdAt: r.createdAt,
            lastContacted: r.lastContacted,
          }));
        }
      }
    } catch {
      // Fallback
    }

    let records = Array.from(inMemoryDb.crmRecords.values()).filter(
      (r) => r.workspaceId === workspaceId
    );

    if (options?.ownerId) {
      records = records.filter((r) => r.ownerId === options.ownerId);
    }

    return records.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      company: r.company,
      email: r.email,
      phone: r.phone,
      dealValue: r.dealValue || 0,
      status: r.status || 'new_lead',
      ownerId: r.ownerId,
      workspaceId: r.workspaceId,
      notes: r.notes || '',
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      lastContacted: r.lastContacted ? new Date(r.lastContacted) : new Date(),
    }));
  }

  /**
   * Get single CRM record by ID within workspace
   */
  static async getRecordById(
    workspaceId: string,
    recordId: string
  ): Promise<CrmRecordEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select()
          .from(schema.crmRecords)
          .where(
            and(
              eq(schema.crmRecords.id, recordId),
              eq(schema.crmRecords.workspaceId, workspaceId)
            )
          );

        if (row) {
          return {
            id: row.id,
            customerName: row.customerName,
            company: row.company,
            email: row.email,
            phone: row.phone,
            dealValue: row.dealValue || 0,
            status: row.status || 'new_lead',
            ownerId: row.ownerId,
            workspaceId: row.workspaceId || workspaceId,
            notes: row.notes,
            createdAt: row.createdAt,
            lastContacted: row.lastContacted,
          };
        }
      }
    } catch {
      // Fallback
    }

    const r = inMemoryDb.crmRecords.get(recordId);
    if (!r || r.workspaceId !== workspaceId) return null;

    return {
      id: r.id,
      customerName: r.customerName,
      company: r.company,
      email: r.email,
      phone: r.phone,
      dealValue: r.dealValue || 0,
      status: r.status || 'new_lead',
      ownerId: r.ownerId,
      workspaceId: r.workspaceId,
      notes: r.notes || '',
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      lastContacted: r.lastContacted ? new Date(r.lastContacted) : new Date(),
    };
  }

  /**
   * Create CRM Record in PostgreSQL + Drizzle
   */
  static async createRecord(data: CreateCrmRecordParams): Promise<CrmRecordEntity> {
    const recordId = data.id || 'crm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const newRecord = {
      id: recordId,
      customerName: data.customerName.trim(),
      company: data.company.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      dealValue: Number(data.dealValue) || 0,
      status: data.status || 'new_lead',
      ownerId: data.ownerId,
      workspaceId: data.workspaceId,
      notes: data.notes?.trim() || '',
      createdAt: now,
      lastContacted: now,
    };

    inMemoryDb.crmRecords.set(recordId, newRecord);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.crmRecords).values({
          id: recordId,
          customerName: data.customerName.trim(),
          company: data.company.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          dealValue: Number(data.dealValue) || 0,
          status: data.status || 'new_lead',
          ownerId: data.ownerId,
          workspaceId: data.workspaceId,
          notes: data.notes?.trim() || '',
          createdAt: now,
          lastContacted: now,
        });
      }
    } catch {
      // In-memory handled
    }

    return newRecord;
  }

  /**
   * Update CRM record
   */
  static async updateRecord(
    workspaceId: string,
    recordId: string,
    updates: UpdateCrmRecordParams
  ): Promise<CrmRecordEntity | null> {
    const existing = inMemoryDb.crmRecords.get(recordId);
    if (existing && existing.workspaceId === workspaceId) {
      if (updates.customerName !== undefined) existing.customerName = updates.customerName.trim();
      if (updates.company !== undefined) existing.company = updates.company.trim();
      if (updates.email !== undefined) existing.email = updates.email.trim();
      if (updates.phone !== undefined) existing.phone = updates.phone.trim();
      if (updates.dealValue !== undefined) existing.dealValue = Number(updates.dealValue);
      if (updates.status !== undefined) existing.status = updates.status;
      if (updates.ownerId !== undefined) existing.ownerId = updates.ownerId;
      if (updates.notes !== undefined) existing.notes = updates.notes;
      existing.lastContacted = new Date();
      inMemoryDb.crmRecords.set(recordId, existing);
    }

    try {
      const db = getDb();
      if (db) {
        const setValues: any = { lastContacted: new Date() };
        if (updates.customerName !== undefined) setValues.customerName = updates.customerName.trim();
        if (updates.company !== undefined) setValues.company = updates.company.trim();
        if (updates.email !== undefined) setValues.email = updates.email.trim();
        if (updates.phone !== undefined) setValues.phone = updates.phone.trim();
        if (updates.dealValue !== undefined) setValues.dealValue = Number(updates.dealValue);
        if (updates.status !== undefined) setValues.status = updates.status;
        if (updates.ownerId !== undefined) setValues.ownerId = updates.ownerId;
        if (updates.notes !== undefined) setValues.notes = updates.notes;

        const [updated] = await db
          .update(schema.crmRecords)
          .set(setValues)
          .where(
            and(
              eq(schema.crmRecords.id, recordId),
              eq(schema.crmRecords.workspaceId, workspaceId)
            )
          )
          .returning();

        if (updated) {
          return {
            id: updated.id,
            customerName: updated.customerName,
            company: updated.company,
            email: updated.email,
            phone: updated.phone,
            dealValue: updated.dealValue || 0,
            status: updated.status || 'new_lead',
            ownerId: updated.ownerId,
            workspaceId: updated.workspaceId || workspaceId,
            notes: updated.notes,
            createdAt: updated.createdAt,
            lastContacted: updated.lastContacted,
          };
        }
      }
    } catch {
      // In-memory handled
    }

    if (!existing || existing.workspaceId !== workspaceId) return null;

    return {
      id: existing.id,
      customerName: existing.customerName,
      company: existing.company,
      email: existing.email,
      phone: existing.phone,
      dealValue: existing.dealValue,
      status: existing.status,
      ownerId: existing.ownerId,
      workspaceId: existing.workspaceId,
      notes: existing.notes,
      createdAt: existing.createdAt ? new Date(existing.createdAt) : new Date(),
      lastContacted: existing.lastContacted ? new Date(existing.lastContacted) : new Date(),
    };
  }

  /**
   * Delete CRM record
   */
  static async deleteRecord(workspaceId: string, recordId: string): Promise<boolean> {
    const existing = inMemoryDb.crmRecords.get(recordId);
    if (existing && existing.workspaceId === workspaceId) {
      inMemoryDb.crmRecords.delete(recordId);
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.crmRecords)
          .where(
            and(
              eq(schema.crmRecords.id, recordId),
              eq(schema.crmRecords.workspaceId, workspaceId)
            )
          );
      }
    } catch {
      // In-memory handled
    }

    return true;
  }
}
