import { eq, and, sql } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';

export interface DocumentEntity {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  fileSizeBytes?: number;
  mimeType?: string;
  storageKey?: string | null;
  storageUrl?: string | null;
  r2Key?: string | null;
  r2Url?: string | null;
  ownerId: string;
  workspaceId: string;
  visibility: 'public' | 'team' | 'private' | 'learning';
  category: string;
  downloadCount: number;
  createdAt: Date;
}

export interface CreateDocumentParams {
  id?: string;
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
  ownerId: string;
  workspaceId: string;
  visibility?: 'public' | 'team' | 'private' | 'learning';
  category?: string;
}

export class DocumentRepository {
  /**
   * List all documents in a workspace
   */
  static async listDocuments(workspaceId: string): Promise<DocumentEntity[]> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.documents)
          .where(eq(schema.documents.workspaceId, workspaceId));

        if (rows.length > 0) {
          return rows.map((d) => ({
            id: d.id,
            title: d.title,
            fileUrl: d.fileUrl,
            fileType: d.fileType,
            fileSize: d.fileSize,
            fileSizeBytes: d.fileSizeBytes,
            mimeType: d.mimeType,
            storageKey: d.storageKey || d.r2Key || null,
            storageUrl: d.storageUrl || d.r2Url || null,
            r2Key: d.r2Key || d.storageKey || null,
            r2Url: d.r2Url || d.storageUrl || null,
            ownerId: d.ownerId,
            workspaceId: d.workspaceId || workspaceId,
            visibility: (d.visibility as 'public' | 'team' | 'private' | 'learning') || 'team',
            category: d.category || 'General',
            downloadCount: d.downloadCount || 0,
            createdAt: d.createdAt,
          }));
        }
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const docs = Array.from(inMemoryDb.documents.values()).filter(
      (d) => d.workspaceId === workspaceId
    );

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      fileUrl: d.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      fileType: d.fileType || 'pdf',
      fileSize: d.fileSize || '1.2 MB',
      fileSizeBytes: d.fileSizeBytes || 1024 * 100,
      mimeType: d.mimeType || 'application/pdf',
      storageKey: d.storageKey || d.r2Key || null,
      storageUrl: d.storageUrl || d.r2Url || null,
      r2Key: d.r2Key || d.storageKey || null,
      r2Url: d.r2Url || d.storageUrl || null,
      ownerId: d.ownerId,
      workspaceId: d.workspaceId,
      visibility: (d.visibility as 'public' | 'team' | 'private' | 'learning') || 'team',
      category: d.category || 'General',
      downloadCount: d.downloadCount || 0,
      createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
    }));
  }

  /**
   * Get single document by ID within workspace
   */
  static async getDocumentById(
    workspaceId: string,
    documentId: string
  ): Promise<DocumentEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [doc] = await db
          .select()
          .from(schema.documents)
          .where(
            and(
              eq(schema.documents.id, documentId),
              eq(schema.documents.workspaceId, workspaceId)
            )
          );

        if (doc) {
          return {
            id: doc.id,
            title: doc.title,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            fileSizeBytes: doc.fileSizeBytes,
            mimeType: doc.mimeType,
            storageKey: doc.storageKey || doc.r2Key || null,
            storageUrl: doc.storageUrl || doc.r2Url || null,
            r2Key: doc.r2Key || doc.storageKey || null,
            r2Url: doc.r2Url || doc.storageUrl || null,
            ownerId: doc.ownerId,
            workspaceId: doc.workspaceId || workspaceId,
            visibility: (doc.visibility as 'public' | 'team' | 'private' | 'learning') || 'team',
            category: doc.category || 'General',
            downloadCount: doc.downloadCount || 0,
            createdAt: doc.createdAt,
          };
        }
      }
    } catch {
      // Fallback
    }

    const d = inMemoryDb.documents.get(documentId);
    if (!d || d.workspaceId !== workspaceId) return null;

    return {
      id: d.id,
      title: d.title,
      fileUrl: d.fileUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80',
      fileType: d.fileType || 'pdf',
      fileSize: d.fileSize || '1.2 MB',
      fileSizeBytes: d.fileSizeBytes || 1024 * 100,
      mimeType: d.mimeType || 'application/pdf',
      storageKey: d.storageKey || d.r2Key || null,
      storageUrl: d.storageUrl || d.r2Url || null,
      r2Key: d.r2Key || d.storageKey || null,
      r2Url: d.r2Url || d.storageUrl || null,
      ownerId: d.ownerId,
      workspaceId: d.workspaceId,
      visibility: (d.visibility as 'public' | 'team' | 'private' | 'learning') || 'team',
      category: d.category || 'General',
      downloadCount: d.downloadCount || 0,
      createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
    };
  }

  /**
   * Create document in PostgreSQL + Drizzle with Object Storage metadata
   */
  static async createDocument(data: CreateDocumentParams): Promise<DocumentEntity> {
    const docId = data.id || 'doc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const storageKey = data.storageKey || data.r2Key || null;
    const storageUrl = data.storageUrl || data.r2Url || null;
    const fileUrl = data.fileUrl || storageUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300&auto=format&fit=crop&q=80';
    const fileType = data.fileType || 'pdf';
    const fileSize = data.fileSize || '1.5 MB';
    const fileSizeBytes = data.fileSizeBytes || 1024 * 100;
    const mimeType = data.mimeType || 'application/pdf';
    const visibility = data.visibility || 'team';
    const category = data.category || 'General';

    const newDoc = {
      id: docId,
      title: data.title,
      fileUrl,
      fileType,
      fileSize,
      fileSizeBytes,
      mimeType,
      storageKey,
      storageUrl,
      r2Key: storageKey,
      r2Url: storageUrl,
      ownerId: data.ownerId,
      workspaceId: data.workspaceId,
      visibility,
      category,
      downloadCount: 0,
      createdAt: now,
    };

    inMemoryDb.documents.set(docId, newDoc);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.documents).values({
          id: docId,
          title: data.title,
          fileUrl,
          fileType,
          fileSize,
          fileSizeBytes,
          mimeType,
          storageKey,
          storageUrl,
          r2Key: storageKey,
          r2Url: storageUrl,
          ownerId: data.ownerId,
          workspaceId: data.workspaceId,
          visibility,
          category,
          downloadCount: 0,
          createdAt: now,
        });
      }
    } catch {
      // In-memory handled
    }

    return newDoc;
  }

  /**
   * Delete document from PostgreSQL + Drizzle
   */
  static async deleteDocument(workspaceId: string, documentId: string): Promise<boolean> {
    const existing = inMemoryDb.documents.get(documentId);
    if (existing && existing.workspaceId === workspaceId) {
      inMemoryDb.documents.delete(documentId);
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.documents)
          .where(
            and(
              eq(schema.documents.id, documentId),
              eq(schema.documents.workspaceId, workspaceId)
            )
          );
      }
    } catch {
      // In-memory handled
    }

    return true;
  }

  /**
   * Increment download count for document
   */
  static async incrementDownload(
    workspaceId: string,
    documentId: string
  ): Promise<DocumentEntity | null> {
    const existing = inMemoryDb.documents.get(documentId);
    if (existing && existing.workspaceId === workspaceId) {
      existing.downloadCount = (existing.downloadCount || 0) + 1;
      inMemoryDb.documents.set(documentId, existing);
    }

    try {
      const db = getDb();
      if (db) {
        const [updated] = await db
          .update(schema.documents)
          .set({
            downloadCount: sql`${schema.documents.downloadCount} + 1`,
          })
          .where(
            and(
              eq(schema.documents.id, documentId),
              eq(schema.documents.workspaceId, workspaceId)
            )
          )
          .returning();

        if (updated) {
          return {
            id: updated.id,
            title: updated.title,
            fileUrl: updated.fileUrl,
            fileType: updated.fileType,
            fileSize: updated.fileSize,
            ownerId: updated.ownerId,
            workspaceId: updated.workspaceId || workspaceId,
            visibility: (updated.visibility as 'public' | 'team' | 'private' | 'learning') || 'team',
            category: updated.category || 'General',
            downloadCount: updated.downloadCount,
            createdAt: updated.createdAt,
          };
        }
      }
    } catch {
      // In-memory handled
    }

    if (existing && existing.workspaceId === workspaceId) {
      return {
        id: existing.id,
        title: existing.title,
        fileUrl: existing.fileUrl,
        fileType: existing.fileType,
        fileSize: existing.fileSize,
        ownerId: existing.ownerId,
        workspaceId: existing.workspaceId,
        visibility: existing.visibility,
        category: existing.category,
        downloadCount: existing.downloadCount,
        createdAt: existing.createdAt ? new Date(existing.createdAt) : new Date(),
      };
    }

    return null;
  }
}
