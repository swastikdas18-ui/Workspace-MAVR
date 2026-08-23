import { CRMRepository, CrmRecordEntity } from '../repositories/crm-repository';
import { UserRole } from '../types';
import { WorkspaceBoundaryValidator } from '../lib/validation';
import { can, normalizeRole } from '../lib/permissions';
import { EventService } from './event-service';

export interface CreateCrmRecordInput {
  customerName: string;
  company: string;
  email: string;
  phone: string;
  dealValue?: number;
  status?: string;
  ownerId?: string;
  notes?: string;
}

export class CrmService {
  static async getCrmRecords(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'crm:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to Enterprise CRM records.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const options = role === 'employee' ? { ownerId: userId } : undefined;
    const records = await CRMRepository.listRecords(workspaceId, options);

    return records.map((r) => ({
      id: r.id,
      customer_name: r.customerName,
      company: r.company,
      email: r.email,
      phone: r.phone,
      deal_value: r.dealValue || 0,
      status: r.status || 'new_lead',
      owner_id: r.ownerId,
      workspace_id: r.workspaceId,
      notes: r.notes || '',
      created_at: r.createdAt ? new Date(r.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      last_contacted: r.lastContacted ? new Date(r.lastContacted).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
    }));
  }

  static async getCrmRecordById(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    recordId: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'crm:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to Enterprise CRM records.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await CRMRepository.getRecordById(workspaceId, recordId);
    if (!existing) {
      const error: any = new Error('CRM record not found.');
      error.code = 'CRM_RECORD_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: CRM record belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (role === 'employee' && existing.ownerId !== userId) {
      const error: any = new Error('Employees can only access their own assigned CRM records.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    return {
      id: existing.id,
      customer_name: existing.customerName,
      company: existing.company,
      email: existing.email,
      phone: existing.phone,
      deal_value: existing.dealValue || 0,
      status: existing.status || 'new_lead',
      owner_id: existing.ownerId,
      workspace_id: existing.workspaceId,
      notes: existing.notes || '',
      created_at: existing.createdAt ? new Date(existing.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      last_contacted: existing.lastContacted ? new Date(existing.lastContacted).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
    };
  }

  static async createCrmRecord(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    input: CreateCrmRecordInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'crm:create', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] cannot create CRM records.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const assignedOwner = input.ownerId || userId;
    WorkspaceBoundaryValidator.validateWorkspaceMember(workspaceId, assignedOwner);

    const newRecord = await CRMRepository.createRecord({
      customerName: input.customerName.trim(),
      company: input.company.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      dealValue: Number(input.dealValue) || 0,
      status: input.status || 'new_lead',
      ownerId: assignedOwner,
      workspaceId,
      notes: input.notes?.trim() || '',
    });

    return {
      id: newRecord.id,
      customer_name: newRecord.customerName,
      company: newRecord.company,
      email: newRecord.email,
      phone: newRecord.phone,
      deal_value: newRecord.dealValue,
      status: newRecord.status,
      owner_id: newRecord.ownerId,
      workspace_id: newRecord.workspaceId,
      notes: newRecord.notes,
      created_at: newRecord.createdAt.toISOString().substring(0, 10),
      last_contacted: newRecord.lastContacted.toISOString().substring(0, 10),
    };
  }

  static async updateCrmRecord(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    recordId: string,
    updates: Partial<CreateCrmRecordInput>
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    const existing = await CRMRepository.getRecordById(workspaceId, recordId);
    if (!existing) {
      const error: any = new Error('CRM record not found.');
      error.code = 'CRM_RECORD_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: CRM record belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (!can(role, 'crm:update', existing, { userId, workspaceId })) {
      const error: any = new Error('Employees can only modify their own assigned CRM records.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (updates.ownerId) {
      WorkspaceBoundaryValidator.validateWorkspaceMember(workspaceId, updates.ownerId);
    }

    const updated = await CRMRepository.updateRecord(workspaceId, recordId, {
      customerName: updates.customerName !== undefined ? updates.customerName.trim() : undefined,
      company: updates.company !== undefined ? updates.company.trim() : undefined,
      email: updates.email !== undefined ? updates.email.trim() : undefined,
      phone: updates.phone !== undefined ? updates.phone.trim() : undefined,
      dealValue: updates.dealValue !== undefined ? Number(updates.dealValue) : undefined,
      status: updates.status,
      ownerId: updates.ownerId,
      notes: updates.notes,
    });

    if (!updated) {
      const error: any = new Error('CRM record update failed.');
      error.code = 'CRM_RECORD_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Emit event: CRM Status / Stage Changed
    if (updates.status && updates.status !== existing.status) {
      await EventService.emitCrmStageChanged(
        { workspaceId, actorId: userId },
        {
          id: updated.id,
          customerName: updated.customerName,
          company: updated.company,
          previousStatus: existing.status,
          newStatus: updated.status,
          dealValue: updated.dealValue,
          ownerId: updated.ownerId,
        }
      );
    }

    return {
      id: updated.id,
      customer_name: updated.customerName,
      company: updated.company,
      email: updated.email,
      phone: updated.phone,
      deal_value: updated.dealValue,
      status: updated.status,
      owner_id: updated.ownerId,
      workspace_id: updated.workspaceId,
      notes: updated.notes,
      created_at: updated.createdAt ? new Date(updated.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      last_contacted: updated.lastContacted.toISOString().substring(0, 10),
    };
  }

  static async deleteCrmRecord(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    recordId: string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'crm:delete', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from deleting CRM records.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await CRMRepository.getRecordById(workspaceId, recordId);
    if (!existing) {
      const error: any = new Error('CRM record not found.');
      error.code = 'CRM_RECORD_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: CRM record belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    return await CRMRepository.deleteRecord(workspaceId, recordId);
  }
}
