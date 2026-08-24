import { eq, and, inArray } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';

export interface TeamEntity {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  leadId: string;
  color?: string | null;
  createdAt: Date;
  memberIds: string[];
}

export interface CreateTeamParams {
  id?: string;
  name: string;
  description?: string;
  workspaceId: string;
  leadId: string;
  color?: string;
  memberIds?: string[];
}

export interface UpdateTeamParams {
  name?: string;
  description?: string;
  leadId?: string;
  color?: string;
}

export interface TeamMemberEntity {
  id: string;
  teamId: string;
  userId: string;
  roleInTeam: string;
  joinedAt: Date;
}

export class TeamRepository {
  /**
   * List all teams in a workspace with their members
   */
  static async listTeams(workspaceId: string): Promise<TeamEntity[]> {
    try {
      const db = getDb();
      if (db) {
        const teamRows = await db
          .select()
          .from(schema.teams)
          .where(eq(schema.teams.workspaceId, workspaceId));

        if (teamRows.length > 0) {
          const teamIds = teamRows.map((t) => t.id);

          const memberRows = await db
            .select()
            .from(schema.teamMembers)
            .where(inArray(schema.teamMembers.teamId, teamIds));

          const membersByTeam = new Map<string, string[]>();
          memberRows.forEach((m) => {
            const list = membersByTeam.get(m.teamId) || [];
            list.push(m.userId);
            membersByTeam.set(m.teamId, list);
          });

          return teamRows.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            workspaceId: t.workspaceId || workspaceId,
            leadId: t.leadId,
            color: t.color || '#3b82f6',
            createdAt: t.createdAt,
            memberIds: membersByTeam.get(t.id) || [t.leadId],
          }));
        }
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const teams = Array.from(inMemoryDb.teams.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    return teams.map((t) => {
      const members = Array.from(inMemoryDb.teamMembers.values())
        .filter((tm) => tm.teamId === t.id)
        .map((tm) => tm.userId);

      return {
        id: t.id,
        name: t.name,
        description: t.description || '',
        workspaceId: t.workspaceId,
        leadId: t.leadId,
        color: t.color || '#3b82f6',
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        memberIds: members.length > 0 ? members : [t.leadId],
      };
    });
  }

  /**
   * Get single team by ID within workspace
   */
  static async getTeamById(workspaceId: string, teamId: string): Promise<TeamEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [team] = await db
          .select()
          .from(schema.teams)
          .where(
            and(
              eq(schema.teams.id, teamId),
              eq(schema.teams.workspaceId, workspaceId)
            )
          );

