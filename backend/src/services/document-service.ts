import { UserRole } from '../types';
import { can, normalizeRole } from '../lib/permissions';
import { DocumentRepository } from '../repositories/document-repository';
import { ObjectStorageService, StorageService } from './object-storage-service';
import { AuditRepository } from '../repositories/audit-repository';
import { EventService } from './event-service';

export interface CreateDocumentInput {
  title: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  storageKey?: string;
  storageUrl?: string;
  r2Key?: string;
  r2Url?: string;
  content?: string | Buffer;
  departmentId?: string | null;
  department_id?: string | null;
  visibility?: 'private' | 'department' | 'workspace' | 'admin_only' | 'public' | 'team' | 'learning';
  category?: string;
}

export class DocumentService {
  /**
   * List documents in workspace filtered by role visibility rules
   */
  static async getDocuments(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<any[]> {
    const role = normalizeRole(rawRole);
    let docs = await DocumentRepository.listDocuments(workspaceId);

    // Resolve employee's departmentId if applicable
    let userDepartmentId: string | null = null;
    if (role === 'employee' || role === 'intern') {
      try {
        const { PeopleRepository } = await import('../repositories/people-repository.js');
        const profiles = await PeopleRepository.listProfiles(workspaceId);
        const profile = profiles.find((p) => p.userId === userId);
        userDepartmentId = profile?.departmentId || profile?.department?.id || (profile?.user as any)?.teamId || null;
      } catch {}
    }

    if (role === 'admin') {
      // Admin: sees all documents
      docs = docs;
    } else if (role === 'employee') {
      // Employee: own private docs, department docs for their department, workspace docs (plus legacy public/team/learning)
      docs = docs.filter((d) => {
        if (d.visibility === 'admin_only') return false;
        if (d.visibility === 'private') return d.ownerId === userId;
        if (d.visibility === 'department') return userDepartmentId && d.departmentId === userDepartmentId;
        if (d.visibility === 'workspace' || d.visibility === 'team' || d.visibility === 'public' || d.visibility === 'learning') return true;
        return false;
      });
    } else if (role === 'intern') {
      // Intern: workspace docs, department docs for their department (plus legacy public/learning)
      docs = docs.filter((d) => {
        if (d.visibility === 'admin_only' || d.visibility === 'private') return false;
        if (d.visibility === 'department') return userDepartmentId && d.departmentId === userDepartmentId;
        if (d.visibility === 'workspace' || d.visibility === 'public' || d.visibility === 'learning') return true;
        return false;
      });
    }

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      file_url: d.storageUrl || d.r2Url || d.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      file_type: d.fileType || 'pdf',
      file_size: d.fileSize || '1.2 MB',
      file_size_bytes: d.fileSizeBytes || 1024 * 100,
      mime_type: d.mimeType || 'application/pdf',
      storage_key: d.storageKey || d.r2Key || null,
      storage_url: d.storageUrl || d.r2Url || null,
      r2_key: d.r2Key || d.storageKey || null,
      r2_url: d.r2Url || d.storageUrl || null,
      owner_id: d.ownerId,
      department_id: d.departmentId || null,
      visibility: d.visibility || 'workspace',
      category: d.category || 'General',
      created_at: d.createdAt ? new Date(d.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      download_count: d.downloadCount || 0,
    }));
  }

  /**
   * Create / upload organization document to Backblaze B2 Object Storage
   */
  static async createDocument(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    input: CreateDocumentInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'documents:createOrg', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from uploading organization documents.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (!workspaceId || !workspaceId.trim()) {
      const error: any = new Error('Workspace ID is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    if (!input.title || !input.title.trim()) {
      const error: any = new Error('Document title is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const docId = 'doc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const fileType = input.fileType || 'pdf';
    const mimeType = input.mimeType || (fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream');
    const filename = `${input.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${fileType}`;
    const fileContent = input.content || Buffer.from(`Workspace OS Document Vault: ${input.title}`);

    // Upload to Backblaze B2 / Object Storage with tenant path isolation
    const storageResult = await ObjectStorageService.uploadObject({
      workspaceId,
      documentId: docId,
      filename,
      body: fileContent,
      contentType: mimeType,
    });

    const fileSizeFormatted = `${(storageResult.sizeBytes / 1024).toFixed(1)} KB`;

    const newDoc = await DocumentRepository.createDocument({
      id: docId,
      title: input.title.trim(),
      fileUrl: storageResult.url,
      fileType,
      fileSize: input.fileSize || fileSizeFormatted,
      fileSizeBytes: storageResult.sizeBytes,
      mimeType,
      storageKey: storageResult.key,
      storageUrl: storageResult.url,
      r2Key: storageResult.key,
      r2Url: storageResult.url,
      ownerId: userId,
      workspaceId,
      departmentId: input.departmentId || input.department_id || null,
      visibility: input.visibility || 'workspace',
      category: input.category || 'General',
    });

    // Audit Log Entry
    await AuditRepository.logAudit({
      workspaceId,
      userId,
      action: 'document_uploaded',
      resource: 'document',
      resourceId: newDoc.id,
      newValues: { title: newDoc.title, storageKey: newDoc.storageKey, sizeBytes: newDoc.fileSizeBytes },
    });

    // Emit event: Document Uploaded
    await EventService.emitDocumentUploaded(
      { workspaceId, actorId: userId },
      {
        id: newDoc.id,
        title: newDoc.title,
        fileType: newDoc.fileType,
        visibility: newDoc.visibility,
        category: newDoc.category,
      }
    );

    return {
      id: newDoc.id,
      title: newDoc.title,
      file_url: newDoc.fileUrl,
      file_type: newDoc.fileType,
      file_size: newDoc.fileSize,
      file_size_bytes: newDoc.fileSizeBytes,
      mime_type: newDoc.mimeType,
      storage_key: newDoc.storageKey,
      storage_url: newDoc.storageUrl,
      r2_key: newDoc.r2Key,
      r2_url: newDoc.r2Url,
      owner_id: newDoc.ownerId,
      visibility: newDoc.visibility,
      category: newDoc.category,
      created_at: newDoc.createdAt.toISOString().substring(0, 10),
      download_count: newDoc.downloadCount,
    };
  }

  /**
   * Get single document by ID with workspace isolation & visibility checks
   */
  static async getDocumentById(
    workspaceId: string,
    documentId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    const existing = await DocumentRepository.getDocumentById(workspaceId, documentId);

    if (!existing) {
      const error: any = new Error('Document not found.');
      error.code = 'DOCUMENT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: document belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (role === 'intern' && existing.visibility !== 'public' && existing.visibility !== 'learning') {
      const error: any = new Error('Interns are not authorized to view restricted documents.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (role === 'employee' && existing.visibility === 'private' && existing.ownerId !== userId) {
      const error: any = new Error('Unauthorized to view private document.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    return {
      id: existing.id,
      title: existing.title,
      file_url: existing.storageUrl || existing.r2Url || existing.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      file_type: existing.fileType || 'pdf',
      file_size: existing.fileSize || '1.2 MB',
      file_size_bytes: existing.fileSizeBytes || 1024 * 100,
      mime_type: existing.mimeType || 'application/pdf',
      storage_key: existing.storageKey || existing.r2Key || null,
      storage_url: existing.storageUrl || existing.r2Url || null,
      r2_key: existing.r2Key || existing.storageKey || null,
      r2_url: existing.r2Url || existing.storageUrl || null,
      owner_id: existing.ownerId,
      visibility: existing.visibility || 'team',
      category: existing.category || 'General',
      created_at: existing.createdAt ? new Date(existing.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      download_count: existing.downloadCount || 0,
    };
  }

  /**
   * Delete document and purge object from Backblaze B2
   * Strict Lifecycle:
   * 1. Check workspace isolation & RBAC
   * 2. Retrieve b2FileId / b2FileName / storageKey / objectKey
   * 3. Call Backblaze B2 deletion API and purge object
   * 4. Only after successful B2 deletion, delete database record
   * 5. Emit structured lifecycle logs: DOCUMENT_DELETE_STARTED, B2_DELETE_SUCCESS/FAILED, DOCUMENT_DELETE_COMPLETE
   */
  static async deleteDocument(
    workspaceId: string,
    documentId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    const existing = await DocumentRepository.getDocumentById(workspaceId, documentId);

    if (!existing) {
      const error: any = new Error('Document not found.');
      error.code = 'DOCUMENT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: document belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (!can(role, 'documents:delete', existing, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] cannot delete this document.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const storageKey = existing.storageKey || existing.r2Key;

    console.log('[DOCUMENT_DELETE_STARTED]', {
      workspaceId,
      documentId,
      userId,
      role,
      title: existing.title,
      storageKey,
      fileSizeBytes: existing.fileSizeBytes,
      timestamp: new Date().toISOString(),
    });

    // 1. Purge from Backblaze B2 / Object Storage FIRST
    if (storageKey) {
      try {
        await ObjectStorageService.deleteObject(workspaceId, storageKey);
      } catch (err: any) {
        console.error('[B2_DELETE_FAILED]', {
          workspaceId,
          documentId,
          storageKey,
          error: err?.message || err,
          timestamp: new Date().toISOString(),
        });
        
        // Rollback protection: If storage deletion fails, abort DB deletion to prevent orphaned inconsistency
        const storageErr: any = new Error(`Failed to purge document from storage vault: ${err?.message || 'Storage error'}`);
        storageErr.code = 'STORAGE_PURGE_FAILED';
        storageErr.status = 502;
        throw storageErr;
      }
    }

    // 2. Only after B2 deletion succeeds, remove database record
    const deleted = await DocumentRepository.deleteDocument(workspaceId, documentId);

    console.log('[DOCUMENT_DELETE_COMPLETE]', {
      workspaceId,
      documentId,
      storageKey,
      deletedFromDb: deleted,
      timestamp: new Date().toISOString(),
    });

    // 3. Audit Log Entry
    await AuditRepository.logAudit({
      workspaceId,
      userId,
      action: 'document_deleted',
      resource: 'document',
      resourceId: documentId,
      oldValues: { title: existing.title, storageKey },
    });

    return deleted;
  }

  /**
   * Increment download count for document and return signed Backblaze B2 download URL (15 min expiry)
   */
  static async incrementDownload(
    workspaceId: string,
    documentId: string,
    userId?: string,
    rawRole?: UserRole | string
  ): Promise<{ downloadCount: number; downloadUrl: string; signedUrl: string; title: string; fileType: string }> {
    const existing = await DocumentRepository.getDocumentById(workspaceId, documentId);

    if (!existing) {
      const error: any = new Error('Document not found.');
      error.code = 'DOCUMENT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: document belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (rawRole) {
      const role = normalizeRole(rawRole);
      if (role === 'intern' && existing.visibility !== 'public' && existing.visibility !== 'learning') {
        const error: any = new Error('Interns are not authorized to download restricted documents.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
      if (role === 'employee' && existing.visibility === 'private' && existing.ownerId !== userId) {
        const error: any = new Error('Unauthorized to download private document.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
    }

    const key = existing.storageKey || existing.r2Key;
    let signedUrl = existing.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80';
    if (key) {
      // 15 minutes = 900 seconds
      signedUrl = await ObjectStorageService.getSignedDownloadUrl(workspaceId, key, 900);
    }

    const updated = await DocumentRepository.incrementDownload(workspaceId, documentId);

    // Audit Log Entry
    if (userId) {
      await AuditRepository.logAudit({
        workspaceId,
        userId,
        action: 'document_downloaded',
        resource: 'document',
        resourceId: documentId,
        newValues: { title: existing.title, storageKey: key },
      });
    }

    return {
      downloadCount: updated ? updated.downloadCount : (existing.downloadCount || 0) + 1,
      downloadUrl: signedUrl,
      signedUrl,
      title: existing.title,
      fileType: existing.fileType || 'pdf',
    };
  }
}
