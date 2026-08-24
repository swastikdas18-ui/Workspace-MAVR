import { eq, and } from 'drizzle-orm';
import { getDb } from '../../packages/database/connection';
import { users, workspaces, workspaceMembers, sessions } from '../../packages/database/schema';
import type { User, Workspace, WorkspaceMember, Session } from '../../packages/database/types';

/**
 * Auth Repository – pure data‑access layer for authentication related tables.
 * All methods return plain objects as defined in the schema/types.
 */
export const AuthRepository = {
  // ---------- Users ----------
  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const [record] = await db
      .insert(users)
      .values(user)
      .returning();
    return record;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  },

  async findUserById(id: string): Promise<User | null> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  },

  // ---------- Workspaces ----------
  async createWorkspace(workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const [record] = await db.insert(workspaces).values(workspace).returning();
    return record;
  },

  async findWorkspaceById(id: string): Promise<Workspace | null> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return result[0] ?? null;
  },

  // ---------- Workspace Members ----------
  async createWorkspaceMember(member: Omit<WorkspaceMember, 'id' | 'joinedAt'>): Promise<WorkspaceMember> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const [record] = await db.insert(workspaceMembers).values(member).returning();
    return record;
  },

  async findWorkspaceMember(params: { workspaceId: string; userId: string }): Promise<WorkspaceMember | null> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const result = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, params.workspaceId), eq(workspaceMembers.userId, params.userId)))
      .limit(1);
    return result[0] ?? null;
  },

  // ---------- Sessions ----------
  async createSession(session: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const [record] = await db.insert(sessions).values(session).returning();
    return record;
  },

  async findSessionByToken(token: string): Promise<Session | null> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    const result = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    return result[0] ?? null;
  },

  async deleteSession(token: string): Promise<boolean> {
    const db = getDb();
    if (!db) throw new Error('DB_NOT_INITIALIZED');
    await db.delete(sessions).where(eq(sessions.token, token));
    return true;
  },
};
