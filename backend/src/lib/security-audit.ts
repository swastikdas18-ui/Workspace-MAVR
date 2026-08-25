import { Context } from 'hono';
import { AuditRepository, CreateAuditParams } from '../repositories/audit-repository';

/**
 * SECURITY AUDIT EVENT TYPES (Phase 17 — Fix #10)
 *
 * Every denied / suspicious security-relevant action is persisted to the
 * audit_logs store with request metadata: ip, userAgent, workspaceId,
 * actorId, eventType (mapped to action) and timestamp.
 */
export type SecurityEventType =
  | 'auth.failed_login'
  | 'auth.expired_token'
  | 'auth.invalid_token'
  | 'auth.logout'
  | 'webhook.invalid_signature'
  | 'webhook.missing_signature'
  | 'access.forbidden'
  | 'csrf.failure'
  | 'guest.token_invalid'
  | 'guest.token_reuse'
  | 'portal.unauthorized_signoff';

export interface SecurityEventMeta {
  actorId?: string | null;
  workspaceId?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}

function clientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for') ||
    'unknown'
  );
}

/**
 * Extract standard request metadata from a Hono context.
 */
export function requestSecurityMeta(c: Context): Pick<SecurityEventMeta, 'ipAddress' | 'userAgent'> {
  return {
    ipAddress: clientIp(c),
    userAgent: c.req.header('user-agent') || null,
  };
}

/**
 * Persist a security event to audit_logs. Never throws — a failing audit
 * write must not break the primary request path.
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  meta: SecurityEventMeta = {}
): Promise<void> {
  try {
    const params: CreateAuditParams = {
      workspaceId: meta.workspaceId || 'platform',
      userId: meta.actorId || 'anonymous',
      action: eventType,
      resource: 'security',
      resourceId: meta.resourceId || eventType,
      newValues: meta.details ? { ...meta.details } : null,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    };
    await AuditRepository.logAudit(params);
  } catch (err) {
    console.error('[SecurityAudit] Failed to persist security event:', eventType, err);
  }
}
