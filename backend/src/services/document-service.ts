import { inMemoryDb } from '../../packages/database';
import { UserRole } from '../types';
import { can, normalizeRole } from '../lib/permissions';

export interface CreateDocumentInput {
  title: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: string;
  visibility?: 'public' | 'team' | 'private' | 'learning';
  category?: string;
}

export class DocumentService {
  static async getDocuments(workspaceId: string, userId: string, rawRole: UserRole | string): Promise<any[]> {
    const role = normalizeRole(rawRole);
    let docs = Array.from(inMemoryDb.documents.values()).filter(
      (d) => d.workspaceId === workspaceId
    );

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

    const docId = 'doc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const newDoc = {
      id: docId,
      title: input.title.trim(),
      fileUrl: input.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      fileType: input.fileType || 'pdf',
      fileSize: input.fileSize || '1.5 MB',
      ownerId: userId,
      workspaceId,
      visibility: input.visibility || 'team',
      category: input.category || 'General',
      downloadCount: 0,
      createdAt: now,
    };

    inMemoryDb.documents.set(docId, newDoc);

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

  static async deleteDocument(
    workspaceId: string,
    documentId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    const existing = inMemoryDb.documents.get(documentId);
    if (!existing || existing.workspaceId !== workspaceId) {
      const error: any = new Error('Document not found in active workspace.');
      error.code = 'DOCUMENT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!can(role, 'documents:delete', existing, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] cannot delete this document.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    inMemoryDb.documents.delete(documentId);
    return true;
  }

  static async incrementDownload(
    workspaceId: string,
    documentId: string,
    userId?: string,
    rawRole?: UserRole | string
  ): Promise<{ downloadCount: number; downloadUrl: string; title: string; fileType: string }> {
    const existing = inMemoryDb.documents.get(documentId);
    if (!existing || existing.workspaceId !== workspaceId) {
      const error: any = new Error('Document not found in active workspace.');
      error.code = 'DOCUMENT_NOT_FOUND';
      error.status = 404;
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

    existing.downloadCount = (existing.downloadCount || 0) + 1;
    inMemoryDb.documents.set(documentId, existing);
    return {
      downloadCount: existing.downloadCount,
      downloadUrl: existing.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      title: existing.title,
      fileType: existing.fileType || 'pdf',
    };
  }
}
