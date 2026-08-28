import { Hono } from 'hono';
console.log('[BOOT] app.ts loading');
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth';
import { workspaceRouter } from './routes/workspace';
import { WorkspaceService } from './services/workspace-service';
import { authMiddleware } from './middleware/auth';
import { inviteRouter } from './routes/invites';
import { projectRouter } from './routes/projects';
import { taskRouter } from './routes/tasks';
import { teamRouter } from './routes/teams';
import { documentRouter } from './routes/documents';
import { crmRouter } from './routes/crm';
import { notificationRouter } from './routes/notifications';
import { activityRouter } from './routes/activity';
import { searchRouter } from './routes/search';
import { automationRouter } from './routes/automations';
import { presenceRouter } from './routes/presence';
import { healthRouter } from './routes/health';
import { billingRouter } from './routes/billing';
import { executiveRouter } from './routes/executive';
import { analyticsRouter, adminRouter } from './routes/protected-modules';
import { dashboardRouter } from './routes/dashboard';
import { foundingPartnerRouter } from './routes/founding-partner';
import { wikiRouter, timeRouter, guestPortalRouter, integrationRouter } from './routes/msme-extensions';
import { phase14Router } from './routes/phase14-routes';
import { phase16Router } from './routes/phase16-routes';
import { onboardingRouter } from './routes/onboarding';
import { portabilityRouter } from './routes/portability';
import { auditRouter } from './routes/audit';
import { betaRouter } from './routes/beta';
import { npsRouter } from './routes/nps';
import { env } from './config/env';
import { requestLogger } from './middleware/logger';
import { securityHeaders } from './middleware/security';
import { csrfProtection } from './middleware/csrf';
import {
  authRateLimiter,
  inviteRateLimiter,
  workspaceRateLimiter,
  apiRateLimiter,
} from './middleware/rate-limiter';

export const app = new Hono();
console.log('[BOOT] Hono app instantiated');

// Security Headers (Helmet-equivalent)
app.use('*', securityHeaders);
console.log('[BOOT] security headers middleware registered');

// Structured Request & Error Logging
app.use('*', requestLogger);
console.log('[BOOT] request logger middleware registered');

// Helper to validate allowed origins: vercel.app, render, localhost, cloud run, and any active client origin
function isOriginAllowed(origin: string): boolean {
  if (!origin) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // 1. Any *.vercel.app preview or production domain
    if (hostname.endsWith('.vercel.app') || hostname === 'vercel.app') {
      return true;
    }

    // 2. Production Render backend / Cloud Run / Google / custom domain
    if (
      hostname === 'workspace-mavr.onrender.com' ||
      hostname.endsWith('.onrender.com') ||
      hostname.endsWith('.run.app') ||
      hostname.endsWith('.google.com') ||
      hostname.endsWith('.aistudio.google.com') ||
      hostname.endsWith('.cloudshell.dev')
    ) {
      return true;
    }

    // 3. Local development & internal loopbacks
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    ) {
      return true;
    }

    // In preview/sandbox environments or when origin is present, allow origin with credentials
    return true;
  } catch {
    return true;
  }
}

// 1. GLOBAL CORS MIDDLEWARE - Applied to all routes and methods
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      // If origin header is present, validate or echo
      if (origin) {
        if (isOriginAllowed(origin)) {
          return origin;
        }
        return origin;
      }
      // If no origin (same-origin, curl, server-to-server), return host or empty
      const host = c?.req?.header('host');
      return host ? `http://${host}` : '*';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'authorization',
      'x-session-token',
      'X-Session-Token',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token',
      'x-csrf-token',
    ],
    exposeHeaders: ['Content-Length', 'X-Response-Time', 'X-Powered-By', 'Set-Cookie', 'X-CSRF-Token', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

// 2. Explicit Global OPTIONS Preflight Handler
app.options('*', (c) => {
  const origin = c.req.header('Origin') || c.req.header('origin');

  if (origin) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  } else {
    c.header('Access-Control-Allow-Origin', '*');
  }
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, x-session-token, X-Session-Token, X-Requested-With, Accept, Origin, X-CSRF-Token, x-csrf-token');
  c.header('Access-Control-Expose-Headers', 'Content-Length, X-Response-Time, X-Powered-By, Set-Cookie, X-CSRF-Token, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  return c.body(null, 204);
});

// 3. Global Request Performance Headers
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  c.header('X-Response-Time', `${ms}ms`);
  c.header('X-Powered-By', 'Workspace-OS/1.0-Hono');
});

// 4. CSRF Protection (Phase 17 — Fix #9): double-submit cookie enforcement
// for all state-changing cookie-authenticated requests.
app.use('*', csrfProtection);
console.log('[BOOT] CSRF protection middleware registered');

// Health check & diagnostic endpoints
app.route('/health', healthRouter);
app.route('/api/health', healthRouter);
console.log('[BOOT] health routes registered');

// Mount API routes with Rate Limiting
app.use('/api/auth/*', authRateLimiter);
app.use('/auth/*', authRateLimiter);
app.route('/api/auth', authRouter);
app.route('/auth', authRouter);

app.use('/api/invites/*', inviteRateLimiter);
app.use('/invites/*', inviteRateLimiter);
app.route('/api/invites', inviteRouter);
app.route('/invites', inviteRouter);

