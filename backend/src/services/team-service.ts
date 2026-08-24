import { UserRole } from '../types';
import { can, normalizeRole } from '../lib/permissions';
import { TeamRepository, TeamEntity, TeamMemberEntity } from '../repositories/team-repository';
import { EventService } from './event-service';

export interface CreateTeamInput {
  name: string;
  description?: string;
  leadId?: string;
  color?: string;
  memberIds?: string[];
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  leadId?: string;
  color?: string;
}

export class TeamService {
  /**
   * List all teams within workspace
   */
  static async getTeams(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'teams:read', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from viewing teams.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const teams = await TeamRepository.listTeams(workspaceId);

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      workspace_id: t.workspaceId,
      lead_id: t.leadId,
      color: t.color || '#3b82f6',
      created_at: t.createdAt ? new Date(t.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      members_count: t.memberIds.length,
      members: t.memberIds,
    }));
  }

  /**
   * Create a new team in workspace
   */
  static async createTeam(
    workspaceId: string,
    userId: string,
    rawRole: UserRole | string,
    input: CreateTeamInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'teams:create', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from creating teams.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    if (!workspaceId || !workspaceId.trim()) {
      const error: any = new Error('Workspace ID is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    if (!input.name || !input.name.trim()) {
      const error: any = new Error('Team name is required.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const leadId = input.leadId || userId;
    const memberIds = input.memberIds && input.memberIds.length > 0 ? input.memberIds : [leadId];

    const team = await TeamRepository.createTeam({
      name: input.name.trim(),
      description: input.description?.trim() || '',
      workspaceId,
      leadId,
      color: input.color || '#3b82f6',
      memberIds,
    });

    // Emit event: Team Created
    await EventService.emitTeamCreated(
      { workspaceId, actorId: userId },
      {
        id: team.id,
        name: team.name,
        leadId: team.leadId,
        memberIds: team.memberIds,
      }
    );

    return {
      id: team.id,
      name: team.name,
      description: team.description || '',
      workspace_id: team.workspaceId,
      lead_id: team.leadId,
      color: team.color,
      created_at: team.createdAt.toISOString().substring(0, 10),
      members_count: team.memberIds.length,
      members: team.memberIds,
    };
  }

  /**
   * Get team details by ID
   */
  static async getTeamById(
    workspaceId: string,
    teamId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'teams:read', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from viewing team details.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await TeamRepository.getTeamById(workspaceId, teamId);

    if (!existing) {
      const error: any = new Error('Team not found.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: team belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    return {
      id: existing.id,
      name: existing.name,
      description: existing.description || '',
      workspace_id: existing.workspaceId,
      lead_id: existing.leadId,
      color: existing.color || '#3b82f6',
      created_at: existing.createdAt ? new Date(existing.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      members_count: existing.memberIds.length,
      members: existing.memberIds,
    };
  }

  /**
   * Update team
   */
  static async updateTeam(
    workspaceId: string,
    teamId: string,
    userId: string,
    rawRole: UserRole | string,
    updates: UpdateTeamInput
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role !== 'admin') {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from updating teams.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await TeamRepository.getTeamById(workspaceId, teamId);
    if (!existing) {
      const error: any = new Error('Team not found.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: team belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    if (updates.name !== undefined && !updates.name.trim()) {
      const error: any = new Error('Team name cannot be empty.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const updated = await TeamRepository.updateTeam(workspaceId, teamId, {
      name: updates.name ? updates.name.trim() : undefined,
      description: updates.description !== undefined ? updates.description.trim() : undefined,
      leadId: updates.leadId,
      color: updates.color,
    });

    if (!updated) {
      const error: any = new Error('Team not found or update failed.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      workspace_id: updated.workspaceId,
      lead_id: updated.leadId,
      color: updated.color,
      created_at: updated.createdAt ? new Date(updated.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      members_count: updated.memberIds.length,
      members: updated.memberIds,
    };
  }

  /**
   * Delete team
   */
  static async deleteTeam(
    workspaceId: string,
    teamId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    if (role !== 'admin') {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from deleting teams.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await TeamRepository.getTeamById(workspaceId, teamId);
    if (!existing) {
      const error: any = new Error('Team not found.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (existing.workspaceId !== workspaceId) {
      const error: any = new Error('Workspace boundary violation: team belongs to another workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }

    return await TeamRepository.deleteTeam(workspaceId, teamId);
  }

  /**
   * Add member to team
   */
  static async addMember(
    workspaceId: string,
    teamId: string,
    targetUserId: string,
    rawRole: UserRole | string,
    roleInTeam = 'member',
    actorId?: string
  ): Promise<TeamMemberEntity> {
    const role = normalizeRole(rawRole);
    if (role !== 'admin') {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from assigning team members.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await TeamRepository.getTeamById(workspaceId, teamId);
    if (!existing) {
      const error: any = new Error('Team not found.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const result = await TeamRepository.addMember(teamId, targetUserId, roleInTeam);

    // Emit event: Member added to team
    await EventService.emitMemberAdded(
      { workspaceId, actorId: actorId || targetUserId },
      {
        teamId,
        teamName: existing.name,
        userId: targetUserId,
        role: roleInTeam,
      }
    );

    return result;
  }

  /**
   * Remove member from team
   */
  static async removeMember(
    workspaceId: string,
    teamId: string,
    targetUserId: string,
    rawRole: UserRole | string
  ): Promise<boolean> {
    const role = normalizeRole(rawRole);
    if (role !== 'admin') {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from removing team members.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const existing = await TeamRepository.getTeamById(workspaceId, teamId);
    if (!existing) {
      const error: any = new Error('Team not found.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return await TeamRepository.removeMember(teamId, targetUserId);
  }
}
