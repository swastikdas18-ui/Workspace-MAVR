/** Isolated entry point: set test configuration BEFORE dynamically importing the app. */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DEMO_MODE = 'true';
process.env.FOUNDER_EMAILS = '';
process.env.PLATFORM_ADMIN_EMAILS = '';
process.env.SUPPORT_EMAILS = '';
for (const key of ['RESEND_API_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET',
  'B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET_NAME', 'B2_ENDPOINT', 'B2_REGION', 'SENTRY_DSN']) {
  process.env[key] = '';
}
// A test must never reach a real payment, email, storage, or webhook destination.
globalThis.fetch = async () => { throw new Error('RBAC audit: external network disabled'); };
const { runRbacAudit } = await import('../backend/tests/complete-rbac-audit.test');
try {
  await runRbacAudit({ writeReport: process.argv.includes('--report') });
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
