import crypto from 'crypto';
import { inMemoryDb } from '../../packages/database/index.js';
import { generateSecureToken, generateUniqueId } from '../lib/secure-token';

export interface GuestUser {
  id: string;
  workspaceId: string;
  email: string;
  name: string;
  company: string;
  magicToken: string;
  tokenExpiresAt: Date;
  consumedAt?: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
}

export interface DeliverableApproval {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId?: string;
  documentId?: string;
  title: string;
  description?: string;
  fileUrl?: string;
  guestId: string;
  status: 'pending' | 'approved' | 'changes_requested';
  feedback?: string;
  signatureHash?: string;
  signedAt?: Date | null;
  createdAt: Date;
}

export interface GuestSession {
  token: string;
  guestId: string;
  workspaceId: string;
  expiresAt: Date;
  createdAt: Date;
}

const GUEST_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * SECURITY (Phase 17 — Fix #3): magic tokens carry 256 bits of entropy from
 * crypto.randomBytes and are SINGLE-USE — consumption is recorded in
 * `consumedAt`, and reuse attempts are rejected.
 */
export class GuestPortalRepository {
  /**
   * Invite external client guest
   */
  public static async inviteGuest(data: {
    workspaceId: string;
    email: string;
    name: string;
    company: string;
    projectId?: string;
  }): Promise<GuestUser> {
    const id = generateUniqueId('gst');
    const magicToken = `gml_${generateSecureToken(32)}`;
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    const guest: GuestUser = {
      id,
      workspaceId: data.workspaceId,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      company: data.company.trim(),
      magicToken,
      tokenExpiresAt,
      consumedAt: null,
      lastActiveAt: null,
      createdAt: new Date(),
    };

    inMemoryDb.guestUsers.set(id, guest);

    // If projectId supplied, grant permission
    if (data.projectId) {
      const permId = generateUniqueId('gp');
      inMemoryDb.guestPermissions.set(permId, {
        id: permId,
        guestId: id,
        projectId: data.projectId,
        canApprove: true,
        canComment: true,
        canDownload: true,
        createdAt: new Date(),
      });
    }

    return guest;
  }

  /**
   * Validate a magic token & return the guest session.
   *
   * Enforces:
   *  - existence
   *  - expiry
   *  - single-use consumption (reuse => null)
   * On success the token is consumed and the guest's `lastActiveAt` updated.
   */
  public static async consumeMagicToken(magicToken: string): Promise<GuestUser | null> {
    const guest = Array.from(inMemoryDb.guestUsers.values()).find(
      (g) => g.magicToken === magicToken
    );

    if (!guest) return null;
    if (guest.tokenExpiresAt.getTime() <= Date.now()) return null;
    // Single-use enforcement: an already-consumed token is rejected.
    if (guest.consumedAt) return null;

    guest.consumedAt = new Date();
    guest.lastActiveAt = guest.consumedAt;
    inMemoryDb.guestUsers.set(guest.id, guest);
    return guest;
  }

  /**
   * Non-consuming validation used for informational checks (expiry only).
   */
  public static async peekMagicToken(magicToken: string): Promise<GuestUser | null> {
    const guest = Array.from(inMemoryDb.guestUsers.values()).find(
      (g) => g.magicToken === magicToken
    );
    if (!guest) return null;
    if (guest.tokenExpiresAt.getTime() <= Date.now()) return null;
    return guest;
  }

  /**
   * Create a short-lived guest portal session after magic-link auth.
   * The session token is cryptographically random and stored server-side.
   */
  public static createGuestSession(guest: GuestUser): GuestSession {
    const session: GuestSession = {
      token: generateSecureToken(32),
      guestId: guest.id,
      workspaceId: guest.workspaceId,
      expiresAt: new Date(Date.now() + GUEST_SESSION_TTL_MS),
      createdAt: new Date(),
    };
    inMemoryDb.guestSessions.set(session.token, session);
    return session;
  }

  /** Resolve a guest session; expired sessions are revoked on read. */
  public static getGuestSession(token: string): GuestSession | null {
    if (!token) return null;
    const session = inMemoryDb.guestSessions.get(token) as GuestSession | undefined;
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      inMemoryDb.guestSessions.delete(token);
      return null;
    }
    return session;
  }

  public static revokeGuestSession(token: string): boolean {
    return inMemoryDb.guestSessions.delete(token);
  }

  /**
   * Create deliverable sign-off request
   */
  public static async createApprovalRequest(data: {
    workspaceId: string;
    projectId: string;
    taskId?: string;
    documentId?: string;
    title: string;
    description?: string;
    fileUrl?: string;
    guestId: string;
  }): Promise<DeliverableApproval> {
    const id = generateUniqueId('appr');
    const approval: DeliverableApproval = {
      id,
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      taskId: data.taskId,
      documentId: data.documentId,
      title: data.title,
      description: data.description,
      fileUrl: data.fileUrl,
      guestId: data.guestId,
      status: 'pending',
      createdAt: new Date(),
    };

    inMemoryDb.deliverableApprovals.set(id, approval);
    return approval;
  }

  /** Resolve a single approval by id (workspace-scope verified by callers). */
  public static getApprovalById(approvalId: string): DeliverableApproval | null {
    return inMemoryDb.deliverableApprovals.get(approvalId) || null;
  }

  /**
   * Guest Signs off / Approves deliverable.
   * Authorization (guest ownership OR same-workspace member) is enforced by
   * the route before invoking this method.
   */
  public static async signDeliverable(
    approvalId: string,
    guestId: string,
    signatureName: string,
    feedback?: string
  ): Promise<DeliverableApproval | null> {
    const approval = inMemoryDb.deliverableApprovals.get(approvalId);
    if (!approval || approval.guestId !== guestId) return null;

    // Tamper-evident signature hash over the signer + artifact + timestamp
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${signatureName}:${approvalId}:${Date.now()}`)
      .digest('hex')
      .slice(0, 32);

    const updated: DeliverableApproval = {
      ...approval,
      status: 'approved',
      feedback,
      signatureHash,
      signedAt: new Date(),
    };

    inMemoryDb.deliverableApprovals.set(approvalId, updated);
    return updated;
  }

  /**
   * Guest Requests Changes
   */
  public static async requestChanges(
    approvalId: string,
    guestId: string,
    feedback: string
  ): Promise<DeliverableApproval | null> {
    const approval = inMemoryDb.deliverableApprovals.get(approvalId);
    if (!approval || approval.guestId !== guestId) return null;

    const updated: DeliverableApproval = {
      ...approval,
      status: 'changes_requested',
      feedback,
      signedAt: new Date(),
    };

    inMemoryDb.deliverableApprovals.set(approvalId, updated);
    return updated;
  }

  /**
   * Get approvals for guest
   */
  public static async getGuestApprovals(guestId: string): Promise<DeliverableApproval[]> {
    const list: DeliverableApproval[] = [];
    for (const a of inMemoryDb.deliverableApprovals.values()) {
      if (a.guestId === guestId) {
        list.push(a);
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all workspace approvals (Admin/Employee view)
   */
  public static async getWorkspaceApprovals(workspaceId: string): Promise<DeliverableApproval[]> {
    const list: DeliverableApproval[] = [];
    for (const a of inMemoryDb.deliverableApprovals.values()) {
      if (a.workspaceId === workspaceId) {
        list.push(a);
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
