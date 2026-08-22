import { inMemoryDb } from '../../packages/database';
import { UserRole } from '../types';
import { WorkspaceBoundaryValidator } from '../lib/validation';
import { can, normalizeRole } from '../lib/permissions';

export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: string;
  startDate?: string;
  dueDate: string;
  budget?: string;
  memberIds?: string[];
  tags?: string[];
}

export class ProjectService {
  static async getProjects(workspaceId: string, userId: string, rawRole: UserRole | string): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'projects:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to organization project roadmaps.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const allProjects = Array.from(inMemoryDb.projects.values()).filter(
      (p) => p.workspaceId === workspaceId
    );

    return allProjects.map((p) => {
      const members = Array.from(inMemoryDb.projectMembers.values())
        .filter((pm) => pm.projectId === p.id)
        .map((pm) => pm.userId);

      return {
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
        member_ids: members.length > 0 ? members : [p.createdBy],
        tags: p.tags || ['Enterprise', 'Core'],
      };
    });
  }

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

    // Validate cross-workspace boundaries for memberIds
    if (input.memberIds && input.memberIds.length > 0) {
      WorkspaceBoundaryValidator.validateWorkspaceMembers(workspaceId, input.memberIds);
    }

    const projectId = 'proj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const newProject = {
      id: projectId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      workspaceId,
      createdBy: userId,
      status: input.status || 'in_progress',
      progress: 0,
      startDate: input.startDate ? new Date(input.startDate) : now,
      dueDate: input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      budget: input.budget || '$0',
      tags: input.tags || ['General'],
      createdAt: now,
    };

    inMemoryDb.projects.set(projectId, newProject);

    if (input.memberIds && input.memberIds.length > 0) {
      for (const memberId of input.memberIds) {
        const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        inMemoryDb.projectMembers.set(pmId, {
          id: pmId,
          projectId,
          userId: memberId,
          role: memberId === userId ? 'owner' : 'contributor',
        });
      }
    } else {
      const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      inMemoryDb.projectMembers.set(pmId, {
        id: pmId,
        projectId,
        userId,
        role: 'owner',
      });
    }

    return {
      id: newProject.id,
      title: newProject.title,
      description: newProject.description,
      workspace_id: newProject.workspaceId,
      created_by: newProject.createdBy,
      status: newProject.status,
      progress: newProject.progress,
      start_date: newProject.startDate.toISOString().substring(0, 10),
      due_date: newProject.dueDate.toISOString().substring(0, 10),
      budget: newProject.budget,
      member_ids: input.memberIds || [userId],
      tags: newProject.tags,
    };
  }

  static async updateProject(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    projectId: string,
    updates: Partial<CreateProjectInput & { progress?: number; status?: string }>
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    const existing = inMemoryDb.projects.get(projectId);
    if (!existing || existing.workspaceId !== workspaceId) {
      const error: any = new Error('Project not found in active workspace.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const currentMembers = Array.from(inMemoryDb.projectMembers.values())
      .filter((pm) => pm.projectId === projectId)
      .map((pm) => pm.userId);

    const resourceWithMembers = {
      ...existing,
      member_ids: currentMembers,
    };

    if (!can(role, 'projects:update', resourceWithMembers, { userId, workspaceId })) {
      const error: any = new Error(`Unauthorized project modification.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (updates.memberIds && updates.memberIds.length > 0) {
      WorkspaceBoundaryValidator.validateWorkspaceMembers(workspaceId, updates.memberIds);
    }

    const updated = {
      ...existing,
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : existing.dueDate,
      startDate: updates.startDate ? new Date(updates.startDate) : existing.startDate,
    };

    inMemoryDb.projects.set(projectId, updated);

    // Update project members if provided
    if (updates.memberIds) {
      // Remove old
      Array.from(inMemoryDb.projectMembers.entries()).forEach(([id, pm]) => {
        if (pm.projectId === projectId) inMemoryDb.projectMembers.delete(id);
      });
      for (const memberId of updates.memberIds) {
        const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        inMemoryDb.projectMembers.set(pmId, {
          id: pmId,
          projectId,
          userId: memberId,
          role: memberId === userId ? 'owner' : 'contributor',
        });
      }
    }

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      workspace_id: updated.workspaceId,
      created_by: updated.createdBy,
      status: updated.status,
      progress: updated.progress,
      start_date: updated.startDate ? new Date(updated.startDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      due_date: updated.dueDate ? new Date(updated.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      budget: updated.budget,
      member_ids: updates.memberIds || currentMembers,
      tags: updated.tags,
    };
  }

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

    const existing = inMemoryDb.projects.get(projectId);
    if (!existing || existing.workspaceId !== workspaceId) {
      const error: any = new Error('Project not found in active workspace.');
      error.code = 'PROJECT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    inMemoryDb.projects.delete(projectId);
    Array.from(inMemoryDb.projectMembers.entries()).forEach(([id, pm]) => {
      if (pm.projectId === projectId) inMemoryDb.projectMembers.delete(id);
    });
    return true;
  }
}
