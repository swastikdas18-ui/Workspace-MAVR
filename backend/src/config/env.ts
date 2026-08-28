import { z } from 'zod';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment schema.
 *
 * SECURITY (Phase 17): No secret has a default value. Secrets are resolved
 * verbatim from the environment. Startup boot MUST call
 * `assertProductionSecrets()` and abort when a required secret is missing.
 * Never silently continue with placeholder credentials.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEMO_MODE: z.string().default('true').transform((val) => val === 'true' || val === '1'),
  // Encryption master key material for AES-256-GCM token encryption
  ENCRYPTION_KEY: z.string().optional(),
  // Platform administration & Founder roles (comma-separated emails)
  FOUNDER_EMAILS: z.string().optional(),
  PLATFORM_ADMIN_EMAILS: z.string().optional(),
  SUPPORT_EMAILS: z.string().optional(),
  // Backblaze B2 S3-Compatible Object Storage
  B2_KEY_ID: z.string().optional(),
  B2_APPLICATION_KEY: z.string().optional(),
  B2_BUCKET_NAME: z.string().optional(),
  B2_ENDPOINT: z.string().optional(),
  B2_REGION: z.string().optional(),
  B2_PUBLIC_URL: z.string().optional(),
  // Razorpay India-First Payment Gateway
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Resend Email Infrastructure
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Workspace OS <notifications@workspaceos.dev>'),
});

/** Secrets that MUST be present before the server accepts traffic. */
export const REQUIRED_SECRET_KEYS = [
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
  'B2_BUCKET_NAME',
  'B2_ENDPOINT',
  'B2_REGION',
] as const;

const parsedEnv = envSchema.parse(process.env);

/**
 * SECURITY (Phase 17): in non-production environments only, missing required
 * secrets receive EPHEMERAL per-process random values so that tests and local
 * development can boot. Production boot (server.ts) calls
 * `assertProductionSecrets()` which hard-fails on any missing secret —
 * ephemeral fallbacks NEVER activate in production.
 */
function injectDevSecretFallbacks(target: Record<string, any>): void {
  if (target.NODE_ENV === 'production') return;
  for (const key of REQUIRED_SECRET_KEYS) {
    if (!target[key] || target[key]!.trim().length === 0) {
      const generated = crypto.randomBytes(32).toString('hex');
      target[key] = generated;
      process.env[key] = generated;
      console.warn(
        `[Workspace OS][DEV ONLY] ${key} was not configured — an ephemeral random value was generated for this process. It will NOT persist. Configure it via .env before deploying.`
      );
    }
  }
}

injectDevSecretFallbacks(parsedEnv as Record<string, any>);

export const env = parsedEnv;

/**
 * Fail-fast secret validation. Throws with the full list of missing secrets.
 * Called during server startup (server.ts) — never silently continue without
 * production-grade credentials.
 */
export function assertProductionSecrets(target: Record<string, unknown> = process.env): void {
  const missing = REQUIRED_SECRET_KEYS.filter((key) => {
    const value = target[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `[Workspace OS Fatal] Missing required secrets: ${missing.join(', ')}. ` +
        'The application refuses to start without configured credentials. ' +
        'Populate them in the environment or .env file (see .env.example).'
    );
  }

  const sessionSecret = target.SESSION_SECRET;
  if (typeof sessionSecret === 'string' && sessionSecret.length < 32) {
    throw new Error(
      '[Workspace OS Fatal] SESSION_SECRET must be at least 32 characters for cryptographic strength.'
    );
  }

  const encryptionKey = target.ENCRYPTION_KEY;
  if (typeof encryptionKey === 'string' && encryptionKey.length < 32) {
    throw new Error(
      '[Workspace OS Fatal] ENCRYPTION_KEY must be at least 32 characters for AES-256 key derivation.'
    );
  }
}

/**
 * Emails granted the founder role at startup / authentication.
 */
export function getFounderEmails(): string[] {
  const founderEnv = process.env.FOUNDER_EMAILS || env.FOUNDER_EMAILS;
  if (founderEnv !== undefined && founderEnv.trim().length > 0) {
    return founderEnv
      .split(',')
      .map((email) => email.toLowerCase().trim())
      .filter(Boolean);
  }
  return (process.env.PLATFORM_ADMIN_EMAILS || env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean);
}

/**
 * Emails promoted to the platform_admin role at startup.
 */
export function getPlatformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS || env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean);
}

/**
 * Emails granted the support role at startup / authentication.
 */
export function getSupportEmails(): string[] {
  return (process.env.SUPPORT_EMAILS || env.SUPPORT_EMAILS || '')
    .split(',')
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean);
}
