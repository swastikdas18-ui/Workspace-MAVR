import { eq, and, inArray } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';

export interface ProjectEntity {
  id: string;
  title: string;
  description: string | null;
  workspaceId: string;
  createdBy: string;
  status: string;
  progress: number;
  startDate: Date;
  dueDate: Date;
  budget?: string | null;
  createdAt: Date;
  memberIds: string[];
  teamIds: string[];
  tags?: string[];
}

export interface CreateProjectParams {
  id?: string;
  title: string;
  description?: string;
  workspaceId: string;
  createdBy: string;
  status?: string;
  progress?: number;
  startDate?: Date;
  dueDate: Date;
  budget?: string;
  tags?: string[];
  memberIds?: string[];
  teamIds?: string[];
}

export interface UpdateProjectParams {
  title?: string;
  description?: string;
  status?: string;
  progress?: number;
  startDate?: Date;
  dueDate?: Date;
  budget?: string;
  tags?: string[];
  memberIds?: string[];
  teamIds?: string[];
}

export class ProjectRepository {
  /**
   * List all projects belonging to a workspace, filtered by user scope if employee
   */
  static async listProjects(
    workspaceId: string,
    userId?: string,
    role?: string
  ): Promise<ProjectEntity[]> {
    try {
      const db = getDb();

      if (db) {
        // 1. Fetch workspace projects from PostgreSQL via Drizzle
        const projectRows = await db
          .select()
          .from(schema.projects)
          .where(eq(schema.projects.workspaceId, workspaceId));

        if (projectRows.length > 0) {
          const projectIds = projectRows.map((p) => p.id);

          // Fetch project members
          const memberRows = await db
            .select()
            .from(schema.projectMembers)
            .where(inArray(schema.projectMembers.projectId, projectIds));

          const membersByProject = new Map<string, string[]>();
          memberRows.forEach((m) => {
            const list = membersByProject.get(m.projectId) || [];
            list.push(m.userId);
            membersByProject.set(m.projectId, list);
          });

          // Fetch project teams
          const teamRows = await db
            .select()
            .from(schema.projectTeams)
            .where(inArray(schema.projectTeams.projectId, projectIds));

          const teamsByProject = new Map<string, string[]>();
          teamRows.forEach((t) => {
            const list = teamsByProject.get(t.projectId) || [];
            list.push(t.teamId);
            teamsByProject.set(t.projectId, list);
          });

          let filteredProjects = projectRows;

          if (role === 'employee' && userId) {
            // Find project IDs where user is member
            const userProjectIds = new Set(
              memberRows.filter((m) => m.userId === userId).map((m) => m.projectId)
            );

            // Find teams the user belongs to
            const userTeamMemberships = await db
              .select()
              .from(schema.teamMembers)
              .where(eq(schema.teamMembers.userId, userId));
            const userTeamIds = new Set(userTeamMemberships.map((tm) => tm.teamId));

            // Find projects assigned to the user's teams
            teamRows.forEach((tr) => {
              if (userTeamIds.has(tr.teamId)) {
                userProjectIds.add(tr.projectId);
              }
            });

            // Find projects where user is assigned or created tasks
            const taskRows = await db
              .select()
              .from(schema.tasks)
              .where(
                and(
                  eq(schema.tasks.workspaceId, workspaceId),
                  eq(schema.tasks.assignedTo, userId)
                )
              );
            taskRows.forEach((t) => userProjectIds.add(t.projectId));

            filteredProjects = projectRows.filter((p) => {
              const isOwner = p.createdBy === userId;
              const isMemberOrTeam = userProjectIds.has(p.id);
              return isOwner || isMemberOrTeam;
            });
          }

          return filteredProjects.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            workspaceId: p.workspaceId || workspaceId,
            createdBy: p.createdBy,
            status: p.status,
            progress: p.progress,
            startDate: p.startDate,
            dueDate: p.dueDate,
            budget: p.budget,
            createdAt: p.createdAt,
            memberIds: membersByProject.get(p.id) || [p.createdBy],
            teamIds: teamsByProject.get(p.id) || [],
            tags: ['Enterprise', 'Core'],
          }));
        }
      }
    } catch {
      // Fallback to in-memory store
    }

    // In-Memory fallback for test isolation / offline mode
    let allProjects = Array.from(inMemoryDb.projects.values()).filter(
      (p) => p.workspaceId === workspaceId
    );

    if (role === 'employee' && userId) {
      const userProjectIds = new Set(
        Array.from(inMemoryDb.projectMembers.values())
          .filter((pm) => pm.userId === userId)
          .map((pm) => pm.projectId)
      );

      const userTeamIds = new Set(
        Array.from(inMemoryDb.teamMembers.values())
          .filter((tm) => tm.userId === userId)
          .map((tm) => tm.teamId)
      );
      Array.from(inMemoryDb.teams.values()).forEach((t) => {
        if (t.leadId === userId) userTeamIds.add(t.id);
      });

      Array.from(inMemoryDb.projectTeams.values()).forEach((pt) => {
        if (userTeamIds.has(pt.teamId)) {
          userProjectIds.add(pt.projectId);
        }
      });

      Array.from(inMemoryDb.tasks.values()).forEach((task) => {
        if (task.workspaceId === workspaceId && (task.assignedTo === userId || task.createdBy === userId)) {
          userProjectIds.add(task.projectId);
        }
      });

      allProjects = allProjects.filter((p) => {
        const isOwner = p.createdBy === userId;
        const isMember = userProjectIds.has(p.id);
        const isTeam = (p as any).teamId ? userTeamIds.has((p as any).teamId) : false;
        return isOwner || isMember || isTeam;
      });
    }

    return allProjects.map((p) => {
      const members = Array.from(inMemoryDb.projectMembers.values())
        .filter((pm) => pm.projectId === p.id)
        .map((pm) => pm.userId);

      const teams = Array.from(inMemoryDb.projectTeams.values())
        .filter((pt) => pt.projectId === p.id)
        .map((pt) => pt.teamId);

      return {
        id: p.id,
        title: p.title,
        description: p.description || '',
        workspaceId: p.workspaceId,
        createdBy: p.createdBy,
        status: p.status,
        progress: p.progress || 0,
        startDate: p.startDate ? new Date(p.startDate) : new Date(),
        dueDate: p.dueDate ? new Date(p.dueDate) : new Date(),
        budget: p.budget || undefined,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        memberIds: members.length > 0 ? members : [p.createdBy],
        teamIds: teams.length > 0 ? teams : ((p as any).teamIds || []),
        tags: p.tags || ['Enterprise', 'Core'],
      };
    });
  }

  /**
   * Get single project by ID with workspace filtering
   */
  static async getProjectById(
    workspaceId: string,
    projectId: string
  ): Promise<ProjectEntity | null> {
    try {
      const db = getDb();

      if (db) {
        const [project] = await db
          .select()
          .from(schema.projects)
          .where(
            and(
              eq(schema.projects.id, projectId),
              eq(schema.projects.workspaceId, workspaceId)
            )
          );

        if (project) {
          const memberRows = await db
            .select()
            .from(schema.projectMembers)
            .where(eq(schema.projectMembers.projectId, projectId));

          const memberIds = memberRows.map((m) => m.userId);

          const teamRows = await db
            .select()
            .from(schema.projectTeams)
            .where(eq(schema.projectTeams.projectId, projectId));

          const teamIds = teamRows.map((t) => t.teamId);

          return {
            id: project.id,
            title: project.title,
            description: project.description,
            workspaceId: project.workspaceId || workspaceId,
            createdBy: project.createdBy,
            status: project.status,
            progress: project.progress,
            startDate: project.startDate,
            dueDate: project.dueDate,
            budget: project.budget,
            createdAt: project.createdAt,
            memberIds: memberIds.length > 0 ? memberIds : [project.createdBy],
            teamIds,
            tags: ['Enterprise', 'Core'],
          };
        }
      }
    } catch {
      // Fallback
    }

    const p = inMemoryDb.projects.get(projectId);
    if (!p || p.workspaceId !== workspaceId) return null;

    const members = Array.from(inMemoryDb.projectMembers.values())
      .filter((pm) => pm.projectId === p.id)
      .map((pm) => pm.userId);

    const teams = Array.from(inMemoryDb.projectTeams.values())
      .filter((pt) => pt.projectId === p.id)
      .map((pt) => pt.teamId);

    return {
      id: p.id,
      title: p.title,
      description: p.description || '',
      workspaceId: p.workspaceId,
      createdBy: p.createdBy,
      status: p.status,
      progress: p.progress || 0,
      startDate: p.startDate ? new Date(p.startDate) : new Date(),
      dueDate: p.dueDate ? new Date(p.dueDate) : new Date(),
      budget: p.budget || undefined,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      memberIds: members.length > 0 ? members : [p.createdBy],
      teamIds: teams.length > 0 ? teams : ((p as any).teamIds || []),
      tags: p.tags || ['Enterprise', 'Core'],
    };
  }

  /**
   * Create a new project in PostgreSQL with Drizzle (and keep resilient fallback synchronized)
   */
  static async createProject(data: CreateProjectParams): Promise<ProjectEntity> {
    const projectId = data.id || 'proj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const startDate = data.startDate || now;
    const dueDate = data.dueDate;
    const memberIds = data.memberIds && data.memberIds.length > 0 ? data.memberIds : [data.createdBy];
    const teamIds = data.teamIds || [];

    // Always maintain in-memory store
    const newProject = {
      id: projectId,
      title: data.title,
      description: data.description || '',
      workspaceId: data.workspaceId,
      createdBy: data.createdBy,
      status: data.status || 'in_progress',
      progress: data.progress || 0,
      startDate,
      dueDate,
      budget: data.budget || '$0',
      tags: data.tags || ['General'],
      createdAt: now,
    };

    inMemoryDb.projects.set(projectId, newProject);

    for (const mId of memberIds) {
      const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      inMemoryDb.projectMembers.set(pmId, {
        id: pmId,
        projectId,
        userId: mId,
        role: mId === data.createdBy ? 'owner' : 'contributor',
      });
    }

    for (const tId of teamIds) {
      const ptId = 'pt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      inMemoryDb.projectTeams.set(ptId, {
        id: ptId,
        projectId,
        teamId: tId,
      });
    }

    try {
      const db = getDb();
      if (db) {
        await db.transaction(async (tx) => {
          await tx.insert(schema.projects).values({
            id: projectId,
            title: data.title,
            description: data.description || '',
            workspaceId: data.workspaceId,
            createdBy: data.createdBy,
            status: data.status || 'in_progress',
            progress: data.progress || 0,
            startDate,
            dueDate,
            budget: data.budget || '$0',
            createdAt: now,
          });

          for (const mId of memberIds) {
            const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            await tx.insert(schema.projectMembers).values({
              id: pmId,
              projectId,
              userId: mId,
              role: mId === data.createdBy ? 'owner' : 'contributor',
            });
          }

          for (const tId of teamIds) {
            const ptId = 'pt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            await tx.insert(schema.projectTeams).values({
              id: ptId,
              projectId,
              teamId: tId,
            });
          }
        });
      }
    } catch {
      // Retain in-memory copy
    }

    return {
      id: newProject.id,
      title: newProject.title,
      description: newProject.description,
      workspaceId: newProject.workspaceId,
      createdBy: newProject.createdBy,
      status: newProject.status,
      progress: newProject.progress,
      startDate: newProject.startDate,
      dueDate: newProject.dueDate,
      budget: newProject.budget,
      createdAt: newProject.createdAt,
      memberIds,
      teamIds,
      tags: newProject.tags,
    };
  }

  /**
   * Update an existing project
   */
  static async updateProject(
    workspaceId: string,
    projectId: string,
    updates: UpdateProjectParams
  ): Promise<ProjectEntity | null> {
    const existing = inMemoryDb.projects.get(projectId);
    if (!existing || existing.workspaceId !== workspaceId) {
      // Check db
      try {
        const db = getDb();
        if (db) {
          const [dbProj] = await db
            .select()
            .from(schema.projects)
            .where(
              and(
                eq(schema.projects.id, projectId),
                eq(schema.projects.workspaceId, workspaceId)
              )
            );
          if (!dbProj) return null;
        } else {
          return null;
        }
      } catch {
        return null;
      }
    }

    const updated = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? updates.title : existing?.title || '',
      description: updates.description !== undefined ? updates.description : existing?.description || '',
      dueDate: updates.dueDate || existing?.dueDate || new Date(),
      startDate: updates.startDate || existing?.startDate || new Date(),
      workspaceId,
      createdBy: existing?.createdBy || '',
      status: updates.status || existing?.status || 'in_progress',
      progress: updates.progress !== undefined ? updates.progress : existing?.progress || 0,
      budget: updates.budget !== undefined ? updates.budget : existing?.budget || '$0',
      tags: updates.tags || existing?.tags || ['General'],
    };

    inMemoryDb.projects.set(projectId, updated);

    if (updates.memberIds) {
      Array.from(inMemoryDb.projectMembers.entries()).forEach(([id, pm]) => {
        if (pm.projectId === projectId) inMemoryDb.projectMembers.delete(id);
      });
      for (const mId of updates.memberIds) {
        const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        inMemoryDb.projectMembers.set(pmId, {
          id: pmId,
          projectId,
          userId: mId,
          role: mId === updated.createdBy ? 'owner' : 'contributor',
        });
      }
    }

    if (updates.teamIds) {
      Array.from(inMemoryDb.projectTeams.entries()).forEach(([id, pt]) => {
        if (pt.projectId === projectId) inMemoryDb.projectTeams.delete(id);
      });
      for (const tId of updates.teamIds) {
        const ptId = 'pt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        inMemoryDb.projectTeams.set(ptId, {
          id: ptId,
          projectId,
          teamId: tId,
        });
      }
    }

    try {
      const db = getDb();
      if (db) {
        const setValues: any = {};
        if (updates.title !== undefined) setValues.title = updates.title;
        if (updates.description !== undefined) setValues.description = updates.description;
        if (updates.status !== undefined) setValues.status = updates.status;
        if (updates.progress !== undefined) setValues.progress = updates.progress;
        if (updates.startDate !== undefined) setValues.startDate = updates.startDate;
        if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;
        if (updates.budget !== undefined) setValues.budget = updates.budget;

        if (Object.keys(setValues).length > 0) {
          await db
            .update(schema.projects)
            .set(setValues)
            .where(
              and(
                eq(schema.projects.id, projectId),
                eq(schema.projects.workspaceId, workspaceId)
              )
            );
        }

        if (updates.memberIds) {
          await db
            .delete(schema.projectMembers)
            .where(eq(schema.projectMembers.projectId, projectId));

          for (const mId of updates.memberIds) {
            const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            await db.insert(schema.projectMembers).values({
              id: pmId,
              projectId,
              userId: mId,
              role: mId === updated.createdBy ? 'owner' : 'contributor',
            });
          }
        }

        if (updates.teamIds) {
          await db
            .delete(schema.projectTeams)
            .where(eq(schema.projectTeams.projectId, projectId));

          for (const tId of updates.teamIds) {
            const ptId = 'pt-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            await db.insert(schema.projectTeams).values({
              id: ptId,
              projectId,
              teamId: tId,
            });
          }
        }
      }
    } catch {
      // In-memory already updated
    }

    const currentMembers = updates.memberIds || Array.from(inMemoryDb.projectMembers.values())
      .filter((pm) => pm.projectId === projectId)
      .map((pm) => pm.userId);

    const currentTeams = updates.teamIds || Array.from(inMemoryDb.projectTeams.values())
      .filter((pt) => pt.projectId === projectId)
      .map((pt) => pt.teamId);

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description || '',
      workspaceId: updated.workspaceId,
      createdBy: updated.createdBy,
      status: updated.status,
      progress: updated.progress || 0,
      startDate: updated.startDate ? new Date(updated.startDate) : new Date(),
      dueDate: updated.dueDate ? new Date(updated.dueDate) : new Date(),
      budget: updated.budget,
      createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
      memberIds: currentMembers.length > 0 ? currentMembers : [updated.createdBy],
      teamIds: currentTeams,
      tags: updated.tags || ['Enterprise', 'Core'],
    };
  }

  /**
   * Delete a project and its members & teams
   */
  static async deleteProject(workspaceId: string, projectId: string): Promise<boolean> {
    const existing = inMemoryDb.projects.get(projectId);
    if (existing && existing.workspaceId === workspaceId) {
      inMemoryDb.projects.delete(projectId);
      Array.from(inMemoryDb.projectMembers.entries()).forEach(([id, pm]) => {
        if (pm.projectId === projectId) inMemoryDb.projectMembers.delete(id);
      });
      Array.from(inMemoryDb.projectTeams.entries()).forEach(([id, pt]) => {
        if (pt.projectId === projectId) inMemoryDb.projectTeams.delete(id);
      });
    }

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.projectTeams)
          .where(eq(schema.projectTeams.projectId, projectId));

        await db
          .delete(schema.projectMembers)
          .where(eq(schema.projectMembers.projectId, projectId));

        await db
          .delete(schema.projects)
          .where(
            and(
              eq(schema.projects.id, projectId),
              eq(schema.projects.workspaceId, workspaceId)
            )
          );
      }
    } catch {
      // In-memory handled
    }

    return true;
  }
}

