import { Context, Next } from 'hono';

export interface StructuredLog {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  workspaceId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
  errorCode?: string;
}

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  const method = c.req.method;
  const path = c.req.path;
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';

  c.header('X-Request-ID', requestId);

  try {
    await next();

    const durationMs = Date.now() - start;
    const user = c.get('user');
    const workspace = c.get('workspace');
    const status = c.res.status;

    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      requestId,
      method,
      path,
      status,
      durationMs,
      userId: user?.id,
      workspaceId: workspace?.id,
      role: user?.role,
      ip,
      userAgent,
    };

    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(logEntry));
    }
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const user = c.get('user');
    const workspace = c.get('workspace');

    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      requestId,
      method,
      path,
      status: 500,
      durationMs,
      userId: user?.id,
      workspaceId: workspace?.id,
      role: user?.role,
      ip,
      userAgent,
      error: err.message || 'Unknown error',
      errorCode: err.code || 'INTERNAL_ERROR',
    };

    console.error(JSON.stringify(logEntry));
    throw err;
  }
}
