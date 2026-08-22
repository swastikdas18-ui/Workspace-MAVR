import { inMemoryDb, Project, ProjectMember } from '../../packages/database';
import { UserRole } from '../types';

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
  static async getProjects(workspaceId: string, userId: string, role: UserRole): Promise<any[]> {
    if (role === 'intern') {
      return []; // Interns have zero access to project roadmaps
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
    input: CreateProjectInput
  ): Promise<any> {
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
        const pmId = crypto.randomUUID();
        inMemoryDb.projectMembers.set(pmId, {
          id: pmId,
          projectId,
          userId: memberId,
          role: memberId === userId ? 'owner' : 'contributor',
        });
      }
    } else {
      const pmId = crypto.randomUUID();
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
    projectId: string,
    updates: Partial<CreateProjectInput & { progress?: number; status?: string }>
  ): Promise<any> {
    const existing = inMemoryDb.projects.get(projectId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    const updated = {
      ...existing,
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : existing.dueDate,
      startDate: updates.startDate ? new Date(updates.startDate) : existing.startDate,
    };

    inMemoryDb.projects.set(projectId, updated);
    return updated;
  }

  static async deleteProject(workspaceId: string, projectId: string): Promise<boolean> {
    const existing = inMemoryDb.projects.get(projectId);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    inMemoryDb.projects.delete(projectId);
    return true;
  }
}
