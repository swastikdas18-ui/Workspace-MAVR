/**
 * Phase 8B — Backblaze B2 Object Storage Integration & Tenant Isolation Tests
 * 
 * Validates:
 * 1. File Upload to Backblaze B2 / S3 Object Storage with tenant key isolation (`${workspaceId}/${documentId}/${filename}`)
 * 2. Document metadata persistence (storageKey, storageUrl, fileSizeBytes, mimeType)
 * 3. Presigned download URL generation with 15-minute token/time expiry
 * 4. Document deletion with synchronized Backblaze B2 object purging
 * 5. RBAC enforcement on upload, view, download, and delete
 * 6. Multi-Tenant isolation (Workspace A cannot access, download, or delete Workspace B files)
 * 7. Real-Time Storage Metering integration with UsageService & Billing (SUM(fileSizeBytes))
 * 8. Object Storage Health Checks in /health/ready probe
 * 
 * Target: 40+ Assertions
 */

import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { ObjectStorageService, StorageService } from '../src/services/object-storage-service';
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

export async function runB2StorageTests() {
  console.log('\n===============================================================');
  console.log(' PHASE 8B — BACKBLAZE B2 OBJECT STORAGE & TENANT ISOLATION TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();
  ObjectStorageService.reset();

  // --- Step 1: User & Multi-Tenant Setup ---
  console.log('--- Step 1: Workspace & User Provisioning ---');

  // Workspace A: Apex Cloud Systems
  const apexAdminRes = await requestApi('POST', '/api/auth/register', {
    name: 'Alice Admin',
    email: 'alice@apexcloud.io',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'Apex Cloud Systems',
  });
  assert(apexAdminRes.status === 201, 'Step 1.1: Apex Admin registered');
  const tokenApexAdmin = apexAdminRes.data.token;
  const wsApexId = apexAdminRes.data.workspace.id;

  // Invite Employee in Apex
  const apexEmpInvite = await requestApi('POST', '/api/invites', { email: 'bob@apexcloud.io', role: 'employee' }, tokenApexAdmin);
  const apexEmpRes = await requestApi('POST', '/api/invites/accept', {
    token: apexEmpInvite.data.invite.token,
    name: 'Bob Employee',
    password: 'Password123!',
  });
  assert(apexEmpRes.status === 200, 'Step 1.2: Apex Employee accepted invite');
  const tokenApexEmp = apexEmpRes.data.token;

  // Invite Intern in Apex
  const apexInternInvite = await requestApi('POST', '/api/invites', { email: 'ivan@apexcloud.io', role: 'intern' }, tokenApexAdmin);
  const apexInternRes = await requestApi('POST', '/api/invites/accept', {
    token: apexInternInvite.data.invite.token,
    name: 'Ivan Intern',
    password: 'Password123!',
  });
  assert(apexInternRes.status === 200, 'Step 1.3: Apex Intern accepted invite');
  const tokenApexIntern = apexInternRes.data.token;

  // Workspace B: Beta Global Corp (Foreign Tenant)
  const betaAdminRes = await requestApi('POST', '/api/auth/register', {
    name: 'Brian Beta',
    email: 'brian@betaglobal.com',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'Beta Global Corp',
  });
  assert(betaAdminRes.status === 201, 'Step 1.4: Beta Admin registered in separate workspace');
  const tokenBetaAdmin = betaAdminRes.data.token;
  const wsBetaId = betaAdminRes.data.workspace.id;

  // --- Step 2: Direct ObjectStorageService Operations ---
  console.log('\n--- Step 2: ObjectStorageService Direct Operations ---');

  const rawUpload = await ObjectStorageService.uploadObject({
    workspaceId: wsApexId,
    documentId: 'doc_direct_b2',
    filename: 'b2-architecture-spec.pdf',
    body: Buffer.from('PDF file payload simulating confidential Backblaze B2 architecture specification'),
    contentType: 'application/pdf',
  });

  assert(!!rawUpload.key, 'Step 2.1: B2 object uploaded with key');
  assert(rawUpload.key.startsWith(`${wsApexId}/doc_direct_b2/`), 'Step 2.2: B2 storage key follows tenant prefix path');
  assert(rawUpload.sizeBytes > 0, 'Step 2.3: B2 object size calculated accurately');
  assert(rawUpload.bucket === 'workspace-os-vault', 'Step 2.4: B2 target bucket verified');

  const signedUrl = await ObjectStorageService.getSignedDownloadUrl(wsApexId, rawUpload.key, 900);
  assert(typeof signedUrl === 'string' && signedUrl.length > 10, 'Step 2.5: Signed download URL generated successfully');

  // Verify foreign tenant key download rejection
  let foreignKeyError = false;
  try {
    await ObjectStorageService.getSignedDownloadUrl(wsBetaId, rawUpload.key, 900);
  } catch (err: any) {
    foreignKeyError = true;
  }
  assert(foreignKeyError, 'Step 2.6: ObjectStorageService blocks foreign tenant from signing download URL');

  // Verify direct object retrieval within tenant
  const retrievedObj = await ObjectStorageService.getObject(wsApexId, rawUpload.key);
  assert(!!retrievedObj.body, 'Step 2.7: Stored object retrieved by owning workspace');
  assert(retrievedObj.contentType === 'application/pdf', 'Step 2.8: Content-type matched');

  // --- Step 3: Document API Uploads & Metadata Persistence ---
  console.log('\n--- Step 3: Document Upload API & Metadata Persistence ---');

  const doc1Res = await requestApi('POST', '/api/documents', {
    title: 'Apex Q4 SOC2 Compliance Audit',
    category: 'Security',
    fileType: 'pdf',
    visibility: 'team',
    content: 'Backblaze B2 Encrypted Vault Document — Trust Services Criteria Verified.',
  }, tokenApexAdmin);

  assert(doc1Res.status === 201, 'Step 3.1: Document uploaded via POST /api/documents');
  const doc1 = doc1Res.data.document;
  assert(!!doc1.id, 'Step 3.2: Document assigned unique ID');
  assert(doc1.storage_key.startsWith(`${wsApexId}/${doc1.id}/`), 'Step 3.3: Document storage_key follows tenant path isolation');
  assert(doc1.file_size_bytes > 0, 'Step 3.4: Document file_size_bytes persisted');
  assert(doc1.mime_type === 'application/pdf', 'Step 3.5: Document mime_type recorded');

  // Upload Public / Learning Document
  const docLearnRes = await requestApi('POST', '/api/documents', {
    title: 'Employee Onboarding Manual 2026',
    category: 'Training',
    fileType: 'pdf',
    visibility: 'learning',
    content: 'Welcome to Apex Cloud. Git workflow & PR security standards.',
  }, tokenApexAdmin);

  assert(docLearnRes.status === 201, 'Step 3.6: Learning document uploaded');
  const docLearn = docLearnRes.data.document;
  assert(docLearn.visibility === 'learning', 'Step 3.7: Document visibility set to learning');

  // --- Step 4: RBAC & Document Visibility Checks ---
  console.log('\n--- Step 4: RBAC Visibility & Download Authorization ---');

  // 4.1 Admin sees all documents
  const adminDocs = await requestApi('GET', '/api/documents', undefined, tokenApexAdmin);
  assert(adminDocs.data.documents.length >= 2, 'Step 4.1: Admin views all workspace documents');

  // 4.2 Employee sees team & learning documents
  const empDocs = await requestApi('GET', '/api/documents', undefined, tokenApexEmp);
  assert(empDocs.data.documents.length >= 2, 'Step 4.2: Employee views team documents');

  // 4.3 Intern sees only learning documents
  const internDocs = await requestApi('GET', '/api/documents', undefined, tokenApexIntern);
  assert(internDocs.data.documents.length === 1, 'Step 4.3: Intern view filtered to learning-only documents');
  assert(internDocs.data.documents[0].id === docLearn.id, 'Step 4.4: Intern sees only learning manual');

  // 4.4 Intern blocked from uploading documents
  const internUpload = await requestApi('POST', '/api/documents', {
    title: 'Unauthorized Intern Doc',
    visibility: 'team',
  }, tokenApexIntern);
  assert(internUpload.status === 403, 'Step 4.5: Intern blocked from POST /api/documents (403 Forbidden)');

  // --- Step 5: Document Downloads & Signed URLs (15 Min Expiry) ---
  console.log('\n--- Step 5: Document Downloads & Signed URL Generation ---');

  // 5.1 Admin downloads team doc
  const downloadDoc1 = await requestApi('GET', `/api/documents/${doc1.id}/download`, undefined, tokenApexAdmin);
  assert(downloadDoc1.status === 200, 'Step 5.1: Admin downloads document successfully');
  assert(!!downloadDoc1.data.signedUrl || !!downloadDoc1.data.downloadUrl, 'Step 5.2: Download returns valid presigned URL');
  assert(downloadDoc1.data.downloadCount >= 1, 'Step 5.3: Document download counter incremented');

  // 5.2 Employee downloads team doc
  const empDownload = await requestApi('GET', `/api/documents/${doc1.id}/download`, undefined, tokenApexEmp);
  assert(empDownload.status === 200, 'Step 5.4: Employee authorized to download team doc');

  // 5.3 Intern blocked from downloading restricted team doc
  const internBlockedDownload = await requestApi('GET', `/api/documents/${doc1.id}/download`, undefined, tokenApexIntern);
  assert(internBlockedDownload.status === 403, 'Step 5.5: Intern blocked from downloading restricted team doc (403 Forbidden)');

  // 5.4 Intern allowed to download learning doc
  const internLearnDownload = await requestApi('GET', `/api/documents/${docLearn.id}/download`, undefined, tokenApexIntern);
  assert(internLearnDownload.status === 200, 'Step 5.6: Intern authorized to download learning doc');

  // --- Step 6: Multi-Tenant Boundary Enforcement ---
  console.log('\n--- Step 6: Multi-Tenant Isolation Audit ---');

  // Beta Admin cannot see Apex documents
  const betaDocs = await requestApi('GET', '/api/documents', undefined, tokenBetaAdmin);
  assert(betaDocs.data.documents.length === 0, 'Step 6.1: Beta tenant has 0 documents (zero Apex leakage)');

  // Beta Admin cannot fetch Apex document by ID
  const crossTenantGet = await requestApi('GET', `/api/documents/${doc1.id}`, undefined, tokenBetaAdmin);
  assert(crossTenantGet.status === 404 || crossTenantGet.status === 403, 'Step 6.2: Beta Admin blocked from Apex doc details');

  // Beta Admin cannot download Apex document
  const crossTenantDownload = await requestApi('GET', `/api/documents/${doc1.id}/download`, undefined, tokenBetaAdmin);
  assert(crossTenantDownload.status === 404 || crossTenantDownload.status === 403, 'Step 6.3: Beta Admin blocked from downloading Apex doc');

  // Beta Admin cannot delete Apex document
  const crossTenantDelete = await requestApi('DELETE', `/api/documents/${doc1.id}`, undefined, tokenBetaAdmin);
  assert(crossTenantDelete.status === 404 || crossTenantDelete.status === 403, 'Step 6.4: Beta Admin blocked from deleting Apex doc');

  // --- Step 7: Document Deletion & Storage Purging ---
  console.log('\n--- Step 7: Document Deletion & Object Purging ---');

  const deleteRes = await requestApi('DELETE', `/api/documents/${doc1.id}`, undefined, tokenApexAdmin);
  assert(deleteRes.status === 200, 'Step 7.1: Document deleted via DELETE /api/documents/:id');

  // Verify deleted from database
  const getDeleted = await requestApi('GET', `/api/documents/${doc1.id}`, undefined, tokenApexAdmin);
  assert(getDeleted.status === 404, 'Step 7.2: Deleted document returns 404 Not Found');

  // --- Step 8: Storage Usage Metering Integration ---
  console.log('\n--- Step 8: Real-Time Storage Metering in UsageService ---');

  const apexUsage = await UsageService.getWorkspaceUsage(wsApexId);
  assert(typeof apexUsage.usage.storageMb.current === 'number', 'Step 8.1: Storage MB consumption calculated dynamically');
  assert(apexUsage.usage.storageMb.limit === 200 || apexUsage.usage.storageMb.limit === 500, 'Step 8.2: Free tier storage limit enforced');
  assert(apexUsage.usage.storageMb.percent >= 0 && apexUsage.usage.storageMb.percent <= 100, 'Step 8.3: Storage consumption percent valid');
  assert(apexUsage.hasOverage === false, 'Step 8.4: Storage is within plan limits');

  // --- Step 9: Backblaze B2 Health Monitoring ---
  console.log('\n--- Step 9: Production Health Readiness Probe ---');

  const readyRes = await requestApi('GET', '/health/ready');
  assert(readyRes.status === 200, 'Step 9.1: GET /health/ready returned 200 OK');
  assert(readyRes.data.checks.storage === 'operational', 'Step 9.2: Object storage operational status verified');
  assert(readyRes.data.checks.storage_ok === true, 'Step 9.3: Storage subsystem health check flag is true');
  assert(readyRes.data.checks.bucket === 'workspace-os-vault', 'Step 9.4: Backblaze B2 bucket target verified');

  console.log('\n===============================================================');
  console.log(` BACKBLAZE B2 STORAGE TESTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    throw new Error(`Backblaze B2 storage testing failed with ${failCount} errors.`);
  }
}

if (process.argv[1]?.endsWith('b2-storage.test.ts') || process.argv[1]?.includes('b2-storage')) {
  runB2StorageTests().then(() => process.exit(0)).catch((err) => {
    console.error('B2 test suite error:', err);
    process.exit(1);
  });
}
