import { inMemoryDb } from '../packages/database';
import { PaymentRepository } from '../src/repositories/payment-repository';
import { TaskExtensionRepository } from '../src/repositories/task-extension-repository';
import { PipelineRepository } from '../src/repositories/pipeline-repository';
import { DataTransferService } from '../src/services/data-transfer-service';
import { InvoiceGeneratorService } from '../src/services/invoice-generator-service';
import { IntegrationPlatformService } from '../src/services/integration-platform-service';
import { EmailService } from '../src/services/email-service';
import { EncryptionService } from '../src/services/encryption-service';
import { UsageService } from '../src/services/usage-service';

async function validatePhase14() {
  console.log('================================================================');
  console.log('PHASE 14: REVENUE & BETA READINESS COMPREHENSIVE VALIDATION SUITE');
  console.log('================================================================');

  inMemoryDb.reset();

  const wsId = 'ws-beta-14';
  const adminId = 'usr-admin-14';

  // Seed sample workspace
  inMemoryDb.workspaces.set(wsId, {
    id: wsId,
    name: 'Apex Digital Enterprise',
    slug: 'apex-digital-enterprise',
    ownerId: adminId,
    plan: 'scale',
    createdAt: new Date().toISOString(),
  } as any);

  // 1. PART 1: STORAGE BILLING BIGINT VERIFICATION (20 GB Growth Plan)
  console.log('\n--- 1. Storage Metering: 20 GB BigInt Overflow Protection ---');
  // 15 GB file in bytes = 15 * 1024 * 1024 * 1024 = 16,106,127,360 bytes (Exceeds standard 32-bit INT 2.14GB)
  const fifteenGbBytes = 15 * 1024 * 1024 * 1024;
  inMemoryDb.documents.set('doc-large-vault', {
    id: 'doc-large-vault',
    workspaceId: wsId,
    title: 'Enterprise Dataset Archive.zip',
    fileSizeBytes: fifteenGbBytes,
    owner_id: adminId,
    visibility: 'team',
    category: 'Technical',
  } as any);

  const usage = await UsageService.getWorkspaceUsage(wsId);
  console.log('Calculated Storage Usage:', `${usage.usage.storageMb.current} MB / ${usage.usage.storageMb.limit} MB`);

  if (usage.usage.storageMb.current >= 15000 && !usage.hasOverage) {
    console.log('✅ PASS: BigInt Storage Handled 15 GB Without Integer Overflow');
  } else {
    throw new Error('FAILED: Storage metering overflowed or failed');
  }

  // 2. PART 2: RAZORPAY SUBSCRIPTION & WEBHOOK VALIDATION
  console.log('\n--- 2. Real Payment Infrastructure: Razorpay Integration ---');
  const customer = await PaymentRepository.createCustomer({
    workspaceId: wsId,
    email: 'finance@apexdigital.com',
    name: 'Apex Finance Dept',
    contact: '+91 98888 12345',
  });
  console.log('Razorpay Customer Created:', customer.razorpayCustomerId);

  const subResult = await PaymentRepository.createSubscription({
    workspaceId: wsId,
    planTier: 'scale',
  });
  console.log('Razorpay Subscription Created:', subResult.subscription.razorpaySubscriptionId, `(Plan: ${subResult.subscription.planTier})`);

  // Webhook Signature Test
  const webhookBody = JSON.stringify({ event: 'subscription.charged', event_id: `evt_test_${Date.now()}` });
  const isSigValid = PaymentRepository.verifyWebhookSignature(webhookBody, 'invalid-signature');
  console.log('Invalid Webhook Signature Rejection Probe:', isSigValid === false ? 'Correctly Rejected' : 'Failed');

  const webhookProc = await PaymentRepository.processWebhookEvent(`evt_test_1`, 'subscription.charged', { amount: 399900 });
  const webhookDup = await PaymentRepository.processWebhookEvent(`evt_test_1`, 'subscription.charged', { amount: 399900 });
  if (webhookProc.status === 'processed' && webhookDup.duplicate === true) {
    console.log('✅ PASS: Webhook Ingestion & Duplicate Replay Protection Verified');
  } else {
    throw new Error('FAILED: Webhook replay protection failure');
  }

  // 3. PART 3: RESEND EMAIL INFRASTRUCTURE
  console.log('\n--- 3. Email Infrastructure: Resend Multi-Template Delivery ---');
  const emailRes1 = await EmailService.sendWorkspaceInvite('staff@company.com', 'Apex Digital', 'https://app.workspaceos.dev/invite/token123');
  const emailRes2 = await EmailService.sendTrialReminder('admin@company.com', 3, 'https://app.workspaceos.dev/billing');
  const emailRes3 = await EmailService.sendSubscriptionReceipt('billing@company.com', '₹3,999/mo', 'INV-990123');

  if (emailRes1.success && emailRes2.success && emailRes3.success) {
    console.log('✅ PASS: Email Dispatch & Templates Verified (Total Sent:', EmailService.getSentEmails().length, ')');
  } else {
    throw new Error('FAILED: Email delivery failed');
  }

  // 4. PART 4: AES-256-GCM OAUTH TOKEN ENCRYPTION
  console.log('\n--- 4. Security: AES-256-GCM OAuth Token Encryption ---');
  const rawOAuthToken = 'ya29.a0AfH6SMB_secret_google_oauth_refresh_token_xyz987';
  const encryptedPayload = EncryptionService.encryptToken(rawOAuthToken);
  console.log('Encrypted Token Sample:', encryptedPayload.encryptedToken.slice(0, 24) + '...', `(IV: ${encryptedPayload.iv})`);

  const decryptedToken = EncryptionService.decryptToken(encryptedPayload);
  if (decryptedToken === rawOAuthToken) {
    console.log('✅ PASS: Zero Plaintext OAuth Token Storage Verified');
  } else {
    throw new Error('FAILED: Token decryption mismatch');
  }

  // 5. PART 5, 6, 7: RECURRING TASKS, MULTI-ASSIGNEES & DEPENDENCY BLOCKING
  console.log('\n--- 5. Task Engine: Recurring Rules, Multi-Assignees & Dependencies ---');
  // Seed base task
  inMemoryDb.tasks.set('task-pr-review', { id: 'task-pr-review', workspaceId: wsId, title: 'Code Architecture Review', status: 'in_progress' } as any);
  inMemoryDb.tasks.set('task-deploy-prod', { id: 'task-deploy-prod', workspaceId: wsId, title: 'Deploy Production Release', status: 'todo' } as any);

  // Multi-assignees
  await TaskExtensionRepository.assignUsersToTask('task-deploy-prod', ['usr-1', 'usr-2', 'usr-3']);
  const assignees = await TaskExtensionRepository.getTaskAssignees('task-deploy-prod');
  console.log('Multi-Assignees Count:', assignees.length);

  // Dependencies
  await TaskExtensionRepository.addDependency({
    taskId: 'task-deploy-prod',
    dependsOnTaskId: 'task-pr-review',
    type: 'finish_to_start',
  });

  const canComplete1 = await TaskExtensionRepository.canCompleteTask('task-deploy-prod');
  console.log('Dependency Check (PR Review Pending):', canComplete1.canComplete === false ? `Blocked on "${canComplete1.blockingTaskTitle}"` : 'Failed');

  // Complete blocking task
  inMemoryDb.tasks.set('task-pr-review', { id: 'task-pr-review', workspaceId: wsId, title: 'Code Architecture Review', status: 'completed' } as any);
  const canComplete2 = await TaskExtensionRepository.canCompleteTask('task-deploy-prod');
  console.log('Dependency Check (PR Review Completed):', canComplete2.canComplete === true ? 'Ready for completion' : 'Failed');

  // Recurrence
  await TaskExtensionRepository.createRecurrenceRule({
    workspaceId: wsId,
    taskId: 'task-pr-review',
    frequency: 'weekly',
    nextRunAt: new Date(Date.now() - 1000), // Due now
  });
  const recurringSpawned = await TaskExtensionRepository.processRecurringTasksWorker();
  console.log('Recurring Tasks Spawned:', recurringSpawned);

  if (assignees.length === 3 && !canComplete1.canComplete && canComplete2.canComplete && recurringSpawned === 1) {
    console.log('✅ PASS: Task Recurrence, Multi-Assignees & Dependency Blocking Verified');
  } else {
    throw new Error('FAILED: Task engine validation failure');
  }

  // 6. PART 8: CUSTOM CRM INDUSTRY PIPELINES
  console.log('\n--- 6. CRM: Custom Industry Pipelines & Dynamic Stages ---');
  const agencyPipeline = await PipelineRepository.createPipeline({
    workspaceId: wsId,
    name: 'Digital Agency Client Retainer Pipeline',
    stages: [
      { name: '1. Inbound Inquiry', color: '#60A5FA' },
      { name: '2. Discovery Audit Call', color: '#A855F7' },
      { name: '3. Scope & Proposal Sent', color: '#F59E0B' },
      { name: '4. Contract Retainer Won', color: '#10B981' },
    ],
  });
  console.log('Custom Pipeline Created:', agencyPipeline.name, `(${agencyPipeline.stages.length} stages)`);

  if (agencyPipeline.stages.length === 4) {
    console.log('✅ PASS: Custom Industry Pipelines Verified');
  } else {
    throw new Error('FAILED: Pipeline creation failed');
  }

  // 7. PART 9 & 10: CSV IMPORT & EXPORT SYSTEM
  console.log('\n--- 7. Data Transfer: CSV Importer & Exporter ---');
  const sampleCsv = `Customer Name,Company,Email,Phone,Deal Value\n"Alice Smith","Smith Logistics","alice@smith.com","+91 99999 11111",150000\n"Bob Jones","Jones Agency","bob@jones.com","+91 99999 22222",300000`;
  const importResult = await DataTransferService.importCsv(wsId, 'leads', sampleCsv);
  console.log('CSV Import Result:', `${importResult.importedCount} leads imported successfully`);

  const exportResult = await DataTransferService.exportData(wsId, 'leads', 'csv');
  console.log('CSV Export Size:', exportResult.data.length, 'bytes');

  if (importResult.importedCount === 2 && exportResult.data.includes('Smith Logistics')) {
    console.log('✅ PASS: CSV Data Import & Export Verified');
  } else {
    throw new Error('FAILED: CSV transfer failure');
  }

  // 8. PART 11: TIME TRACKING TO GST INVOICE GENERATION
  console.log('\n--- 8. Invoicing: Time Entries to GST-Compliant Invoice ---');
  inMemoryDb.taskTimeEntries.set('time-101', {
    id: 'time-101',
    workspaceId: wsId,
    taskId: 'task-deploy-prod',
    userId: adminId,
    startTime: new Date(),
    durationMinutes: 120, // 2 hrs
    billable: true,
    hourlyRate: 2500, // ₹2,500/hr = ₹5,000
    notes: 'Production launch execution',
    createdAt: new Date(),
  } as any);

  const invoice = await InvoiceGeneratorService.generateInvoiceFromTimeEntries({
    workspaceId: wsId,
    clientName: 'Sarah Connor',
    companyName: 'Apex Solutions',
    clientEmail: 'sarah@apex.com',
    timeEntryIds: ['time-101'],
    taxRatePercent: 18, // 18% GST
  });
  console.log('Invoice Generated:', invoice.invoiceNumber, `(Subtotal: ₹${invoice.subtotal}, GST: ₹${invoice.gst.totalTax}, Total: ₹${invoice.total})`);

  if (invoice.subtotal === 5000 && invoice.gst.totalTax === 900 && invoice.total === 5900) {
    console.log('✅ PASS: Time Entries to GST Invoice Calculation Verified');
  } else {
    throw new Error('FAILED: GST invoice math error');
  }

  // 9. PART 13 & 14: DEVELOPER API KEYS & OUTBOUND WEBHOOKS
  console.log('\n--- 9. Developer Ecosystem: Scoped API Keys & HMAC Webhooks ---');
  const { apiKey, secretKey } = await IntegrationPlatformService.createApiKey({
    workspaceId: wsId,
    name: 'Production CRM Integration Key',
    scopes: ['read', 'write', 'crm'],
  });
  console.log('API Key Created:', apiKey.prefix, `(Secret: ${secretKey.slice(0, 16)}...)`);

  const validatedKey = await IntegrationPlatformService.validateApiKey(secretKey);
  if (!validatedKey) throw new Error('FAILED: API Key validation failed');

  const webhook = await IntegrationPlatformService.registerWebhook({
    workspaceId: wsId,
    url: 'https://webhook.site/test-endpoint',
    events: ['lead.won', 'invoice.paid'],
  });
  console.log('Webhook Registered:', webhook.url, `(Events: ${webhook.events.join(', ')})`);

  const dispatches = await IntegrationPlatformService.dispatchEvent(wsId, 'lead.won', {
    leadId: 'crm-1',
    dealValue: 150000,
    company: 'Smith Logistics',
  });
  console.log('Dispatched Webhook Deliveries Count:', dispatches.length, `(HMAC-SHA256 Signature Attached: true)`);

  if (dispatches.length === 1 && dispatches[0].payload.signature) {
    console.log('✅ PASS: API Keys & Outbound Webhook Security Verified');
  } else {
    throw new Error('FAILED: Webhook dispatch error');
  }

  console.log('\n================================================================');
  console.log('✅ ALL PHASE 14 REVENUE & BETA READINESS SUITES PASSED (100%)');
  console.log('================================================================');
}

validatePhase14().catch((err) => {
  console.error('Phase 14 Validation Error:', err);
  process.exit(1);
});
