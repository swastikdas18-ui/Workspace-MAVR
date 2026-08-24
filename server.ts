import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getRequestListener } from '@hono/node-server';
import { app as honoApp } from './backend/src/app';
import { wsServer } from './backend/src/realtime/websocket-server';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Strict Production Safety: Fail fast if DATABASE_URL is missing in production
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new Error('[Workspace OS Fatal] DATABASE_URL is missing in production. In-memory persistence fallback is strictly prohibited.');
  }

  const honoListener = getRequestListener(honoApp.fetch);

  // 1. Mount Backend API Routes & Health Check (Hono Engine)
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/workspace') ||
      req.path === '/health'
    ) {
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
