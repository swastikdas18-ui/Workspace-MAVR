import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';
import { eq, and, inArray } from 'drizzle-orm';

export class WorkspaceBoundaryValidator {
  /**
   * Validate that project exists and belongs to the specified workspace
   */
  static validateProject(workspaceId: string, projectId: string | null | undefined): void {
    if (!projectId) return;
    const project = inMemoryDb.projects.get(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      const error: any = new Error('Referenced project does not belong to the active workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }
  }

  /**
   * Validate that team exists and belongs to the specified workspace
   */
  static validateTeam(workspaceId: string, teamId: string | null | undefined): void {
    if (!teamId) return;
    const team = inMemoryDb.teams.get(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      const error: any = new Error('Referenced team does not belong to the active workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }
  }

  /**
   * Validate that user exists and is a registered member or owner of the specified workspace
   */
  static async validateWorkspaceMemberAsync(workspaceId: string, userId: string | null | undefined): Promise<void> {
    if (!userId) return;

    try {
      const db = getDb();
      if (db) {
        // Check if user exists in the users table at all
        const [userRow] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.id, userId));

        if (!userRow) {
          const error: any = new Error('One or more selected members no longer exist');
          error.code = 'BAD_REQUEST';
          error.status = 400;
          throw error;
        }

        // Check workspace owner
        const [ws] = await db
          .select({ ownerId: schema.workspaces.ownerId })
          .from(schema.workspaces)
          .where(eq(schema.workspaces.id, workspaceId));

        if (ws && ws.ownerId === userId) {
          return;
        }

        // Check workspace membership
        const [membership] = await db
          .select()
          .from(schema.workspaceMembers)
          .where(
            and(
              eq(schema.workspaceMembers.workspaceId, workspaceId),
              eq(schema.workspaceMembers.userId, userId)
            )
          );

        if (membership) {
          return;
        }

        // User exists but is not a member of this workspace
        const error: any = new Error('One or more selected members are not part of this workspace.');
        error.code = 'BAD_REQUEST';
        error.status = 400;
        throw error;
      }
    } catch (err: any) {
      // Re-throw known validation errors
      if (err.code === 'BAD_REQUEST') throw err;
      // In-memory fallback for other errors
    }

    const user = inMemoryDb.users.get(userId);
    if (!user) {
      const error: any = new Error('One or more selected members no longer exist');
      error.code = 'BAD_REQUEST';
      error.status = 400;
      throw error;
    }

    const isMember = Array.from(inMemoryDb.workspaceMembers.values()).some(
      (wm) => wm.workspaceId === workspaceId && wm.userId === userId
    );

    const isOwner = inMemoryDb.workspaces.get(workspaceId)?.ownerId === userId;

    if (!isMember && !isOwner) {
      const error: any = new Error('One or more selected members are not part of this workspace.');
      error.code = 'BAD_REQUEST';
      error.status = 400;
      throw error;
    }
  }

  /**
   * Validate that user exists and is a registered member or owner of the specified workspace (sync wrapper)
   */
  static validateWorkspaceMember(workspaceId: string, userId: string | null | undefined): void {
    if (!userId) return;

    // When PostgreSQL is connected, skip sync in-memory validation entirely.
    // The async validator (validateWorkspaceMemberAsync) should be used instead.
    try {
      const db = getDb();
      if (db) {
        // PostgreSQL is available — sync in-memory check is unreliable, skip it.
        // Callers should use validateWorkspaceMemberAsync or validateWorkspaceMembersAsync.
        return;
      }
    } catch {
      // No db, fall through to in-memory check
    }

    const user = inMemoryDb.users.get(userId);
    const isMember = Array.from(inMemoryDb.workspaceMembers.values()).some(
      (wm) => wm.workspaceId === workspaceId && wm.userId === userId
    );
    const isOwner = inMemoryDb.workspaces.get(workspaceId)?.ownerId === userId;

    if (!user && inMemoryDb.users.size > 0) {
      const error: any = new Error('One or more selected members no longer exist');
      error.code = 'BAD_REQUEST';
      error.status = 400;
      throw error;
    }

    if (inMemoryDb.users.size > 0 && !isMember && !isOwner) {
      const error: any = new Error('One or more selected members are not part of this workspace.');
      error.code = 'BAD_REQUEST';
      error.status = 400;
      throw error;
    }
  }

  /**
   * Validate that an array of member IDs all belong to the specified workspace (sync)
   */
  static validateWorkspaceMembers(workspaceId: string, memberIds: string[] | undefined): void {
    if (!memberIds || !Array.isArray(memberIds)) return;
    for (const memberId of memberIds) {
      this.validateWorkspaceMember(workspaceId, memberId);
    }
  }

  /**
   * Validate that an array of member IDs all belong to the specified workspace (async - PostgreSQL aware)
   */
  static async validateWorkspaceMembersAsync(workspaceId: string, memberIds: string[] | undefined): Promise<void> {
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) return;

    try {
      const db = getDb();
      if (db) {
        const userRows = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(inArray(schema.users.id, memberIds));

        const existingUserIds = userRows.map((u) => u.id);
        const missingUsers = memberIds.filter((id) => !existingUserIds.includes(id));

        console.log({
          memberIds,
          existingUserIds,
          missingUsers,
        });

        if (missingUsers.length > 0) {
          const error: any = new Error('One or more selected members no longer exist');
          error.code = 'BAD_REQUEST';
          error.status = 400;
          throw error;
        }

        // Check workspace membership or ownership for each user
        for (const memberId of memberIds) {
          await this.validateWorkspaceMemberAsync(workspaceId, memberId);
        }
        return;
      }
    } catch (err: any) {
      if (err.code === 'BAD_REQUEST') throw err;
      // In-memory fallback
    }

    const existingUserIds = memberIds.filter((id) => inMemoryDb.users.has(id));
    const missingUsers = memberIds.filter((id) => !existingUserIds.includes(id));

    console.log({
      memberIds,
      existingUserIds,
      missingUsers,
    });

    if (missingUsers.length > 0) {
      const error: any = new Error('One or more selected members no longer exist');
      error.code = 'BAD_REQUEST';
      error.status = 400;
      throw error;
    }

    for (const memberId of memberIds) {
      await this.validateWorkspaceMemberAsync(workspaceId, memberId);
    }
  }

  /**
   * Validate that document exists and belongs to the specified workspace
   */
  static validateDocument(workspaceId: string, documentId: string | null | undefined): void {
    if (!documentId) return;
    const doc = inMemoryDb.documents.get(documentId);
    if (!doc || doc.workspaceId !== workspaceId) {
      const error: any = new Error('Referenced document does not belong to the active workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }
  }
}
