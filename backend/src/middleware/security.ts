/**
 * Enterprise Production Security Headers Middleware (Helmet-equivalent for Hono)
 * 
 * Sets:
 * - Content-Security-Policy (CSP)
 * - X-Content-Type-Options (nosniff)
 * - X-Frame-Options (DENY)
 * - X-XSS-Protection
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 */

import { Context, Next } from 'hono';

export async function securityHeaders(c: Context, next: Next) {
  await next();

  // 1. Prevent MIME-sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // 2. Prevent Clickjacking
  c.header('X-Frame-Options', 'DENY');

  // 3. XSS Filter (legacy browsers)
  c.header('X-XSS-Protection', '1; mode=block');

  // 4. Strict Transport Security (HSTS) - 1 Year with subdomains
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // 5. Referrer Policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Permissions Policy
  c.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()'
  );

  // 7. Content Security Policy (Allow inline styles for Tailwind v4 and React)
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://* wss://* ws://* http://localhost:* ws://localhost:*;"
  );
}
