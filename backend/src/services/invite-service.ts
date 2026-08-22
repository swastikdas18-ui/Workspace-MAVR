import { inMemoryDb, WorkspaceInvite, User, WorkspaceMember, Session, TeamMember } from '../../packages/database';
import { hashPassword, generateSessionToken, calculateSessionExpiry } from '../auth/auth';
import { SafeUser, SafeWorkspace, AuthSessionResponse, UserRole } from '../types';
import { sanitizeUser, sanitizeWorkspace } from './auth-service';

export interface CreateInviteInput {
  workspaceId: string;
  email: string;
  role: 'employee' | 'intern';
  invitedBy: string;
  teamId?: string | null;
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

export class InviteService {
  /**
   * Create a new workspace invitation (Admin only)
   */
  static async createInvite(input: CreateInviteInput): Promise<WorkspaceInvite> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const assignedRole = input.role === 'intern' ? 'intern' : 'employee'; // Never admin

    // Verify workspace exists
    const workspace = inMemoryDb.workspaces.get(input.workspaceId);
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND');
    }

    const inviteId = crypto.randomUUID();
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const now = new Date();
    const expiresAt = calculateSessionExpiry(7); // 7 days valid

    const newInvite: WorkspaceInvite = {
      id: inviteId,
      workspaceId: input.workspaceId,
      email: normalizedEmail,
      role: assignedRole,
      token,
      invitedBy: input.invitedBy,
      teamId: input.teamId || null,
      expiresAt,
      acceptedAt: null,
      createdAt: now,
    };

    inMemoryDb.workspaceInvites.set(inviteId, newInvite);
    return newInvite;
  }

  /**
   * Get all invites for a specific workspace
   */
  static async getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    return Array.from(inMemoryDb.workspaceInvites.values()).filter(
      (inv) => inv.workspaceId === workspaceId
    );
  }

  /**
   * Get invite details by token (for public preview before accepting)
   */
  static async getInviteByToken(token: string): Promise<{ invite: WorkspaceInvite; workspace: SafeWorkspace }> {
    const invite = Array.from(inMemoryDb.workspaceInvites.values()).find(
      (inv) => inv.token === token
    );

    if (!invite) {
      throw new Error('INVITE_NOT_FOUND');
    }

    if (invite.acceptedAt) {
      throw new Error('INVITE_ALREADY_ACCEPTED');
    }

    if (new Date() > new Date(invite.expiresAt)) {
      throw new Error('INVITE_EXPIRED');
    }

    const workspace = inMemoryDb.workspaces.get(invite.workspaceId);
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND');
    }

    return {
      invite,
      workspace: sanitizeWorkspace(workspace, invite.role as UserRole),
    };
  }

  /**
   * Accept an invitation and create user / session in target workspace
   */
  static async acceptInvite(input: AcceptInviteInput): Promise<AuthSessionResponse> {
    const { token, name, password } = input;
    const { invite, workspace } = await this.getInviteByToken(token);

    const normalizedEmail = invite.email.toLowerCase().trim();

    // Check if user with this email already exists
    let existingUser = Array.from(inMemoryDb.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    const now = new Date();
    let userId: string;
    let user: User;

    const assignedRole: UserRole = invite.role === 'intern' ? 'intern' : 'employee';

    if (existingUser) {
      userId = existingUser.id;
      user = existingUser;
      // Check if already in workspace
      const existingMembership = Array.from(inMemoryDb.workspaceMembers.values()).find(
        (m) => m.workspaceId === invite.workspaceId && m.userId === userId
      );
      if (!existingMembership) {
        const membershipId = crypto.randomUUID();
        const membership: WorkspaceMember = {
          id: membershipId,
          workspaceId: invite.workspaceId,
          userId,
          role: assignedRole,
          joinedAt: now,
        };
        inMemoryDb.workspaceMembers.set(membershipId, membership);
      }
    } else {
      userId = crypto.randomUUID();
      const hashedPassword = await hashPassword(password);

      user = {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: assignedRole, // Never admin
        title: assignedRole === 'intern' ? 'Product Intern' : 'Operations Specialist',
        avatar: assignedRole === 'intern'
          ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        teamId: invite.teamId || null,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryDb.users.set(userId, user);

      // Create workspace membership
      const membershipId = crypto.randomUUID();
      const membership: WorkspaceMember = {
        id: membershipId,
        workspaceId: invite.workspaceId,
        userId,
        role: assignedRole,
        joinedAt: now,
      };
      inMemoryDb.workspaceMembers.set(membershipId, membership);
    }

    // If invite had a teamId, join team
    if (invite.teamId) {
      const existingTeamMember = Array.from(inMemoryDb.teamMembers.values()).find(
        (tm) => tm.teamId === invite.teamId && tm.userId === userId
      );
      if (!existingTeamMember) {
        const teamMemberId = crypto.randomUUID();
        const teamMember: TeamMember = {
          id: teamMemberId,
          teamId: invite.teamId,
          userId,
          roleInTeam: 'member',
          joinedAt: now,
        };
        inMemoryDb.teamMembers.set(teamMemberId, teamMember);
      }
    }

    // Mark invite as accepted
    invite.acceptedAt = now;
    inMemoryDb.workspaceInvites.set(invite.id, invite);

    // Create session token
    const sessionToken = generateSessionToken();
    const expiresAt = calculateSessionExpiry(7);
    const newSession: Session = {
      id: crypto.randomUUID(),
      userId,
      workspaceId: invite.workspaceId,
      token: sessionToken,
      expiresAt,
      createdAt: now,
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(sessionToken, newSession);

    const fullWorkspace = inMemoryDb.workspaces.get(invite.workspaceId)!;

    return {
      user: sanitizeUser(user),
      workspace: sanitizeWorkspace(fullWorkspace, assignedRole),
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
