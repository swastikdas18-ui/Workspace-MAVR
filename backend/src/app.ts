import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth';
import { workspaceRouter } from './routes/workspace';
import { env } from './config/env';

export const app = new Hono();

// Production CORS Configuration
const allowedOrigins = [
  'https://workspace-mavr.vercel.app',
  'https://workspace-mavr.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return origin;
      }
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-session-token', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Response-Time', 'X-Powered-By'],
    credentials: true,
    maxAge: 86400,
  })
);

// Global Request Logger & Headers
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
