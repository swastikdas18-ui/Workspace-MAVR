import { UserRole } from '../types';
import { can, normalizeRole } from '../lib/permissions';
import { DocumentRepository } from '../repositories/document-repository';
import { EventService } from './event-service';

export interface CreateDocumentInput {
  title: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: string;
  visibility?: 'public' | 'team' | 'private' | 'learning';
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

    if (role === 'intern') {
      // Intern: strictly public or learning documents
      docs = docs.filter((d) => d.visibility === 'public' || d.visibility === 'learning');
    } else if (role === 'employee') {
      // Employee: public, team, learning, or private owned by user
      docs = docs.filter(
        (d) => d.visibility === 'public' || d.visibility === 'team' || d.visibility === 'learning' || d.ownerId === userId
      );
    }

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      file_url: d.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      file_type: d.fileType || 'pdf',
      file_size: d.fileSize || '1.2 MB',
      owner_id: d.ownerId,
      visibility: d.visibility || 'team',
      category: d.category || 'General',
      created_at: d.createdAt ? new Date(d.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      download_count: d.downloadCount || 0,
    }));
  }

  /**
   * Create / upload organization document
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

    const newDoc = await DocumentRepository.createDocument({
      title: input.title.trim(),
      fileUrl: input.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      fileType: input.fileType || 'pdf',
      fileSize: input.fileSize || '1.5 MB',
      ownerId: userId,
      workspaceId,
      visibility: input.visibility || 'team',
      category: input.category || 'General',
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
      file_url: existing.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      file_type: existing.fileType || 'pdf',
      file_size: existing.fileSize || '1.2 MB',
      owner_id: existing.ownerId,
      visibility: existing.visibility || 'team',
      category: existing.category || 'General',
      created_at: existing.createdAt ? new Date(existing.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      download_count: existing.downloadCount || 0,
    };
  }

  /**
   * Delete document
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

    return await DocumentRepository.deleteDocument(workspaceId, documentId);
  }

  /**
   * Increment download count for document and return download payload
   */
  static async incrementDownload(
    workspaceId: string,
    documentId: string,
    userId?: string,
    rawRole?: UserRole | string
  ): Promise<{ downloadCount: number; downloadUrl: string; title: string; fileType: string }> {
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

    const updated = await DocumentRepository.incrementDownload(workspaceId, documentId);

    return {
      downloadCount: updated ? updated.downloadCount : (existing.downloadCount || 0) + 1,
      downloadUrl: existing.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      title: existing.title,
      fileType: existing.fileType || 'pdf',
    };
  }
}
