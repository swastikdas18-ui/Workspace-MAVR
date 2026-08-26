/**
 * Client-Side Sentry & Error Monitoring Service
 * 
 * Provides client-side exception capture, breadcrumbs, context tagging,
 * and forwarding to backend observability endpoints.
 */

export interface ErrorContext {
  userId?: string;
  workspaceId?: string;
  role?: string;
  componentStack?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export class SentryClient {
  private static environment = import.meta.env?.MODE || 'development';

  public static captureException(
    error: Error | any,
    context?: ErrorContext
  ): string {
    const errorId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const payload = {
      id: errorId,
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      stack,
      environment: this.environment,
      context: {
        ...context,
        tags: {
          platform: 'web',
          env: this.environment,
          ...(context?.tags || {}),
        },
      },
    };

    console.error(`[Sentry Alert] [${errorId}]`, message, payload);

    // Forward to backend observability pipeline if reachable
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      try {
        window.fetch('/api/health/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {
          // Silent catch for network drops
        });
      } catch {
        // Ignored
      }
    }

    return errorId;
  }

  public static captureMessage(message: string, context?: ErrorContext): string {
    return this.captureException(new Error(message), context);
  }
}
