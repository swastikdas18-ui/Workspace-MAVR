import { inMemoryDb } from '../../packages/database';

export interface WikiPage {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string;
  coverImage: string | null;
  slug: string;
  contentJson: Record<string, any>;
  visibility: 'public' | 'team' | 'private' | 'learning';
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
   * Get all wiki pages for workspace
   */
  public static async getWorkspacePages(workspaceId: string): Promise<WikiPage[]> {
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
    return inMemoryDb.wikiPages.get(pageId) || null;
  }

  /**
   * Create page
   */
  public static async createPage(data: {
    workspaceId: string;
    parentId?: string | null;
    title: string;
    icon?: string;
    contentJson?: Record<string, any>;
    visibility?: 'public' | 'team' | 'private' | 'learning';
    createdBy: string;
  }): Promise<WikiPage> {
    const id = `wiki-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'page';
    
    const page: WikiPage = {
      id,
      workspaceId: data.workspaceId,
      parentId: data.parentId || null,
      title: data.title || 'Untitled Page',
      icon: data.icon || '📄',
      coverImage: null,
      slug: `${slug}-${id.slice(-4)}`,
      contentJson: data.contentJson || { blocks: [{ id: 'b1', type: 'paragraph', content: 'Start typing here...' }] },
      visibility: data.visibility || 'team',
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryDb.wikiPages.set(id, page);

    // Record initial revision
    this.createVersion(id, 1, page.contentJson, data.createdBy);

    return page;
  }

  /**
   * Update page
   */
  public static async updatePage(
    pageId: string,
    updates: Partial<Pick<WikiPage, 'title' | 'icon' | 'contentJson' | 'visibility' | 'parentId'>>,
    userId: string
  ): Promise<WikiPage | null> {
    const page = inMemoryDb.wikiPages.get(pageId);
    if (!page) return null;

    const updated: WikiPage = {
      ...page,
      ...updates,
      updatedAt: new Date(),
    };

    inMemoryDb.wikiPages.set(pageId, updated);

    // Save revision if content changed
    if (updates.contentJson) {
      const versions = await this.getPageVersions(pageId);
      const nextVer = versions.length + 1;
      await this.createVersion(pageId, nextVer, updates.contentJson, userId);
    }

    return updated;
  }

  /**
   * Delete page and its subpages
   */
  public static async deletePage(pageId: string): Promise<boolean> {
    const page = inMemoryDb.wikiPages.get(pageId);
    if (!page) return false;

    // Delete subpages
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
    const version = {
      id,
      pageId,
      versionNumber,
      contentSnapshot,
      createdBy,
      createdAt: new Date(),
    };
    inMemoryDb.wikiPageVersions.set(id, version);
    return version;
  }

  /**
   * Get page versions
   */
  public static async getPageVersions(pageId: string) {
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
    const comment: WikiComment = {
      id,
      pageId: data.pageId,
      userId: data.userId,
      userName: data.userName || 'Team Member',
      blockId: data.blockId,
      comment: data.comment,
      resolved: false,
      createdAt: new Date(),
    };
    inMemoryDb.wikiComments.set(id, comment);
    return comment;
  }

  /**
   * Get page comments
   */
  public static async getPageComments(pageId: string): Promise<WikiComment[]> {
    const list: WikiComment[] = [];
    for (const c of inMemoryDb.wikiComments.values()) {
      if (c.pageId === pageId) {
        list.push(c);
      }
    }
    return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
