import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function calculateSessionExpiry(days = 7): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export const betterAuthConfig = {
  // SECURITY (Phase 17): SESSION_SECRET is mandatory — validated at startup
  // by assertProductionSecrets(). No fallback secret exists.
  secret: env.SESSION_SECRET as string,
  baseURL: env.BETTER_AUTH_URL,
  sessionDurationDays: 7,
};
