import { Hono } from 'hono';
import crypto from 'crypto';
import { inMemoryDb } from '../../packages/database/index.js';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireWorkspaceRole } from '../middleware/rbac';
import { PaymentRepository } from '../repositories/payment-repository';
import { TaskExtensionRepository } from '../repositories/task-extension-repository';
import { PipelineRepository } from '../repositories/pipeline-repository';
import { DataTransferService } from '../services/data-transfer-service';
import { InvoiceGeneratorService } from '../services/invoice-generator-service';
import { IntegrationPlatformService } from '../services/integration-platform-service';
import { EmailService } from '../services/email-service';
import { EncryptionService } from '../services/encryption-service';
import { logSecurityEvent, requestSecurityMeta } from '../lib/security-audit';

export const phase14Router = new Hono();

// ============================================================================
// PART 2: REAL RAZORPAY BILLING APIS
// ============================================================================
phase14Router.post('/billing/create-customer', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const customer = await PaymentRepository.createCustomer({
    workspaceId: workspace?.id || 'ws-default',
    email: user?.email || 'admin@company.com',
    name: user?.name || 'Company Admin',
    contact: body.contact || '+91 99999 00000',
  });

  return c.json({ customer }, 201);
});

phase14Router.post('/billing/create-subscription', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const result = await PaymentRepository.createSubscription({
    workspaceId: workspace?.id || 'ws-default',
    planTier: body.planTier || 'business',
    userEmail: user?.email || 'admin@workspaceos.dev',
    userName: user?.name || 'Workspace Admin',
  });

  return c.json(result, 201);
});

phase14Router.post('/billing/verify', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planTier } = body;

  // SECURITY (Phase 17): payment signatures are verified unconditionally —
  // no environment-dependent bypass. Invalid signatures never activate plans.
  const isValid = PaymentRepository.verifyPaymentSignature({
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  });

  if (!isValid) {
    await logSecurityEvent('webhook.invalid_signature', {
      actorId: user?.id || null,
      workspaceId: workspace?.id || null,
      resourceId: 'POST /billing/verify',
      ...requestSecurityMeta(c),
      details: { reason: 'invalid_payment_signature' },
    });
    return c.json({ error: { code: 'BAD_SIGNATURE', message: 'Cryptographic payment signature verification failed.' } }, 400);
  }

  // Record captured payment
  await PaymentRepository.recordPayment({
    workspaceId: workspace?.id || 'ws-default',
    razorpayPaymentId: razorpay_payment_id || `pay_${Date.now()}`,
    razorpaySubscriptionId: razorpay_subscription_id,
    amount: planTier === 'starter' ? 99900 : planTier === 'scale' ? 799900 : planTier === 'business' ? 299900 : 99900,
    currency: 'INR',
    status: 'captured',
    method: 'upi',
  });

  // Activate plan in workspace
  if (workspace?.id && planTier) {
    const ws = inMemoryDb.workspaces.get(workspace.id);
    if (ws) {
      ws.plan = planTier;
      inMemoryDb.workspaces.set(workspace.id, ws);
    }
  }

  // Send automated receipt email
  const invNumber = `INV-${Date.now().toString().slice(-6)}`;
  await EmailService.sendSubscriptionReceipt(
    user?.email || 'admin@workspaceos.dev',
    `₹${planTier === 'starter' ? '999' : planTier === 'scale' ? '7,999' : '2,999'}/mo`,
    invNumber
  );

  return c.json({
    success: true,
    message: 'Payment verified and plan activated successfully.',
    invoiceNumber: invNumber,
    activePlan: planTier,
  }, 200);
});

/**
 * POST /billing/webhook — Razorpay event ingestion.
 *
 * SECURITY (Phase 17 — Fix #1): the x-razorpay-signature header is verified
 * against the RAW request body with HMAC-SHA256 (timing-safe compare) BEFORE
 * any processing. Missing or invalid signatures are rejected with 401 and
 * persisted as security audit events. Forged events can never mutate
 * workspace plans or billing state.
 */
