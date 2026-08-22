import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth';
import { workspaceRouter } from './routes/workspace';
import { env } from './config/env';

export const app = new Hono();

// Helper to validate allowed origins: *.vercel.app, render, localhost, reject unknown
function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // 1. Any *.vercel.app preview or production domain
    if (hostname.endsWith('.vercel.app') || hostname === 'vercel.app') {
      return true;
    }

    // 2. Production Render backend / custom domain
    if (
      hostname === 'workspace-mavr.onrender.com' ||
      hostname.endsWith('.onrender.com') ||
      hostname.endsWith('.run.app')
    ) {
      return true;
    }

    // 3. Local development
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// 1. Temporary Debug & Origin Logger Middleware (runs on EVERY request)
app.use('*', async (c, next) => {
  const origin = c.req.header('origin') || c.req.header('Origin');
  console.log('Origin:', origin);
  await next();
});

// 2. GLOBAL CORS MIDDLEWARE - Applied to all routes and methods
app.use(
  '*',
  cors({
    origin: (origin) => {
      // If no origin header is provided (e.g. server-to-server, curl, Postman), allow
      if (!origin) return '*';

      // Validate origin against allowed domains
      if (isOriginAllowed(origin)) {
        return origin;
      }

      // Reject unknown origins by returning empty string or null (CORS failure)
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'x-session-token',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposeHeaders: ['Content-Length', 'X-Response-Time', 'X-Powered-By'],
    credentials: true,
    maxAge: 86400,
  })
);

// 3. Explicit Global OPTIONS Preflight Handler
app.options('*', (c) => {
  const origin = c.req.header('Origin') || c.req.header('origin') || '';

  if (origin && isOriginAllowed(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-token, X-Requested-With, Accept, Origin');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400');
  }

  return c.body(null, 204);
});

// 3. Global Request Logger & Performance Headers
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  c.header('X-Response-Time', `${ms}ms`);
  c.header('X-Powered-By', 'Workspace-OS/1.0-Hono');
});

// Health check endpoints
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Workspace OS',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    database: 'PostgreSQL (Neon / Drizzle ORM)',
    auth: 'Better Auth (Session Active)',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes (supporting both /api/auth and /auth directly as per specs)
app.route('/api/auth', authRouter);
app.route('/auth', authRouter);

app.route('/api/workspace', workspaceRouter);
app.route('/workspace', workspaceRouter);

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
