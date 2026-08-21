import { z } from 'zod';
import { inMemoryDb, User, Workspace, WorkspaceMember, Session } from '../../packages/database';
import { hashPassword, verifyPassword, generateSessionToken, calculateSessionExpiry } from '../auth/auth';
import { SafeUser, SafeWorkspace, AuthSessionResponse, UserRole } from '../types';

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

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
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

    // Check if user already exists
    const existing = Array.from(inMemoryDb.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      throw new Error('USER_EXISTS');
    }

    const hashedPassword = await hashPassword(data.password);
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const now = new Date();

    // 1. Create Admin User
    const newUser: User = {
      id: userId,
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin', // First org creator is always Admin
      title: 'Organization Administrator',
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
      slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
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
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(token, newSession);

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

    // Verify workspace exists
    const workspace = inMemoryDb.workspaces.get(data.workspaceId);
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND');
    }

    // Check if user already exists
    const existing = Array.from(inMemoryDb.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      throw new Error('USER_EXISTS');
    }

    // Role safety check: client can NEVER self-promote to 'admin'
    const assignedRole: UserRole = data.role === 'intern' ? 'intern' : 'employee';

    const hashedPassword = await hashPassword(data.password);
    const userId = crypto.randomUUID();
    const now = new Date();

    const newUser: User = {
      id: userId,
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
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
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(token, newSession);

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

    const user = Array.from(inMemoryDb.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyPassword(data.password, user.password);
    if (!isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Resolve user's workspace membership
    let userWorkspace: Workspace | null = null;
    let userRoleInWorkspace: UserRole = user.role as UserRole;

    // Check if user is owner of a workspace
    const ownedWorkspace = Array.from(inMemoryDb.workspaces.values()).find(
      (w) => w.ownerId === user.id
    );

    if (ownedWorkspace) {
      userWorkspace = ownedWorkspace;
      userRoleInWorkspace = 'admin';
    } else {
      // Find membership
      const membership = Array.from(inMemoryDb.workspaceMembers.values()).find(
        (m) => m.userId === user.id
      );
      if (membership) {
        userWorkspace = inMemoryDb.workspaces.get(membership.workspaceId) || null;
        userRoleInWorkspace = membership.role as UserRole;
      }
    }

    // Create new session
    const token = generateSessionToken();
    const expiresAt = calculateSessionExpiry(7);
    const session: Session = {
      id: crypto.randomUUID(),
      userId: user.id,
      workspaceId: userWorkspace?.id || null,
      token,
      expiresAt,
      createdAt: new Date(),
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(token, session);

    return {
      user: sanitizeUser(user),
      workspace: userWorkspace ? sanitizeWorkspace(userWorkspace, userRoleInWorkspace) : null,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Validate an active session token and return user identity from server
   */
  static async getSession(token: string): Promise<AuthSessionResponse | null> {
    if (!token) return null;

    const session = inMemoryDb.sessions.get(token);
    if (!session) return null;

    if (new Date() > new Date(session.expiresAt)) {
      inMemoryDb.sessions.delete(token);
      return null;
    }

    const user = inMemoryDb.users.get(session.userId);
    if (!user) {
      inMemoryDb.sessions.delete(token);
      return null;
    }

    let workspace: Workspace | null = null;
    let roleInWorkspace: UserRole = user.role as UserRole;

    if (session.workspaceId) {
      workspace = inMemoryDb.workspaces.get(session.workspaceId) || null;
      if (workspace) {
        const member = Array.from(inMemoryDb.workspaceMembers.values()).find(
          (m) => m.workspaceId === workspace!.id && m.userId === user.id
        );
        if (member) {
          roleInWorkspace = member.role as UserRole;
        } else if (workspace.ownerId === user.id) {
          roleInWorkspace = 'admin';
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
    return inMemoryDb.sessions.delete(token);
  }
}
