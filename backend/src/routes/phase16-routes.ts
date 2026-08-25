/**
 * Phase 16 Routes — Beta Readiness Hardening Sprint
 *
 * Covers:
 * - Data Export (CSV + JSON backup)
 * - Daily/Weekly Digest Engine
 * - Founder Admin Console
 * - Audit Log Search
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { requireFounder, requirePlatformAdmin, requireSupport } from '../middleware/platform-admin';
import { inMemoryDb } from '../../packages/database';
import { ExportService } from '../services/export-service';
import { DigestService } from '../services/digest-service';
import { AuditRepository } from '../repositories/audit-repository';
import { WorkspaceHealthService } from '../services/workspace-health-service';
import { EmailService } from '../services/email-service';
import { EmailHealthService } from '../services/email-health-service';
import { BackupService } from '../services/backup-service';
import { SentryService } from '../services/sentry-service';
import { PLAN_CONFIG, PlanTier } from '../repositories/billing-repository';
import { PricingEngine } from '../services/pricing-engine';

export const phase16Router = new Hono();

// ============================================================================
// PART 4 — DATA EXPORT SAFETY
// ============================================================================

const exportRouter = new Hono();
exportRouter.use('*', authMiddleware);
exportRouter.use('*', requireWorkspaceRole(['admin']));

/**
 * GET /api/export/projects — Export projects as CSV
 */
