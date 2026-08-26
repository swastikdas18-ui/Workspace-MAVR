import { z } from 'zod';
import { inMemoryDb, User, Workspace, WorkspaceMember, Session, getDb, schema } from '../../packages/database';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateSessionToken, calculateSessionExpiry } from '../auth/auth';
import { SafeUser, SafeWorkspace, AuthSessionResponse, UserRole, PlatformRole } from '../types';
import { generateUniqueId } from '../lib/secure-token';
import { getPlatformAdminEmails, getFounderEmails, getSupportEmails } from '../config/env';

// Validation Schemas
export const registerAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
});

export const registerMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  role: z.enum(['employee', 'intern']).default('employee'), // Admin cannot be chosen by regular registration
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function determinePlatformRole(email: string): PlatformRole {
  const normalized = email.toLowerCase().trim();
  const founderEmails = getFounderEmails();
  if (founderEmails.includes(normalized)) {
    return 'founder';
  }
  const adminEmails = getPlatformAdminEmails();
  if (adminEmails.includes(normalized)) {
    return 'platform_admin';
  }
  const supportEmails = getSupportEmails();
  if (supportEmails.includes(normalized)) {
    return 'support';
  }
  return 'none';
}

export function sanitizeUser(user: User): SafeUser {
  const platformRole = (user.platformRole as PlatformRole) || determinePlatformRole(user.email);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (platformRole === 'founder' || platformRole === 'platform_admin' ? 'platform_admin' : user.role) as UserRole,
    platformRole,
    title: user.title,
    avatar: user.avatar,
    teamId: user.teamId,
    createdAt: user.createdAt,
  };
}

export function sanitizeWorkspace(workspace: Workspace, roleInWorkspace?: UserRole): SafeWorkspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    plan: workspace.plan as 'free' | 'pro' | 'enterprise',
    logo: workspace.logo,
    createdAt: workspace.createdAt,
    roleInWorkspace,
  };
}

