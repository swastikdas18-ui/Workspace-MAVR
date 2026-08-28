// Invite Repository (Drizzle ORM)
import { eq } from 'drizzle-orm';
import { getDb } from '../../packages/database/connection';
import { workspaceInvites } from '../../packages/database/schema.js';
import { WorkspaceInvite } from '../../packages/database/types';

export class InviteRepository {
  /** Create a new invite */
  static async createInvite(data: {
    id: string;
    workspaceId: string;
    email: string;
    role: string;
    token: string;
    invitedBy: string;
    teamId?: string | null;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<WorkspaceInvite> {
    const db = getDb();
    if (!db) throw new Error('Database not available');
    const [invite] = await db
      .insert(workspaceInvites)
      .values({
        id: data.id,
        workspaceId: data.workspaceId,
        email: data.email,
        role: data.role,
        token: data.token,
        invitedBy: data.invitedBy,
        teamId: data.teamId ?? null,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
      })
      .returning();
    return invite;
  }

  /** List invites for a workspace */
  static async listInvitesByWorkspace(workspaceId: string): Promise<WorkspaceInvite[]> {
    const db = getDb();
    if (!db) throw new Error('Database not available');
    const invites = await db.select().from(workspaceInvites).where(eq(workspaceInvites.workspaceId, workspaceId));
    return invites;
  }

  /** Find invite by token */
  static async findInviteByToken(token: string): Promise<WorkspaceInvite | undefined> {
    const db = getDb();
    if (!db) throw new Error('Database not available');
    const [invite] = await db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token));
    return invite;
  }

  /** Mark invite as accepted */
  static async markInviteAccepted(token: string, acceptedAt: Date): Promise<void> {
    const db = getDb();
    if (!db) throw new Error('Database not available');
    await db.update(workspaceInvites).set({ acceptedAt }).where(eq(workspaceInvites.token, token));
  }

  /** Delete an invite */
  static async deleteInvite(token: string): Promise<void> {
    const db = getDb();
    if (!db) throw new Error('Database not available');
    await db.delete(workspaceInvites).where(eq(workspaceInvites.token, token));
  }
}
