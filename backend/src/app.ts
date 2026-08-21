import { Hono } from 'hono';
import { authRouter } from './routes/auth';
import { workspaceRouter } from './routes/workspace';
import { env } from './config/env';

export const app = new Hono();

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
