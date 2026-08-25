import { inMemoryDb, WorkspaceInvite, User, WorkspaceMember, Session, TeamMember } from '../../packages/database';
import { hashPassword, generateSessionToken, calculateSessionExpiry } from '../auth/auth';
import { SafeUser, SafeWorkspace, AuthSessionResponse, UserRole } from '../types';
import { sanitizeUser, sanitizeWorkspace } from './auth-service';
import { EventService } from './event-service';
import { EmailService } from './email-service';
// SECURITY (Phase 17 — Fix #3): all bearer credentials share one CSPRNG source.
import { generateSecureToken } from '../lib/secure-token';

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

// Extended invite with status lifecycle
export interface InviteWithStatus extends WorkspaceInvite {
  status: 'pending' | 'sent' | 'opened' | 'accepted' | 'expired';
  openedAt?: Date | null;
  sentAt?: Date | null;
  resendCount?: number;
}

export class InviteService {
  /**
   * Create a new workspace invitation (Admin only)
   */
  static async createInvite(input: CreateInviteInput): Promise<any> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const assignedRole = input.role === 'intern' ? 'intern' : 'employee'; // Never admin

    // Verify workspace exists
    const workspace = inMemoryDb.workspaces.get(input.workspaceId);
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND');
    }

    const inviteId = crypto.randomUUID();
    // SECURITY (Phase 17 — Fix #3): 256-bit CSPRNG token (64 hex chars).
    const token = generateSecureToken();
    const now = new Date();
    const expiresAt = calculateSessionExpiry(7); // 7 days valid

    const newInvite: InviteWithStatus = {
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
      status: 'sent',
      sentAt: now,
      openedAt: null,
      resendCount: 0,
    };

    inMemoryDb.workspaceInvites.set(token, newInvite);
    inMemoryDb.workspaceInvites.set(inviteId, newInvite);

    // Send invitation email
    try {
      const inviteUrl = `${process.env.FRONTEND_URL || 'https://workspace-mavr.onrender.com'}/invites/accept?token=${token}`;
      await EmailService.sendWorkspaceInvite(normalizedEmail, workspace.name, inviteUrl);
    } catch (emailErr) {
      console.warn('[InviteService] Email dispatch warning:', emailErr);
    }

    return {
      id: newInvite.id,
      workspace_id: newInvite.workspaceId,
      workspaceId: newInvite.workspaceId,
      email: newInvite.email,
      role: newInvite.role,
      token: newInvite.token,
      invited_by: newInvite.invitedBy,
      invitedBy: newInvite.invitedBy,
      team_id: newInvite.teamId,
      teamId: newInvite.teamId,
      expires_at: newInvite.expiresAt.toISOString(),
      expiresAt: newInvite.expiresAt.toISOString(),
      accepted_at: null,
      acceptedAt: null,
      created_at: newInvite.createdAt.toISOString(),
      createdAt: newInvite.createdAt.toISOString(),
      status: newInvite.status,
      sentAt: newInvite.sentAt?.toISOString() || null,
    };
  }

  /**
   * Resend an invitation email (Admin only, max 3 resends)
   */
  static async resendInvite(inviteId: string, workspaceId: string): Promise<{ success: boolean; message: string }> {
    const invite = inMemoryDb.workspaceInvites.get(inviteId) as InviteWithStatus | undefined;
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new Error('INVITE_NOT_FOUND');
    }
    if (invite.acceptedAt) {
      throw new Error('INVITE_ALREADY_ACCEPTED');
    }
    if (new Date() > new Date(invite.expiresAt)) {
      throw new Error('INVITE_EXPIRED');
    }

    const resendCount = (invite.resendCount || 0) + 1;
    if (resendCount > 3) {
      throw new Error('INVITE_RESEND_LIMIT_EXCEEDED');
    }

    // Refresh expiry on resend
    const newExpiry = calculateSessionExpiry(7);
    (invite as any).expiresAt = newExpiry;
    (invite as any).sentAt = new Date();
    (invite as any).resendCount = resendCount;
    (invite as any).status = 'sent';

    inMemoryDb.workspaceInvites.set(inviteId, invite);
    inMemoryDb.workspaceInvites.set(invite.token, invite);

    const workspace = inMemoryDb.workspaces.get(workspaceId);
    const inviteUrl = `${process.env.FRONTEND_URL || 'https://workspace-mavr.onrender.com'}/invites/accept?token=${invite.token}`;
    await EmailService.sendWorkspaceInvite(invite.email, workspace?.name || 'your workspace', inviteUrl);

    return { success: true, message: `Invitation resent to ${invite.email} (attempt ${resendCount}/3)` };
  }

  /**
   * Expire stale invites older than 7 days (housekeeping sweep)
   */
  static expireStaleInvites(workspaceId: string): { expired: number } {
    const now = new Date();
    let expiredCount = 0;
    const seen = new Set<string>();

    for (const invite of inMemoryDb.workspaceInvites.values()) {
      if (seen.has(invite.id)) continue;
      if (invite.workspaceId !== workspaceId) continue;
      seen.add(invite.id);

      if (!invite.acceptedAt && new Date(invite.expiresAt) < now) {
        (invite as InviteWithStatus).status = 'expired';
        inMemoryDb.workspaceInvites.set(invite.id, invite);
        inMemoryDb.workspaceInvites.set(invite.token, invite);
        expiredCount++;
      }
    }
    return { expired: expiredCount };
  }

  /**
   * Mark invite as opened (called when user previews invite token)
   */
  static markInviteOpened(token: string): void {
    const invite = inMemoryDb.workspaceInvites.get(token) as InviteWithStatus | undefined;
    if (invite && !invite.openedAt && !invite.acceptedAt) {
      invite.openedAt = new Date();
      invite.status = 'opened';
      inMemoryDb.workspaceInvites.set(token, invite);
      inMemoryDb.workspaceInvites.set(invite.id, invite);
    }
  }

  /**
   * Send onboarding reminder emails (Day 1, Day 3, Day 7)
   */
  static async sendOnboardingReminders(workspaceId: string): Promise<{ sent: number }> {
    const workspace = inMemoryDb.workspaces.get(workspaceId);
    if (!workspace) return { sent: 0 };

    const now = new Date();
    let sent = 0;

    for (const member of inMemoryDb.workspaceMembers.values()) {
      if (member.workspaceId !== workspaceId) continue;
      const user = inMemoryDb.users.get(member.userId);
      if (!user) continue;

      const joinedDaysAgo = Math.floor((now.getTime() - new Date(member.joinedAt).getTime()) / 86400000);

      if (joinedDaysAgo === 1 || joinedDaysAgo === 3 || joinedDaysAgo === 7) {
        const workspaceUrl = `${process.env.FRONTEND_URL || 'https://workspace-mavr.onrender.com'}/app`;
        await EmailService.sendOnboardingReminder(user.email, user.name, joinedDaysAgo, workspace.name, workspaceUrl);
        sent++;
      }
    }
    return { sent };
  }

  /**
   * Get invite analytics for a workspace
   */
  static getInviteAnalytics(workspaceId: string): {
    totalSent: number;
    totalOpened: number;
    totalAccepted: number;
    acceptanceRate: number;
    openRate: number;
    avgTimeToAcceptHours: number | null;
    pending: number;
    expired: number;
  } {
    const seen = new Set<string>();
    let totalSent = 0, totalOpened = 0, totalAccepted = 0, totalExpired = 0;
    const acceptanceTimes: number[] = [];
    const now = new Date();

    for (const invite of inMemoryDb.workspaceInvites.values()) {
      if (seen.has(invite.id)) continue;
      if (invite.workspaceId !== workspaceId) continue;
      seen.add(invite.id);

      totalSent++;
      const ext = invite as InviteWithStatus;

      if (ext.openedAt) totalOpened++;
      if (invite.acceptedAt) {
        totalAccepted++;
        const sentTime = ext.sentAt ? new Date(ext.sentAt) : new Date(invite.createdAt);
        const acceptTime = new Date(invite.acceptedAt);
        const hours = (acceptTime.getTime() - sentTime.getTime()) / 3600000;
        acceptanceTimes.push(hours);
      }
      if (!invite.acceptedAt && new Date(invite.expiresAt) < now) totalExpired++;
    }

    const pending = totalSent - totalAccepted - totalExpired;
    const avgTimeToAcceptHours = acceptanceTimes.length > 0
      ? Math.round(acceptanceTimes.reduce((a, b) => a + b, 0) / acceptanceTimes.length * 10) / 10
      : null;

    return {
      totalSent,
      totalOpened,
      totalAccepted,
      acceptanceRate: totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100) : 0,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      avgTimeToAcceptHours,
      pending: Math.max(0, pending),
      expired: totalExpired,
    };
  }

  /**
   * Delete / cancel an invite
   */
  static async cancelInvite(inviteId: string, workspaceId: string): Promise<{ success: boolean }> {
    const invite = inMemoryDb.workspaceInvites.get(inviteId);
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new Error('INVITE_NOT_FOUND');
    }
    if (invite.acceptedAt) {
      throw new Error('INVITE_ALREADY_ACCEPTED');
    }
    inMemoryDb.workspaceInvites.delete(inviteId);
    inMemoryDb.workspaceInvites.delete(invite.token);
    return { success: true };
  }

  /**
   * Get all invites for a specific workspace
   */
  static async getWorkspaceInvites(workspaceId: string): Promise<any[]> {
    const invites = Array.from(inMemoryDb.workspaceInvites.values()).filter(
      (inv) => inv.workspaceId === workspaceId && !inv.acceptedAt
    );

    // Deduplicate by token
    const unique = new Map<string, WorkspaceInvite>();
    invites.forEach((inv) => {
      if (!unique.has(inv.token)) {
        unique.set(inv.token, inv);
      }
    });

    const now = new Date();
    return Array.from(unique.values()).map((inv) => {
      const ext = inv as InviteWithStatus;
      const isExpired = new Date(inv.expiresAt) < now;
      const status = inv.acceptedAt ? 'accepted' : isExpired ? 'expired' : (ext.status || 'sent');

      return {
        id: inv.id,
        workspace_id: inv.workspaceId,
        workspaceId: inv.workspaceId,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        invited_by: inv.invitedBy,
        invitedBy: inv.invitedBy,
        team_id: inv.teamId,
        teamId: inv.teamId,
        expires_at: inv.expiresAt ? new Date(inv.expiresAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        expiresAt: inv.expiresAt ? new Date(inv.expiresAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        accepted_at: inv.acceptedAt ? new Date(inv.acceptedAt).toISOString() : null,
        acceptedAt: inv.acceptedAt ? new Date(inv.acceptedAt).toISOString() : null,
        created_at: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
        createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
        status,
        openedAt: ext.openedAt ? new Date(ext.openedAt).toISOString() : null,
        sentAt: ext.sentAt ? new Date(ext.sentAt).toISOString() : null,
        resendCount: ext.resendCount || 0,
      };
    });
  }

  /**
   * Get invite details by token (for public preview before accepting)
   */
  static async getInviteByToken(token: string): Promise<{ invite: any; workspace: SafeWorkspace }> {
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

    // Mark as opened
    this.markInviteOpened(token);

    const workspace = inMemoryDb.workspaces.get(invite.workspaceId);
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND');
    }

    const formattedInvite = {
      id: invite.id,
      workspace_id: invite.workspaceId,
      workspaceId: invite.workspaceId,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      invited_by: invite.invitedBy,
      invitedBy: invite.invitedBy,
      team_id: invite.teamId,
      teamId: invite.teamId,
      expires_at: invite.expiresAt ? new Date(invite.expiresAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
      expiresAt: invite.expiresAt ? new Date(invite.expiresAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
      accepted_at: invite.acceptedAt ? new Date(invite.acceptedAt).toISOString() : null,
      acceptedAt: invite.acceptedAt ? new Date(invite.acceptedAt).toISOString() : null,
      created_at: invite.createdAt ? new Date(invite.createdAt).toISOString() : new Date().toISOString(),
      createdAt: invite.createdAt ? new Date(invite.createdAt).toISOString() : new Date().toISOString(),
    };

    return {
      invite: formattedInvite,
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
        (m) => m.workspaceId === invite.workspace_id && m.userId === userId
      );
      if (!existingMembership) {
        const membershipId = crypto.randomUUID();
        const membership: WorkspaceMember = {
          id: membershipId,
          workspaceId: invite.workspace_id,
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
        teamId: invite.team_id || null,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryDb.users.set(userId, user);

      // Create workspace membership
      const membershipId = crypto.randomUUID();
      const membership: WorkspaceMember = {
        id: membershipId,
        workspaceId: invite.workspace_id,
        userId,
        role: assignedRole,
        joinedAt: now,
      };
      inMemoryDb.workspaceMembers.set(membershipId, membership);
    }

    // If invite had a teamId, join team
    if (invite.team_id) {
      const existingTeamMember = Array.from(inMemoryDb.teamMembers.values()).find(
        (tm) => tm.teamId === invite.team_id && tm.userId === userId
      );
      if (!existingTeamMember) {
        const teamMemberId = crypto.randomUUID();
        const teamMember: TeamMember = {
          id: teamMemberId,
          teamId: invite.team_id,
          userId,
          roleInTeam: 'member',
          joinedAt: now,
        };
        inMemoryDb.teamMembers.set(teamMemberId, teamMember);
      }
    }

    // Mark invite as accepted in inMemoryDb + update status
    const rawInvite = inMemoryDb.workspaceInvites.get(invite.id) || inMemoryDb.workspaceInvites.get(token);
    if (rawInvite) {
      rawInvite.acceptedAt = now;
      (rawInvite as InviteWithStatus).status = 'accepted';
      inMemoryDb.workspaceInvites.set(rawInvite.id, rawInvite);
      inMemoryDb.workspaceInvites.set(token, rawInvite);
    }

    // Emit event: Invite Accepted
    await EventService.emitInviteAccepted(
      { workspaceId: invite.workspace_id, actorId: userId },
      {
        id: invite.id,
        email: invite.email,
        role: assignedRole,
        invitedBy: invite.invited_by,
        teamId: invite.team_id,
      }
    );

    // Create session token
    const sessionToken = generateSessionToken();
    const expiresAt = calculateSessionExpiry(7);
    const newSession: Session = {
      id: crypto.randomUUID(),
      userId,
      workspaceId: invite.workspace_id,
      token: sessionToken,
      expiresAt,
      createdAt: now,
      ipAddress: null,
      userAgent: null,
    };
    inMemoryDb.sessions.set(sessionToken, newSession);

    const fullWorkspace = inMemoryDb.workspaces.get(invite.workspace_id)!;

    return {
      user: sanitizeUser(user),
      workspace: sanitizeWorkspace(fullWorkspace, assignedRole),
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