export class AuthService {
  /**
   * Register a new Organization Administrator and create their initial Workspace
   */
  static async registerAdmin(input: z.infer<typeof registerAdminSchema>): Promise<AuthSessionResponse> {
    const data = registerAdminSchema.parse(input);
    const normalizedEmail = data.email.toLowerCase().trim();
    const db = getDb();

    // Check if user already exists in-memory or in database
    let existing: any = Array.from(inMemoryDb.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (!existing && db) {
      try {
        const dbUsers = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).limit(1);
        if (dbUsers.length > 0) existing = dbUsers[0];
      } catch (err) {
        // Fallback
      }
    }
    if (existing) {
      throw new Error('USER_EXISTS');
    }

    const hashedPassword = await hashPassword(data.password);
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const now = new Date();
    const platformRole = determinePlatformRole(normalizedEmail);

    // 1. Create Admin User
    const newUser: User = {
      id: userId,
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: platformRole === 'founder' || platformRole === 'platform_admin' ? 'platform_admin' : 'admin', // First org creator is always Admin
      platformRole,
      title: platformRole === 'founder' ? 'Platform Founder' : 'Organization Administrator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      teamId: null,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryDb.users.set(userId, newUser);

    // 2. Create Workspace
    const slug = data.workspaceName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace';

    const newWorkspace: Workspace = {
      id: workspaceId,
      name: data.workspaceName.trim(),
      // SECURITY (Phase 17): crypto-random slug suffix instead of Math.random()
      slug: `${slug}-${generateUniqueId().slice(-8)}`,
      ownerId: userId,
      plan: 'pro',
      logo: null,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryDb.workspaces.set(workspaceId, newWorkspace);

    // 3. Create Workspace Membership
    const membershipId = crypto.randomUUID();
    const membership: WorkspaceMember = {
      id: membershipId,
      workspaceId,
      userId,
      role: 'admin',
      joinedAt: now,
    };
    inMemoryDb.workspaceMembers.set(membershipId, membership);

    // 4. Create Session
    const token = generateSessionToken();
    const expiresAt = calculateSessionExpiry(7);
    const newSession: Session = {
      id: crypto.randomUUID(),
      userId,
      workspaceId,
      token,
      expiresAt,
      createdAt: now,
      lastActiveAt: now,
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(token, newSession);

    // Persist to PostgreSQL if connected
    if (db) {
      try {
        await db.insert(schema.users).values(newUser as any);
        await db.insert(schema.workspaces).values(newWorkspace as any);
        await db.insert(schema.workspaceMembers).values(membership as any);
        await db.insert(schema.sessions).values(newSession as any);
      } catch (err: any) {
        console.error('[AuthService] PostgreSQL insert failed during registerAdmin:', err.message);
      }
    }

    return {
      user: sanitizeUser(newUser),
      workspace: sanitizeWorkspace(newWorkspace, 'admin'),
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Register an invited Employee or Intern into an existing Workspace
   */
  static async registerMember(
    input: z.infer<typeof registerMemberSchema> & { requestedRole?: string }
  ): Promise<AuthSessionResponse> {
    const data = registerMemberSchema.parse(input);
    const normalizedEmail = data.email.toLowerCase().trim();
    const db = getDb();

    // Verify workspace exists in-memory or db
    let workspace = inMemoryDb.workspaces.get(data.workspaceId);
    if (!workspace && db) {
      try {
        const dbWs = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, data.workspaceId)).limit(1);
        if (dbWs.length > 0) {
          workspace = dbWs[0] as Workspace;
          inMemoryDb.workspaces.set(workspace.id, workspace);
        }
      } catch (err) {
        // Fallback
      }
    }
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND');
    }

    // Check if user already exists
    let existing: any = Array.from(inMemoryDb.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (!existing && db) {
      try {
        const dbUsers = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).limit(1);
        if (dbUsers.length > 0) existing = dbUsers[0];
      } catch (err) {
        // Fallback
      }
    }
    if (existing) {
      throw new Error('USER_EXISTS');
    }

    // Role safety check: client can NEVER self-promote to 'admin'
    const assignedRole: UserRole = data.role === 'intern' ? 'intern' : 'employee';

    const hashedPassword = await hashPassword(data.password);
    const userId = crypto.randomUUID();
    const now = new Date();
    const platformRole = determinePlatformRole(normalizedEmail);

    const newUser: User = {
      id: userId,
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: platformRole === 'founder' || platformRole === 'platform_admin' ? 'platform_admin' : assignedRole,
      platformRole,
      title: assignedRole === 'intern' ? 'Product Intern' : 'Operations Specialist',
      avatar: assignedRole === 'intern' 
        ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      teamId: null,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryDb.users.set(userId, newUser);

    const membershipId = crypto.randomUUID();
    const membership: WorkspaceMember = {
      id: membershipId,
      workspaceId: workspace.id,
      userId,
      role: assignedRole,
      joinedAt: now,
    };
    inMemoryDb.workspaceMembers.set(membershipId, membership);

    const token = generateSessionToken();
    const expiresAt = calculateSessionExpiry(7);
    const newSession: Session = {
      id: crypto.randomUUID(),
      userId,
      workspaceId: workspace.id,
      token,
      expiresAt,
      createdAt: now,
      lastActiveAt: now,
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(token, newSession);

    // Persist to PostgreSQL if connected
    if (db) {
      try {
        await db.insert(schema.users).values(newUser as any);
        await db.insert(schema.workspaceMembers).values(membership as any);
        await db.insert(schema.sessions).values(newSession as any);
      } catch (err: any) {
        console.error('[AuthService] PostgreSQL insert failed during registerMember:', err.message);
      }
    }

    return {
      user: sanitizeUser(newUser),
      workspace: sanitizeWorkspace(workspace, assignedRole),
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Log in an existing user with email and password
   */
  static async login(input: z.infer<typeof loginSchema>): Promise<AuthSessionResponse> {
    const data = loginSchema.parse(input);
    const normalizedEmail = data.email.toLowerCase().trim();
    const db = getDb();

    console.log('[AuthService] ============================================================');
    console.log(`[AuthService] [LOGIN ATTEMPT] Incoming email: "${normalizedEmail}"`);
    console.log(`[AuthService] Active Database Connection: ${db ? 'PostgreSQL (Neon Serverless)' : 'In-Memory Store (Local / Test)'}`);

    // 1. Look up user in PostgreSQL FIRST if connected
    let user: any = null;
    let userSource = 'none';

    if (db) {
      try {
        const dbUsers = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).limit(1);
        if (dbUsers.length > 0) {
          user = dbUsers[0];
          userSource = 'PostgreSQL (Neon)';
          inMemoryDb.users.set(user.id, user as User);
        }
      } catch (err: any) {
        console.error('[AuthService] PostgreSQL user query error:', err.message);
      }
    }

    // Fallback to in-memory store if not found in PostgreSQL or offline test mode
    if (!user) {
      user = Array.from(inMemoryDb.users.values()).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (user) userSource = 'In-Memory Store';
    }

    console.log(`[AuthService] User lookup result: ${user ? `FOUND in ${userSource} (ID: ${user.id}, Role: ${user.role}, Platform: ${user.platformRole})` : 'NOT FOUND (0 matches)'}`);

    if (!user) {
      console.warn(`[AuthService] Authentication failed: User "${normalizedEmail}" not found in database.`);
      console.log('[AuthService] ============================================================');
      throw new Error('INVALID_CREDENTIALS');
    }

    console.log(`[AuthService] Stored password hash: ${user.password ? `${user.password.slice(0, 15)}... (len: ${user.password.length})` : 'EMPTY'}`);

    // 2. Validate Password with bcrypt
    const isValidPassword = await verifyPassword(data.password, user.password);
    console.log(`[AuthService] bcrypt.compare("${data.password ? '***' : ''}", hash) result: ${isValidPassword ? '✅ VALID' : '❌ INVALID'}`);

    if (!isValidPassword) {
      console.warn(`[AuthService] Authentication failed: Password mismatch for user "${normalizedEmail}".`);
      console.log('[AuthService] ============================================================');
      throw new Error('INVALID_CREDENTIALS');
    }

    // 3. Update platform role if configured in env
    const currentPlatformRole = determinePlatformRole(normalizedEmail);
    if (currentPlatformRole !== 'none' && user.platformRole !== currentPlatformRole) {
      user.platformRole = currentPlatformRole;
      if (currentPlatformRole === 'founder' || currentPlatformRole === 'platform_admin') {
        user.role = 'platform_admin';
      }
      user.updatedAt = new Date();
      inMemoryDb.users.set(user.id, user);
      if (db) {
        try {
          await db.update(schema.users).set({ platformRole: currentPlatformRole, role: user.role, updatedAt: user.updatedAt }).where(eq(schema.users.id, user.id));
        } catch {
          // Fallback
        }
      }
    }

    // 4. Resolve user's workspace membership (PostgreSQL priority)
    let userWorkspace: Workspace | null = null;
    let userRoleInWorkspace: UserRole = user.role as UserRole;

    if (db) {
      try {
        const owned = await db.select().from(schema.workspaces).where(eq(schema.workspaces.ownerId, user.id)).limit(1);
        if (owned.length > 0) {
          userWorkspace = owned[0] as Workspace;
          userRoleInWorkspace = 'admin';
          inMemoryDb.workspaces.set(userWorkspace.id, userWorkspace);
        } else {
          const mems = await db.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, user.id)).limit(1);
          if (mems.length > 0) {
            const ws = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, mems[0].workspaceId)).limit(1);
            if (ws.length > 0) {
              userWorkspace = ws[0] as Workspace;
              userRoleInWorkspace = mems[0].role as UserRole;
              inMemoryDb.workspaces.set(userWorkspace.id, userWorkspace);
              inMemoryDb.workspaceMembers.set(mems[0].id, mems[0] as WorkspaceMember);
            }
          }
        }
      } catch (err: any) {
        console.error('[AuthService] PostgreSQL workspace lookup error:', err.message);
      }
    }

    if (!userWorkspace) {
      const ownedWorkspace = Array.from(inMemoryDb.workspaces.values()).find(
        (w) => w.ownerId === user.id
      );
      if (ownedWorkspace) {
        userWorkspace = ownedWorkspace;
        userRoleInWorkspace = 'admin';
      } else {
        const membership = Array.from(inMemoryDb.workspaceMembers.values()).find(
          (m) => m.userId === user.id
        );
        if (membership) {
          userWorkspace = inMemoryDb.workspaces.get(membership.workspaceId) || null;
          userRoleInWorkspace = membership.role as UserRole;
        }
      }
    }

    console.log(`[AuthService] Workspace lookup result: ${userWorkspace ? `FOUND "${userWorkspace.name}" (ID: ${userWorkspace.id}, Role: ${userRoleInWorkspace})` : 'NONE'}`);

    // 5. Create new session
    const now = new Date();
    const token = generateSessionToken();
    const expiresAt = calculateSessionExpiry(7);
    const session: Session = {
      id: crypto.randomUUID(),
      userId: user.id,
      workspaceId: userWorkspace?.id || null,
      token,
      expiresAt,
      createdAt: now,
      lastActiveAt: now,
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(token, session);

    if (db) {
      try {
        await db.insert(schema.sessions).values(session as any);
        console.log(`[AuthService] Session row persisted in PostgreSQL (Token: ${token.slice(0, 12)}...)`);
      } catch (err: any) {
        console.error('[AuthService] PostgreSQL session insert failed during login:', err.message);
      }
    }

    console.log(`[AuthService] Login successful for "${normalizedEmail}". Session active.`);
    console.log('[AuthService] ============================================================');

    return {
      user: sanitizeUser(user),
      workspace: userWorkspace ? sanitizeWorkspace(userWorkspace, userRoleInWorkspace) : null,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Validate an active session token and return user identity from server
   * Enforces:
   * 1. Absolute timeout (expiresAt timestamp)
   * 2. Idle timeout (inactivity threshold: 4 hours / 14,400,000 ms)
   */
  static async getSession(token: string, options?: { maxIdleMs?: number }): Promise<AuthSessionResponse | null> {
    if (!token) return null;
    const db = getDb();

    let session = inMemoryDb.sessions.get(token);
    if (!session && db) {
      try {
        const dbSessions = await db.select().from(schema.sessions).where(eq(schema.sessions.token, token)).limit(1);
        if (dbSessions.length > 0) {
          session = dbSessions[0] as Session;
          inMemoryDb.sessions.set(token, session);
        }
      } catch (err: any) {
        console.error('[AuthService] PostgreSQL session lookup error:', err.message);
      }
    }

    if (!session) return null;

    const now = Date.now();
    const expiryTime = new Date(session.expiresAt).getTime();

    // 1. Absolute Expiration Check (7 days maximum)
    if (now > expiryTime) {
      inMemoryDb.sessions.delete(token);
      if (db) {
        try {
          await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
        } catch {}
      }
      return null;
    }

    // 2. Idle Timeout Check (default 4 hours / 14,400,000 ms)
    const maxIdleMs = options?.maxIdleMs || (4 * 60 * 60 * 1000);
    const lastActiveTime = session.lastActiveAt ? new Date(session.lastActiveAt).getTime() : new Date(session.createdAt).getTime();
    if (now - lastActiveTime > maxIdleMs) {
      inMemoryDb.sessions.delete(token);
      if (db) {
        try {
          await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
        } catch {}
      }
      return null;
    }

    // Update lastActiveAt to slide the idle window
    session.lastActiveAt = new Date();
    if (db) {
      try {
        await db.update(schema.sessions).set({ lastActiveAt: session.lastActiveAt }).where(eq(schema.sessions.token, token));
      } catch {}
    }

    let user = inMemoryDb.users.get(session.userId);
    if (!user && db) {
      try {
        const dbUsers = await db.select().from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
        if (dbUsers.length > 0) {
          user = dbUsers[0] as User;
          inMemoryDb.users.set(user.id, user);
        }
      } catch {}
    }

    if (!user) {
      inMemoryDb.sessions.delete(token);
      return null;
    }

    let workspace: Workspace | null = null;
    let roleInWorkspace: UserRole = user.role as UserRole;

    if (session.workspaceId) {
      workspace = inMemoryDb.workspaces.get(session.workspaceId) || null;
      if (!workspace && db) {
        try {
          const dbWs = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, session.workspaceId)).limit(1);
          if (dbWs.length > 0) {
            workspace = dbWs[0] as Workspace;
            inMemoryDb.workspaces.set(workspace.id, workspace);
          }
        } catch {}
      }

      if (workspace) {
        let member: any = Array.from(inMemoryDb.workspaceMembers.values()).find(
          (m) => m.workspaceId === workspace!.id && m.userId === user!.id
        );
        if (!member && db) {
          try {
            const dbMems = await db.select().from(schema.workspaceMembers).where(
              and(eq(schema.workspaceMembers.workspaceId, workspace.id), eq(schema.workspaceMembers.userId, user.id))
            ).limit(1);
            if (dbMems.length > 0) {
              member = dbMems[0];
              inMemoryDb.workspaceMembers.set(member.id, member as WorkspaceMember);
            }
          } catch {}
        }

        if (member) {
          roleInWorkspace = member.role as UserRole;
        } else if (workspace.ownerId === user.id) {
          roleInWorkspace = 'admin';
        } else {
          workspace = null;
          roleInWorkspace = user.role as UserRole;
        }
      }
    }

    // Fallback: If workspace not resolved from session.workspaceId, resolve user's primary workspace
    if (!workspace) {
      if (db) {
        try {
          const owned = await db.select().from(schema.workspaces).where(eq(schema.workspaces.ownerId, user.id)).limit(1);
          if (owned.length > 0) {
            workspace = owned[0] as Workspace;
            roleInWorkspace = 'admin';
            inMemoryDb.workspaces.set(workspace.id, workspace);
          } else {
            const mems = await db.select().from(schema.workspaceMembers).where(eq(schema.workspaceMembers.userId, user.id)).limit(1);
            if (mems.length > 0) {
              const ws = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, mems[0].workspaceId)).limit(1);
              if (ws.length > 0) {
                workspace = ws[0] as Workspace;
                roleInWorkspace = mems[0].role as UserRole;
                inMemoryDb.workspaces.set(workspace.id, workspace);
                inMemoryDb.workspaceMembers.set(mems[0].id, mems[0] as WorkspaceMember);
              }
            }
          }
        } catch (err: any) {
          console.warn('[AuthService] Fallback workspace lookup note:', err.message);
        }
      }

      if (!workspace) {
        const ownedInMemory = Array.from(inMemoryDb.workspaces.values()).find((w) => w.ownerId === user.id);
        if (ownedInMemory) {
          workspace = ownedInMemory;
          roleInWorkspace = 'admin';
        } else {
          const mem = Array.from(inMemoryDb.workspaceMembers.values()).find((m) => m.userId === user.id);
          if (mem) {
            workspace = inMemoryDb.workspaces.get(mem.workspaceId) || null;
            roleInWorkspace = mem.role as UserRole;
          }
        }
      }

      // If workspace resolved via fallback, update session.workspaceId
      if (workspace && !session.workspaceId) {
        session.workspaceId = workspace.id;
        inMemoryDb.sessions.set(session.token, session);
        if (db) {
          try {
            await db.update(schema.sessions).set({ workspaceId: workspace.id }).where(eq(schema.sessions.token, session.token));
          } catch {}
        }
      }
    }

    return {
      user: sanitizeUser(user),
      workspace: workspace ? sanitizeWorkspace(workspace, roleInWorkspace) : null,
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
    };
  }

