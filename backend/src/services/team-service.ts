import { UserRole } from '../types';
import { can, normalizeRole } from '../lib/permissions';
import { TeamRepository, TeamEntity, TeamMemberEntity } from '../repositories/team-repository';
import { EventService } from './event-service';

export interface CreateTeamInput {
  name: string;
  description?: string;
  leadId?: string;
  lead_id?: string;
  color?: string;
  memberIds?: string[];
  member_ids?: string[];
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  leadId?: string;
  lead_id?: string;
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

    let teams = await TeamRepository.listTeams(workspaceId);

    // Strict team visibility isolation:
    // Admin: all teams
    // Employee & Intern: only teams they belong to or lead
    if (role === 'employee' || role === 'intern') {
      teams = teams.filter((t) => t.leadId === userId || t.memberIds.includes(userId));
    }

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      workspace_id: t.workspaceId,
      lead_id: t.leadId,
      color: t.color || '#3b82f6',
      created_at: t.createdAt ? new Date(t.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      member_count: t.memberIds.length,
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
    console.log('CREATE TEAM SERVICE', workspaceId);
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

    const leadId = input.leadId || input.lead_id || userId;
    const rawMembers = input.memberIds || input.member_ids;
    const memberIds = rawMembers && rawMembers.length > 0 ? Array.from(new Set([...rawMembers, leadId])) : [leadId];

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
      member_count: team.memberIds.length,
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

    if (role === 'employee') {
      const isLead = existing.leadId === userId;
      const isMember = (existing.memberIds || []).includes(userId);
      if (!isLead && !isMember) {
        const error: any = new Error('Unauthorized to view unassigned team details.');
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }
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
  ): Promise<{ member: TeamMemberEntity; team: any }> {
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

    const member = await TeamRepository.addMember(teamId, targetUserId, roleInTeam, workspaceId);
    const updatedTeam = await TeamRepository.getTeamById(workspaceId, teamId);

    // Emit event: Member Added (triggers automation engine, activity log, eventbus)
    try {
      await EventService.emitMemberAdded(
        { workspaceId, actorId: actorId || userId },
        {
          teamId,
          teamName: existing.name,
          userId: targetUserId,
          role: roleInTeam,
        }
      );
    } catch (e) {
      console.warn('Failed to emit member added event:', e);
    }

    // Dispatch Notification: TEAM_MEMBER_ADDED
    try {
      const { NotificationService } = await import('./notification-service.js');
      await NotificationService.createNotification({
        workspaceId,
        recipientId: targetUserId,
        actorId: actorId || undefined,
        type: 'team_member_added',
        title: 'Added to Team',
        message: `You were added to team "${existing.name}" as ${roleInTeam}.`,
        entityType: 'team',
        entityId: teamId,
        link: '/people',
      }).catch(() => null);
    } catch {}

    return {
      member,
      team: {
        id: updatedTeam?.id || teamId,
        name: updatedTeam?.name || existing.name,
        description: updatedTeam?.description || '',
        workspace_id: updatedTeam?.workspaceId || workspaceId,
        lead_id: updatedTeam?.leadId || existing.leadId,
        color: updatedTeam?.color || '#3b82f6',
        created_at: updatedTeam?.createdAt ? new Date(updatedTeam.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        member_count: updatedTeam?.memberIds.length || 1,
        members_count: updatedTeam?.memberIds.length || 1,
        members: updatedTeam?.memberIds || [targetUserId],
      },
    };
  }

  /**
   * Add multiple members to team
   */
  static async addMembers(
    workspaceId: string,
    teamId: string,
    targetUserIds: string[],
    rawRole: UserRole | string,
    actorId?: string
  ): Promise<{ team: any; members: TeamMemberEntity[] }> {
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

    const members: TeamMemberEntity[] = [];
    for (const uId of targetUserIds) {
      const m = await TeamRepository.addMember(teamId, uId, 'member', workspaceId);
      members.push(m);

      await EventService.emitMemberAdded(
        { workspaceId, actorId: actorId || uId },
        {
          teamId,
          teamName: existing.name,
          userId: uId,
          role: 'member',
        }
      );

      // Dispatch Notification: TEAM_MEMBER_ADDED
      try {
        const { NotificationService } = await import('./notification-service.js');
        await NotificationService.createNotification({
          workspaceId,
          recipientId: uId,
          actorId: actorId || undefined,
          type: 'team_member_added',
          title: 'Added to Team',
          message: `You were added to team "${existing.name}".`,
          entityType: 'team',
          entityId: teamId,
          link: '/people',
        }).catch(() => null);
      } catch {}
    }

    const updatedTeam = await TeamRepository.getTeamById(workspaceId, teamId);

    return {
      members,
      team: {
        id: updatedTeam?.id || teamId,
        name: updatedTeam?.name || existing.name,
        description: updatedTeam?.description || '',
        workspace_id: updatedTeam?.workspaceId || workspaceId,
        lead_id: updatedTeam?.leadId || existing.leadId,
        color: updatedTeam?.color || '#3b82f6',
        created_at: updatedTeam?.createdAt ? new Date(updatedTeam.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        member_count: updatedTeam?.memberIds.length || 1,
        members_count: updatedTeam?.memberIds.length || 1,
        members: updatedTeam?.memberIds || [],
      },
    };
  }

  /**
   * Remove member from team
   */
  static async removeMember(
    workspaceId: string,
    teamId: string,
    targetUserId: string,
    rawRole: UserRole | string
  ): Promise<{ success: boolean; team: any }> {
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

    await TeamRepository.removeMember(teamId, targetUserId, workspaceId);
    const updatedTeam = await TeamRepository.getTeamById(workspaceId, teamId);

    return {
      success: true,
      team: updatedTeam ? {
        id: updatedTeam.id,
        name: updatedTeam.name,
        description: updatedTeam.description || '',
        workspace_id: updatedTeam.workspaceId,
        lead_id: updatedTeam.leadId,
        color: updatedTeam.color || '#3b82f6',
        created_at: updatedTeam.createdAt ? new Date(updatedTeam.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        member_count: updatedTeam.memberIds.length,
        members_count: updatedTeam.memberIds.length,
        members: updatedTeam.memberIds,
      } : null,
    };
  }

  /**
   * Move member between teams
   */
  static async moveMember(
    workspaceId: string,
    fromTeamId: string,
    toTeamId: string,
    targetUserId: string,
    rawRole: UserRole | string,
    actorId?: string
  ): Promise<{ success: boolean; fromTeam: any; toTeam: any }> {
    const role = normalizeRole(rawRole);
    if (role !== 'admin') {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from moving team members.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const fromTeam = await TeamRepository.getTeamById(workspaceId, fromTeamId);
    if (!fromTeam) {
      const error: any = new Error('Source team not found.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const toTeam = await TeamRepository.getTeamById(workspaceId, toTeamId);
    if (!toTeam) {
      const error: any = new Error('Destination team not found.');
      error.code = 'TEAM_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    await TeamRepository.moveMember(fromTeamId, toTeamId, targetUserId, workspaceId);

    const updatedFrom = await TeamRepository.getTeamById(workspaceId, fromTeamId);
    const updatedTo = await TeamRepository.getTeamById(workspaceId, toTeamId);

    // Emit event: Member added to destination team
    await EventService.emitMemberAdded(
      { workspaceId, actorId: actorId || targetUserId },
      {
        teamId: toTeamId,
        teamName: toTeam.name,
        userId: targetUserId,
        role: 'member',
      }
    );

    return {
      success: true,
      fromTeam: updatedFrom ? {
        id: updatedFrom.id,
        name: updatedFrom.name,
        description: updatedFrom.description || '',
        workspace_id: updatedFrom.workspaceId,
        lead_id: updatedFrom.leadId,
        color: updatedFrom.color || '#3b82f6',
        created_at: updatedFrom.createdAt ? new Date(updatedFrom.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        member_count: updatedFrom.memberIds.length,
        members_count: updatedFrom.memberIds.length,
        members: updatedFrom.memberIds,
      } : null,
      toTeam: updatedTo ? {
        id: updatedTo.id,
        name: updatedTo.name,
        description: updatedTo.description || '',
        workspace_id: updatedTo.workspaceId,
        lead_id: updatedTo.leadId,
        color: updatedTo.color || '#3b82f6',
        created_at: updatedTo.createdAt ? new Date(updatedTo.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        member_count: updatedTo.memberIds.length,
        members_count: updatedTo.memberIds.length,
        members: updatedTo.memberIds,
      } : null,
    };
  }

  /**
   * Set or update team lead
   */
  static async setTeamLead(
    workspaceId: string,
    teamId: string,
    leadId: string,
    rawRole: UserRole | string,
    actorId?: string
  ): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role !== 'admin') {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from changing team lead.`);
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

    const updated = await TeamRepository.updateLead(workspaceId, teamId, leadId);
    if (!updated) {
      const error: any = new Error('Failed to update team lead.');
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
      color: updated.color || '#3b82f6',
      created_at: updated.createdAt ? new Date(updated.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      member_count: updated.memberIds.length,
      members_count: updated.memberIds.length,
      members: updated.memberIds,
    };
  }

  /**
   * Get team members with details
   */
  static async getTeamMembers(
    workspaceId: string,
    teamId: string,
    userId: string,
    rawRole: UserRole | string
  ): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'teams:read', undefined, { userId, workspaceId })) {
      const error: any = new Error(`Role [${role.toUpperCase()}] is forbidden from viewing team members.`);
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    return await TeamRepository.getTeamMembersWithDetails(workspaceId, teamId);
  }
}
