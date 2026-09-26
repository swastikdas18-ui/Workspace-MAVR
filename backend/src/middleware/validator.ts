import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';
import type { MiddlewareHandler } from 'hono';

/**
 * Standardized JSON body validator middleware using @hono/zod-validator.
 * Returns consistent HTTP 400 validation error responses when validation fails.
 */
export function validateBody<T extends ZodSchema>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    const contentType = c.req.header('Content-Type') || '';
    // If no Content-Type or empty body, check if schema can validate an empty object {}
    if (!contentType.includes('application/json')) {
      const parsed = schema.safeParse({});
      if (parsed.success) {
        return next();
      }
    } else {
      // Check if body is empty text
      try {
        const text = await c.req.raw.clone().text();
        if (!text || text.trim() === '') {
          const parsed = schema.safeParse({});
          if (parsed.success) {
            return next();
          }
        }
      } catch {
        // Fall through to validator
      }
    }

    const validator = zValidator('json', schema, (result, c) => {
      if (!result.success) {
        const error = (result as { success: false; error: any }).error;
        const firstIssue = error?.issues?.[0];
        const message = firstIssue?.message || 'Invalid request payload.';
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message,
              issues: error?.issues || [],
            },
            message,
            code: 'VALIDATION_ERROR',
          },
          400
        );
      }
    });

    return validator(c, next);
  };
}