  /**
   * Invalidate a session token on logout
   */
  static async logout(token: string): Promise<boolean> {
    if (!token) return false;
    inMemoryDb.sessions.delete(token);
    const db = getDb();
    if (db) {
      try {
        await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
      } catch {}
    }
    return true;
  }

  /**
   * PLATFORM ADMIN & FOUNDER BOOTSTRAP (Phase 20A)
   *
   * Promotes users whose emails are listed in FOUNDER_EMAILS, PLATFORM_ADMIN_EMAILS,
   * or SUPPORT_EMAILS to their respective platform roles. Called during server
   * startup; also invocable from operational tooling. Role assignment is
   * strictly server-side — no client path can request these roles.
   */
  static async bootstrapPlatformAdmins(): Promise<{ promoted: string[] }> {
    const founderEmails = getFounderEmails();
    const adminEmails = getPlatformAdminEmails();
    const supportEmails = getSupportEmails();

    const promoted: string[] = [];
    for (const user of inMemoryDb.users.values()) {
      const email = user.email.toLowerCase().trim();
      let newPlatformRole: PlatformRole = 'none';

      if (founderEmails.includes(email)) {
        newPlatformRole = 'founder';
      } else if (adminEmails.includes(email)) {
        newPlatformRole = 'platform_admin';
      } else if (supportEmails.includes(email)) {
        newPlatformRole = 'support';
      }

      if (newPlatformRole !== 'none') {
        user.platformRole = newPlatformRole;
        if (newPlatformRole === 'founder' || newPlatformRole === 'platform_admin') {
          user.role = 'platform_admin';
        }
        user.updatedAt = new Date();
        inMemoryDb.users.set(user.id, user);
        promoted.push(`${email} (${newPlatformRole})`);
      }
    }
    return { promoted };
  }

  /**
   * Resolve a fresh user record by id (server-side role re-verification).
   */
  static getUserById(userId: string): SafeUser | null {
    const user = inMemoryDb.users.get(userId);
    return user ? sanitizeUser(user) : null;
  }
}
