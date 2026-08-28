import { eq, and, or, ilike, inArray, count, desc, sql } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

export interface SearchFilterOptions {
  // Project filter
  allowedProjectIds?: string[];
  projectCreatedBy?: string;

  // Task filter
  taskAssignedTo?: string;
  isLearningTaskOnly?: boolean;

  // Team filter
  allowedTeamIds?: string[];

  // Document filter
  allowedVisibilities?: string[];
  documentOwnerId?: string;

  // CRM filter
  crmOwnerId?: string;

  // User filter
  userIdOnly?: string;
}

export interface SearchResultItem {
  id: string;
  [key: string]: any;
}

export interface PaginatedResult<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class SearchRepository {
  /**
   * Escape search query string for safe ILIKE matching
   */
  private static sanitizeQuery(query: string): string {
    return query.replace(/[%_\\]/g, '\\$&').trim();
  }

  /**
   * Search projects in workspace
   */
  static async searchProjects(
    workspaceId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filter?: { allowedProjectIds?: string[]; createdBy?: string }
  ): Promise<PaginatedResult> {
    const cleanQuery = this.sanitizeQuery(query);
    const searchPattern = `%${cleanQuery}%`;
    const offset = Math.max(0, (page - 1) * pageSize);

    const db = getDb();
    if (db) {
      try {
        // Base conditions
        const conditions: any[] = [eq(schema.projects.workspaceId, workspaceId)];

        if (cleanQuery.length > 0) {
          conditions.push(
            or(
              ilike(schema.projects.title, searchPattern),
              ilike(schema.projects.description, searchPattern)
            )
          );
        }

        // RBAC filtering
        if (filter?.allowedProjectIds && filter.allowedProjectIds.length > 0) {
          if (filter.createdBy) {
            conditions.push(
              or(
                eq(schema.projects.createdBy, filter.createdBy),
                inArray(schema.projects.id, filter.allowedProjectIds)
              )
            );
          } else {
            conditions.push(inArray(schema.projects.id, filter.allowedProjectIds));
          }
        } else if (filter?.createdBy) {
          conditions.push(eq(schema.projects.createdBy, filter.createdBy));
        }

        const whereClause = and(...conditions);

        // Count total matching
        const [totalRes] = await db
          .select({ value: count() })
          .from(schema.projects)
          .where(whereClause);
        const total = Number(totalRes?.value || 0);

        // Fetch paginated rows
        const rows = await db
          .select()
          .from(schema.projects)
          .where(whereClause)
          .orderBy(desc(schema.projects.createdAt))
          .limit(pageSize)
          .offset(offset);

        if (rows.length > 0) {
          // Fetch members for matching projects
          const projectIds = rows.map((r) => r.id);
          const memberMap = new Map<string, string[]>();

          const memberRows = await db
            .select()
            .from(schema.projectMembers)
            .where(inArray(schema.projectMembers.projectId, projectIds));

          for (const m of memberRows) {
            const list = memberMap.get(m.projectId) || [];
            list.push(m.userId);
            memberMap.set(m.projectId, list);
          }

          const items = rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            workspaceId: row.workspaceId,
            createdBy: row.createdBy,
            status: row.status,
            progress: row.progress,
            startDate: row.startDate,
            dueDate: row.dueDate,
            budget: row.budget,
            createdAt: row.createdAt,
            memberIds: memberMap.get(row.id) || [],
          }));

          return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
      } catch (err) {
        console.error('[SearchRepository.searchProjects DB Error]:', err);
      }
    }

    // In-memory fallback
    const qLower = cleanQuery.toLowerCase();
    let projects = Array.from(inMemoryDb.projects.values()).filter(
      (p) => p.workspaceId === workspaceId
    );

    if (filter?.allowedProjectIds && filter.allowedProjectIds.length > 0) {
      if (filter.createdBy) {
        projects = projects.filter(
          (p) =>
            p.createdBy === filter.createdBy ||
            filter.allowedProjectIds!.includes(p.id)
        );
      } else {
        projects = projects.filter((p) => filter.allowedProjectIds!.includes(p.id));
      }
    } else if (filter?.createdBy) {
      projects = projects.filter((p) => p.createdBy === filter.createdBy);
    }

    if (qLower.length > 0) {
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(qLower) ||
          (p.description && p.description.toLowerCase().includes(qLower))
      );
    }

    const total = projects.length;
    const paginated = projects.slice(offset, offset + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Search tasks in workspace
   */
  static async searchTasks(
    workspaceId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filter?: { assignedTo?: string; allowedProjectIds?: string[]; isLearningTaskOnly?: boolean }
  ): Promise<PaginatedResult> {
    const cleanQuery = this.sanitizeQuery(query);
    const searchPattern = `%${cleanQuery}%`;
    const offset = Math.max(0, (page - 1) * pageSize);

    const db = getDb();
    if (db) {
      try {
        const conditions: any[] = [eq(schema.tasks.workspaceId, workspaceId)];

        if (cleanQuery.length > 0) {
          conditions.push(
            or(
              ilike(schema.tasks.title, searchPattern),
              ilike(schema.tasks.description, searchPattern)
            )
          );
        }

        // Intern Learning Task Filter
        if (filter?.isLearningTaskOnly) {
          conditions.push(eq(schema.tasks.isLearningTask, true));
          if (filter.assignedTo) {
            conditions.push(eq(schema.tasks.assignedTo, filter.assignedTo));
          }
        } else {
          // Employee RBAC Filter: assigned to user OR in one of user's projects
          if (filter?.assignedTo && filter?.allowedProjectIds && filter.allowedProjectIds.length > 0) {
            conditions.push(
              or(
                eq(schema.tasks.assignedTo, filter.assignedTo),
                inArray(schema.tasks.projectId, filter.allowedProjectIds)
              )
            );
          } else if (filter?.assignedTo) {
            conditions.push(eq(schema.tasks.assignedTo, filter.assignedTo));
          } else if (filter?.allowedProjectIds && filter.allowedProjectIds.length > 0) {
            conditions.push(inArray(schema.tasks.projectId, filter.allowedProjectIds));
          }
        }

        const whereClause = and(...conditions);

        const [totalRes] = await db
          .select({ value: count() })
          .from(schema.tasks)
          .where(whereClause);
        const total = Number(totalRes?.value || 0);

        const rows = await db
          .select()
          .from(schema.tasks)
          .where(whereClause)
          .orderBy(desc(schema.tasks.createdAt))
          .limit(pageSize)
          .offset(offset);

        if (rows.length > 0) {
          const items = rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            priority: row.priority,
            assignedTo: row.assignedTo,
            projectId: row.projectId,
            workspaceId: row.workspaceId,
            dueDate: row.dueDate,
            isLearningTask: row.isLearningTask,
            createdAt: row.createdAt,
          }));

          return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
      } catch (err) {
        console.error('[SearchRepository.searchTasks DB Error]:', err);
      }
    }

    // In-memory fallback
    const qLower = cleanQuery.toLowerCase();
    let tasks = Array.from(inMemoryDb.tasks.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    if (filter?.isLearningTaskOnly) {
      tasks = tasks.filter(
        (t) => t.isLearningTask && (!filter.assignedTo || t.assignedTo === filter.assignedTo)
      );
    } else {
      if (filter?.assignedTo && filter?.allowedProjectIds && filter.allowedProjectIds.length > 0) {
        tasks = tasks.filter(
          (t) =>
            t.assignedTo === filter.assignedTo ||
            filter.allowedProjectIds!.includes(t.projectId)
        );
      } else if (filter?.assignedTo) {
        tasks = tasks.filter((t) => t.assignedTo === filter.assignedTo);
      } else if (filter?.allowedProjectIds && filter.allowedProjectIds.length > 0) {
        tasks = tasks.filter((t) => filter.allowedProjectIds!.includes(t.projectId));
      }
    }

    if (qLower.length > 0) {
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(qLower) ||
          (t.description && t.description.toLowerCase().includes(qLower))
      );
    }

    const total = tasks.length;
    const paginated = tasks.slice(offset, offset + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Search teams in workspace
   */
  static async searchTeams(
    workspaceId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filter?: { allowedTeamIds?: string[] }
  ): Promise<PaginatedResult> {
    const cleanQuery = this.sanitizeQuery(query);
    const searchPattern = `%${cleanQuery}%`;
    const offset = Math.max(0, (page - 1) * pageSize);

    const db = getDb();
    if (db) {
      try {
        const conditions: any[] = [eq(schema.teams.workspaceId, workspaceId)];

        if (cleanQuery.length > 0) {
          conditions.push(
            or(
              ilike(schema.teams.name, searchPattern),
              ilike(schema.teams.description, searchPattern)
            )
          );
        }

        if (filter?.allowedTeamIds && filter.allowedTeamIds.length > 0) {
          conditions.push(inArray(schema.teams.id, filter.allowedTeamIds));
        }

        const whereClause = and(...conditions);

        const [totalRes] = await db
          .select({ value: count() })
          .from(schema.teams)
          .where(whereClause);
        const total = Number(totalRes?.value || 0);

        const rows = await db
          .select()
          .from(schema.teams)
          .where(whereClause)
          .orderBy(desc(schema.teams.createdAt))
          .limit(pageSize)
          .offset(offset);

        if (rows.length > 0) {
          // Fetch team members
          const teamIds = rows.map((r) => r.id);
          const memberMap = new Map<string, string[]>();

          const memberRows = await db
            .select()
            .from(schema.teamMembers)
            .where(inArray(schema.teamMembers.teamId, teamIds));

          for (const m of memberRows) {
            const list = memberMap.get(m.teamId) || [];
            list.push(m.userId);
            memberMap.set(m.teamId, list);
          }

          const items = rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            workspaceId: row.workspaceId,
            leadId: row.leadId,
            color: row.color,
            createdAt: row.createdAt,
            memberIds: memberMap.get(row.id) || [],
          }));

          return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
      } catch (err) {
        console.error('[SearchRepository.searchTeams DB Error]:', err);
      }
    }

    // In-memory fallback
    const qLower = cleanQuery.toLowerCase();
    let teams = Array.from(inMemoryDb.teams.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    if (filter?.allowedTeamIds && filter.allowedTeamIds.length > 0) {
      teams = teams.filter((t) => filter.allowedTeamIds!.includes(t.id));
    }

    if (qLower.length > 0) {
      teams = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(qLower) ||
          (t.description && t.description.toLowerCase().includes(qLower))
      );
    }

    const total = teams.length;
    const paginated = teams.slice(offset, offset + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Search documents in workspace
   */
  static async searchDocuments(
    workspaceId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filter?: { allowedVisibilities?: string[]; ownerId?: string }
  ): Promise<PaginatedResult> {
    const cleanQuery = this.sanitizeQuery(query);
    const searchPattern = `%${cleanQuery}%`;
    const offset = Math.max(0, (page - 1) * pageSize);

    const db = getDb();
    if (db) {
      try {
        const conditions: any[] = [eq(schema.documents.workspaceId, workspaceId)];

        if (cleanQuery.length > 0) {
          conditions.push(
            or(
              ilike(schema.documents.title, searchPattern),
              ilike(schema.documents.category, searchPattern)
            )
          );
        }

        if (filter?.allowedVisibilities && filter.allowedVisibilities.length > 0) {
          if (filter.ownerId) {
            conditions.push(
              or(
                inArray(schema.documents.visibility, filter.allowedVisibilities),
                eq(schema.documents.ownerId, filter.ownerId)
              )
            );
          } else {
            conditions.push(inArray(schema.documents.visibility, filter.allowedVisibilities));
          }
        } else if (filter?.ownerId) {
          conditions.push(eq(schema.documents.ownerId, filter.ownerId));
        }

        const whereClause = and(...conditions);

        const [totalRes] = await db
          .select({ value: count() })
          .from(schema.documents)
          .where(whereClause);
        const total = Number(totalRes?.value || 0);

        const rows = await db
          .select()
          .from(schema.documents)
          .where(whereClause)
          .orderBy(desc(schema.documents.createdAt))
          .limit(pageSize)
          .offset(offset);

        if (rows.length > 0) {
          const items = rows.map((row) => ({
            id: row.id,
            title: row.title,
            fileUrl: row.fileUrl,
            fileType: row.fileType,
            fileSize: row.fileSize,
            ownerId: row.ownerId,
            workspaceId: row.workspaceId,
            visibility: row.visibility,
            category: row.category,
            downloadCount: row.downloadCount,
            createdAt: row.createdAt,
          }));

          return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
      } catch (err) {
        console.error('[SearchRepository.searchDocuments DB Error]:', err);
      }
    }

    // In-memory fallback
    const qLower = cleanQuery.toLowerCase();
    let docs = Array.from(inMemoryDb.documents.values()).filter(
      (d) => d.workspaceId === workspaceId
    );

    if (filter?.allowedVisibilities && filter.allowedVisibilities.length > 0) {
      if (filter.ownerId) {
        docs = docs.filter(
          (d) =>
            filter.allowedVisibilities!.includes(d.visibility) ||
            d.ownerId === filter.ownerId
        );
      } else {
        docs = docs.filter((d) => filter.allowedVisibilities!.includes(d.visibility));
      }
    } else if (filter?.ownerId) {
      docs = docs.filter((d) => d.ownerId === filter.ownerId);
    }

    if (qLower.length > 0) {
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(qLower) ||
          d.category.toLowerCase().includes(qLower)
      );
    }

    const total = docs.length;
    const paginated = docs.slice(offset, offset + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Search CRM records in workspace
   */
  static async searchCrmRecords(
    workspaceId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filter?: { ownerId?: string }
  ): Promise<PaginatedResult> {
    const cleanQuery = this.sanitizeQuery(query);
    const searchPattern = `%${cleanQuery}%`;
    const offset = Math.max(0, (page - 1) * pageSize);

    const db = getDb();
    if (db) {
      try {
        const conditions: any[] = [eq(schema.crmRecords.workspaceId, workspaceId)];

        if (cleanQuery.length > 0) {
          conditions.push(
            or(
              ilike(schema.crmRecords.customerName, searchPattern),
              ilike(schema.crmRecords.company, searchPattern),
              ilike(schema.crmRecords.email, searchPattern),
              ilike(schema.crmRecords.notes, searchPattern)
            )
          );
        }

        if (filter?.ownerId) {
          conditions.push(eq(schema.crmRecords.ownerId, filter.ownerId));
        }

        const whereClause = and(...conditions);

        const [totalRes] = await db
          .select({ value: count() })
          .from(schema.crmRecords)
          .where(whereClause);
        const total = Number(totalRes?.value || 0);

        const rows = await db
          .select()
          .from(schema.crmRecords)
          .where(whereClause)
          .orderBy(desc(schema.crmRecords.createdAt))
          .limit(pageSize)
          .offset(offset);

        if (rows.length > 0) {
          const items = rows.map((row) => ({
            id: row.id,
            customerName: row.customerName,
            company: row.company,
            email: row.email,
            phone: row.phone,
            dealValue: row.dealValue,
            status: row.status,
            ownerId: row.ownerId,
            workspaceId: row.workspaceId,
            notes: row.notes,
            createdAt: row.createdAt,
            lastContacted: row.lastContacted,
          }));

          return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
      } catch (err) {
        console.error('[SearchRepository.searchCrmRecords DB Error]:', err);
      }
    }

    // In-memory fallback
    const qLower = cleanQuery.toLowerCase();
    let records = Array.from(inMemoryDb.crmRecords.values()).filter(
      (r) => r.workspaceId === workspaceId
    );

    if (filter?.ownerId) {
      records = records.filter((r) => r.ownerId === filter.ownerId);
    }

    if (qLower.length > 0) {
      records = records.filter(
        (r) =>
          r.customerName.toLowerCase().includes(qLower) ||
          r.company.toLowerCase().includes(qLower) ||
          r.email.toLowerCase().includes(qLower) ||
          (r.notes && r.notes.toLowerCase().includes(qLower))
      );
    }

    const total = records.length;
    const paginated = records.slice(offset, offset + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Search users in workspace
   */
  static async searchUsers(
    workspaceId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filter?: { userIdOnly?: string }
  ): Promise<PaginatedResult> {
    const cleanQuery = this.sanitizeQuery(query);
    const searchPattern = `%${cleanQuery}%`;
    const offset = Math.max(0, (page - 1) * pageSize);

    const db = getDb();
    if (db) {
      try {
        const conditions: any[] = [eq(schema.workspaceMembers.workspaceId, workspaceId)];

        if (cleanQuery.length > 0) {
          conditions.push(
            or(
              ilike(schema.users.name, searchPattern),
              ilike(schema.users.email, searchPattern),
              ilike(schema.users.title, searchPattern)
            )
          );
        }

        if (filter?.userIdOnly) {
          conditions.push(eq(schema.users.id, filter.userIdOnly));
        }

        const whereClause = and(...conditions);

        // Count total matching
        const [totalRes] = await db
          .select({ value: count() })
          .from(schema.workspaceMembers)
          .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
          .where(whereClause);
        const total = Number(totalRes?.value || 0);

        // Select users with membership details
        const rows = await db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            role: schema.workspaceMembers.role,
            title: schema.users.title,
            avatar: schema.users.avatar,
            teamId: schema.users.teamId,
            joinedAt: schema.workspaceMembers.joinedAt,
          })
          .from(schema.workspaceMembers)
          .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
          .where(whereClause)
          .orderBy(schema.users.name)
          .limit(pageSize)
          .offset(offset);

        if (rows.length > 0) {
          const items = rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            role: r.role,
            title: r.title || null,
            avatar: r.avatar || null,
            teamId: r.teamId || null,
            joinedAt: r.joinedAt,
          }));

          return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
      } catch (err) {
        console.error('[SearchRepository.searchUsers DB Error]:', err);
      }
    }

    // In-memory fallback
    const qLower = cleanQuery.toLowerCase();
    const members = Array.from(inMemoryDb.workspaceMembers.values()).filter(
      (m) => m.workspaceId === workspaceId
    );

    let usersList: any[] = [];
    for (const mem of members) {
      const user = inMemoryDb.users.get(mem.userId);
      if (!user) continue;

      if (filter?.userIdOnly && user.id !== filter.userIdOnly) {
        continue;
      }

      if (qLower.length > 0) {
        const matches =
          user.name.toLowerCase().includes(qLower) ||
          user.email.toLowerCase().includes(qLower) ||
          (user.title && user.title.toLowerCase().includes(qLower));
        if (!matches) continue;
      }

      usersList.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: mem.role || user.role,
        title: user.title || null,
        avatar: user.avatar || null,
        teamId: user.teamId || null,
        joinedAt: mem.joinedAt,
      });
    }

    const total = usersList.length;
    const paginated = usersList.slice(offset, offset + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Run unified global search across all domains
   */
  static async globalSearch(
    workspaceId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: SearchFilterOptions
  ): Promise<{
    projects: any[];
    tasks: any[];
    teams: any[];
    documents: any[];
    crm: any[];
    users: any[];
    totalResults: number;
  }> {
    // Parallel execute across domains
    const [
      projectsRes,
      tasksRes,
      teamsRes,
      docsRes,
      crmRes,
      usersRes,
    ] = await Promise.all([
      this.searchProjects(workspaceId, query, page, pageSize, {
        allowedProjectIds: filters?.allowedProjectIds,
        createdBy: filters?.projectCreatedBy,
      }),
      this.searchTasks(workspaceId, query, page, pageSize, {
        assignedTo: filters?.taskAssignedTo,
        allowedProjectIds: filters?.allowedProjectIds,
        isLearningTaskOnly: filters?.isLearningTaskOnly,
      }),
      this.searchTeams(workspaceId, query, page, pageSize, {
        allowedTeamIds: filters?.allowedTeamIds,
      }),
      this.searchDocuments(workspaceId, query, page, pageSize, {
        allowedVisibilities: filters?.allowedVisibilities,
        ownerId: filters?.documentOwnerId,
      }),
      this.searchCrmRecords(workspaceId, query, page, pageSize, {
        ownerId: filters?.crmOwnerId,
      }),
      this.searchUsers(workspaceId, query, page, pageSize, {
        userIdOnly: filters?.userIdOnly,
      }),
    ]);

    const totalResults =
      projectsRes.total +
      tasksRes.total +
      teamsRes.total +
      docsRes.total +
      crmRes.total +
      usersRes.total;

    return {
      projects: projectsRes.items,
      tasks: tasksRes.items,
      teams: teamsRes.items,
      documents: docsRes.items,
      crm: crmRes.items,
      users: usersRes.items,
      totalResults,
    };
  }
}
