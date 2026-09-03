import { Context, Next, Hono } from 'hono';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function resetRateLimits() {
  rateLimitStore.clear();
}

// Clean up expired buckets every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = getCurrentTime();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 300_000);
if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

/**
 * Clock virtualization helpers for deterministic testing of window resets.
 */
let clockOffset = 0;

export function advanceRateLimitClock(ms: number) {
  clockOffset += ms;
}

export function resetRateLimitClock() {
  clockOffset = 0;
}

function getCurrentTime(): number {
  return Date.now() + clockOffset;
}

/**
 * Test environment bypass controls.
 * By default in test environment (NODE_ENV === 'test'), rate limiting is bypassed
 * so large integration test suites execute without hitting rate limits.
 * Suite 37 can explicitly enable enforcement via enableRateLimiterInTest(true).
 */
let testEnforceRateLimiter = false;
let testMaxRequestsOverride: number | null = null;

export function enableRateLimiterInTest(enable = true) {
  testEnforceRateLimiter = enable;
}

export function setTestMaxRequestsOverride(max: number | null) {
  testMaxRequestsOverride = max;
}

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default 60s)
  maxRequests?: number; // Max requests per window (default 100)
  keyPrefix?: string;
}

/**
 * Explicit route exemptions from rate limiting (Phase 37 — HIGH-02 Audit Requirement 3 & 4)
 *
 * EXEMPTION RATIONALE:
 * 1. /health, /health/*, /api/health, /api/health/*:
 *    Container orchestrators (Kubernetes, Render, Cloud Run, GCP health checkers) poll
 *    these endpoints at high frequency (every 5-10s) across multiple probe workers.
 *    Throttling health checks would trigger false-positive container restarts and downtime.
 *
 * 2. /storage/health, /api/storage/health:
 *    Internal diagnostic probe for Backblaze B2 object storage connectivity.
 *
 * 3. /ws:
 *    WebSocket upgrade endpoints. Real-time connections are managed by WebSocketServer
 *    heartbeat and presence protocol, not HTTP request rate limits.
 */
export function isExemptRoute(path: string): boolean {
  if (
    path === '/health' ||
    path.startsWith('/health/') ||
    path === '/api/health' ||
    path.startsWith('/api/health/') ||
    path === '/storage/health' ||
    path === '/api/storage/health' ||
    path === '/ws' ||
    path.startsWith('/ws/')
  ) {
    return true;
  }
  return false;
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 60_000;
  const defaultMaxRequests = options.maxRequests || 100;
  const keyPrefix = options.keyPrefix || 'global';

  return async function rateLimiter(c: Context, next: Next) {
    // 1. Deduplication guard: ensure request passes through rate limiting only once
    if (c.get('rateLimitProcessed')) {
      await next();
      return;
    }

    // 2. In test environment, bypass unless test explicitly enables enforcement
    if (process.env.NODE_ENV === 'test' && !testEnforceRateLimiter) {
      await next();
      return;
    }

    // 3. HTTP OPTIONS preflight requests are never throttled
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }

    // 4. Intentionally exempted routes (health probes & diagnostics)
    if (isExemptRoute(c.req.path)) {
      await next();
      return;
    }

    // Mark as processed so downstream routers or aliases do not duplicate execution
    c.set('rateLimitProcessed', true);

    const maxRequests =
      process.env.NODE_ENV === 'test' && testMaxRequestsOverride !== null
        ? testMaxRequestsOverride
        : defaultMaxRequests;

    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      'anonymous';

    const userId = c.get('user')?.id || ip;
    const key = `${keyPrefix}:${userId}`;
    const now = getCurrentTime();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.max(0, Math.ceil((record.resetTime - now) / 1000));

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetSeconds.toString());

    if (record.count > maxRequests) {
      c.header('Retry-After', resetSeconds.toString());
      return c.json(
        {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests. Please try again later.',
            retryAfter: resetSeconds,
          },
        },
        429
      );
    }

    await next();
  };
}

// Pre-configured rate limit tiers
export const authRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 20, // 20 attempts/min for login & registration
  keyPrefix: 'auth',
});

export const inviteRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30, // 30 requests/min for invite creation/acceptance
  keyPrefix: 'invites',
});

export const workspaceRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 120, // 120 requests/min
  keyPrefix: 'workspace',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 300, // 300 requests/min general API rate limit
  keyPrefix: 'api',
});

/**
 * Phase 37 (HIGH-02): Unified Global Rate Limiting Dispatcher
 *
 * Single Source of Truth: applyGlobalRateLimiting(app)
 *
 * Eliminates all rate limiter bypass paths:
 * - /api/* routes
 * - Root-mounted routes (/chat, /tasks, /projects, /people, /crm, /inbox, /dashboard, etc.)
 * - Feature routers
 * - Legacy route aliases
 *
 * Route Tiers:
 * - Auth (/auth/*, /api/auth/*) -> authRateLimiter (20 req/min)
 * - Invites (/invites/*, /api/invites/*) -> inviteRateLimiter (30 req/min)
 * - Workspace (/workspace/*, /api/workspace/*, /workspaces/*, /api/workspaces/*) -> workspaceRateLimiter (120 req/min)
 * - All other routes -> apiRateLimiter (300 req/min)
 *
 * Guarantees:
 * - Deduplication: exactly one rate limiter executes per request.
 * - Exemptions: /health, /api/health, /storage/health, /api/storage/health, and OPTIONS.
 */
export function createGlobalRateLimiter() {
  return async function globalRateLimiter(c: Context, next: Next) {
    // Deduplication check
    if (c.get('rateLimitProcessed')) {
      await next();
      return;
    }

    // Preflight OPTIONS requests are exempt
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }

    const path = c.req.path;

    // Health and diagnostic exemptions
    if (isExemptRoute(path)) {
      await next();
      return;
    }

    // Dispatch to specific tier based on route prefix
    if (
      path === '/auth' ||
      path.startsWith('/auth/') ||
      path === '/api/auth' ||
      path.startsWith('/api/auth/')
    ) {
      return authRateLimiter(c, next);
    }

    if (
      path === '/invites' ||
      path.startsWith('/invites/') ||
      path === '/api/invites' ||
      path.startsWith('/api/invites/')
    ) {
      return inviteRateLimiter(c, next);
    }

    if (
      path === '/workspace' ||
      path.startsWith('/workspace/') ||
      path === '/workspaces' ||
      path.startsWith('/workspaces/') ||
      path === '/api/workspace' ||
      path.startsWith('/api/workspace/') ||
      path === '/api/workspaces' ||
      path.startsWith('/api/workspaces/')
    ) {
      return workspaceRateLimiter(c, next);
    }

    // Default tier: All feature routes, root-mounted routes, /api/*, and legacy aliases
    return apiRateLimiter(c, next);
  };
}

/**
 * Mounts global rate limiting as the single source of truth on the Hono application.
 */
export function applyGlobalRateLimiting(app: Hono) {
  app.use('*', createGlobalRateLimiter());
}
