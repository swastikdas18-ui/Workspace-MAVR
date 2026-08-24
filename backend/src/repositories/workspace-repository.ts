import { eq, and } from 'drizzle-orm';
import { getDb, schema, inMemoryDb, Workspace, WorkspaceMember, User } from '../../packages/database';
import { UserRole } from '../types';

export interface WorkspaceEntity {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  logo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMemberEntity {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    title?: string | null;
    avatar?: string | null;
    teamId?: string | null;
    createdAt: Date;
  };
}

export interface CreateWorkspaceParams {
  id?: string;
  name: string;
  slug: string;
  ownerId: string;
  plan?: 'free' | 'pro' | 'enterprise';
  logo?: string | null;
}

export interface UpdateWorkspaceParams {
  name?: string;
  slug?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  logo?: string | null;
}

export class WorkspaceRepository {
  /**
   * Get workspace by ID
   */
  static async getWorkspaceById(workspaceId: string): Promise<WorkspaceEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [ws] = await db
          .select()
          .from(schema.workspaces)
          .where(eq(schema.workspaces.id, workspaceId));

        if (ws) {
          return {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            ownerId: ws.ownerId,
            plan: (ws.plan as 'free' | 'pro' | 'enterprise') || 'pro',
            logo: ws.logo,
            createdAt: ws.createdAt,
            updatedAt: ws.updatedAt,
          };
        }
      }
    } catch {
      // Fallback
    }

    const ws = inMemoryDb.workspaces.get(workspaceId);
    if (!ws) return null;

    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId,
      plan: (ws.plan as 'free' | 'pro' | 'enterprise') || 'pro',
      logo: ws.logo,
      createdAt: ws.createdAt ? new Date(ws.createdAt) : new Date(),
      updatedAt: ws.updatedAt ? new Date(ws.updatedAt) : new Date(),
    };
  }

  /**
   * Get workspace by Slug
   */
  static async getWorkspaceBySlug(slug: string): Promise<WorkspaceEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [ws] = await db
          .select()
          .from(schema.workspaces)
          .where(eq(schema.workspaces.slug, slug));

        if (ws) {
          return {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            ownerId: ws.ownerId,
            plan: (ws.plan as 'free' | 'pro' | 'enterprise') || 'pro',
            logo: ws.logo,
            createdAt: ws.createdAt,
            updatedAt: ws.updatedAt,
          };
        }
      }
    } catch {
      // Fallback
    }

    const ws = Array.from(inMemoryDb.workspaces.values()).find((w) => w.slug === slug);
    if (!ws) return null;

    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId,
      plan: (ws.plan as 'free' | 'pro' | 'enterprise') || 'pro',
      logo: ws.logo,
      createdAt: ws.createdAt ? new Date(ws.createdAt) : new Date(),
      updatedAt: ws.updatedAt ? new Date(ws.updatedAt) : new Date(),
    };
  }

  /**
   * Get specific workspace membership
   */
  static async getWorkspaceMember(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMemberEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [member] = await db
          .select()
          .from(schema.workspaceMembers)
          .where(
            and(
              eq(schema.workspaceMembers.workspaceId, workspaceId),
              eq(schema.workspaceMembers.userId, userId)
            )
          );

        if (member) {
          const [user] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId));

          return {
            id: member.id,
            workspaceId: member.workspaceId,
            userId: member.userId,
            role: member.role as UserRole,
            joinedAt: member.joinedAt,
            user: user
              ? {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role as UserRole,
                  title: user.title,
                  avatar: user.avatar,
                  teamId: user.teamId,
                  createdAt: user.createdAt,
                }
              : undefined,
          };
        }
      }
    } catch {
      // Fallback
    }

    const mem = Array.from(inMemoryDb.workspaceMembers.values()).find(
      (m) => m.workspaceId === workspaceId && m.userId === userId
    );
    if (!mem) return null;

    const u = inMemoryDb.users.get(userId);

    return {
      id: mem.id,
      workspaceId: mem.workspaceId,
      userId: mem.userId,
      role: mem.role as UserRole,
      joinedAt: mem.joinedAt ? new Date(mem.joinedAt) : new Date(),
      user: u
        ? {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as UserRole,
            title: u.title,
            avatar: u.avatar,
            teamId: u.teamId,
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          }
        : undefined,
    };
  }

  /**
   * Get all members of a workspace
   */
  static async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberEntity[]> {
    try {
      const db = getDb();
      if (db) {
        const members = await db
          .select({
            member: schema.workspaceMembers,
            user: schema.users,
          })
          .from(schema.workspaceMembers)
          .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
          .where(eq(schema.workspaceMembers.workspaceId, workspaceId));

        if (members.length > 0) {
          return members.map((m) => ({
            id: m.member.id,
            workspaceId: m.member.workspaceId,
            userId: m.member.userId,
            role: m.member.role as UserRole,
            joinedAt: m.member.joinedAt,
            user: {
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
              role: m.user.role as UserRole,
              title: m.user.title,
              avatar: m.user.avatar,
              teamId: m.user.teamId,
              createdAt: m.user.createdAt,
            },
          }));
        }
      }
    } catch {
      // Fallback
    }

    const mems = Array.from(inMemoryDb.workspaceMembers.values()).filter(
      (m) => m.workspaceId === workspaceId
    );

    return mems.map((m) => {
      const u = inMemoryDb.users.get(m.userId);
      return {
        id: m.id,
        workspaceId: m.workspaceId,
        userId: m.userId,
        role: m.role as UserRole,
        joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date(),
        user: u
          ? {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role as UserRole,
              title: u.title,
              avatar: u.avatar,
              teamId: u.teamId,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
            }
          : undefined,
      };
    });
  }

  /**
   * Create workspace
   */
  static async createWorkspace(data: CreateWorkspaceParams): Promise<WorkspaceEntity> {
    const wsId = data.id || crypto.randomUUID();
    const now = new Date();
    const newWs: Workspace = {
      id: wsId,
      name: data.name,
      slug: data.slug,
      ownerId: data.ownerId,
      plan: data.plan || 'pro',
      logo: data.logo || null,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.workspaces.set(wsId, newWs);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.workspaces).values({
          id: wsId,
          name: data.name,
          slug: data.slug,
          ownerId: data.ownerId,
          plan: data.plan || 'pro',
          logo: data.logo || null,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch {
      // In-memory handled
    }

    return {
      id: newWs.id,
      name: newWs.name,
      slug: newWs.slug,
      ownerId: newWs.ownerId,
      plan: newWs.plan as 'free' | 'pro' | 'enterprise',
      logo: newWs.logo,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(
    workspaceId: string,
    updates: UpdateWorkspaceParams
  ): Promise<WorkspaceEntity | null> {
    const existing = inMemoryDb.workspaces.get(workspaceId);
    if (existing) {
      if (updates.name !== undefined) existing.name = updates.name;
      if (updates.slug !== undefined) existing.slug = updates.slug;
      if (updates.plan !== undefined) existing.plan = updates.plan;
      if (updates.logo !== undefined) existing.logo = updates.logo;
      existing.updatedAt = new Date();
      inMemoryDb.workspaces.set(workspaceId, existing);
    }

    try {
      const db = getDb();
      if (db) {
        const setValues: any = { updatedAt: new Date() };
        if (updates.name !== undefined) setValues.name = updates.name;
        if (updates.slug !== undefined) setValues.slug = updates.slug;
        if (updates.plan !== undefined) setValues.plan = updates.plan;
        if (updates.logo !== undefined) setValues.logo = updates.logo;

        const [updated] = await db
          .update(schema.workspaces)
          .set(setValues)
          .where(eq(schema.workspaces.id, workspaceId))
          .returning();

        if (updated) {
          return {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            ownerId: updated.ownerId,
            plan: updated.plan as 'free' | 'pro' | 'enterprise',
            logo: updated.logo,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          };
        }
      }
    } catch {
      // In-memory handled
    }

    if (!existing) return null;

    return {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
      ownerId: existing.ownerId,
      plan: existing.plan as 'free' | 'pro' | 'enterprise',
      logo: existing.logo,
      createdAt: existing.createdAt ? new Date(existing.createdAt) : new Date(),
      updatedAt: existing.updatedAt ? new Date(existing.updatedAt) : new Date(),
    };
  }
}
