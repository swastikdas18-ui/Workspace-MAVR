import { inMemoryDb } from '../../packages/database';
import { UserRole } from '../types';

export interface CreateDocumentInput {
  title: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: string;
  visibility?: 'public' | 'team' | 'private' | 'learning';
  category?: string;
}

export class DocumentService {
  static async getDocuments(workspaceId: string, userId: string, role: UserRole): Promise<any[]> {
    let docs = Array.from(inMemoryDb.documents.values()).filter(
      (d) => d.workspaceId === workspaceId
    );

    if (role === 'intern') {
      // Intern: only public or learning documents
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
    role: UserRole,
    input: CreateDocumentInput
  ): Promise<any> {
    if (role === 'intern') {
      throw new Error('INTERN_CANNOT_CREATE_DOCUMENT');
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
    role: UserRole
  ): Promise<boolean> {
    const existing = inMemoryDb.documents.get(documentId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (role === 'intern') {
      throw new Error('INTERN_CANNOT_DELETE_DOCUMENT');
    }

    if (role === 'employee' && existing.ownerId !== userId) {
      throw new Error('EMPLOYEE_CANNOT_DELETE_NON_OWNED_DOCUMENT');
    }

    inMemoryDb.documents.delete(documentId);
    return true;
  }

  static async incrementDownload(workspaceId: string, documentId: string): Promise<number> {
    const existing = inMemoryDb.documents.get(documentId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    existing.downloadCount = (existing.downloadCount || 0) + 1;
    inMemoryDb.documents.set(documentId, existing);
    return existing.downloadCount;
  }
}
