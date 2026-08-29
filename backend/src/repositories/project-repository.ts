import { eq, and, inArray, or } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

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
  startedAt?: Date | null;
  submittedForReviewAt?: Date | null;
  submittedBy?: string | null;
  completedAt?: Date | null;
  approvedBy?: string | null;
  reviewFeedback?: string | null;
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
  startedAt?: Date | null;
  submittedForReviewAt?: Date | null;
  submittedBy?: string | null;
  completedAt?: Date | null;
  approvedBy?: string | null;
  reviewFeedback?: string | null;
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
  startedAt?: Date | null;
  submittedForReviewAt?: Date | null;
  submittedBy?: string | null;
  completedAt?: Date | null;
  approvedBy?: string | null;
  reviewFeedback?: string | null;
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

          console.log('[ProjectRepository.listProjects] loaded teamRows for projects:', {
            workspaceId,
            projectCount: projectRows.length,
            teamRowCount: teamRows.length,
            teamRows: teamRows.map((tr) => ({ projectId: tr.projectId, teamId: tr.teamId })),
          });

          const teamsByProject = new Map<string, string[]>();
          teamRows.forEach((t) => {
            const list = teamsByProject.get(t.projectId) || [];
            list.push(t.teamId);
            teamsByProject.set(t.projectId, list);
          });

          let filteredProjects = projectRows;

          if (role === 'employee' && userId) {
            // Find project IDs where user is direct member
            const userProjectIds = new Set(
              memberRows.filter((m) => m.userId === userId).map((m) => m.projectId)
            );

            // Find teams the user belongs to
            const userTeamMemberships = await db
              .select()
              .from(schema.teamMembers)
              .where(eq(schema.teamMembers.userId, userId));
            const userTeamIds = new Set(userTeamMemberships.map((tm) => tm.teamId));

            // Also check users.teamId (direct user team assignment)
            const [userRow] = await db
              .select({ teamId: schema.users.teamId })
              .from(schema.users)
              .where(eq(schema.users.id, userId));
            if (userRow?.teamId) {
              userTeamIds.add(userRow.teamId);
            }

            // Also check if user is a team lead
            const ledTeams = await db
              .select({ id: schema.teams.id })
              .from(schema.teams)
              .where(
                and(
                  eq(schema.teams.workspaceId, workspaceId),
                  eq(schema.teams.leadId, userId)
                )
              );
            ledTeams.forEach((lt) => userTeamIds.add(lt.id));

            // Find projects assigned to the user's teams (projects -> project_teams)
            teamRows.forEach((tr) => {
              if (userTeamIds.has(tr.teamId)) {
                userProjectIds.add(tr.projectId);
              }
            });

            // Find projects where user has assigned tasks
            const taskRows = await db
              .select()
              .from(schema.tasks)
              .where(
                and(
                  eq(schema.tasks.workspaceId, workspaceId),
                  eq(schema.tasks.assignedTo, userId)
                )
              );
            taskRows.forEach((t) => {
              if (t.projectId) userProjectIds.add(t.projectId);
            });

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
            startedAt: p.startedAt,
            submittedForReviewAt: p.submittedForReviewAt,
            submittedBy: p.submittedBy,
            completedAt: p.completedAt,
            approvedBy: p.approvedBy,
            reviewFeedback: p.reviewFeedback,
            createdAt: p.createdAt,
            memberIds: membersByProject.get(p.id) || [p.createdBy],
            teamIds: teamsByProject.get(p.id) || [],
            tags: ['Enterprise', 'Core'],
          }));
        } else {
          // PostgreSQL is connected and legitimately returned 0 projects for this workspace
          return [];
        }
      }
    } catch {
      // Fallback to in-memory store if DB query threw error
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
        startedAt: p.startedAt ? new Date(p.startedAt) : undefined,
        submittedForReviewAt: p.submittedForReviewAt ? new Date(p.submittedForReviewAt) : undefined,
        submittedBy: p.submittedBy || undefined,
        completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
        approvedBy: p.approvedBy || undefined,
        reviewFeedback: p.reviewFeedback || undefined,
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
            startedAt: project.startedAt,
            submittedForReviewAt: project.submittedForReviewAt,
            submittedBy: project.submittedBy,
            completedAt: project.completedAt,
            approvedBy: project.approvedBy,
            reviewFeedback: project.reviewFeedback,
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
      startedAt: p.startedAt ? new Date(p.startedAt) : undefined,
      submittedForReviewAt: p.submittedForReviewAt ? new Date(p.submittedForReviewAt) : undefined,
      submittedBy: p.submittedBy || undefined,
      completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
      approvedBy: p.approvedBy || undefined,
      reviewFeedback: p.reviewFeedback || undefined,
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

    const validMemberIds = memberIds.filter((mId) => typeof mId === 'string' && mId.trim().length > 0);
    const validTeamIds = teamIds.filter((tId) => typeof tId === 'string' && tId.trim().length > 0);

    console.log('[Repository.createProject incoming]', { teamIds });
    console.log('[Repository.createProject validTeamIds]', validTeamIds);

    for (const mId of validMemberIds) {
      const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      inMemoryDb.projectMembers.set(pmId, {
        id: pmId,
        projectId,
        userId: mId,
        role: mId === data.createdBy ? 'owner' : 'contributor',
      });
    }

    for (const tId of validTeamIds) {
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
        console.log('[ProjectRepository] INSERT project to PostgreSQL:', {
          id: projectId,
          title: data.title,
          workspaceId: data.workspaceId,
          createdBy: data.createdBy,
        });

        await db.insert(schema.projects).values({
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

        for (const mId of validMemberIds) {
          const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + mId.slice(-4);
          console.log('[ProjectRepository] INSERT project_members:', { pmId, projectId, userId: mId });
          await db.insert(schema.projectMembers).values({
            id: pmId,
            projectId,
            userId: mId,
            role: mId === data.createdBy ? 'owner' : 'contributor',
          });
        }

        if (validTeamIds.length > 0) {
          // Verify teams exist in database to satisfy foreign key constraint
          const existingTeams = await db
            .select({ id: schema.teams.id })
            .from(schema.teams)
            .where(inArray(schema.teams.id, validTeamIds));
          const existingTeamIds = new Set(existingTeams.map((t) => t.id));

          for (const tId of validTeamIds) {
            if (existingTeamIds.has(tId)) {
              const ptId = 'pt-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + tId.slice(-4);
              console.log('[INSERT project_teams]', { projectId, teamId: tId });
              await db.insert(schema.projectTeams).values({
                id: ptId,
                projectId,
                teamId: tId,
              });
            } else {
              console.warn(`[ProjectRepository] Skipped project_teams insertion: Team ${tId} not found in database.`);
            }
          }

          const insertedRows = await db
            .select()
            .from(schema.projectTeams)
            .where(eq(schema.projectTeams.projectId, projectId));
          console.log('[VERIFY INSERTED ROWS]', insertedRows);
        }
        console.log('[ProjectRepository] INSERT RESULT: Successfully created project in PostgreSQL');
      }
    } catch (err: any) {
      console.error('[ProjectRepository] PostgreSQL Insert Error in createProject:', err.message || err);
      if (process.env.NODE_ENV === 'production' && !process.env.TEST_MODE) {
        throw new Error(`Failed to persist project to PostgreSQL: ${err.message}`);
      }
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
      memberIds: validMemberIds,
      teamIds: validTeamIds,
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
      status: updates.status !== undefined ? updates.status : existing?.status || 'in_progress',
      progress: updates.progress !== undefined ? updates.progress : existing?.progress || 0,
      startDate: updates.startDate || existing?.startDate || new Date(),
      dueDate: updates.dueDate || existing?.dueDate || new Date(),
      budget: updates.budget !== undefined ? updates.budget : existing?.budget,
      workspaceId,
      createdBy: existing?.createdBy || '',
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
        if (updates.startedAt !== undefined) setValues.startedAt = updates.startedAt;
        if (updates.submittedForReviewAt !== undefined) setValues.submittedForReviewAt = updates.submittedForReviewAt;
        if (updates.submittedBy !== undefined) setValues.submittedBy = updates.submittedBy;
        if (updates.completedAt !== undefined) setValues.completedAt = updates.completedAt;
        if (updates.approvedBy !== undefined) setValues.approvedBy = updates.approvedBy;
        if (updates.reviewFeedback !== undefined) setValues.reviewFeedback = updates.reviewFeedback;

        if (Object.keys(setValues).length > 0) {
          console.log('[ProjectRepository] UPDATE project status/progress:', { projectId, setValues });
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
          const validMemberIds = updates.memberIds.filter((mId) => typeof mId === 'string' && mId.trim().length > 0);
          await db
            .delete(schema.projectMembers)
            .where(eq(schema.projectMembers.projectId, projectId));

          for (const mId of validMemberIds) {
            const pmId = 'pm-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + mId.slice(-4);
            await db.insert(schema.projectMembers).values({
              id: pmId,
              projectId,
              userId: mId,
              role: mId === updated.createdBy ? 'owner' : 'contributor',
            });
          }
        }

        if (updates.teamIds) {
          const validTeamIds = updates.teamIds.filter((tId) => typeof tId === 'string' && tId.trim().length > 0);
          await db
            .delete(schema.projectTeams)
            .where(eq(schema.projectTeams.projectId, projectId));

          if (validTeamIds.length > 0) {
            const existingTeams = await db
              .select({ id: schema.teams.id })
              .from(schema.teams)
              .where(
                and(
                  eq(schema.teams.workspaceId, workspaceId),
                  inArray(schema.teams.id, validTeamIds)
                )
              );
            const existingTeamIds = new Set(existingTeams.map((t) => t.id));

            for (const tId of validTeamIds) {
              if (existingTeamIds.has(tId)) {
                const ptId = 'pt-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + tId.slice(-4);
                await db.insert(schema.projectTeams).values({
                  id: ptId,
                  projectId,
                  teamId: tId,
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[ProjectRepository] PostgreSQL Update Error in updateProject:', err.message || err);
      if (process.env.NODE_ENV === 'production' && !process.env.TEST_MODE) {
        throw new Error(`Failed to update project in PostgreSQL: ${err.message}`);
      }
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
      startedAt: updated.startedAt ? new Date(updated.startedAt) : undefined,
      submittedForReviewAt: updated.submittedForReviewAt ? new Date(updated.submittedForReviewAt) : undefined,
      submittedBy: updated.submittedBy || undefined,
      completedAt: updated.completedAt ? new Date(updated.completedAt) : undefined,
      approvedBy: updated.approvedBy || undefined,
      reviewFeedback: updated.reviewFeedback || undefined,
      createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
      memberIds: currentMembers.length > 0 ? currentMembers : [updated.createdBy],
      teamIds: currentTeams,
      tags: updated.tags || ['Enterprise', 'Core'],
    };
  }

  /**
   * Start Work on a project (planning -> in_progress)
   */
  static async startProject(workspaceId: string, projectId: string, userId: string): Promise<ProjectEntity | null> {
    const startedAt = new Date();
    const updated = await this.updateProject(workspaceId, projectId, {
      status: 'in_progress',
      startedAt,
    });

    if (updated) {
      await this.addProjectUpdate(workspaceId, projectId, userId, updated.progress || 0, 'Started work on initiative');
    }

    return updated;
  }

  /**
   * Add a project progress update with note
   */
  static async addProjectUpdate(
    workspaceId: string,
    projectId: string,
    userId: string,
    progress: number,
    note?: string
  ): Promise<any> {
    const updateId = 'pu-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const cleanProgress = Math.max(0, Math.min(100, Math.round(progress)));

    const updateRecord = {
      id: updateId,
      projectId,
      userId,
      progress: cleanProgress,
      note: note?.trim() || null,
      createdAt: now,
    };

    inMemoryDb.projectUpdates.set(updateId, updateRecord);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.projectUpdates).values({
          id: updateId,
          projectId,
          userId,
          progress: cleanProgress,
          note: note?.trim() || null,
          createdAt: now,
        });
      }
    } catch (err: any) {
      console.error('[ProjectRepository] Failed to insert project_updates to DB:', err.message || err);
    }

    // Update project progress
    await this.updateProject(workspaceId, projectId, { progress: cleanProgress });

    return updateRecord;
  }

  /**
   * Submit project for review (in_progress -> review)
   */
  static async submitForReview(workspaceId: string, projectId: string, userId: string): Promise<ProjectEntity | null> {
    const submittedForReviewAt = new Date();
    const updated = await this.updateProject(workspaceId, projectId, {
      status: 'review',
      submittedForReviewAt,
      submittedBy: userId,
    });

    if (updated) {
      await this.addProjectUpdate(workspaceId, projectId, userId, updated.progress, 'Submitted initiative for review');
    }

    return updated;
  }

  /**
   * Approve project review and mark completed (review -> completed)
   */
  static async approveProject(workspaceId: string, projectId: string, userId: string): Promise<ProjectEntity | null> {
    const completedAt = new Date();
    const updated = await this.updateProject(workspaceId, projectId, {
      status: 'completed',
      completedAt,
      approvedBy: userId,
      progress: 100,
    });

    if (updated) {
      await this.addProjectUpdate(workspaceId, projectId, userId, 100, 'Review approved. Initiative completed.');
    }

    return updated;
  }

  /**
   * Request changes on project (review -> in_progress)
   */
  static async requestChanges(
    workspaceId: string,
    projectId: string,
    userId: string,
    feedback: string
  ): Promise<ProjectEntity | null> {
    const updated = await this.updateProject(workspaceId, projectId, {
      status: 'in_progress',
      reviewFeedback: feedback.trim(),
    });

    if (updated) {
      await this.addProjectUpdate(
        workspaceId,
        projectId,
        userId,
        updated.progress,
        `Changes requested: "${feedback.trim()}"`
      );
    }

    return updated;
  }

  /**
   * Get all progress updates & timeline history for a project
   */
  static async getProjectUpdates(projectId: string): Promise<any[]> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select({
            id: schema.projectUpdates.id,
            projectId: schema.projectUpdates.projectId,
            userId: schema.projectUpdates.userId,
            userName: schema.users.name,
            userAvatar: schema.users.avatar,
            progress: schema.projectUpdates.progress,
            note: schema.projectUpdates.note,
            createdAt: schema.projectUpdates.createdAt,
          })
          .from(schema.projectUpdates)
          .leftJoin(schema.users, eq(schema.projectUpdates.userId, schema.users.id))
          .where(eq(schema.projectUpdates.projectId, projectId))
          .orderBy(schema.projectUpdates.createdAt);

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            project_id: r.projectId,
            user_id: r.userId,
            user_name: r.userName || 'Team Member',
            user_avatar: r.userAvatar,
            progress: r.progress,
            note: r.note,
            created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          }));
        }
      }
    } catch {
      // Fallback to in-memory
    }

    const updates = Array.from(inMemoryDb.projectUpdates.values())
      .filter((pu) => pu.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return updates.map((u) => {
      const user = inMemoryDb.users.get(u.userId);
      return {
        id: u.id,
        project_id: u.projectId,
        user_id: u.userId,
        user_name: user?.name || 'Team Member',
        user_avatar: user?.avatar,
        progress: u.progress,
        note: u.note,
        created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
      };
    });
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
