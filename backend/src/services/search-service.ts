import { SafeUser, UserRole } from '../types';
import { normalizeRole } from '../lib/permissions';
import { SearchRepository, PaginatedResult } from '../repositories/search-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { TeamRepository } from '../repositories/team-repository';
import { EventService } from './event-service';

export interface SearchMeta {
  query: string;
  totalResults: number;
  page: number;
  pageSize: number;
}

export interface GlobalSearchResponse {
  projects: any[];
  tasks: any[];
  teams: any[];
  documents: any[];
  crm: any[];
  users: any[];
  meta: SearchMeta;
}

export interface EntitySearchResponse<T = any> {
  [key: string]: T[] | SearchMeta;
  meta: SearchMeta;
}

export class SearchService {
  /**
   * Normalize and bound pagination values safely
   */
  private static normalizePagination(pageParam?: any, pageSizeParam?: any) {
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    let pageSize = parseInt(pageSizeParam, 10) || 20;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100; // Enforce max pageSize = 100
    return { page, pageSize };
  }

  /**
   * Helper to resolve project IDs accessible by an Employee
   */
  private static async getEmployeeProjectIds(workspaceId: string, userId: string): Promise<string[]> {
    const projects = await ProjectRepository.listProjects(workspaceId, userId, 'employee');
    return projects.map((p) => p.id);
  }

  /**
   * Helper to resolve team IDs accessible by an Employee
   */
  private static async getEmployeeTeamIds(workspaceId: string, userId: string): Promise<string[]> {
    const teams = await TeamRepository.listTeams(workspaceId);
    return teams
      .filter((t) => t.leadId === userId || (t.memberIds && t.memberIds.includes(userId)))
      .map((t) => t.id);
  }

  /**
   * Global search across all entities with strict 3-tier RBAC enforcement
   */
  static async globalSearch(
    user: SafeUser,
    workspaceId: string,
    query: string = '',
    pageInput?: number,
    pageSizeInput?: number
  ): Promise<GlobalSearchResponse> {
    const role = normalizeRole(user.role);
    const { page, pageSize } = this.normalizePagination(pageInput, pageSizeInput);
    const cleanQuery = (query || '').trim();

    let result: {
      projects: any[];
      tasks: any[];
      teams: any[];
      documents: any[];
      crm: any[];
      users: any[];
      totalResults: number;
    };

    if (role === 'intern') {
      // Intern: Learning tasks assigned to them, public/learning documents, own user profile. No projects/teams/crm.
      const [tasksRes, docsRes, usersRes] = await Promise.all([
        SearchRepository.searchTasks(workspaceId, cleanQuery, page, pageSize, {
          isLearningTaskOnly: true,
          assignedTo: user.id,
        }),
        SearchRepository.searchDocuments(workspaceId, cleanQuery, page, pageSize, {
          allowedVisibilities: ['public', 'learning'],
        }),
        SearchRepository.searchUsers(workspaceId, cleanQuery, page, pageSize, {
          userIdOnly: user.id,
        }),
      ]);

      result = {
        projects: [],
        tasks: tasksRes.items,
        teams: [],
        documents: docsRes.items,
        crm: [],
        users: usersRes.items,
        totalResults: tasksRes.total + docsRes.total + usersRes.total,
      };
    } else if (role === 'employee') {
      // Employee:
      // - Projects: createdBy = user.id OR project member
      // - Tasks: assignedTo = user.id OR project member of task's project
      // - Teams: teams they belong to or lead
      // - Documents: visibility in ('public', 'team') OR ownerId = user.id
      // - CRM: ownerId = user.id
      // - Users: workspace directory
      const [allowedProjectIds, allowedTeamIds] = await Promise.all([
        this.getEmployeeProjectIds(workspaceId, user.id),
        this.getEmployeeTeamIds(workspaceId, user.id),
      ]);

      result = await SearchRepository.globalSearch(workspaceId, cleanQuery, page, pageSize, {
        allowedProjectIds,
        projectCreatedBy: user.id,
        taskAssignedTo: user.id,
        allowedTeamIds,
        allowedVisibilities: ['public', 'team'],
        documentOwnerId: user.id,
        crmOwnerId: user.id,
      });
    } else {
      // Admin: Unrestricted search across entire workspace
      result = await SearchRepository.globalSearch(workspaceId, cleanQuery, page, pageSize);
    }

    // Emit search activity for non-empty queries
    if (cleanQuery.length > 0) {
      const activeEntityTypes: string[] = [];
      if (result.projects.length > 0) activeEntityTypes.push('projects');
      if (result.tasks.length > 0) activeEntityTypes.push('tasks');
      if (result.teams.length > 0) activeEntityTypes.push('teams');
      if (result.documents.length > 0) activeEntityTypes.push('documents');
      if (result.crm.length > 0) activeEntityTypes.push('crm');
      if (result.users.length > 0) activeEntityTypes.push('users');

      await EventService.emitSearchPerformed(
        { workspaceId, actorId: user.id },
        {
          query: cleanQuery,
          resultCount: result.totalResults,
          entityTypes: activeEntityTypes.length > 0 ? activeEntityTypes : ['all'],
        }
      );
    }

    return {
      projects: result.projects,
      tasks: result.tasks,
      teams: result.teams,
      documents: result.documents,
      crm: result.crm,
      users: result.users,
      meta: {
        query: cleanQuery,
        totalResults: result.totalResults,
        page,
        pageSize,
      },
    };
  }

