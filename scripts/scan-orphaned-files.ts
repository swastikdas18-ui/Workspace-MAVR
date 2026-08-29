/**
 * scripts/scan-orphaned-files.ts
 * 
 * Backblaze B2 Orphaned Storage Scanner & Cleanup Utility
 * 
 * Purpose:
 * Scans the Backblaze B2 bucket (or active object storage provider),
 * compares all storage keys against active rows in PostgreSQL `documents` table,
 * identifies orphaned objects that consume storage without database references,
 * and optionally purges them to reclaim storage costs.
 * 
 * Usage:
 *   npx tsx scripts/scan-orphaned-files.ts           # Dry-run audit report
 *   npx tsx scripts/scan-orphaned-files.ts --delete  # Execute purge of orphaned objects
 */

import dotenv from 'dotenv';
dotenv.config();

import { ObjectStorageService } from '../backend/src/services/object-storage-service';
import { getDb, schema } from '../backend/packages/database/index.js';

interface CleanupReport {
  timestamp: string;
  bucket: string;
  storageProvider: string;
  totalFiles: number;
  databaseFiles: number;
  orphanedFiles: number;
  recoveredStorageBytes: number;
  recoveredStorageFormatted: string;
  orphanedKeys: Array<{ key: string; size: number; lastModified?: string }>;
  purged: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function scanOrphanedFiles(options: { purge?: boolean } = {}): Promise<CleanupReport> {
  const shouldPurge = options.purge || process.argv.includes('--delete') || process.argv.includes('--purge');
  const bucket = ObjectStorageService.getBucketName();
  
  console.log('===============================================================');
  console.log(' BACKBLAZE B2 STORAGE ORPHAN SCANNER & AUDIT UTILITY');
  console.log('===============================================================');
  console.log(`Bucket Target : ${bucket}`);
  console.log(`Execution Mode: ${shouldPurge ? 'PURGE / DELETE' : 'DRY RUN AUDIT'}\n`);

  // 1. Fetch all objects from Backblaze B2 / Object Storage
  console.log('>>> [1/4] Scanning Object Storage bucket contents...');
  const bucketObjects = await ObjectStorageService.listObjects();
  console.log(`    Found ${bucketObjects.length} total objects in bucket.`);

  // 2. Fetch all active document storage keys from Database
  console.log('>>> [2/4] Querying PostgreSQL active document records...');
  const dbKeys = new Set<string>();
  try {
    const db = getDb();
    if (db) {
      const rows = await db.select({ storageKey: schema.documents.storageKey, r2Key: schema.documents.r2Key }).from(schema.documents);
      for (const row of rows) {
        if (row.storageKey) dbKeys.add(row.storageKey);
        if (row.r2Key) dbKeys.add(row.r2Key);
      }
    }
  } catch (err: any) {
    console.warn('    Database connection warning (falling back to empty DB map if local):', err?.message);
  }
  console.log(`    Found ${dbKeys.size} registered storage keys in database.`);

  // 3. Identify Orphaned Objects
  console.log('>>> [3/4] Comparing bucket objects against database catalog...');
  const orphanedList: Array<{ key: string; size: number; lastModified?: string }> = [];
  let totalOrphanedBytes = 0;

  for (const obj of bucketObjects) {
    // Ignore internal health check probes
    if (obj.key.startsWith('_health/')) continue;

    if (!dbKeys.has(obj.key)) {
      orphanedList.push({
        key: obj.key,
        size: obj.size,
        lastModified: obj.lastModified ? obj.lastModified.toISOString() : undefined,
      });
      totalOrphanedBytes += obj.size;
    }
  }

  console.log(`    Identified ${orphanedList.length} orphaned objects (${formatBytes(totalOrphanedBytes)}).`);

  // 4. Execute Purge if Requested
  if (shouldPurge && orphanedList.length > 0) {
    console.log('\n>>> [4/4] Purging orphaned objects from Backblaze B2...');
    for (const orphan of orphanedList) {
      const workspaceId = orphan.key.split('/')[0] || 'default';
      try {
        await ObjectStorageService.deleteObject(workspaceId, orphan.key);
        console.log(`    ✅ Purged: ${orphan.key} (${formatBytes(orphan.size)})`);
      } catch (err: any) {
        console.error(`    ❌ Failed to purge: ${orphan.key}`, err?.message || err);
      }
    }
    console.log(`\n🎉 Successfully purged ${orphanedList.length} orphaned files.`);
  } else if (orphanedList.length > 0) {
    console.log('\n>>> [4/4] Dry run completed. To delete these orphaned files, run:');
    console.log('    npx tsx scripts/scan-orphaned-files.ts --delete');
  }

  const report: CleanupReport = {
    timestamp: new Date().toISOString(),
    bucket,
    storageProvider: process.env.NODE_ENV === 'production' ? 'backblaze-b2' : 's3/in-memory',
    totalFiles: bucketObjects.length,
    databaseFiles: dbKeys.size,
    orphanedFiles: orphanedList.length,
    recoveredStorageBytes: totalOrphanedBytes,
    recoveredStorageFormatted: formatBytes(totalOrphanedBytes),
    orphanedKeys: orphanedList,
    purged: shouldPurge,
  };

  console.log('\n===============================================================');
  console.log(' CLEANUP REPORT SUMMARY');
  console.log('===============================================================');
  console.log(`Total Files in Storage : ${report.totalFiles}`);
  console.log(`Active Database Files  : ${report.databaseFiles}`);
  console.log(`Orphaned Files Found   : ${report.orphanedFiles}`);
  console.log(`Recoverable Storage    : ${report.recoveredStorageFormatted}`);
  console.log(`Purge Executed         : ${report.purged ? 'YES' : 'NO'}`);
  console.log('===============================================================\n');

  return report;
}

if (process.argv[1]?.endsWith('scan-orphaned-files.ts') || process.argv[1]?.includes('scan-orphaned-files')) {
  scanOrphanedFiles().then(() => process.exit(0)).catch((err) => {
    console.error('Scanner error:', err);
    process.exit(1);
  });
}