phase14Router.post('/billing/webhook', async (c) => {
  const signature = c.req.header('x-razorpay-signature') || '';
  const bodyText = await c.req.text();

  if (!signature) {
    await logSecurityEvent('webhook.missing_signature', {
      resourceId: 'POST /billing/webhook',
      ...requestSecurityMeta(c),
      details: { reason: 'missing_x_razorpay_signature' },
    });
    return c.json({ status: 'rejected', error: { code: 'UNAUTHORIZED', message: 'Missing webhook signature.' } }, 401);
  }

  const valid = PaymentRepository.verifyWebhookSignature(bodyText, signature);
  if (!valid) {
    await logSecurityEvent('webhook.invalid_signature', {
      resourceId: 'POST /billing/webhook',
      ...requestSecurityMeta(c),
      details: { reason: 'hmac_verification_failed' },
    });
    return c.json({ status: 'rejected', error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature.' } }, 401);
  }

  const payload = JSON.parse(bodyText || '{}');
  const eventId = payload.event_id || `evt_${Date.now()}`;
  const eventName = payload.event || 'payment.captured';

  const result = await PaymentRepository.processWebhookEvent(eventId, eventName, payload);
  return c.json({ status: 'ok', processed: result }, 200);
});

phase14Router.get('/billing/status', authMiddleware, async (c) => {
  const workspace = c.get('workspace');
  const status = await PaymentRepository.getBillingStatus(workspace?.id || '');
  return c.json({ status }, 200);
});

// ============================================================================
// PART 5, 6, 7: TASKS RECURRENCE, MULTI-ASSIGNEES & DEPENDENCIES
// SECURITY (Phase 17 — Fix #8): write routes require authenticated members;
// interns are read-only and cannot mutate task assignment structures.
// ============================================================================
phase14Router.post('/tasks/:id/assignees', authMiddleware, requireWorkspaceRole(['admin', 'employee']), async (c) => {
  const taskId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const assignees = await TaskExtensionRepository.assignUsersToTask(taskId, body.userIds || []);
  return c.json({ assignees }, 200);
});

phase14Router.post('/tasks/:id/recurrence', authMiddleware, requireWorkspaceRole(['admin', 'employee']), async (c) => {
  const workspace = c.get('workspace');
  const taskId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const rule = await TaskExtensionRepository.createRecurrenceRule({
    workspaceId: workspace?.id || 'ws-default',
    taskId,
    frequency: body.frequency || 'weekly',
    interval: body.interval || 1,
  });

  return c.json({ recurrenceRule: rule }, 201);
});

phase14Router.post('/tasks/:id/dependency', authMiddleware, requireWorkspaceRole(['admin', 'employee']), async (c) => {
  const taskId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const dep = await TaskExtensionRepository.addDependency({
    taskId,
    dependsOnTaskId: body.dependsOnTaskId,
    type: body.type || 'finish_to_start',
  });

  return c.json({ dependency: dep }, 201);
});

// ============================================================================
// PART 8: CUSTOM CRM PIPELINES
// ============================================================================
phase14Router.post('/crm/pipelines', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  const pipeline = await PipelineRepository.createPipeline({
    workspaceId: workspace?.id || 'ws-default',
    name: body.name || 'Sales Pipeline',
    stages: body.stages || [{ name: 'Lead' }, { name: 'Discovery' }, { name: 'Won' }],
  });

  return c.json({ pipeline }, 201);
});

phase14Router.get('/crm/pipelines', authMiddleware, async (c) => {
  const workspace = c.get('workspace');
  const pipelines = await PipelineRepository.getWorkspacePipelines(workspace?.id || '');
  return c.json({ pipelines }, 200);
});

// ============================================================================
// PART 9 & 10: CSV IMPORT & EXPORT
// ============================================================================
phase14Router.post('/transfer/import', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));
  const result = await DataTransferService.importCsv(
    workspace?.id || 'ws-default',
    body.entityType || 'leads',
    body.csvData || ''
  );
  return c.json({ result }, 200);
});

phase14Router.get('/transfer/export', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const entityType = (c.req.query('entityType') as any) || 'leads';
  const format = (c.req.query('format') as any) || 'csv';

  const exportResult = await DataTransferService.exportData(workspace?.id || 'ws-default', entityType, format);
  return c.json({ exportResult }, 200);
});

// ============================================================================
// PART 11: TIME TRACKING TO INVOICE GENERATOR
// ============================================================================
phase14Router.post('/invoices/generate-from-time', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  const invoice = await InvoiceGeneratorService.generateInvoiceFromTimeEntries({
    workspaceId: workspace?.id || 'ws-default',
    clientName: body.clientName || 'Client Lead',
    companyName: body.companyName || 'Apex Solutions',
    clientEmail: body.clientEmail || 'billing@apex.com',
    timeEntryIds: body.timeEntryIds || [],
    taxRatePercent: 18,
  });

  return c.json({ invoice }, 201);
});

// ============================================================================
// PART 13 & 14: DEVELOPER API KEYS & OUTBOUND WEBHOOKS
// ============================================================================
phase14Router.post('/developer/api-keys', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  const created = await IntegrationPlatformService.createApiKey({
    workspaceId: workspace?.id || 'ws-default',
    name: body.name || 'Production API Key',
    scopes: body.scopes,
  });

  return c.json(created, 201);
});

phase14Router.post('/developer/webhooks', authMiddleware, requireWorkspaceRole(['admin']), async (c) => {
  const workspace = c.get('workspace');
  const body = await c.req.json().catch(() => ({}));

  const webhook = await IntegrationPlatformService.registerWebhook({
    workspaceId: workspace?.id || 'ws-default',
    url: body.url || 'https://client.com/webhook',
    events: body.events || ['task.created', 'lead.won', 'invoice.paid'],
  });

  return c.json({ webhook }, 201);
});
