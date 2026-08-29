import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getRequestListener } from '@hono/node-server';
import { app as honoApp } from './backend/src/app';
import { wsServer } from './backend/src/realtime/websocket-server';
import { assertProductionSecrets } from './backend/src/config/env';
import { AuthService } from './backend/src/services/auth-service';
import { runMigrations } from './backend/packages/database/migrate';
import { validateDatabaseSchema } from './backend/packages/database/schema-validator';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
  const isProduction = process.env.NODE_ENV === 'production' || isVercel;
  const databaseUrl = process.env.DATABASE_URL;

  // Telemetry: Parse Database Lineage (strictly sanitize credentials)
  let dbHost = 'none (in-memory)';
  let dbName = 'in-memory-store';
  let dbMode: 'postgres' | 'memory' = 'memory';

  if (databaseUrl) {
    try {
      const parsedUrl = new URL(databaseUrl);
      dbHost = parsedUrl.host;
      dbName = parsedUrl.pathname.replace(/^\//, '') || 'neondb';
      dbMode = 'postgres';
    } catch {
      dbHost = 'postgres-configured';
      dbName = 'custom-db';
      dbMode = 'postgres';
    }
  }

  console.log('================================================================================');
  console.log(' WORKSPACE OS STARTUP TELEMETRY');
  console.log('================================================================================');
  console.log(` DATABASE MODE:      ${dbMode}`);
  console.log(` DATABASE HOST:      ${dbHost}`);
  console.log(` DATABASE NAME:      ${dbName}`);
  console.log(` VERCEL ENVIRONMENT: ${isVercel ? `Detected (${process.env.VERCEL_ENV || 'production'})` : 'Standalone'}`);
  console.log(` DATABASE_URL SET:   ${!!databaseUrl}`);
  console.log('================================================================================');

  // Strict Production Safety: Fail fast if DATABASE_URL is missing in production or Vercel
  if (isProduction && !databaseUrl) {
    throw new Error(
      '[Workspace OS Fatal] DATABASE_URL is missing in production/Vercel environment. ' +
      'Silent in-memory fallback is strictly prohibited in production. ' +
      'Please configure DATABASE_URL in your deployment environment variables.'
    );
  }

  // Auto-run schema migrations on database startup to ensure newly added columns/tables are synchronized
  if (databaseUrl) {
    try {
      console.log('[Workspace OS] Auto-synchronizing relational database migrations...');
      await runMigrations();
      console.log('[Workspace OS] Database migrations synchronized successfully.');
      
      // Strict Startup Schema Validation: Verify required columns exist before accepting traffic
      await validateDatabaseSchema(databaseUrl);
    } catch (migErr: any) {
      if (migErr.message?.includes('[Workspace OS Schema Error]')) {
        throw migErr;
      }
      console.error('[Workspace OS Migration Notice]:', migErr.message || migErr);
    }
  }

  // SECURITY (Phase 17 — Fix #6): Fail fast when required secrets are absent.
  assertProductionSecrets();

  // SECURITY (Phase 17 — Fix #4): promote configured platform administrators.
  const { promoted } = await AuthService.bootstrapPlatformAdmins();
  if (promoted.length > 0) {
    console.log(`[Workspace OS] Platform admins provisioned: ${promoted.join(', ')}`);
  }

  const honoListener = getRequestListener(honoApp.fetch);

  const apiRoutePrefixes = [
    '/api',
    '/auth',
    '/workspace',
    '/health',
    '/storage',
    '/invites',
    '/members',
    '/projects',
    '/tasks',
    '/teams',
    '/documents',
    '/crm',
    '/notifications',
    '/activity',
    '/search',
    '/automations',
    '/presence',
    '/analytics',
    '/billing',
    '/founding-partner',
    '/executive',
    '/admin',
    '/wiki',
    '/time',
    '/portal',
    '/integrations',
    '/onboarding',
    '/portability',
    '/audit',
    '/beta',
    '/nps',
  ];

  // 1. Mount Backend API Routes & Health Check (Hono Engine)
  app.use((req, res, next) => {
    const isApiRequest = apiRoutePrefixes.some(
      (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`)
    );
    if (isApiRequest) {
      return honoListener(req, res);
    }
    next();
  });

  // 2. Vite middleware for development / Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Workspace OS] Server running on http://0.0.0.0:${PORT}`);
  });

  // Attach Real-Time Collaboration WebSocket Server
  wsServer.attach(server, '/ws');

  // Graceful shutdown handling for Cloud Run container lifecycle
  const handleShutdown = async (signal: string) => {
    console.log(`[Workspace OS] Received ${signal}. Gracefully closing server...`);
    try {
      await wsServer.close();
    } catch (wsErr) {
      console.warn('[Workspace OS] Error closing WebSocket server:', wsErr);
    }

    server.close(() => {
      console.log('[Workspace OS] HTTP & WebSocket server closed.');
      process.exit(0);
    });

    // Force close after 10s timeout
    setTimeout(() => {
      console.error('[Workspace OS] Force shutdown timeout reached.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Workspace OS] Failed to start server:', err);
  process.exit(1);
});
