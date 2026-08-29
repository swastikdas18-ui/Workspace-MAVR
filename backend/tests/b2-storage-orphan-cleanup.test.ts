/**
 * Suite 17 — Backblaze B2 Orphan Storage Lifecycle & Rollback Protection Tests
 * 
 * Validates:
 * 1. File Upload to Backblaze B2 & persistence in storage
 * 2. File Deletion triggers B2 object purge BEFORE DB deletion
 * 3. Verify object is completely removed from storage
 * 4. Verify delete of document without storage object handles gracefully
 * 5. Verify cross-tenant delete attempt returns 403 / 404
 * 6. Rollback protection: Storage failure retains DB record
 * 7. scan-orphaned-files scanner accurately identifies orphaned files and purges them
 */

import { inMemoryDb } from '../packages/database';
import { app } from '../src/app';
import { ObjectStorageService } from '../src/services/object-storage-service';
import { DocumentService } from '../src/services/document-service';
import { DocumentRepository } from '../src/repositories/document-repository';
import { scanOrphanedFiles } from '../../scripts/scan-orphaned-files';
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

export async function runB2StorageOrphanCleanupTests() {
  console.log('\n===============================================================');
  console.log(' SUITE 17: B2 STORAGE ORPHAN CLEANUP & LIFECYCLE TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();
  ObjectStorageService.reset();

  // --- Step 1: Provision Multi-Tenant Workspaces ---
  console.log('--- Step 1: Provision Multi-Tenant Workspaces ---');

  const wsARes = await requestApi('POST', '/api/auth/register', {
    name: 'Atlas Admin',
    email: 'admin@atlascorp.io',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'Atlas Corp',
  });
  assert(wsARes.status === 201, 'Workspace A (Atlas Corp) provisioned');
  const tokenAtlasAdmin = wsARes.data.token;
  const wsAtlasId = wsARes.data.workspace.id;

  const wsBRes = await requestApi('POST', '/api/auth/register', {
    name: 'Beta Admin',
    email: 'admin@betacorp.io',
    password: 'Password123!',
    role: 'admin',
    workspaceName: 'Beta Corp',
  });
  assert(wsBRes.status === 201, 'Workspace B (Beta Corp) provisioned');
  const tokenBetaAdmin = wsBRes.data.token;
  const wsBetaId = wsBRes.data.workspace.id;

  // --- Step 2: Upload File & Verify Exists in Storage ---
  console.log('\n--- Step 2: Upload File & Verify Exists in Storage ---');

  const uploadRes = await requestApi('POST', '/api/documents', {
    title: 'Financial Q4 Report',
    visibility: 'team',
    category: 'Finance',
    filename: 'q4_financials.pdf',
    fileContent: Buffer.from('Confidential Financial Report 2026').toString('base64'),
    contentType: 'application/pdf',
  }, tokenAtlasAdmin);

  assert(uploadRes.status === 201, 'Document uploaded via POST /api/documents (201)');
  const doc = uploadRes.data.document;
  assert(!!doc.storage_key, 'Document assigned tenant storage key');
  
  const existsInStorageBefore = await ObjectStorageService.objectExists(wsAtlasId, doc.storage_key);
  assert(existsInStorageBefore === true, 'Object physically exists in Storage before deletion');

  // --- Step 3: Delete Document & Verify Removal From Storage ---
  console.log('\n--- Step 3: Delete Document & Verify Synchronized Removal from B2 ---');

  const deleteRes = await requestApi('DELETE', `/api/documents/${doc.id}`, undefined, tokenAtlasAdmin);
  assert(deleteRes.status === 200, 'DELETE /api/documents/:id returned 200 OK');

  // 1. Verify object removed from storage
  const existsInStorageAfter = await ObjectStorageService.objectExists(wsAtlasId, doc.storage_key);
  assert(existsInStorageAfter === false, 'Object physically purged from Storage upon document deletion');

  // 2. Verify record removed from database
  const getDeletedRes = await requestApi('GET', `/api/documents/${doc.id}`, undefined, tokenAtlasAdmin);
  assert(getDeletedRes.status === 404, 'Database record deleted (404 Not Found on GET)');

  // --- Step 4: Delete Document with Missing Storage Object (Graceful Recovery) ---
  console.log('\n--- Step 4: Graceful Handling for Document with No Storage Key / Missing Object ---');

  const metaOnlyDoc = await DocumentRepository.createDocument({
    workspaceId: wsAtlasId,
    ownerId: wsARes.data.user.id,
    title: 'Legacy Metadata File',
    visibility: 'team',
    category: 'General',
  });

  const deleteMetaRes = await requestApi('DELETE', `/api/documents/${metaOnlyDoc.id}`, undefined, tokenAtlasAdmin);
  assert(deleteMetaRes.status === 200, 'Document without storage object deleted gracefully (200 OK)');

  // --- Step 5: Multi-Tenant Boundary Enforcement ---
  console.log('\n--- Step 5: Cross-Workspace Deletion Isolation (403/404) ---');

  const docAtlas = await DocumentService.createDocument(
    wsAtlasId,
    wsARes.data.user.id,
    'admin',
    {
      title: 'Atlas Confidential Blueprint',
      visibility: 'team',
      category: 'Technical',
      fileType: 'pdf',
      content: Buffer.from('Atlas Blueprint Secret'),
    }
  );

  const crossDeleteRes = await requestApi('DELETE', `/api/documents/${docAtlas.id}`, undefined, tokenBetaAdmin);
  assert(crossDeleteRes.status === 404 || crossDeleteRes.status === 403, 'Beta Admin blocked from deleting Atlas document (403/404)');

  // Ensure Atlas document still exists
  const stillExistsInStorage = await ObjectStorageService.objectExists(wsAtlasId, docAtlas.storage_key!);
  assert(stillExistsInStorage === true, 'Atlas document storage object remained untouched after cross-tenant attack');

  // --- Step 6: Rollback Protection on Storage Failure ---
  console.log('\n--- Step 6: Storage Rollback Protection ---');

  // Simulate storage failure during purge
  const origDelete = ObjectStorageService.deleteObject;
  ObjectStorageService.deleteObject = async () => {
    throw new Error('Simulated Backblaze B2 Network Timeout');
  };

  try {
    let failed = false;
    try {
      await DocumentService.deleteDocument(wsAtlasId, docAtlas.id, wsARes.data.user.id, 'admin');
    } catch (err: any) {
      failed = true;
      assert(err.code === 'STORAGE_PURGE_FAILED', 'DocumentService throws STORAGE_PURGE_FAILED on storage failure');
    }
    assert(failed === true, 'Deletion failed as expected due to storage error');

    // Verify DB record was NOT deleted (rollback protection)
    const dbRecord = await DocumentRepository.getDocumentById(wsAtlasId, docAtlas.id);
    assert(dbRecord !== null, 'Rollback protection: Database record preserved when storage purge fails');
  } finally {
    ObjectStorageService.deleteObject = origDelete;
  }

  // --- Step 7: Orphan Scanner & Purge Audit ---
  console.log('\n--- Step 7: Orphan Scanner & Purge Execution ---');

  // Inject a simulated orphaned object directly into storage without a DB row
  const orphanedKey = `${wsAtlasId}/orphan-doc-999/orphaned_payload.pdf`;
  await ObjectStorageService.uploadObject({
    workspaceId: wsAtlasId,
    documentId: 'orphan-doc-999',
    filename: 'orphaned_payload.pdf',
    body: Buffer.from('I am an orphaned file consuming space'),
  });

  const dryReport = await scanOrphanedFiles({ purge: false });
  assert(dryReport.orphanedFiles >= 1, 'Orphan scanner identified orphaned object');
  assert(dryReport.orphanedKeys.some((k) => k.key.includes('orphaned_payload.pdf')), 'Orphan scanner identified specific orphaned key');

  // Now execute purge
  const purgeReport = await scanOrphanedFiles({ purge: true });
  assert(purgeReport.purged === true, 'Purge executed flag is true');
  const orphanStillExists = await ObjectStorageService.objectExists(wsAtlasId, orphanedKey);
  assert(orphanStillExists === false, 'Orphaned file successfully purged from storage');

  console.log('\n===============================================================');
  console.log(` SUITE 17 PASSED: ${passCount} Assertions, ${failCount} Failures`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    throw new Error(`Suite 17 failed with ${failCount} errors.`);
  }
}

if (process.argv[1]?.endsWith('b2-storage-orphan-cleanup.test.ts') || process.argv[1]?.includes('b2-storage-orphan-cleanup')) {
  runB2StorageOrphanCleanupTests().then(() => process.exit(0)).catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}
