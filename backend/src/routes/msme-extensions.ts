import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { requireRole, requireWorkspaceRole } from '../middleware/rbac';
import { WikiRepository } from '../repositories/wiki-repository';
import { TimeTrackingRepository } from '../repositories/time-tracking-repository';
import {
  GuestPortalRepository,
  GuestUser,
} from '../repositories/guest-portal-repository';
import { IntegrationRepository } from '../repositories/integration-repository';
import { generateSecureToken } from '../lib/secure-token';
import { GUEST_SESSION_COOKIE, CSRF_COOKIE } from '../lib/session-cookies';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';

export const wikiRouter = new Hono();
export const timeRouter = new Hono();
export const guestPortalRouter = new Hono();
export const integrationRouter = new Hono();

// ============================================================================
// 1. WIKI ROUTER
// ============================================================================
wikiRouter.use('*', authMiddleware);

const listPagesHandler = async (c: any) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const role = workspace?.roleInWorkspace || user?.role;

  const pages = await WikiRepository.getWorkspacePages(workspace?.id || '');
  
  // Filter for intern role
  const visible = pages.filter((p) => {
    if (role === 'intern') return p.visibility === 'public' || p.visibility === 'learning';
    if (role === 'employee' && p.visibility === 'private') return p.createdBy === user?.id;
    return true;
  });

  return c.json({ pages: visible }, 200);
};
wikiRouter.get('/', listPagesHandler);
wikiRouter.get('/pages', listPagesHandler);

const getPageHandler = async (c: any) => {
  const workspace = c.get('workspace');
  const pageId = c.req.param('id');
  const page = await WikiRepository.getPageById(pageId);
  if (!page || (workspace && page.workspaceId !== workspace.id)) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }
  return c.json({ page }, 200);
};
wikiRouter.get('/:id', getPageHandler);
wikiRouter.get('/pages/:id', getPageHandler);

const createPageHandler = async (c: any) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const page = await WikiRepository.createPage({
    workspaceId: workspace?.id || 'ws-default',
    parentId: body.parentId,
    title: body.title || 'Untitled Page',
    icon: body.icon || '📄',
    contentJson: body.contentJson,
    visibility: body.visibility || 'team',
    createdBy: user?.id || 'usr-default',
  });

  return c.json({ page }, 201);
};
wikiRouter.post('/', requireWorkspaceRole(['admin', 'employee']), createPageHandler);
wikiRouter.post('/pages', requireWorkspaceRole(['admin', 'employee']), createPageHandler);

const updatePageHandler = async (c: any) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const pageId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const existingPage = await WikiRepository.getPageById(pageId);
  if (!existingPage) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }
  if (workspace && existingPage.workspaceId !== workspace.id) {
    await logSecurityEvent('access.forbidden', {
      actorId: user?.id || null,
      workspaceId: workspace.id,
      resourceId: `PATCH /wiki/pages/${pageId}`,
      ...requestSecurityMeta(c),
      details: { reason: 'cross_workspace_wiki_page' },
    });
    return c.json({ error: { code: 'FORBIDDEN', message: 'Page belongs to another workspace.' } }, 403);
  }

  const updated = await WikiRepository.updatePage(pageId, body, user?.id || 'usr-default');
  if (!updated) return c.json({ error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);

  return c.json({ page: updated }, 200);
};
wikiRouter.patch('/:id', requireWorkspaceRole(['admin', 'employee']), updatePageHandler);
wikiRouter.patch('/pages/:id', requireWorkspaceRole(['admin', 'employee']), updatePageHandler);
wikiRouter.put('/:id', requireWorkspaceRole(['admin', 'employee']), updatePageHandler);

const deletePageHandler = async (c: any) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const effectiveRole = (workspace?.roleInWorkspace || user?.role || 'employee').toLowerCase();
  const pageId = c.req.param('id');

  const page = await WikiRepository.getPageById(pageId);
  if (!page || (workspace && page.workspaceId !== workspace.id)) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }

  // Admin can delete any page, Employee can delete own page
  if (effectiveRole !== 'admin' && page.createdBy !== user?.id) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Only admins or page owners can delete wiki pages.' } }, 403);
  }

  const success = await WikiRepository.deletePage(pageId);
  return c.json({ success: true, message: 'Wiki page deleted successfully.' }, 200);
};
wikiRouter.delete('/:id', requireWorkspaceRole(['admin', 'employee']), deletePageHandler);
wikiRouter.delete('/pages/:id', requireWorkspaceRole(['admin', 'employee']), deletePageHandler);

