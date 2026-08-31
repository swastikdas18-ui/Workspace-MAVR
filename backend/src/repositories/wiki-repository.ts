import { eq, and, desc } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

export interface WikiPage {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string;
  coverImage: string | null;
  slug: string;
  contentJson: Record<string, any>;
  departmentId?: string | null;
  visibility: 'private' | 'department' | 'workspace' | 'admin_only' | 'public' | 'team' | 'learning';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WikiComment {
  id: string;
  pageId: string;
  userId: string;
  userName?: string;
  blockId?: string;
  comment: string;
  resolved: boolean;
  createdAt: Date;
}

export class WikiRepository {
  /**
   * Get all wiki pages for workspace from PostgreSQL / In-Memory
   */
  public static async getWorkspacePages(workspaceId: string): Promise<WikiPage[]> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.wikiPages)
          .where(eq(schema.wikiPages.workspaceId, workspaceId))
          .orderBy(desc(schema.wikiPages.updatedAt));

        return rows.map((p) => ({
          id: p.id,
          workspaceId: p.workspaceId,
          parentId: p.parentId,
          title: p.title,
          icon: p.icon || '📄',
          coverImage: p.coverImage,
          slug: p.slug,
          contentJson: (p.contentJson as Record<string, any>) || {},
          departmentId: p.departmentId || null,
          visibility: (p.visibility as any) || 'workspace',
          createdBy: p.createdBy,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        }));
      }
    } catch {}

    const list: WikiPage[] = [];
    for (const page of inMemoryDb.wikiPages.values()) {
      if (page.workspaceId === workspaceId) {
        list.push(page);
      }
    }
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get page by ID
   */
  public static async getPageById(pageId: string): Promise<WikiPage | null> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.wikiPages)
          .where(eq(schema.wikiPages.id, pageId))
          .limit(1);

        if (rows.length > 0) {
          const p = rows[0];
          return {
            id: p.id,
            workspaceId: p.workspaceId,
            parentId: p.parentId,
            title: p.title,
            icon: p.icon || '📄',
            coverImage: p.coverImage,
            slug: p.slug,
            contentJson: (p.contentJson as Record<string, any>) || {},
            departmentId: p.departmentId || null,
            visibility: (p.visibility as any) || 'workspace',
            createdBy: p.createdBy,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          };
        }
      }
    } catch {}

    return inMemoryDb.wikiPages.get(pageId) || null;
  }

  /**
   * Create page in PostgreSQL and In-Memory
   */
  public static async createPage(data: {
    workspaceId: string;
    parentId?: string | null;
    title: string;
    icon?: string;
    contentJson?: Record<string, any>;
    departmentId?: string | null;
    visibility?: 'private' | 'department' | 'workspace' | 'admin_only' | 'public' | 'team' | 'learning';
    createdBy: string;
  }): Promise<WikiPage> {
    const id = `wiki-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'page';
    const now = new Date();

    const page: WikiPage = {
      id,
      workspaceId: data.workspaceId,
      parentId: data.parentId || null,
      title: data.title || 'Untitled Page',
      icon: data.icon || '📄',
      coverImage: null,
      slug: `${slug}-${id.slice(-4)}`,
      contentJson: data.contentJson || { blocks: [{ id: 'b1', type: 'paragraph', content: 'Start typing here...' }] },
      departmentId: data.departmentId || null,
      visibility: data.visibility || 'workspace',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.wikiPages.set(id, page);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.wikiPages).values({
          id,
          workspaceId: page.workspaceId,
          parentId: page.parentId,
          title: page.title,
          icon: page.icon,
          coverImage: page.coverImage,
          slug: page.slug,
          contentJson: page.contentJson,
          departmentId: page.departmentId,
          visibility: page.visibility,
          createdBy: page.createdBy,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch {}

    // Record initial revision
    await this.createVersion(id, 1, page.contentJson, data.createdBy);

    return page;
  }

  /**
   * Update page in PostgreSQL and In-Memory
   */
  public static async updatePage(
    pageId: string,
    updates: Partial<Pick<WikiPage, 'title' | 'icon' | 'contentJson' | 'visibility' | 'parentId'>>,
    userId: string
  ): Promise<WikiPage | null> {
    const page = await this.getPageById(pageId);
    if (!page) return null;

    const now = new Date();
    const updated: WikiPage = {
      ...page,
      ...updates,
      updatedAt: now,
    };

    inMemoryDb.wikiPages.set(pageId, updated);

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.wikiPages)
          .set({
            title: updated.title,
            icon: updated.icon,
            contentJson: updated.contentJson,
            visibility: updated.visibility,
            parentId: updated.parentId,
            updatedAt: now,
          })
          .where(eq(schema.wikiPages.id, pageId));
      }
    } catch {}

    // Save revision if content changed
    if (updates.contentJson) {
      const versions = await this.getPageVersions(pageId);
      const nextVer = versions.length + 1;
      await this.createVersion(pageId, nextVer, updates.contentJson, userId);
    }

    return updated;
  }

  /**
   * Delete page and its subpages from PostgreSQL and In-Memory
   */
  public static async deletePage(pageId: string): Promise<boolean> {
    try {
      const db = getDb();
      if (db) {
        // Delete subpages
        await db.delete(schema.wikiPages).where(eq(schema.wikiPages.parentId, pageId));
        // Delete main page
        await db.delete(schema.wikiPages).where(eq(schema.wikiPages.id, pageId));
      }
    } catch {}

    const page = inMemoryDb.wikiPages.get(pageId);
    if (!page) return true;

    // Delete subpages from in-memory
    for (const p of inMemoryDb.wikiPages.values()) {
      if (p.parentId === pageId) {
        inMemoryDb.wikiPages.delete(p.id);
      }
    }

    inMemoryDb.wikiPages.delete(pageId);
    return true;
  }

  /**
   * Create version snapshot
   */
  public static async createVersion(
    pageId: string,
    versionNumber: number,
    contentSnapshot: Record<string, any>,
    createdBy: string
  ) {
    const id = `ver-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const version = {
      id,
      pageId,
      versionNumber,
      contentSnapshot,
      createdBy,
      createdAt: now,
    };
    inMemoryDb.wikiPageVersions.set(id, version);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.wikiPageVersions).values({
          id,
          pageId,
          versionNumber,
          contentSnapshot,
          createdBy,
          createdAt: now,
        });
      }
    } catch {}

    return version;
  }

  /**
   * Get page versions
   */
  public static async getPageVersions(pageId: string) {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.wikiPageVersions)
          .where(eq(schema.wikiPageVersions.pageId, pageId))
          .orderBy(desc(schema.wikiPageVersions.versionNumber));

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            pageId: r.pageId,
            versionNumber: r.versionNumber,
            contentSnapshot: r.contentSnapshot as Record<string, any>,
            createdBy: r.createdBy,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          }));
        }
      }
    } catch {}

    const list: any[] = [];
    for (const ver of inMemoryDb.wikiPageVersions.values()) {
      if (ver.pageId === pageId) {
        list.push(ver);
      }
    }
    return list.sort((a, b) => b.versionNumber - a.versionNumber);
  }

  /**
   * Add comment
   */
  public static async addComment(data: {
    pageId: string;
    userId: string;
    userName?: string;
    blockId?: string;
    comment: string;
  }): Promise<WikiComment> {
    const id = `comm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const comment: WikiComment = {
      id,
      pageId: data.pageId,
      userId: data.userId,
      userName: data.userName || 'Team Member',
      blockId: data.blockId,
      comment: data.comment,
      resolved: false,
      createdAt: now,
    };
    inMemoryDb.wikiComments.set(id, comment);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.wikiComments).values({
          id,
          pageId: data.pageId,
          userId: data.userId,
          blockId: data.blockId,
          comment: data.comment,
          resolved: false,
          createdAt: now,
        });
      }
    } catch {}

    return comment;
  }

  /**
   * Get page comments
   */
  public static async getPageComments(pageId: string): Promise<WikiComment[]> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.wikiComments)
          .where(eq(schema.wikiComments.pageId, pageId));

        if (rows.length > 0) {
          return rows.map((c) => ({
            id: c.id,
            pageId: c.pageId,
            userId: c.userId,
            blockId: c.blockId || undefined,
            comment: c.comment,
            resolved: c.resolved || false,
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          }));
        }
      }
    } catch {}

    const list: WikiComment[] = [];
    for (const c of inMemoryDb.wikiComments.values()) {
      if (c.pageId === pageId) {
        list.push(c);
      }
    }
    return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
