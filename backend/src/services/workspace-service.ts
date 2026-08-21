import { inMemoryDb, Workspace, WorkspaceMember } from '../../packages/database';
import { SafeWorkspace, SafeUser, UserRole } from '../types';
import { sanitizeUser, sanitizeWorkspace } from './auth-service';

export class WorkspaceService {
  /**
   * Get workspace details for an authenticated user with membership verification
   */
  static async getWorkspace(userId: string, requestedWorkspaceId?: string): Promise<SafeWorkspace> {
    const user = inMemoryDb.users.get(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    let targetWorkspace: Workspace | null = null;
    let userRoleInWorkspace: UserRole = user.role as UserRole;

    if (requestedWorkspaceId) {
      // Find requested workspace
      const workspace = inMemoryDb.workspaces.get(requestedWorkspaceId);
      if (!workspace) {
        throw new Error('WORKSPACE_NOT_FOUND');
      }

      // Verify membership
      const membership = Array.from(inMemoryDb.workspaceMembers.values()).find(
        (m) => m.workspaceId === requestedWorkspaceId && m.userId === userId
      );

      if (!membership && workspace.ownerId !== userId) {
        throw new Error('ACCESS_DENIED_WORKSPACE_MEMBERSHIP_REQUIRED');
      }

      targetWorkspace = workspace;
      userRoleInWorkspace = membership ? (membership.role as UserRole) : 'admin';
    } else {
      // Find default user's workspace
      const owned = Array.from(inMemoryDb.workspaces.values()).find((w) => w.ownerId === userId);
      if (owned) {
        targetWorkspace = owned;
        userRoleInWorkspace = 'admin';
      } else {
        const membership = Array.from(inMemoryDb.workspaceMembers.values()).find(
          (m) => m.userId === userId
        );
        if (membership) {
          targetWorkspace = inMemoryDb.workspaces.get(membership.workspaceId) || null;
          userRoleInWorkspace = membership.role as UserRole;
        }
      }
    }

    if (!targetWorkspace) {
      throw new Error('NO_ACTIVE_WORKSPACE');
    }

    return sanitizeWorkspace(targetWorkspace, userRoleInWorkspace);
  }

  /**
   * List members belonging to a workspace with membership verification
   */
  static async getWorkspaceMembers(
    userId: string,
    workspaceId: string
  ): Promise<{ member: SafeUser; role: UserRole; joinedAt: string }[]> {
    // 1. Verify caller has access to this workspace
    await this.getWorkspace(userId, workspaceId);

    // 2. Fetch all members
    const memberships = Array.from(inMemoryDb.workspaceMembers.values()).filter(
      (m) => m.workspaceId === workspaceId
    );

    const result: { member: SafeUser; role: UserRole; joinedAt: string }[] = [];

    for (const mem of memberships) {
      const u = inMemoryDb.users.get(mem.userId);
      if (u) {
        result.push({
          member: sanitizeUser(u),
          role: mem.role as UserRole,
          joinedAt: new Date(mem.joinedAt).toISOString(),
        });
      }
    }

    return result;
  }
}