wikiRouter.get('/pages/:id/comments', async (c) => {
  const workspace = c.get('workspace');
  const pageId = c.req.param('id');

  // SECURITY (Phase 17 — Fix #8): comments may only be read for pages inside
  // the caller's workspace.
  const page = await WikiRepository.getPageById(pageId);
  if (!page || (workspace && page.workspaceId !== workspace.id)) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
  }

  const comments = await WikiRepository.getPageComments(pageId);
  return c.json({ comments }, 200);
});

wikiRouter.post('/pages/:id/comments', requireWorkspaceRole(['admin', 'employee']), async (c) => {
  const user = c.get('user');
  const pageId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const comment = await WikiRepository.addComment({
    pageId,
    userId: user?.id || 'usr-default',
    userName: user?.name || 'Team Member',
    blockId: body.blockId,
    comment: body.comment || '',
  });

  return c.json({ comment }, 201);
});

// ============================================================================
// 2. TIME TRACKING ROUTER
// ============================================================================
timeRouter.use('*', authMiddleware);

timeRouter.post('/start', async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const entry = await TimeTrackingRepository.startTimer({
    workspaceId: workspace?.id || 'ws-default',
    taskId: body.taskId || 'task-gen',
    userId: user?.id || 'usr-default',
    billable: body.billable,
    hourlyRate: body.hourlyRate,
    notes: body.notes,
  });

  return c.json({ entry }, 201);
});

timeRouter.post('/stop', async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');

  const stopped = await TimeTrackingRepository.stopActiveTimer(
    workspace?.id || 'ws-default',
    user?.id || 'usr-default'
  );

  return c.json({ entry: stopped }, 200);
});

timeRouter.get('/active', async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');

  const active = await TimeTrackingRepository.getActiveTimer(
    workspace?.id || 'ws-default',
    user?.id || 'usr-default'
  );

  return c.json({ activeTimer: active }, 200);
});

timeRouter.post('/manual', async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const entry = await TimeTrackingRepository.logManualEntry({
    workspaceId: workspace?.id || 'ws-default',
    taskId: body.taskId || 'task-gen',
    userId: user?.id || 'usr-default',
    startTime: body.startTime ? new Date(body.startTime) : new Date(),
    durationMinutes: Number(body.durationMinutes) || 60,
    billable: body.billable,
    hourlyRate: body.hourlyRate,
    notes: body.notes,
  });

  return c.json({ entry }, 201);
});

timeRouter.get('/entries', async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const role = workspace?.roleInWorkspace || user?.role;

  const filters = role === 'admin' ? {} : { userId: user?.id };
  const entries = await TimeTrackingRepository.getEntries(workspace?.id || '', filters);
  return c.json({ entries: entries || [] }, 200);
});

timeRouter.delete('/entries/:id', async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const role = workspace?.roleInWorkspace || user?.role;
  const entryId = c.req.param('id');

  const entries = await TimeTrackingRepository.getEntries(workspace?.id || '', {});
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Time entry not found.' } }, 404);
  }

  // Admin can delete any entry, others can delete only their own
  if (role !== 'admin' && entry.userId !== user?.id) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to delete this time entry.' } }, 403);
  }

  await TimeTrackingRepository.deleteEntry(entryId);
  return c.json({ success: true, message: 'Time entry deleted successfully.' }, 200);
});

timeRouter.get('/report', requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const report = await TimeTrackingRepository.getUtilizationReport(workspace?.id || '');
  return c.json({ report }, 200);
});

timeRouter.get('/analytics', requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const report = await TimeTrackingRepository.getUtilizationReport(workspace?.id || '');
  return c.json({ analytics: report }, 200);
});

// ============================================================================
// 3. GUEST PORTAL ROUTER
// ============================================================================
// SECURITY (Phase 17 — Fix #2/#3): magic links are 256-bit, single-use, and
// exchange into an httpOnly guest session cookie. Deliverable sign-off
// requires either an authenticated guest session or a workspace member with
// verified workspace ownership of the approval.

