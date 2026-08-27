import { WorkspaceRepository, WorkspaceEntity } from '../repositories/workspace-repository';
import { TeamRepository } from '../repositories/team-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { TaskRepository } from '../repositories/task-repository';
import { SafeWorkspace, SafeUser, UserRole } from '../types';
import { getDb, schema, inMemoryDb, WorkspaceMember, Session } from '../../packages/database';
import { eq } from 'drizzle-orm';

export function sanitizeWorkspaceEntity(
  workspace: WorkspaceEntity,
  roleInWorkspace?: UserRole,
  memberCount?: number
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
    memberCount: memberCount || 1,
  };
}

export class WorkspaceService {
  /**
   * Get all workspaces accessible by a user
   */
  static async getUserWorkspaces(userId: string): Promise<SafeWorkspace[]> {
    const workspaces = await WorkspaceRepository.getUserWorkspaces(userId);
    return workspaces.map((ws) => sanitizeWorkspaceEntity(ws, ws.role, ws.memberCount));
  }

  /**
   * Get workspace details for an authenticated user with membership verification
   */
  static async getWorkspace(userId: string, requestedWorkspaceId?: string): Promise<SafeWorkspace> {
    let targetWorkspace: WorkspaceEntity | null = null;
    let userRoleInWorkspace: UserRole = 'employee';
    let memberCount = 1;

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
      // Find user's accessible workspaces (PostgreSQL + In-Memory)
      const userWorkspaces = await WorkspaceRepository.getUserWorkspaces(userId);
      if (userWorkspaces.length > 0) {
        const primary = userWorkspaces[0];
        targetWorkspace = primary;
        userRoleInWorkspace = primary.role;
        memberCount = primary.memberCount;
      }
    }

    if (!targetWorkspace) {
      throw new Error('NO_ACTIVE_WORKSPACE');
    }

    return sanitizeWorkspaceEntity(targetWorkspace, userRoleInWorkspace, memberCount);
  }

  /**
   * Create a new workspace and automatically bind user as owner & admin
   */
  static async createWorkspace(
    userId: string,
    data: { name: string; slug?: string; plan?: 'free' | 'pro' | 'enterprise' }
  ): Promise<SafeWorkspace> {
    const rawSlug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = rawSlug || `workspace-${Date.now().toString(36)}`;

    // Create workspace record
    const workspace = await WorkspaceRepository.createWorkspace({
      name: data.name.trim(),
      slug,
      ownerId: userId,
      plan: data.plan || 'free',
    });

    // Create workspace membership for owner as ADMIN
    const membershipId = crypto.randomUUID();
    const now = new Date();
    const membership: WorkspaceMember = {
      id: membershipId,
      workspaceId: workspace.id,
      userId,
      role: 'admin',
      joinedAt: now,
    };

    inMemoryDb.workspaceMembers.set(membershipId, membership);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.workspaceMembers).values({
          id: membershipId,
          workspaceId: workspace.id,
          userId,
          role: 'admin',
          joinedAt: now,
        });
      }
    } catch (err: any) {
      console.warn('[WorkspaceService] Membership insert note:', err.message);
    }

    return sanitizeWorkspaceEntity(workspace, 'admin', 1);
  }

  /**
   * Switch the active workspace for the session
   */
  static async switchWorkspace(
    userId: string,
    sessionToken: string,
    workspaceId: string
  ): Promise<SafeWorkspace> {
    // Verify membership in target workspace
    const workspace = await this.getWorkspace(userId, workspaceId);

    // Update active session in memory and PostgreSQL
    const session = inMemoryDb.sessions.get(sessionToken);
    if (session) {
      session.workspaceId = workspace.id;
      session.lastActiveAt = new Date();
      inMemoryDb.sessions.set(sessionToken, session);
    }

    try {
      const db = getDb();
      if (db && sessionToken) {
        await db
          .update(schema.sessions)
          .set({ workspaceId: workspace.id, lastActiveAt: new Date() })
          .where(eq(schema.sessions.token, sessionToken));
      }
    } catch (err: any) {
      console.warn('[WorkspaceService] Session update note:', err.message);
    }

    return workspace;
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
