import { eq, and, inArray } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

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

          const userRows = await db
            .select({ id: schema.users.id, teamId: schema.users.teamId })
            .from(schema.users)
            .where(inArray(schema.users.teamId, teamIds));

          const membersByTeam = new Map<string, Set<string>>();
          teamRows.forEach((t) => {
            membersByTeam.set(t.id, new Set([t.leadId].filter(Boolean)));
          });

          memberRows.forEach((m) => {
            const set = membersByTeam.get(m.teamId) || new Set<string>();
            set.add(m.userId);
            membersByTeam.set(m.teamId, set);
          });

          userRows.forEach((u) => {
            if (u.teamId) {
              const set = membersByTeam.get(u.teamId) || new Set<string>();
              set.add(u.id);
              membersByTeam.set(u.teamId, set);
            }
          });

          return teamRows.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            workspaceId: t.workspaceId || workspaceId,
            leadId: t.leadId,
            color: t.color || '#3b82f6',
            createdAt: t.createdAt,
            memberIds: Array.from(membersByTeam.get(t.id) || [t.leadId]),
          }));
        } else {
          // PostgreSQL is connected and legitimately returned 0 teams for this workspace
          return [];
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
      const explicitMembers = Array.from(inMemoryDb.teamMembers.values())
        .filter((tm) => tm.teamId === t.id)
        .map((tm) => tm.userId);
      const userAssigned = Array.from(inMemoryDb.users.values())
        .filter((u) => u.teamId === t.id)
        .map((u) => u.id);
      const allMembers = Array.from(new Set([...explicitMembers, ...userAssigned, t.leadId].filter(Boolean)));

      return {
        id: t.id,
        name: t.name,
        description: t.description || '',
        workspaceId: t.workspaceId,
        leadId: t.leadId,
        color: t.color || '#3b82f6',
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        memberIds: allMembers.length > 0 ? allMembers : [t.leadId],
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
    const leadId = data.leadId && data.leadId.trim() ? data.leadId.trim() : null;
    const memberIds = data.memberIds && data.memberIds.length > 0 ? data.memberIds : (leadId ? [leadId] : []);

    const newTeam = {
      id: teamId,
      name: data.name,
      description: data.description || '',
      workspaceId: data.workspaceId,
      leadId: leadId || '',
      color: data.color || '#3b82f6',
      createdAt: now,
    };

    inMemoryDb.teams.set(teamId, newTeam);

    for (const mId of memberIds) {
      const tmId = 'tm-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + mId.slice(-4);
      inMemoryDb.teamMembers.set(tmId, {
        id: tmId,
        teamId,
        userId: mId,
        roleInTeam: mId === leadId ? 'lead' : 'member',
        joinedAt: now,
      });
    }

    try {
      const db = getDb();
      if (db) {
        console.log('[TeamRepository] INSERT TEAM to PostgreSQL:', {
          id: teamId,
          name: data.name,
          workspaceId: data.workspaceId,
          leadId,
        });

        await db.insert(schema.teams).values({
          id: teamId,
          name: data.name,
          description: data.description || '',
          workspaceId: data.workspaceId,
          leadId: leadId,
          color: data.color || '#3b82f6',
          createdAt: now,
        });

        for (const mId of memberIds) {
          const tmId = 'tm-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + mId.slice(-4);
          await db.insert(schema.teamMembers).values({
            id: tmId,
            teamId,
            userId: mId,
            roleInTeam: mId === leadId ? 'lead' : 'member',
            joinedAt: now,
          });
        }
        console.log('[TeamRepository] INSERT RESULT: Successfully persisted team and members');
      }
    } catch (err: any) {
      console.error('[TeamRepository] PostgreSQL Insert Error in createTeam:', err.message || err);
      // In production mode, rethrow so it does not fail silently
      if (process.env.NODE_ENV === 'production' && !process.env.TEST_MODE) {
        throw new Error(`Failed to persist team to PostgreSQL: ${err.message}`);
      }
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
        await db
          .delete(schema.teamMembers)
          .where(eq(schema.teamMembers.teamId, teamId));

        await db
          .delete(schema.teams)
          .where(
            and(
              eq(schema.teams.id, teamId),
              eq(schema.teams.workspaceId, workspaceId)
            )
          );
      }
    } catch (err: any) {
      console.error('[TeamRepository] PostgreSQL Delete Error in deleteTeam:', err.message || err);
      if (process.env.NODE_ENV === 'production' && !process.env.TEST_MODE) {
        throw err;
      }
    }

    return true;
  }

  /**
   * Add a member to a team and sync user team_id
   */
  static async addMember(
    teamId: string,
    userId: string,
    roleInTeam = 'member',
    workspaceId?: string
  ): Promise<TeamMemberEntity> {
    // Check if already in team in memory
    const existingEntry = Array.from(inMemoryDb.teamMembers.values()).find(
      (tm) => tm.teamId === teamId && tm.userId === userId
    );

    let memberEntity: TeamMemberEntity;
    const now = new Date();

    if (existingEntry) {
      memberEntity = existingEntry;
    } else {
      const tmId = 'tm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      memberEntity = {
        id: tmId,
        teamId,
        userId,
        roleInTeam,
        joinedAt: now,
      };
      inMemoryDb.teamMembers.set(tmId, memberEntity);
    }

    // Sync in-memory user teamId
    const inMemUser = inMemoryDb.users.get(userId);
    if (inMemUser) {
      inMemUser.teamId = teamId;
      inMemoryDb.users.set(userId, inMemUser);
    }

    try {
      const db = getDb();
      if (db) {
        // Check if row already exists in database
        const [existingDbMember] = await db
          .select()
          .from(schema.teamMembers)
          .where(
            and(
              eq(schema.teamMembers.teamId, teamId),
              eq(schema.teamMembers.userId, userId)
            )
          );

        if (!existingDbMember) {
          const tmId = memberEntity.id;
          await db.insert(schema.teamMembers).values({
            id: tmId,
            teamId,
            userId,
            roleInTeam,
            joinedAt: now,
          });
        }

        // Update user's teamId in users table
        await db
          .update(schema.users)
          .set({ teamId, updatedAt: now })
          .where(eq(schema.users.id, userId));
      }
    } catch (e) {
      // In-memory handled
    }

    return memberEntity;
  }

  /**
   * Remove a member from a team and update user team_id
   */
  static async removeMember(teamId: string, userId: string, workspaceId?: string): Promise<boolean> {
    // Remove from in-memory teamMembers
    Array.from(inMemoryDb.teamMembers.entries()).forEach(([id, tm]) => {
      if (tm.teamId === teamId && tm.userId === userId) {
        inMemoryDb.teamMembers.delete(id);
      }
    });

    // Check if user has other teams, or clear teamId
    const remainingTeams = Array.from(inMemoryDb.teamMembers.values()).filter(
      (tm) => tm.userId === userId
    );
    const inMemUser = inMemoryDb.users.get(userId);
    if (inMemUser) {
      inMemUser.teamId = remainingTeams.length > 0 ? remainingTeams[0].teamId : undefined;
      inMemoryDb.users.set(userId, inMemUser);
    }

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

        // Check if user has other team memberships in DB
        const remainingDbMembers = await db
          .select()
          .from(schema.teamMembers)
          .where(eq(schema.teamMembers.userId, userId));

        const nextTeamId = remainingDbMembers.length > 0 ? remainingDbMembers[0].teamId : null;

        await db
          .update(schema.users)
          .set({ teamId: nextTeamId, updatedAt: new Date() })
          .where(eq(schema.users.id, userId));
      }
    } catch {
      // In-memory handled
    }

    return true;
  }

  /**
   * Move a member between two teams
   */
  static async moveMember(
    fromTeamId: string,
    toTeamId: string,
    userId: string,
    workspaceId?: string
  ): Promise<boolean> {
    await this.removeMember(fromTeamId, userId, workspaceId);
    await this.addMember(toTeamId, userId, 'member', workspaceId);
    return true;
  }

  /**
   * Update team lead and ensure lead is a member
   */
  static async updateLead(
    workspaceId: string,
    teamId: string,
    leadId: string
  ): Promise<TeamEntity | null> {
    await this.addMember(teamId, leadId, 'lead', workspaceId);
    return await this.updateTeam(workspaceId, teamId, { leadId });
  }

  /**
   * Get team members with full user details
   */
  static async getTeamMembersWithDetails(
    workspaceId: string,
    teamId: string
  ): Promise<Array<TeamMemberEntity & { user?: any }>> {
    const rawMembers = await this.getTeamMembers(teamId);

    // Look up user details
    const result: Array<TeamMemberEntity & { user?: any }> = [];

    for (const m of rawMembers) {
      let userObj: any = inMemoryDb.users.get(m.userId);
      if (!userObj) {
        try {
          const db = getDb();
          if (db) {
            const [u] = await db
              .select()
              .from(schema.users)
              .where(eq(schema.users.id, m.userId));
            if (u) {
              userObj = {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar || '',
                title: u.title || '',
                teamId: u.teamId || teamId,
              };
            }
          }
        } catch {
          // Fallback
        }
      }

      result.push({
        ...m,
        user: userObj
          ? {
            id: userObj.id,
            name: userObj.name,
            email: userObj.email,
            role: userObj.role,
            avatar: userObj.avatar || '',
            title: userObj.title || '',
            teamId: userObj.teamId || teamId,
          }
          : {
            id: m.userId,
            name: 'Workspace Member',
            email: '',
            role: 'employee',
            avatar: '',
            title: '',
            teamId,
          },
      });
    }

    return result;
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

  /**
   * Get all team IDs associated with a user
   */
  static async getUserTeams(userId: string): Promise<string[]> {
    const teamIds = new Set<string>();

    try {
      const db = getDb();
      if (db) {
        const memberRows = await db
          .select({ teamId: schema.teamMembers.teamId })
          .from(schema.teamMembers)
          .where(eq(schema.teamMembers.userId, userId));
        memberRows.forEach((r) => teamIds.add(r.teamId));

        const [userRow] = await db
          .select({ teamId: schema.users.teamId })
          .from(schema.users)
          .where(eq(schema.users.id, userId));
        if (userRow?.teamId) {
          teamIds.add(userRow.teamId);
        }

        const ledTeams = await db
          .select({ id: schema.teams.id })
          .from(schema.teams)
          .where(eq(schema.teams.leadId, userId));
        ledTeams.forEach((t) => teamIds.add(t.id));
      }
    } catch {
      // In-memory fallback
    }

    Array.from(inMemoryDb.teamMembers.values()).forEach((tm) => {
      if (tm.userId === userId) teamIds.add(tm.teamId);
    });

    Array.from(inMemoryDb.teams.values()).forEach((t) => {
      if (t.leadId === userId) teamIds.add(t.id);
    });

    return Array.from(teamIds);
  }

  /**
   * Get all team IDs where the user is lead
   */
  static async getUserLedTeams(userId: string): Promise<string[]> {
    const ledTeamIds = new Set<string>();

    try {
      const db = getDb();
      if (db) {
        const ledTeams = await db
          .select({ id: schema.teams.id })
          .from(schema.teams)
          .where(eq(schema.teams.leadId, userId));
        ledTeams.forEach((t) => ledTeamIds.add(t.id));

        const leadMemberships = await db
          .select({ teamId: schema.teamMembers.teamId })
          .from(schema.teamMembers)
          .where(and(eq(schema.teamMembers.userId, userId), eq(schema.teamMembers.roleInTeam, 'lead')));
        leadMemberships.forEach((lm) => ledTeamIds.add(lm.teamId));
      }
    } catch {
      // In-memory fallback
    }

    Array.from(inMemoryDb.teams.values()).forEach((t) => {
      if (t.leadId === userId) ledTeamIds.add(t.id);
    });
    Array.from(inMemoryDb.teamMembers.values()).forEach((tm) => {
      if (tm.userId === userId && tm.roleInTeam === 'lead') ledTeamIds.add(tm.teamId);
    });

    return Array.from(ledTeamIds);
  }
}