const GUEST_COOKIE_BASE = {
  path: '/',
  sameSite: 'Strict' as const,
  secure: process.env.NODE_ENV === 'production',
};

/** Strip secret material before returning a guest to any client. */
function sanitizeGuest(guest: GuestUser) {
  return {
    id: guest.id,
    workspaceId: guest.workspaceId,
    email: guest.email,
    name: guest.name,
    company: guest.company,
    lastActiveAt: guest.lastActiveAt,
    createdAt: guest.createdAt,
  };
}

// Public Magic Token Auth — consumes the single-use token and issues a
// guest portal session (httpOnly cookie).
guestPortalRouter.get('/auth/:token', async (c) => {
  const token = c.req.param('token');
  const guest = await GuestPortalRepository.consumeMagicToken(token);
  if (!guest) {
    await logSecurityEvent('guest.token_invalid', {
      actorId: null,
      workspaceId: null,
      resourceId: 'GET /portal/auth/:token',
      ...requestSecurityMeta(c),
      details: { reason: 'invalid_expired_or_reused_magic_token' },
    });
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired magic link' } }, 401);
  }

  // Issue httpOnly guest session + readable CSRF cookie for double-submit.
  const session = GuestPortalRepository.createGuestSession(guest);
  const csrfToken = generateSecureToken();
  setCookie(c, GUEST_SESSION_COOKIE, session.token, {
    ...GUEST_COOKIE_BASE,
    httpOnly: true,
    maxAge: Math.max(60, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
  });
  setCookie(c, CSRF_COOKIE, csrfToken, { ...GUEST_COOKIE_BASE, httpOnly: false, maxAge: 30 * 24 * 60 * 60 });

  const approvals = await GuestPortalRepository.getGuestApprovals(guest.id);
  return c.json({ guest: sanitizeGuest(guest), approvals, csrfToken }, 200);
});

/**
 * POST /approvals/:id/sign — Deliverable sign-off.
 *
 * Authorized principals:
 *  1. Authenticated GUEST holding a valid gs_session whose guestId owns the
 *     approval (guest permission + deliverable ownership verified).
 *  2. Workspace EMPLOYEE/ADMIN whose session workspace matches the approval's
 *     workspaceId (workspaceId verification).
 *
 * Everything else: 401 unauthenticated / 403 unauthorized.
 */
guestPortalRouter.post('/approvals/:id/sign', optionalAuthMiddleware, async (c) => {
  const approvalId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const signatureName = typeof body.signatureName === 'string' ? body.signatureName : '';
  const feedback = typeof body.feedback === 'string' ? body.feedback : undefined;

  if (!signatureName.trim()) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'signatureName is required.' } }, 400);
  }

  const approval = GuestPortalRepository.getApprovalById(approvalId);

  // --- Principal 1: workspace member (employee/admin) -----------------------
  const user = c.get('user');
  const workspace = c.get('workspace');
  if (user && workspace?.roleInWorkspace) {
    const role = workspace.roleInWorkspace;
    if (!['admin', 'employee'].includes(role)) {
      await logSecurityEvent('portal.unauthorized_signoff', {
        actorId: user.id,
        workspaceId: workspace.id,
        resourceId: approvalId,
        ...requestSecurityMeta(c),
        details: { reason: 'insufficient_workspace_role', role },
      });
      return c.json({ error: { code: 'FORBIDDEN', message: 'Workspace role cannot sign deliverables.' } }, 403);
    }
    // Workspace ownership check — cross-workspace sign-off is rejected.
    if (!approval || approval.workspaceId !== workspace.id) {
      await logSecurityEvent('portal.unauthorized_signoff', {
        actorId: user.id,
        workspaceId: workspace.id,
        resourceId: approvalId,
        ...requestSecurityMeta(c),
        details: { reason: 'approval_outside_workspace' },
      });
      return c.json({ error: { code: 'FORBIDDEN', message: 'Deliverable does not belong to your workspace.' } }, 403);
    }

    const signed = await GuestPortalRepository.signDeliverable(
      approvalId,
      approval.guestId,
      signatureName,
      feedback
    );
    if (!signed) return c.json({ error: { code: 'BAD_REQUEST', message: 'Sign-off failed' } }, 400);
    return c.json({ success: true, approval: signed }, 200);
  }

  // --- Principal 2: authenticated guest via httpOnly gs_session -------------
  const cookieHeader = c.req.header('cookie') || '';
  const guestSessionMatch = cookieHeader.match(/(?:^|;\s*)gs_session=([^;]*)/);
  if (guestSessionMatch) {
    const session = GuestPortalRepository.getGuestSession(guestSessionMatch[1]);
    if (!session) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Guest session expired. Reopen your magic link.' } }, 401);
    }
    // Deliverable ownership: the approval must belong to THIS guest AND the
    // session's guestId is authoritative — body-supplied guestId is ignored.
    if (!approval || approval.guestId !== session.guestId) {
      await logSecurityEvent('portal.unauthorized_signoff', {
        actorId: session.guestId,
        workspaceId: session.workspaceId,
        resourceId: approvalId,
        ...requestSecurityMeta(c),
        details: { reason: 'guest_does_not_own_approval' },
      });
      return c.json({ error: { code: 'FORBIDDEN', message: 'Deliverable is not assigned to this guest.' } }, 403);
    }

    const signed = await GuestPortalRepository.signDeliverable(
      approvalId,
      session.guestId,
      signatureName,
      feedback
    );
    if (!signed) return c.json({ error: { code: 'BAD_REQUEST', message: 'Sign-off failed' } }, 400);
    return c.json({ success: true, approval: signed }, 200);
  }

  // --- No valid principal ---------------------------------------------------
  await logSecurityEvent('portal.unauthorized_signoff', {
    actorId: user?.id || null,
    resourceId: approvalId,
    ...requestSecurityMeta(c),
    details: { reason: 'unauthenticated' },
  });
  return c.json(
    { error: { code: 'UNAUTHORIZED', message: 'Authentication required to sign deliverables.' } },
    401
  );
});

