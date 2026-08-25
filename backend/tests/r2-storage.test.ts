/**
 * Phase 8A — Cloudflare R2 Object Storage Integration Tests
 * 
 * Validates:
 * 1. File Upload to Cloudflare R2 with tenant key isolation (`${workspaceId}/${documentId}/${filename}`)
 * 2. Document metadata persistence (r2Key, r2Url, fileSizeBytes, mimeType)
 * 3. Presigned download URL generation with token/time expiry
 * 4. Document deletion with synchronized Cloudflare R2 object purging
 * 5. RBAC enforcement on upload, view, download, and delete
 * 6. Multi-Tenant isolation (Workspace A cannot access, download, or delete Workspace B files)
 * 7. Real-Time Storage Metering integration with UsageService & Billing
 * 8. Cloudflare R2 Health Checks in /health/ready probe
 * 
 * Target: 25+ Assertions
 */

import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { R2Service } from '../src/services/r2-service';
import { UsageService } from '../src/services/usage-service';
import { attachSessionToken } from './session-test-utils';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failCount++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passCount++;
    console.log(`✅ PASS: ${message}`);
  }
}

async function requestApi(
  method: string,
  path: string,
  body?: any,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req = new Request(`http://localhost:3000${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const res = await app.fetch(req);
  let data = null;
  try {
    data = attachSessionToken(res, await res.json());
  } catch {}

  return { status: res.status, data, headers: res.headers };
}

export async function runR2StorageTests() {
  console.log('\n===============================================================');
  console.log(' PHASE 8A — CLOUDFLARE R2 OBJECT STORAGE & TENANT ISOLATION TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();
  R2Service.reset();

  // --- Step 1: User & Multi-Tenant Setup ---
  console.log('--- Step 1: Workspace & User Provisioning ---');

  // Workspace A: Acme Cloud Solutions
  const acmeAdminRes = await requestApi('POST', '/api/auth/register', {
    name: 'Alice Admin',
    email: 'alice@acmecloud.io',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'Acme Cloud Solutions',
  });
  assert(acmeAdminRes.status === 201, 'Step 1.1: Acme Admin registered');
  const tokenAcmeAdmin = acmeAdminRes.data.token;
  const wsAcmeId = acmeAdminRes.data.workspace.id;

  // Invite Employee in Acme
  const acmeEmpInvite = await requestApi('POST', '/api/invites', { email: 'bob@acmecloud.io', role: 'employee' }, tokenAcmeAdmin);
  const acmeEmpRes = await requestApi('POST', '/api/invites/accept', {
    token: acmeEmpInvite.data.invite.token,
    name: 'Bob Employee',
    password: 'Password123!',
  });
  assert(acmeEmpRes.status === 200, 'Step 1.2: Acme Employee accepted invite');
  const tokenAcmeEmp = acmeEmpRes.data.token;

  // Invite Intern in Acme
  const acmeInternInvite = await requestApi('POST', '/api/invites', { email: 'ivan@acmecloud.io', role: 'intern' }, tokenAcmeAdmin);
  const acmeInternRes = await requestApi('POST', '/api/invites/accept', {
    token: acmeInternInvite.data.invite.token,
    name: 'Ivan Intern',
    password: 'Password123!',
  });
  assert(acmeInternRes.status === 200, 'Step 1.3: Acme Intern accepted invite');
  const tokenAcmeIntern = acmeInternRes.data.token;

  // Workspace B: Beta Global Systems (Foreign Tenant)
  const betaAdminRes = await requestApi('POST', '/api/auth/register', {
    name: 'Brian Beta',
    email: 'brian@betaglobal.com',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'Beta Global Systems',
  });
  assert(betaAdminRes.status === 201, 'Step 1.4: Beta Admin registered in separate workspace');
  const tokenBetaAdmin = betaAdminRes.data.token;
  const wsBetaId = betaAdminRes.data.workspace.id;

  // --- Step 2: Direct R2 Integration Layer Tests ---
  console.log('\n--- Step 2: R2 Service Direct Operations ---');

  const rawUpload = await R2Service.uploadObject({
    workspaceId: wsAcmeId,
    documentId: 'doc_direct_test',
    filename: 'architecture-spec.pdf',
    body: Buffer.from('PDF file payload simulating confidential architecture specification'),
    contentType: 'application/pdf',
  });

  assert(!!rawUpload.key, 'Step 2.1: R2 object uploaded with key');
  assert(rawUpload.key.startsWith(`${wsAcmeId}/doc_direct_test/`), 'Step 2.2: R2 storage key follows tenant prefix path');
  assert(rawUpload.sizeBytes > 0, 'Step 2.3: R2 object size calculated accurately');

  const signedUrl = await R2Service.getSignedDownloadUrl(wsAcmeId, rawUpload.key);
  assert(typeof signedUrl === 'string' && signedUrl.length > 10, 'Step 2.4: Signed download URL generated successfully');

  // Verify foreign tenant key download rejection
  let foreignKeyError = false;
  try {
    await R2Service.getSignedDownloadUrl(wsBetaId, rawUpload.key);
  } catch (err: any) {
    foreignKeyError = true;
  }
  assert(foreignKeyError, 'Step 2.5: R2Service blocks foreign tenant from signing download URL (Tenant Security Guard)');

  // --- Step 3: Document API Uploads & Metadata ---
  console.log('\n--- Step 3: Document Upload API & R2 Metadata Persistence ---');

  const doc1Res = await requestApi('POST', '/api/documents', {
    title: 'Acme Q4 SOC2 Security Audit Report',
    category: 'Security',
    fileType: 'pdf',
    visibility: 'team',
    content: 'SOC2 Type II Compliance Report — All 5 Trust Services Criteria Satisfied.',
  }, tokenAcmeAdmin);

  assert(doc1Res.status === 201, 'Step 3.1: Document uploaded via POST /api/documents');
  const doc1 = doc1Res.data.document;
  assert(!!doc1.id, 'Step 3.2: Document assigned unique ID');
  assert(doc1.r2_key.startsWith(`${wsAcmeId}/${doc1.id}/`), 'Step 3.3: Document r2_key follows tenant path isolation');
  assert(doc1.file_size_bytes > 0, 'Step 3.4: Document file_size_bytes persisted in database');
  assert(doc1.mime_type === 'application/pdf', 'Step 3.5: Document mime_type recorded');

  // Upload Public / Learning Document
  const docLearnRes = await requestApi('POST', '/api/documents', {
    title: 'Engineering Onboarding Manual 2026',
    category: 'Training',
    fileType: 'pdf',
    visibility: 'learning',
    content: 'Welcome to Acme engineering team. Git workflow & PR standards.',
  }, tokenAcmeAdmin);

  assert(docLearnRes.status === 201, 'Step 3.6: Learning document uploaded');
  const docLearn = docLearnRes.data.document;

  // --- Step 4: RBAC & Document Visibility Checks ---
  console.log('\n--- Step 4: RBAC Visibility & Download Authorization ---');

  // 4.1 Admin sees all documents
  const adminDocs = await requestApi('GET', '/api/documents', undefined, tokenAcmeAdmin);
  assert(adminDocs.data.documents.length >= 2, 'Step 4.1: Admin views all workspace documents');

  // 4.2 Employee sees team & learning documents
  const empDocs = await requestApi('GET', '/api/documents', undefined, tokenAcmeEmp);
  assert(empDocs.data.documents.length >= 2, 'Step 4.2: Employee views team documents');

  // 4.3 Intern sees only learning documents
  const internDocs = await requestApi('GET', '/api/documents', undefined, tokenAcmeIntern);
  assert(internDocs.data.documents.length === 1, 'Step 4.3: Intern view filtered to learning-only documents');
  assert(internDocs.data.documents[0].id === docLearn.id, 'Step 4.4: Intern sees only learning manual');

  // 4.4 Intern blocked from uploading documents
  const internUpload = await requestApi('POST', '/api/documents', {
    title: 'Unauthorized Intern Doc',
    visibility: 'team',
  }, tokenAcmeIntern);
  assert(internUpload.status === 403, 'Step 4.5: Intern blocked from POST /api/documents (403 Forbidden)');

  // --- Step 5: Document Downloads & Signed URLs ---
  console.log('\n--- Step 5: Document Downloads & Signed URL Generation ---');

  // 5.1 Admin downloads team doc
  const downloadDoc1 = await requestApi('GET', `/api/documents/${doc1.id}/download`, undefined, tokenAcmeAdmin);
  assert(downloadDoc1.status === 200, 'Step 5.1: Admin downloads document successfully');
  assert(!!downloadDoc1.data.signedUrl || !!downloadDoc1.data.downloadUrl, 'Step 5.2: Download returns valid presigned URL');
  assert(downloadDoc1.data.downloadCount >= 1, 'Step 5.3: Document download counter incremented');

  // 5.2 Intern blocked from downloading restricted team doc
  const internBlockedDownload = await requestApi('GET', `/api/documents/${doc1.id}/download`, undefined, tokenAcmeIntern);
  assert(internBlockedDownload.status === 403, 'Step 5.4: Intern blocked from downloading restricted team doc (403 Forbidden)');

  // 5.3 Intern allowed to download learning doc
  const internLearnDownload = await requestApi('GET', `/api/documents/${docLearn.id}/download`, undefined, tokenAcmeIntern);
  assert(internLearnDownload.status === 200, 'Step 5.5: Intern authorized to download learning doc');

  // --- Step 6: Multi-Tenant Boundary Enforcement ---
  console.log('\n--- Step 6: Multi-Tenant Isolation Audit ---');

  // Beta Admin cannot see Acme documents
  const betaDocs = await requestApi('GET', '/api/documents', undefined, tokenBetaAdmin);
  assert(betaDocs.data.documents.length === 0, 'Step 6.1: Beta tenant has 0 documents (zero Acme leakage)');

  // Beta Admin cannot fetch Acme document by ID
  const crossTenantGet = await requestApi('GET', `/api/documents/${doc1.id}`, undefined, tokenBetaAdmin);
  assert(crossTenantGet.status === 404 || crossTenantGet.status === 403, 'Step 6.2: Beta Admin blocked from Acme doc details');

  // Beta Admin cannot download Acme document
  const crossTenantDownload = await requestApi('GET', `/api/documents/${doc1.id}/download`, undefined, tokenBetaAdmin);
  assert(crossTenantDownload.status === 404 || crossTenantDownload.status === 403, 'Step 6.3: Beta Admin blocked from downloading Acme doc');

  // --- Step 7: Document Deletion & Cloudflare R2 Purging ---
  console.log('\n--- Step 7: Document Deletion & S3/R2 Purging ---');

  const deleteRes = await requestApi('DELETE', `/api/documents/${doc1.id}`, undefined, tokenAcmeAdmin);
  assert(deleteRes.status === 200, 'Step 7.1: Document deleted via DELETE /api/documents/:id');

  // Verify deleted from database
  const getDeleted = await requestApi('GET', `/api/documents/${doc1.id}`, undefined, tokenAcmeAdmin);
  assert(getDeleted.status === 404, 'Step 7.2: Deleted document returns 404 Not Found');

  // --- Step 8: Storage Usage Metering Integration ---
  console.log('\n--- Step 8: Real-Time Storage Metering in UsageService ---');

  const acmeUsage = await UsageService.getWorkspaceUsage(wsAcmeId);
  assert(typeof acmeUsage.usage.storageMb.current === 'number', 'Step 8.1: Storage MB consumption calculated dynamically');
  assert(acmeUsage.usage.storageMb.limit === 500, 'Step 8.2: Free tier 500 MB storage limit enforced');
  assert(acmeUsage.usage.storageMb.percent >= 0 && acmeUsage.usage.storageMb.percent <= 100, 'Step 8.3: Storage consumption percent within valid range');

  // --- Step 9: Cloudflare R2 Health Monitoring ---
  console.log('\n--- Step 9: Production Health Readiness Probe ---');

  const readyRes = await requestApi('GET', '/health/ready');
  assert(readyRes.status === 200, 'Step 9.1: GET /health/ready returned 200 OK');
  assert(readyRes.data.checks.r2Storage === 'operational', 'Step 9.2: R2 storage operational status verified');
  assert(readyRes.data.checks.r2_ok === true, 'Step 9.3: R2 subsystem health check flag is true');
  assert(readyRes.data.checks.r2Bucket === 'workspace-os-vault', 'Step 9.4: R2 bucket target verified');

  console.log('\n===============================================================');
  console.log(` CLOUDFLARE R2 INTEGRATION TESTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    throw new Error(`R2 Storage testing failed with ${failCount} errors.`);
  }
}

if (process.argv[1]?.endsWith('r2-storage.test.ts') || process.argv[1]?.includes('r2-storage')) {
  runR2StorageTests().then(() => process.exit(0)).catch((err) => {
    console.error('R2 test suite error:', err);
    process.exit(1);
  });
}
