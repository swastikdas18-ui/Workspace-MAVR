import { Context, Next } from 'hono';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 300_000);

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default 60s)
  maxRequests?: number; // Max requests per window (default 100)
  keyPrefix?: string;
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 60_000;
  const maxRequests = options.maxRequests || 100;
  const keyPrefix = options.keyPrefix || 'global';

  return async function rateLimiter(c: Context, next: Next) {
    // In test environment, bypass rate limiter
    if (process.env.NODE_ENV === 'test') {
      await next();
      return;
    }

    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      'anonymous';

    const userId = c.get('user')?.id || ip;
    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();

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
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

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