// Admin invite endpoint
guestPortalRouter.post('/invite', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));
  const { email, name, company, projectId } = body;
  if (!email || !name) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'email and name are required.' } }, 400);
  }

  const guest = await GuestPortalRepository.inviteGuest({
    workspaceId: workspace?.id || 'ws-default',
    email,
    name,
    company,
    projectId,
  });

  return c.json({ guest: sanitizeGuest(guest), magicUrl: `/portal?token=${guest.magicToken}` }, 201);
});

// ============================================================================
// 4. EMAIL & CALENDAR INTEGRATION ROUTER
// ============================================================================
integrationRouter.use('*', authMiddleware);

integrationRouter.get('/calendar/events', async (c) => {
  const workspace = c.get('workspace');
  const crmId = c.req.query('crmRecordId');
  const events = await IntegrationRepository.getEvents(workspace?.id || '', crmId);
  return c.json({ events }, 200);
});

integrationRouter.post('/calendar/events', async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  const event = await IntegrationRepository.createCalendarEvent({
    workspaceId: workspace?.id || 'ws-default',
    crmRecordId: body.crmRecordId,
    projectId: body.projectId,
    title: body.title || 'Discovery Call',
    description: body.description,
    startTime: body.startTime ? new Date(body.startTime) : new Date(),
    endTime: body.endTime ? new Date(body.endTime) : new Date(Date.now() + 30 * 60000),
    attendees: body.attendees,
  });

  return c.json({ event }, 201);
});

integrationRouter.get('/email/lead/:crmId', async (c) => {
  const workspace = c.get('workspace');
  const crmId = c.req.param('crmId');
  const emails = await IntegrationRepository.getLeadEmails(workspace?.id || '', crmId);
  return c.json({ emails }, 200);
});

integrationRouter.post('/email/log', async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  const email = await IntegrationRepository.logEmail({
    workspaceId: workspace?.id || 'ws-default',
    crmRecordId: body.crmRecordId,
    from: body.from || 'client@example.com',
    to: body.to || 'sales@company.com',
    subject: body.subject || 'Re: Discovery Proposal',
    snippet: body.snippet || 'We reviewed your proposal and are excited to proceed.',
    direction: body.direction || 'inbound',
  });

  return c.json({ email }, 201);
});
