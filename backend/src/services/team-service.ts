import { inMemoryDb } from '../../packages/database';
import { UserRole } from '../types';
import { WorkspaceBoundaryValidator } from '../lib/validation';
import { can, normalizeRole } from '../lib/permissions';

export interface CreateTeamInput {
  name: string;
  description?: string;
  color?: string;
  leadId?: string;
}

export class TeamService {
  static async getTeams(workspaceId: string, userId: string, rawRole: UserRole | string): Promise<any[]> {
    const role = normalizeRole(rawRole);
    if (!can(role, 'teams:read', undefined, { userId, workspaceId })) {
      const error: any = new Error('Interns do not have access to organization team structures.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const teams = Array.from(inMemoryDb.teams.values()).filter(
      (t) => t.workspaceId === workspaceId
    );

    return teams.map((t) => {
      const members = Array.from(inMemoryDb.teamMembers.values()).filter(
        (tm) => tm.teamId === t.id
      );

      return {
        id: t.id,
        name: t.name,
        description: t.description || '',
        workspace_id: t.workspaceId,
        lead_id: t.leadId || '',
        color: t.color || '#3b82f6',
        member_count: members.length > 0 ? members.length : 1,
      };
    });
  }

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

    if (input.leadId) {
      WorkspaceBoundaryValidator.validateWorkspaceMember(workspaceId, input.leadId);
    }

    const teamId = 'team-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const newTeam = {
      id: teamId,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      workspaceId,
      leadId: input.leadId || userId,
      color: input.color || '#3b82f6',
      createdAt: now,
    };

    inMemoryDb.teams.set(teamId, newTeam);

    const tmId = 'tm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    inMemoryDb.teamMembers.set(tmId, {
      id: tmId,
      teamId,
      userId: newTeam.leadId,
      roleInTeam: 'lead',
      joinedAt: now,
    });

    return {
      id: newTeam.id,
      name: newTeam.name,
      description: newTeam.description,
      workspace_id: newTeam.workspaceId,
      lead_id: newTeam.leadId,
      color: newTeam.color,
      member_count: 1,
    };
  }
}