  /**
   * Search projects with RBAC scoping
   */
  static async searchProjects(
    user: SafeUser,
    workspaceId: string,
    query: string = '',
    pageInput?: number,
    pageSizeInput?: number
  ): Promise<{ projects: any[]; meta: SearchMeta }> {
    const role = normalizeRole(user.role);
    const { page, pageSize } = this.normalizePagination(pageInput, pageSizeInput);
    const cleanQuery = (query || '').trim();

    // Intern: Forbidden
    if (role === 'intern') {
      return {
        projects: [],
        meta: { query: cleanQuery, totalResults: 0, page, pageSize },
      };
    }

    let filter: { allowedProjectIds?: string[]; createdBy?: string } | undefined;
    if (role === 'employee') {
      const allowedProjectIds = await this.getEmployeeProjectIds(workspaceId, user.id);
      filter = {
        allowedProjectIds,
        createdBy: user.id,
      };
    }

    const res = await SearchRepository.searchProjects(workspaceId, cleanQuery, page, pageSize, filter);

    if (cleanQuery.length > 0) {
      await EventService.emitSearchPerformed(
        { workspaceId, actorId: user.id },
        { query: cleanQuery, resultCount: res.total, entityTypes: ['projects'] }
      );
    }

    return {
      projects: res.items,
      meta: {
        query: cleanQuery,
        totalResults: res.total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Search tasks with RBAC scoping
   */
  static async searchTasks(
    user: SafeUser,
    workspaceId: string,
    query: string = '',
    pageInput?: number,
    pageSizeInput?: number
  ): Promise<{ tasks: any[]; meta: SearchMeta }> {
    const role = normalizeRole(user.role);
    const { page, pageSize } = this.normalizePagination(pageInput, pageSizeInput);
    const cleanQuery = (query || '').trim();

    let filter: { assignedTo?: string; allowedProjectIds?: string[]; isLearningTaskOnly?: boolean } | undefined;

    if (role === 'intern') {
      filter = {
        isLearningTaskOnly: true,
        assignedTo: user.id,
      };
    } else if (role === 'employee') {
      const allowedProjectIds = await this.getEmployeeProjectIds(workspaceId, user.id);
      filter = {
        assignedTo: user.id,
        allowedProjectIds,
      };
    }

    const res = await SearchRepository.searchTasks(workspaceId, cleanQuery, page, pageSize, filter);

    if (cleanQuery.length > 0) {
      await EventService.emitSearchPerformed(
        { workspaceId, actorId: user.id },
        { query: cleanQuery, resultCount: res.total, entityTypes: ['tasks'] }
      );
    }

    return {
      tasks: res.items,
      meta: {
        query: cleanQuery,
        totalResults: res.total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Search teams with RBAC scoping
   */
  static async searchTeams(
    user: SafeUser,
    workspaceId: string,
    query: string = '',
    pageInput?: number,
    pageSizeInput?: number
  ): Promise<{ teams: any[]; meta: SearchMeta }> {
    const role = normalizeRole(user.role);
    const { page, pageSize } = this.normalizePagination(pageInput, pageSizeInput);
    const cleanQuery = (query || '').trim();

    // Intern: Forbidden
    if (role === 'intern') {
      return {
        teams: [],
        meta: { query: cleanQuery, totalResults: 0, page, pageSize },
      };
    }

    let filter: { allowedTeamIds?: string[] } | undefined;
    if (role === 'employee') {
      const allowedTeamIds = await this.getEmployeeTeamIds(workspaceId, user.id);
      filter = { allowedTeamIds };
    }

    const res = await SearchRepository.searchTeams(workspaceId, cleanQuery, page, pageSize, filter);

    if (cleanQuery.length > 0) {
      await EventService.emitSearchPerformed(
        { workspaceId, actorId: user.id },
        { query: cleanQuery, resultCount: res.total, entityTypes: ['teams'] }
      );
    }

    return {
      teams: res.items,
      meta: {
        query: cleanQuery,
        totalResults: res.total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Search documents with RBAC scoping
   */
  static async searchDocuments(
    user: SafeUser,
    workspaceId: string,
    query: string = '',
    pageInput?: number,
    pageSizeInput?: number
  ): Promise<{ documents: any[]; meta: SearchMeta }> {
    const role = normalizeRole(user.role);
    const { page, pageSize } = this.normalizePagination(pageInput, pageSizeInput);
    const cleanQuery = (query || '').trim();

    let filter: { allowedVisibilities?: string[]; ownerId?: string } | undefined;

    if (role === 'intern') {
      filter = {
        allowedVisibilities: ['public', 'learning'],
      };
    } else if (role === 'employee') {
      filter = {
        allowedVisibilities: ['public', 'team'],
        ownerId: user.id,
      };
    }

    const res = await SearchRepository.searchDocuments(workspaceId, cleanQuery, page, pageSize, filter);

    if (cleanQuery.length > 0) {
      await EventService.emitSearchPerformed(
        { workspaceId, actorId: user.id },
        { query: cleanQuery, resultCount: res.total, entityTypes: ['documents'] }
      );
    }

    return {
      documents: res.items,
      meta: {
        query: cleanQuery,
        totalResults: res.total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Search CRM records with RBAC scoping
   */
  static async searchCrm(
    user: SafeUser,
    workspaceId: string,
    query: string = '',
    pageInput?: number,
    pageSizeInput?: number
  ): Promise<{ crm: any[]; meta: SearchMeta }> {
    const role = normalizeRole(user.role);
    const { page, pageSize } = this.normalizePagination(pageInput, pageSizeInput);
    const cleanQuery = (query || '').trim();

    // Intern: Forbidden
    if (role === 'intern') {
      return {
        crm: [],
        meta: { query: cleanQuery, totalResults: 0, page, pageSize },
      };
    }

    let filter: { ownerId?: string } | undefined;
    if (role === 'employee') {
      filter = { ownerId: user.id };
    }

    const res = await SearchRepository.searchCrmRecords(workspaceId, cleanQuery, page, pageSize, filter);

    if (cleanQuery.length > 0) {
      await EventService.emitSearchPerformed(
        { workspaceId, actorId: user.id },
        { query: cleanQuery, resultCount: res.total, entityTypes: ['crm'] }
      );
    }

    return {
      crm: res.items,
      meta: {
        query: cleanQuery,
        totalResults: res.total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Search users with RBAC scoping
   */
  static async searchUsers(
    user: SafeUser,
    workspaceId: string,
    query: string = '',
    pageInput?: number,
    pageSizeInput?: number
  ): Promise<{ users: any[]; meta: SearchMeta }> {
    const role = normalizeRole(user.role);
    const { page, pageSize } = this.normalizePagination(pageInput, pageSizeInput);
    const cleanQuery = (query || '').trim();

    let filter: { userIdOnly?: string } | undefined;
    if (role === 'intern') {
      filter = { userIdOnly: user.id };
    }

    const res = await SearchRepository.searchUsers(workspaceId, cleanQuery, page, pageSize, filter);

    if (cleanQuery.length > 0) {
      await EventService.emitSearchPerformed(
        { workspaceId, actorId: user.id },
        { query: cleanQuery, resultCount: res.total, entityTypes: ['users'] }
      );
    }

    return {
      users: res.items,
      meta: {
        query: cleanQuery,
        totalResults: res.total,
        page,
        pageSize,
      },
    };
  }
}
