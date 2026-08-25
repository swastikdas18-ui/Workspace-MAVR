import crypto from 'crypto';

/**
 * SECURITY (Phase 17): Cryptographically secure token generation.
 *
 * Replaces every Math.random()-derived invitation / magic-link / session
 * token in the codebase. 32 random bytes => 256 bits of entropy, hex-encoded
 * for URL-safe transport.
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Timing-safe string comparison for secrets, signatures and CSRF tokens.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Burn comparable time to reduce length-based oracles.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Collision-resistant unique identifier (not used as a secret). */
export function generateUniqueId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}