exportRouter.get('/projects', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const csv = ExportService.exportProjectsCSV(workspace.id);
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="projects-${workspace.id}-${Date.now()}.csv"`);
    return c.text(csv, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/export/tasks — Export tasks as CSV
 */
exportRouter.get('/tasks', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const csv = ExportService.exportTasksCSV(workspace.id);
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="tasks-${workspace.id}-${Date.now()}.csv"`);
    return c.text(csv, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/export/crm — Export CRM leads as CSV
 */
exportRouter.get('/crm', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const csv = ExportService.exportCRMCSV(workspace.id);
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="crm-${workspace.id}-${Date.now()}.csv"`);
    return c.text(csv, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/export/documents — Export document metadata as CSV
 */
exportRouter.get('/documents', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const csv = ExportService.exportDocumentsMetaCSV(workspace.id);
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="documents-${workspace.id}-${Date.now()}.csv"`);
    return c.text(csv, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/export/time-entries — Export time entries as CSV
 */
exportRouter.get('/time-entries', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const csv = ExportService.exportTimeEntriesCSV(workspace.id);
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="time-entries-${workspace.id}-${Date.now()}.csv"`);
    return c.text(csv, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/export/workspace — Export full workspace JSON backup archive
 */
exportRouter.get('/workspace', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const backup = ExportService.exportWorkspaceBackupJSON(workspace.id);
    c.header('Content-Type', 'application/json');
    c.header('Content-Disposition', `attachment; filename="workspace-backup-${workspace.id}-${Date.now()}.json"`);
    return c.json(backup, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

// ============================================================================
// PART 3 — DAILY DIGEST ENGINE
// ============================================================================

const digestRouter = new Hono();
digestRouter.use('*', authMiddleware);

/**
 * POST /api/digest/send — Manually trigger digest for workspace (Admin only)
 */
digestRouter.post('/send', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const body = await c.req.json().catch(() => ({}));
    const frequency: 'daily' | 'weekly' = body.frequency === 'weekly' ? 'weekly' : 'daily';

    const result = await DigestService.sendDigestToWorkspace(workspace.id, frequency);
    return c.json({ success: true, ...result }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/digest/preview — Preview digest data for workspace
 */
digestRouter.get('/preview', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const frequency = c.req.query('frequency') === 'weekly' ? 'weekly' : 'daily';
    const digest = frequency === 'weekly'
      ? DigestService.generateWeeklyDigest(workspace.id)
      : DigestService.generateDailyDigest(workspace.id);

    return c.json({ digest }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * PATCH /api/digest/preferences — Set digest preferences (authenticated user)
 */
digestRouter.patch('/preferences', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const body = await c.req.json();
    const frequency: 'daily' | 'weekly' | 'none' = ['daily', 'weekly', 'none'].includes(body.frequency)
      ? body.frequency
      : 'daily';

    const prefs = DigestService.setPreferences(user.id, workspace.id, frequency);
    return c.json({ preferences: prefs }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/digest/preferences — Get digest preferences (authenticated user)
 */
digestRouter.get('/preferences', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const prefs = DigestService.getPreferences(user.id, workspace.id);
    return c.json({ preferences: prefs }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

// ============================================================================
// PART 5 — AUDIT LOG SEARCH
// ============================================================================

const auditSearchRouter = new Hono();
auditSearchRouter.use('*', authMiddleware);
auditSearchRouter.use('*', requireWorkspaceRole(['admin']));

/**
 * GET /api/audit/search — Search audit logs with filters
 * Query params: search, actor, module, startDate, endDate, limit, offset
 */
auditSearchRouter.get('/search', async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);

    const search = c.req.query('search');
    const actor = c.req.query('actor');
    const module = c.req.query('module');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const limit = parseInt(c.req.query('limit') || '100', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const logs = await AuditRepository.searchAuditLogs(workspace.id, {
      search, actor, module,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit, offset,
    });

    return c.json({ logs, total: logs.length }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

// ============================================================================
// ============================================================================
// PART 7 — FOUNDER ADMIN CONSOLE & PLATFORM RBAC (Phase 20A)
// ============================================================================

export const founderConsoleRouter = new Hono();
founderConsoleRouter.use('*', authMiddleware);

/**
 * GET /api/admin/founder-console — Company-wide metrics (FOUNDERS ONLY)
 * SECURITY (Phase 20A): cross-workspace financials (MRR, ARR, all
 * payments, all customers) strictly require the founder platform role.
 * Workspace-level admins receive 403 Forbidden and the denial is audit-logged.
 */
founderConsoleRouter.get('/founder-console', requireFounder(), async (c) => {
  try {
    // Aggregate across ALL workspaces (company view)
    const allWorkspaces = Array.from(inMemoryDb.workspaces.values());
    const allUsers = Array.from(inMemoryDb.users.values());
    const allPayments = Array.from(inMemoryDb.billingPayments.values());
    const allSubscriptions = Array.from(inMemoryDb.billingSubscriptions.values());
    const sentEmails = EmailService.getSentEmails();

    // MRR / ARR from captured payments (past 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const monthlyPayments = allPayments.filter(
      (p) => p.status === 'captured' && new Date(p.createdAt || Date.now()) > thirtyDaysAgo
    );
    const mrr = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0) / 100, 0);
    const arr = mrr * 12;

    // Plan breakdown
    const planCounts: Record<string, number> = {};
    for (const ws of allWorkspaces) {
      const plan = ws.plan || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }

    // Trial workspaces (free plan)
    const trialWorkspaces = planCounts.free || 0;
    const paidWorkspaces = allWorkspaces.length - trialWorkspaces;
    const conversionRate = allWorkspaces.length > 0
      ? Math.round((paidWorkspaces / allWorkspaces.length) * 100)
      : 0;

    // Active users (past 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const activeSessions = new Set<string>();
    const wauSessions = new Set<string>();
    const mauSessions = new Set<string>();

    for (const session of inMemoryDb.sessions.values()) {
      const created = new Date(session.createdAt);
      if (created > sevenDaysAgo) wauSessions.add(session.userId);
      if (created > thirtyDaysAgo) mauSessions.add(session.userId);
      if (created > new Date(Date.now() - 86400000)) activeSessions.add(session.userId);
    }

    // Storage usage
    let totalStorageBytes = 0;
    for (const doc of inMemoryDb.documents.values()) {
      totalStorageBytes += doc.sizeBytes || 0;
    }

    // Top customers (by plan tier, then by member count)
    const planWeight: Record<string, number> = { enterprise: 5, scale: 4, business: 3, starter: 2, free: 1 };
    const topCustomers = allWorkspaces
      .sort((a, b) => (planWeight[b.plan] || 0) - (planWeight[a.plan] || 0))
      .slice(0, 10)
      .map((ws) => {
        const memberCount = Array.from(inMemoryDb.workspaceMembers.values())
          .filter((m) => m.workspaceId === ws.id).length;
        const healthScore = WorkspaceHealthService.calculateHealth(ws.id);
        return {
          id: ws.id,
          name: ws.name,
          plan: ws.plan,
          members: memberCount,
          healthScore: healthScore.score,
          healthStatus: healthScore.status,
          createdAt: ws.createdAt,
        };
      });

    // ARPU & ARPS calculations
    const paidSubs = Array.from(inMemoryDb.subscriptions.values())
      .filter((s: any) => s.plan !== 'free' && s.pricePerMonth > 0)
      .map((s: any) => ({ plan: s.plan as PlanTier, seats: s.seats || 1, pricePerMonth: s.pricePerMonth || 0 }));

    const arpu = paidSubs.length > 0
      ? Math.round(paidSubs.reduce((sum, s) => sum + s.pricePerMonth, 0) / paidSubs.length)
      : 0;
    const arps = PricingEngine.calculateARPS(paidSubs);
    const expansionRevenue = PricingEngine.calculateExpansionRevenue(paidSubs);
    const avgSeatCount = paidSubs.length > 0
      ? Math.round(paidSubs.reduce((sum, s) => sum + s.seats, 0) / paidSubs.length)
      : 0;

    // Churn risk count from health engine
    const churnRiskCount = allWorkspaces.filter((ws) => {
      const h = WorkspaceHealthService.calculateHealth(ws.id);
      return h.status === 'Critical' || h.status === 'At Risk';
    }).length;

    return c.json({
      financials: {
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        arpu,
        arps,
        expansionRevenue,
        avgSeatCount,
        churnRiskCount,
        currency: 'INR',
      },
      workspaces: {
        total: allWorkspaces.length,
        active: paidWorkspaces,
        trial: trialWorkspaces,
        paid: paidWorkspaces,
        conversionRate,
        planBreakdown: planCounts,
      },
      users: {
        total: allUsers.length,
        dau: activeSessions.size,
        wau: wauSessions.size,
        mau: mauSessions.size,
      },
      engagement: {
        emailsSent: sentEmails.length,
        storageBytes: totalStorageBytes,
        storageGB: Math.round(totalStorageBytes / (1024 * 1024 * 1024) * 100) / 100,
      },
      topCustomers,
      generatedAt: new Date().toISOString(),
    }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/admin/revenue — Detailed Financial Telemetry (FOUNDERS ONLY)
 */
founderConsoleRouter.get('/revenue', requireFounder(), async (c) => {
  try {
    const allPayments = Array.from(inMemoryDb.billingPayments.values());
    const allSubscriptions = Array.from(inMemoryDb.billingSubscriptions.values());
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const monthlyPayments = allPayments.filter(
      (p) => p.status === 'captured' && new Date(p.createdAt || Date.now()) > thirtyDaysAgo
    );
    const mrr = Math.round(monthlyPayments.reduce((sum, p) => sum + (p.amount || 0) / 100, 0));
    const arr = mrr * 12;

    const paidSubs = Array.from(inMemoryDb.subscriptions.values())
      .filter((s: any) => s.plan !== 'free' && s.pricePerMonth > 0)
      .map((s: any) => ({ plan: s.plan as PlanTier, seats: s.seats || 1, pricePerMonth: s.pricePerMonth || 0 }));

    const arpu = paidSubs.length > 0
      ? Math.round(paidSubs.reduce((sum, s) => sum + s.pricePerMonth, 0) / paidSubs.length)
      : 0;
    const arps = PricingEngine.calculateARPS(paidSubs);
    const expansionRevenue = PricingEngine.calculateExpansionRevenue(paidSubs);

    return c.json({
      revenue: {
        mrr,
        arr,
        arpu,
        arps,
        expansionRevenue,
        currency: 'INR',
        totalTransactions: allPayments.length,
        successfulTransactions: monthlyPayments.length,
      },
      subscriptions: {
        total: allSubscriptions.length,
        active: allSubscriptions.filter((s) => s.status === 'active').length,
      },
      generatedAt: new Date().toISOString(),
    }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/admin/customers — Cross-Workspace Customer Directory (PLATFORM ADMINS & FOUNDERS)
 */
founderConsoleRouter.get('/customers', requirePlatformAdmin(), async (c) => {
  try {
    const allWorkspaces = Array.from(inMemoryDb.workspaces.values());
    const customers = allWorkspaces.map((ws) => {
      const memberCount = Array.from(inMemoryDb.workspaceMembers.values())
        .filter((m) => m.workspaceId === ws.id).length;
      const health = WorkspaceHealthService.calculateHealth(ws.id);
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        plan: ws.plan,
        memberCount,
        healthScore: health.score,
        healthStatus: health.status,
        churnRisk: health.status === 'Critical' ? 'HIGH' : health.status === 'At Risk' ? 'MEDIUM' : 'LOW',
        createdAt: ws.createdAt,
      };
    });

    return c.json({ customers, total: customers.length }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/admin/platform-health — Global System & Database Health (PLATFORM ADMINS)
 */
founderConsoleRouter.get('/platform-health', requirePlatformAdmin(), async (c) => {
  try {
    const memory = process.memoryUsage();
    return c.json({
      status: 'healthy',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      stats: {
        totalWorkspaces: inMemoryDb.workspaces.size,
        totalUsers: inMemoryDb.users.size,
        activeSessions: inMemoryDb.sessions.size,
      },
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024) * 100) / 100,
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024) * 100) / 100,
      },
    }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/admin/email-health — Global Email Health & Deliverability (SUPPORT & ABOVE)
 */
founderConsoleRouter.get('/email-health', requireSupport(), async (c) => {
  try {
    const metrics = await EmailHealthService.getDeliverabilityMetrics();
    return c.json({ emailHealth: metrics }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/admin/backups — PostgreSQL Backup Snapshot Directory (FOUNDERS ONLY)
 */
founderConsoleRouter.get('/backups', requireFounder(), async (c) => {
  try {
    const backups = await BackupService.listBackups();
    return c.json({ backups, total: backups.length }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

/**
 * GET /api/admin/observability — Sentry Errors & Ring Buffer Telemetry (PLATFORM ADMINS)
 */
founderConsoleRouter.get('/observability', requirePlatformAdmin(), async (c) => {
  try {
    const reports = SentryService.getReports(50);
    return c.json({
      observability: {
        totalReports: reports.length,
        reports,
        status: 'active',
      },
    }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }, 500);
  }
});

// ============================================================================
// Register all sub-routers in phase16Router
// ============================================================================
phase16Router.route('/export', exportRouter);
phase16Router.route('/digest', digestRouter);
phase16Router.route('/audit', auditSearchRouter);
phase16Router.route('/admin', founderConsoleRouter);
