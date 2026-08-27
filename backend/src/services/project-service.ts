import { UserRole } from '../types';
import { WorkspaceBoundaryValidator } from '../lib/validation';
import { can, normalizeRole } from '../lib/permissions';
import { ProjectRepository, CreateProjectParams, UpdateProjectParams } from '../repositories/project-repository';
import { EventService } from './event-service';

export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: string;
  startDate?: string;
  dueDate: string;
  budget?: string;
  memberIds?: string[];
  member_ids?: string[];
  teamIds?: string[];
  team_ids?: string[];
  tags?: string[];
}

export class ProjectService {
  /**
   * List projects in workspace with role scoping
   */
  static async getProjects(workspaceId: string, userId: string, rawRole: UserRole | string): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to organization project roadmaps.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const projects = await ProjectRepository.listProjects(workspaceId, userId, role);

    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description || '',
      workspace_id: p.workspaceId,
      created_by: p.createdBy,
      status: p.status,
      progress: p.progress || 0,
      start_date: p.startDate ? new Date(p.startDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      due_date: p.dueDate ? new Date(p.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      budget: p.budget || undefined,
      member_ids: p.memberIds && p.memberIds.length > 0 ? p.memberIds : [p.createdBy],
      team_ids: p.teamIds || [],
      tags: p.tags || ['Enterprise', 'Core'],
    }));
  }

  /**
   * Create a new project with RBAC and validation
   */
  static async createProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    input: CreateProjectInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:create', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from creating projects.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (!input.title || !input.title.trim()) {
      const error: any = new Error('Title is required');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    let parsedDue: Date;
    if (input.dueDate) {
      parsedDue = new Date(input.dueDate);
      if (isNaN(parsedDue.getTime())) {
        const error: any = new Error('Due date must be a valid ISO date');
        error.code = 'VALIDATION_ERROR';
        error.status = 400;
        throw error;
      }
    } else {
      parsedDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const memberIds = input.memberIds || input.member_ids;
    const teamIds = input.teamIds || input.team_ids || [];

    // Validate cross-workspace boundaries for memberIds
    if (memberIds && memberIds.length > 0) {
      WorkspaceBoundaryValidator.validateWorkspaceMembers(workspaceId, memberIds);
    }

    const created = await ProjectRepository.createProject({
      title: input.title.trim(),
      description: input.description?.trim() || '',
      workspaceId,
      createdBy: userId,
      status: input.status || 'in_progress',
      progress: 0,
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      dueDate: parsedDue,
      budget: input.budget || '$0',
      tags: input.tags || ['General'],
      memberIds: memberIds && memberIds.length > 0 ? memberIds : [userId],
      teamIds,
    });

    // Emit event: Project Created
    await EventService.emitProjectCreated(
      { workspaceId, actorId: userId },
      {
        id: created.id,
        title: created.title,
        memberIds: created.memberIds || [userId],
        teamIds: created.teamIds || [],
        budget: created.budget,
      }
    );

    const projectPayload = {
      id: created.id,
      title: created.title,
      description: created.description || '',
      workspace_id: created.workspaceId,
      created_by: created.createdBy,
      status: created.status,
      progress: created.progress,
      start_date: created.startDate ? new Date(created.startDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      due_date: created.dueDate ? new Date(created.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      budget: created.budget,
      member_ids: created.memberIds || [userId],
      team_ids: created.teamIds || [],
      tags: created.tags,
    };

    return {
      project: projectPayload,
      ...projectPayload,
    };
  }

  /**
   * Get a single project by ID with membership and isolation checks
   */
  static async getProjectById(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to organization project roadmaps.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: project belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const members = existing.memberIds || [existing.createdBy];

    return {
      id: existing.id,
      title: existing.title,
      description: existing.description || '',
      workspace_id: existing.workspaceId,
      created_by: existing.createdBy,
      status: existing.status,
      progress: existing.progress || 0,
      start_date: existing.startDate ? new Date(existing.startDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      due_date: existing.dueDate ? new Date(existing.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      budget: existing.budget || undefined,
      member_ids: members.length > 0 ? members : [existing.createdBy],
      team_ids: existing.teamIds || [],
      tags: existing.tags || ['Enterprise', 'Core'],
    };
  }

  /**
   * Update an existing project
   */
  static async updateProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string,
    updates: Partial<CreateProjectInput & { progress?: number; status?: string }>
  ): Promise<any> {
    const role = normalizeRole(rawRole);

    if (!can(role, 'projects:update')) {
      const error: any = new Error('Insufficient permissions');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: project belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const currentMemberIds = existing.memberIds || [existing.createdBy];
    const isOwner = existing.createdBy === userId;
    const isMember = currentMemberIds.includes(userId);

    if (role === 'employee' && !isOwner && !isMember) {
      const error: any = new Error('You can only update your own projects');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (updates.title !== undefined && (!updates.title || !updates.title.trim())) {
      const error: any = new Error('Title cannot be empty');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    let parsedDueDate: Date | undefined;
    if (updates.dueDate !== undefined) {
      parsedDueDate = new Date(updates.dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        const error: any = new Error('Due date must be a valid ISO date');
        error.code = 'VALIDATION_ERROR';
        error.status = 400;
        throw error;
      }
    }

    const memberIds = updates.memberIds || updates.member_ids;
    const teamIds = updates.teamIds || updates.team_ids;

    if (memberIds && memberIds.length > 0) {
      WorkspaceBoundaryValidator.validateWorkspaceMembers(workspaceId, memberIds);
    }

    const updateParams: UpdateProjectParams = {};
    if (updates.title !== undefined) updateParams.title = updates.title.trim();
    if (updates.description !== undefined) updateParams.description = updates.description.trim();
    if (updates.status !== undefined) updateParams.status = updates.status;
    if (updates.progress !== undefined) updateParams.progress = updates.progress;
    if (updates.budget !== undefined) updateParams.budget = updates.budget;
    if (updates.startDate !== undefined) updateParams.startDate = new Date(updates.startDate);
    if (parsedDueDate !== undefined) updateParams.dueDate = parsedDueDate;
    if (memberIds !== undefined) updateParams.memberIds = memberIds;
    if (teamIds !== undefined) updateParams.teamIds = teamIds;

    const updated = await ProjectRepository.updateProject(workspaceId, projectId, updateParams);
    if (!updated) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Emit event: Project Updated
    await EventService.emitProjectUpdated(
      { workspaceId, actorId: userId },
      {
        id: updated.id,
        title: updated.title,
        oldValues: {
          status: existing.status,
          progress: existing.progress,
          budget: existing.budget,
        },
        newValues: {
          status: updated.status,
          progress: updated.progress,
          budget: updated.budget,
        },
      }
    );

    const projectPayload = {
      id: updated.id,
      title: updated.title,
      description: updated.description || '',
      workspace_id: updated.workspaceId,
      created_by: updated.createdBy,
      status: updated.status,
      progress: updated.progress,
      start_date: updated.startDate ? new Date(updated.startDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      due_date: updated.dueDate ? new Date(updated.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      budget: updated.budget,
      member_ids: updated.memberIds || currentMemberIds,
      team_ids: updated.teamIds || [],
      tags: updated.tags,
    };

    return {
      project: projectPayload,
      ...projectPayload,
    };
  }

  /**
   * Delete project with RBAC checks
   */
  static async deleteProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:delete', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from deleting projects.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await ProjectRepository.getProjectById(workspaceId, projectId);
    if (!existing) {
      const error: any = new Error('Project not found.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: project belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    const currentMemberIds = existing.memberIds || [existing.createdBy];
    const isOwner = existing.createdBy === userId;
    const isMember = currentMemberIds.includes(userId);

    if (role === 'employee' && !isOwner && !isMember) {
      const error: any = new Error('You can only delete your own projects');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    return ProjectRepository.deleteProject(workspaceId, projectId);
  }
}