        if (team) {
          const memberRows = await db
            .select()
            .from(schema.teamMembers)
            .where(eq(schema.teamMembers.teamId, teamId));

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            workspaceId: team.workspaceId || workspaceId,
            leadId: team.leadId,
            color: team.color || '#3b82f6',
            createdAt: team.createdAt,
            memberIds: memberRows.map((m) => m.userId),
          };
        }
      }
    } catch {
      // Fallback
    }

    const t = inMemoryDb.teams.get(teamId);
    if (!t || t.workspaceId !== workspaceId) return null;

    const members = Array.from(inMemoryDb.teamMembers.values())
      .filter((tm) => tm.teamId === teamId)
      .map((tm) => tm.userId);

    return {
      id: t.id,
      name: t.name,
      description: t.description || '',
      workspaceId: t.workspaceId,
      leadId: t.leadId,
      color: t.color || '#3b82f6',
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
      memberIds: members.length > 0 ? members : [t.leadId],
    };
  }

  /**
   * Create team and add initial members
   */
  static async createTeam(data: CreateTeamParams): Promise<TeamEntity> {
    const teamId = data.id || 'team-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const memberIds = data.memberIds && data.memberIds.length > 0 ? data.memberIds : [data.leadId];

    const newTeam = {
      id: teamId,
      name: data.name,
      description: data.description || '',
      workspaceId: data.workspaceId,
      leadId: data.leadId,
      color: data.color || '#3b82f6',
      createdAt: now,
    };

    inMemoryDb.teams.set(teamId, newTeam);

    for (const mId of memberIds) {
      const tmId = 'tm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      inMemoryDb.teamMembers.set(tmId, {
        id: tmId,
        teamId,
        userId: mId,
        roleInTeam: mId === data.leadId ? 'lead' : 'member',
        joinedAt: now,
      });
    }

    try {
      const db = getDb();
      if (db) {
        await db.transaction(async (tx) => {
          await tx.insert(schema.teams).values({
            id: teamId,
            name: data.name,
            description: data.description || '',
            workspaceId: data.workspaceId,
            leadId: data.leadId,
            color: data.color || '#3b82f6',
            createdAt: now,
          });

          for (const mId of memberIds) {
            const tmId = 'tm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            await tx.insert(schema.teamMembers).values({
              id: tmId,
              teamId,
              userId: mId,
              roleInTeam: mId === data.leadId ? 'lead' : 'member',
              joinedAt: now,
            });
          }
        });
      }
    } catch {
      // In-memory handled
    }

    return {
      ...newTeam,
      memberIds,
    };
  }

  /**
   * Update team attributes
   */
  static async updateTeam(
    workspaceId: string,
    teamId: string,
    updates: UpdateTeamParams
  ): Promise<TeamEntity | null> {
    const existing = inMemoryDb.teams.get(teamId);
    if (!existing || existing.workspaceId !== workspaceId) {
      try {
        const db = getDb();
        if (db) {
          const [dbTeam] = await db
            .select()
            .from(schema.teams)
            .where(
              and(
                eq(schema.teams.id, teamId),
                eq(schema.teams.workspaceId, workspaceId)
              )
            );
          if (!dbTeam) return null;
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
      name: updates.name !== undefined ? updates.name : existing?.name || '',
      description: updates.description !== undefined ? updates.description : existing?.description || '',
      leadId: updates.leadId !== undefined ? updates.leadId : existing?.leadId || '',
      color: updates.color !== undefined ? updates.color : existing?.color || '#3b82f6',
      workspaceId,
    };

    inMemoryDb.teams.set(teamId, updated);

    try {
      const db = getDb();
      if (db) {
        const setValues: any = {};
        if (updates.name !== undefined) setValues.name = updates.name;
        if (updates.description !== undefined) setValues.description = updates.description;
        if (updates.leadId !== undefined) setValues.leadId = updates.leadId;
        if (updates.color !== undefined) setValues.color = updates.color;

        if (Object.keys(setValues).length > 0) {
          await db
            .update(schema.teams)
            .set(setValues)
            .where(
              and(
                eq(schema.teams.id, teamId),
                eq(schema.teams.workspaceId, workspaceId)
              )
            );
        }
      }
    } catch {
      // In-memory handled
    }

    const members = Array.from(inMemoryDb.teamMembers.values())
      .filter((tm) => tm.teamId === teamId)
      .map((tm) => tm.userId);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      workspaceId: updated.workspaceId,
      leadId: updated.leadId,
      color: updated.color || '#3b82f6',
      createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
      memberIds: members.length > 0 ? members : [updated.leadId],
    };
  }

  /**
   * Delete team and member associations
   */
  static async deleteTeam(workspaceId: string, teamId: string): Promise<boolean> {
    const existing = inMemoryDb.teams.get(teamId);
    if (existing && existing.workspaceId === workspaceId) {
      inMemoryDb.teams.delete(teamId);
      Array.from(inMemoryDb.teamMembers.entries()).forEach(([id, tm]) => {
        if (tm.teamId === teamId) inMemoryDb.teamMembers.delete(id);
      });
    }

    try {
      const db = getDb();
      if (db) {
        await db.transaction(async (tx) => {
          await tx
            .delete(schema.teamMembers)
            .where(eq(schema.teamMembers.teamId, teamId));

          await tx
            .delete(schema.teams)
            .where(
              and(
                eq(schema.teams.id, teamId),
                eq(schema.teams.workspaceId, workspaceId)
              )
            );
        });
      }
    } catch {
      // In-memory handled
    }

    return true;
  }

  /**
   * Add a member to a team
   */
  static async addMember(
    teamId: string,
    userId: string,
    roleInTeam = 'member'
  ): Promise<TeamMemberEntity> {
    const tmId = 'tm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const newMember: TeamMemberEntity = {
      id: tmId,
      teamId,
      userId,
      roleInTeam,
      joinedAt: now,
    };

    inMemoryDb.teamMembers.set(tmId, newMember);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.teamMembers).values({
          id: tmId,
          teamId,
          userId,
          roleInTeam,
          joinedAt: now,
        });
      }
    } catch {
      // In-memory handled
    }

    return newMember;
  }

  /**
   * Remove a member from a team
   */
  static async removeMember(teamId: string, userId: string): Promise<boolean> {
    Array.from(inMemoryDb.teamMembers.entries()).forEach(([id, tm]) => {
      if (tm.teamId === teamId && tm.userId === userId) {
        inMemoryDb.teamMembers.delete(id);
      }
    });

    try {
      const db = getDb();
      if (db) {
        await db
          .delete(schema.teamMembers)
          .where(
            and(
              eq(schema.teamMembers.teamId, teamId),
              eq(schema.teamMembers.userId, userId)
            )
          );
      }
    } catch {
      // In-memory handled
    }

    return true;
  }

  /**
   * Get team members
   */
  static async getTeamMembers(teamId: string): Promise<TeamMemberEntity[]> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.teamMembers)
          .where(eq(schema.teamMembers.teamId, teamId));

        if (rows.length > 0) {
          return rows.map((m) => ({
            id: m.id,
            teamId: m.teamId,
            userId: m.userId,
            roleInTeam: m.roleInTeam || 'member',
            joinedAt: m.joinedAt,
          }));
        }
      }
    } catch {
      // Fallback
    }

    const members = Array.from(inMemoryDb.teamMembers.values()).filter(
      (tm) => tm.teamId === teamId
    );

    return members.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      roleInTeam: m.roleInTeam || 'member',
      joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date(),
    }));
  }
}