app.use('/api/workspace/*', workspaceRateLimiter);
app.use('/workspace/*', workspaceRateLimiter);
app.use('/api/workspaces/*', workspaceRateLimiter);
app.use('/workspaces/*', workspaceRateLimiter);
app.route('/api/workspace', workspaceRouter);
app.route('/workspace', workspaceRouter);
app.route('/api/workspaces', workspaceRouter);
console.log('[BOOT] workspace routes registered');
app.route('/workspaces', workspaceRouter);

// Direct /members and /api/members route aliases for workspace member directory
const getMembersHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } }, 404);
    }
    const members = await WorkspaceService.getWorkspaceMembers(user.id, workspace.id);
    return c.json({ members }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'FORBIDDEN', message: err.message || 'Failed to retrieve workspace members.' } }, 403);
  }
};
app.get('/api/members', authMiddleware, getMembersHandler);
app.get('/members', authMiddleware, getMembersHandler);

const deleteDirectMemberHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspaceCtx = c.get('workspace');
    const effectiveRole = (workspaceCtx?.roleInWorkspace || user.role || 'employee').toLowerCase();

    if (effectiveRole === 'employee' || effectiveRole === 'intern') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: `Role [${effectiveRole.toUpperCase()}] is forbidden from removing workspace members.` } },
        403
      );
    }

    if (!workspaceCtx) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace found for session.' } },
        404
      );
    }

    const targetUserId = c.req.param('id');
    const { WorkspaceRepository } = await import('./repositories/workspace-repository');
    await WorkspaceRepository.removeWorkspaceMember(workspaceCtx.id, targetUserId);
    return c.json({ success: true, message: 'Member removed from workspace successfully.' }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to remove member.' } },
      400
    );
  }
};
app.delete('/api/members/:id', authMiddleware, deleteDirectMemberHandler);
app.delete('/members/:id', authMiddleware, deleteDirectMemberHandler);


app.use('/api/*', apiRateLimiter);

app.route('/api/projects', projectRouter);
app.route('/projects', projectRouter);

app.route('/api/tasks', taskRouter);
app.route('/tasks', taskRouter);

app.route('/api/teams', teamRouter);
app.route('/teams', teamRouter);

app.route('/api/documents', documentRouter);
app.route('/documents', documentRouter);

app.route('/api/crm', crmRouter);
app.route('/crm', crmRouter);

app.route('/api/notifications', notificationRouter);
app.route('/notifications', notificationRouter);

app.route('/api/activity', activityRouter);
app.route('/activity', activityRouter);

app.route('/api/search', searchRouter);
app.route('/search', searchRouter);

app.route('/api/automations', automationRouter);
app.route('/automations', automationRouter);

app.route('/api/presence', presenceRouter);
app.route('/presence', presenceRouter);

app.route('/api/analytics', analyticsRouter);
app.route('/analytics', analyticsRouter);

app.route('/api/dashboard', dashboardRouter);
app.route('/dashboard', dashboardRouter);

// Phase 14 routes (includes /billing/webhook) MUST be mounted BEFORE
// the billingRouter sub-app so the webhook path is not intercepted
// by billingRouter's sub-app prefix.
app.route('/api/v2', phase14Router);
app.route('/api', phase14Router);

app.route('/api/billing', billingRouter);
app.route('/billing', billingRouter);

app.route('/api/founding-partner', foundingPartnerRouter);
app.route('/founding-partner', foundingPartnerRouter);

app.route('/api/executive', executiveRouter);
app.route('/executive', executiveRouter);

app.route('/api/admin', adminRouter);
app.route('/admin', adminRouter);

// Phase 12: Enterprise MSME Extension Routes
app.route('/api/wiki', wikiRouter);
app.route('/wiki', wikiRouter);

app.route('/api/time', timeRouter);
app.route('/time', timeRouter);

app.route('/api/portal', guestPortalRouter);
app.route('/portal', guestPortalRouter);

app.route('/api/integrations', integrationRouter);
app.route('/integrations', integrationRouter);

// Phase 21: Real World Operations, Portability, Onboarding & Compliance
app.route('/api/onboarding', onboardingRouter);
app.route('/onboarding', onboardingRouter);

app.route('/api/portability', portabilityRouter);
app.route('/portability', portabilityRouter);

app.route('/api/audit', auditRouter);
app.route('/audit', auditRouter);

// Phase 22: Closed Beta Execution & Launch Readiness
app.route('/api/beta', betaRouter);
app.route('/beta', betaRouter);

// Phase 23: Real NPS Survey System
app.route('/api/nps', npsRouter);
app.route('/nps', npsRouter);

// Phase 14: Enterprise Revenue & Beta Readiness Routes
// (already mounted above, before billingRouter, to avoid /billing/webhook collision)

// Phase 16: Beta Readiness Hardening — Export, Digest, Audit Search, Founder Console
app.route('/api', phase16Router);
app.route('/api/v2', phase16Router);

// Global Error Handler
app.onError((err, c) => {
  console.error('[API Error]:', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred. Please try again later.',
      },
    },
    500
  );
});
console.log('[BOOT] global error handler registered');

// 404 Handler for undefined routes
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint not found: ${c.req.method} ${c.req.url}`,
      },
    },
    404
  );
});
console.log('[BOOT] 404 handler registered');

export default app;
