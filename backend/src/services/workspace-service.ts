import { WorkspaceRepository, WorkspaceEntity } from '../repositories/workspace-repository';
import { TeamRepository } from '../repositories/team-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { TaskRepository } from '../repositories/task-repository';
import { SafeWorkspace, SafeUser, UserRole } from '../types';
import { inMemoryDb } from '../../packages/database';

export function sanitizeWorkspaceEntity(
  workspace: WorkspaceEntity,
  roleInWorkspace?: UserRole
): SafeWorkspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    plan: workspace.plan as 'free' | 'pro' | 'enterprise',
    logo: workspace.logo || null,
    createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
    roleInWorkspace,
  };
}

export class WorkspaceService {
  /**
   * Get workspace details for an authenticated user with membership verification
   */
  static async getWorkspace(userId: string, requestedWorkspaceId?: string): Promise<SafeWorkspace> {
    let targetWorkspace: WorkspaceEntity | null = null;
    let userRoleInWorkspace: UserRole = 'employee';

    if (requestedWorkspaceId) {
      // Find requested workspace
      const workspace = await WorkspaceRepository.getWorkspaceById(requestedWorkspaceId);
      if (!workspace) {
        throw new Error('WORKSPACE_NOT_FOUND');
      }

      // Verify membership
      const membership = await WorkspaceRepository.getWorkspaceMember(requestedWorkspaceId, userId);

      if (!membership && workspace.ownerId !== userId) {
        throw new Error('ACCESS_DENIED_WORKSPACE_MEMBERSHIP_REQUIRED');
      }

      targetWorkspace = workspace;
      userRoleInWorkspace = membership ? membership.role : 'admin';
    } else {
      // Find default user's workspace
      const user = inMemoryDb.users.get(userId);
      userRoleInWorkspace = (user?.role as UserRole) || 'employee';

      // Check if user owns any workspace
      const allMemberships = Array.from(inMemoryDb.workspaceMembers.values()).filter((m) => m.userId === userId);
      const owned = Array.from(inMemoryDb.workspaces.values()).find((w) => w.ownerId === userId);

      if (owned) {
        targetWorkspace = await WorkspaceRepository.getWorkspaceById(owned.id);
        userRoleInWorkspace = 'admin';
      } else if (allMemberships.length > 0) {
        targetWorkspace = await WorkspaceRepository.getWorkspaceById(allMemberships[0].workspaceId);
        userRoleInWorkspace = allMemberships[0].role as UserRole;
      }
    }

    if (!targetWorkspace) {
      throw new Error('NO_ACTIVE_WORKSPACE');
    }

    return sanitizeWorkspaceEntity(targetWorkspace, userRoleInWorkspace);
  }

  /**
   * List members belonging to a workspace with membership verification and role scoping
   */
  static async getWorkspaceMembers(
    userId: string,
    workspaceId: string
  ): Promise<{ member: SafeUser; role: UserRole; joinedAt: string }[]> {
    // 1. Verify caller has access to this workspace and retrieve role in workspace
    const ws = await this.getWorkspace(userId, workspaceId);
    const callerRole = (ws.roleInWorkspace || 'employee') as UserRole;

    if (callerRole === 'intern') {
      const error: any = new Error('Interns do not have access to the workspace member directory.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // 2. Fetch all members in the workspace via WorkspaceRepository
    const memberEntities = await WorkspaceRepository.getWorkspaceMembers(workspaceId);

    // If caller is Employee, filter to only team members, direct collaborators, and assigned project members
    let allowedUserIds: Set<string> | null = null;
    if (callerRole === 'employee') {
      allowedUserIds = new Set<string>([userId]);

      // 2a. Teams the employee is a member or lead of
      const teams = await TeamRepository.listTeams(workspaceId);
      for (const t of teams) {
        if (t.leadId === userId || t.memberIds.includes(userId)) {
          allowedUserIds.add(t.leadId);
          t.memberIds.forEach((mId) => allowedUserIds!.add(mId));
        }
      }

      // 2b. Projects the employee is member or creator of
      const projects = await ProjectRepository.listProjects(workspaceId);
      for (const p of projects) {
        if (p.createdBy === userId || p.memberIds.includes(userId)) {
          allowedUserIds.add(p.createdBy);
          p.memberIds.forEach((mId) => allowedUserIds!.add(mId));
        }
      }

      // 2c. Tasks assigned to or created by the employee
      const tasks = await TaskRepository.listTasks(workspaceId);
      for (const t of tasks) {
        if (t.assignedTo === userId || t.createdBy === userId) {
          if (t.assignedTo) allowedUserIds.add(t.assignedTo);
          if (t.createdBy) allowedUserIds.add(t.createdBy);
        }
      }
    }

    const result: { member: SafeUser; role: UserRole; joinedAt: string }[] = [];

    for (const mem of memberEntities) {
      if (allowedUserIds && !allowedUserIds.has(mem.userId)) {
        continue;
      }
      if (mem.user) {
        result.push({
          member: {
            id: mem.user.id,
            name: mem.user.name,
            email: mem.user.email,
            role: mem.user.role,
            platformRole: ((mem.user as any).platformRole || 'none'),
            title: mem.user.title || null,
            avatar: mem.user.avatar || null,
            teamId: mem.user.teamId || null,
            createdAt: mem.user.createdAt,
          },
          role: mem.role,
          joinedAt: mem.joinedAt.toISOString(),
        });
      }
    }

    return result;
  }
}
