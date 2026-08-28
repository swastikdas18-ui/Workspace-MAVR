/**
 * Backblaze B2 & Provider-Agnostic S3 Object Storage Service
 * 
 * Capabilities:
 * - uploadObject() - Encapsulates S3 PutObject with workspace/document tenant key isolation
 * - deleteObject() - Removes object from Backblaze B2 bucket
 * - getSignedDownloadUrl() - Generates secure presigned URLs (15 min expiry) for client downloads
 * - healthCheck() - Verifies bucket reachability, write & read operations
 * 
 * Strict Tenant Isolation:
 * Key format: `${workspaceId}/${documentId}/${filename}`
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

export interface StorageUploadOptions {
  workspaceId: string;
  documentId: string;
  filename: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}

export interface StorageUploadResult {
  key: string;
  url: string;
  bucket: string;
  sizeBytes: number;
  etag?: string;
}

export class ObjectStorageService {
  private static client: S3Client | null = null;
  private static inMemoryStore: Map<string, { body: Buffer; contentType: string; size: number }> = new Map();

  public static getBucketName(): string {
    const bucket = process.env.B2_BUCKET_NAME || env.B2_BUCKET_NAME;
    if (!bucket && process.env.NODE_ENV === 'production') {
      throw new Error('[ObjectStorageService Fatal] B2_BUCKET_NAME is missing in environment.');
    }
    return bucket || 'workspace-os-vault';
  }

  public static getEndpoint(): string {
    let endpoint = process.env.B2_ENDPOINT || env.B2_ENDPOINT;
    if (!endpoint && process.env.NODE_ENV === 'production') {
      throw new Error('[ObjectStorageService Fatal] B2_ENDPOINT is missing in environment.');
    }
    endpoint = endpoint || 'https://s3.us-east-005.backblazeb2.com';
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = `https://${endpoint.replace(/^\/+/, '')}`;
    }
    return endpoint;
  }

  public static getRegion(): string {
    const region = process.env.B2_REGION || env.B2_REGION;
    if (!region && process.env.NODE_ENV === 'production') {
      throw new Error('[ObjectStorageService Fatal] B2_REGION is missing in environment.');
    }
    return region || 'us-east-005';
  }

  /**
   * Initializes or returns the AWS S3Client configured for Backblaze B2
   */
  public static getClient(): S3Client | null {
    if (this.client) return this.client;

    const keyId = process.env.B2_KEY_ID || env.B2_KEY_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY || env.B2_APPLICATION_KEY;
    const bucketName = this.getBucketName();
    const endpoint = this.getEndpoint();
    const region = this.getRegion();

    console.log('[B2 CONFIG]', {
      bucket: bucketName,
      endpoint,
      region,
      keyConfigured: !!keyId,
      applicationKeyConfigured: !!applicationKey,
    });

    if (process.env.NODE_ENV === 'production') {
      if (!keyId || !applicationKey || !bucketName || !endpoint || !region) {
        throw new Error(
          `[ObjectStorageService Fatal] Incomplete B2 Configuration: keyId=${!!keyId}, applicationKey=${!!applicationKey}, bucketName=${!!bucketName}, endpoint=${!!endpoint}, region=${!!region}`
        );
      }
    }

    if (keyId && applicationKey && process.env.NODE_ENV !== 'test') {
      try {
        this.client = new S3Client({
          region,
          endpoint,
          credentials: {
            accessKeyId: keyId,
            secretAccessKey: applicationKey,
          },
        });
        return this.client;
      } catch (clientErr) {
        console.error('[ObjectStorageService] Failed to initialize S3Client:', clientErr);
        if (process.env.NODE_ENV === 'production') {
          throw clientErr;
        }
        return null;
      }
    }

    return null;
  }

  /**
   * Generate canonical tenant-isolated storage key
   * Format: workspaceId/documentId/filename
   */
  public static getStorageKey(workspaceId: string, documentId: string, filename: string): string {
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${workspaceId}/${documentId}/${cleanFilename}`;
  }

  /**
   * Upload object to Backblaze B2 / Object Storage
   */
  public static async uploadObject(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const key = this.getStorageKey(options.workspaceId, options.documentId, options.filename);
    const contentType = options.contentType || 'application/octet-stream';
    const buffer = Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body);
    const sizeBytes = buffer.length;
    const bucketName = this.getBucketName();
    const endpoint = this.getEndpoint();
    const region = this.getRegion();

    const client = this.getClient();
    let storageProvider = 'in-memory';
    let storageSuccess = false;

    console.log('[B2 UPLOAD START]', {
      bucket: bucketName,
      key,
      sizeBytes,
      contentType,
    });

    if (client) {
      storageProvider = 'backblaze-b2';
      try {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          Metadata: {
            workspaceId: options.workspaceId,
            documentId: options.documentId,
          },
        });

        const response = await client.send(command);
        storageSuccess = true;
        const publicBase = process.env.B2_PUBLIC_URL || env.B2_PUBLIC_URL || `https://f005.backblazeb2.com/file/${bucketName}`;
        const url = `${publicBase}/${key}`;

        console.log(`[DOCUMENT-UPLOAD] workspaceId=${options.workspaceId} documentId=${options.documentId} filename=${options.filename} mimeType=${contentType} bytes=${sizeBytes} storageProvider=${storageProvider} storageKey=${key} storageSuccess=true`);

        return {
          key,
          url,
          bucket: bucketName,
          sizeBytes,
          etag: response.ETag,
        };
      } catch (err: any) {
        console.error('[B2 UPLOAD FAILED]', {
          bucket: bucketName,
          endpoint,
          region,
          key,
          error: err,
          message: err?.message,
          stack: err?.stack,
        });

        console.error(`[DOCUMENT-UPLOAD] workspaceId=${options.workspaceId} documentId=${options.documentId} filename=${options.filename} mimeType=${contentType} bytes=${sizeBytes} storageProvider=${storageProvider} storageKey=${key} storageSuccess=false error=${err?.message || err}`);
        
        // If in production and B2 is configured, fail closed so no ghost/broken document record is created
        if (process.env.NODE_ENV === 'production') {
          const uploadErr: any = new Error(`Backblaze B2 storage upload failed: ${err?.message || 'Unknown S3 error'}`);
          uploadErr.code = 'STORAGE_UPLOAD_FAILED';
          uploadErr.status = 502;
          throw uploadErr;
        }
      }
    }

    // High-resilience In-Memory test/dev fallback storage
    this.inMemoryStore.set(key, {
      body: buffer,
      contentType,
      size: sizeBytes,
    });

    console.log(`[DOCUMENT-UPLOAD] workspaceId=${options.workspaceId} documentId=${options.documentId} filename=${options.filename} mimeType=${contentType} bytes=${sizeBytes} storageProvider=in-memory storageKey=${key} storageSuccess=true`);

    return {
      key,
      url: `/api/documents/vault/${key}`,
      bucket: bucketName,
      sizeBytes,
      etag: `etag-${Date.now()}`,
    };
  }

  /**
   * Generate presigned download URL with 15-minute default expiry (900 seconds)
   */
  public static async getSignedDownloadUrl(
    workspaceId: string,
    key: string,
    expiresInSeconds = 900
  ): Promise<string> {
    // Validate tenant isolation
    if (!key.startsWith(`${workspaceId}/`)) {
      throw new Error(`[Security Boundary Violation] Access denied to foreign tenant storage key: ${key}`);
    }

    const client = this.getClient();
    const bucketName = this.getBucketName();
    if (client) {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    }

    // In-memory presigned token fallback
    const token = crypto.randomUUID();
    return `/api/documents/download-stream?key=${encodeURIComponent(key)}&token=${token}&expires=${Date.now() + expiresInSeconds * 1000}`;
  }

  /**
   * Delete object from Backblaze B2 / Object Storage
   */
  public static async deleteObject(workspaceId: string, key: string): Promise<boolean> {
    if (!key.startsWith(`${workspaceId}/`)) {
      throw new Error(`[Security Boundary Violation] Cannot delete foreign tenant object: ${key}`);
    }

    const client = this.getClient();
    const bucketName = this.getBucketName();
    if (client) {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await client.send(command);
      return true;
    }

    this.inMemoryStore.delete(key);
    return true;
  }

  /**
   * Retrieve stored object data (for download streams / testing)
   */
  public static async getObject(workspaceId: string, key: string) {
    if (!key.startsWith(`${workspaceId}/`)) {
      throw new Error(`[Security Boundary Violation] Access denied to foreign tenant key: ${key}`);
    }

    const client = this.getClient();
    const bucketName = this.getBucketName();
    if (client) {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await client.send(command);
      return {
        body: response.Body,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
      };
    }

    const stored = this.inMemoryStore.get(key);
    if (!stored) {
      throw new Error(`Object not found in storage: ${key}`);
    }

    return {
      body: stored.body,
      contentType: stored.contentType,
      contentLength: stored.size,
    };
  }

  /**
   * Health Check: Verifies bucket access, read & write permissions
   */
  public static async healthCheck(): Promise<{
    status: 'healthy' | 'error';
    bucket: string;
    endpoint?: string;
    region?: string;
    storage: 'backblaze-b2' | 'in-memory';
    message?: string;
    details?: any;
  }> {
    const bucket = this.getBucketName();
    const endpoint = this.getEndpoint();
    const region = this.getRegion();
    const client = this.getClient();

    if (!client) {
      if (process.env.NODE_ENV === 'production') {
        return {
          status: 'error',
          bucket,
          endpoint,
          region,
          storage: 'in-memory',
          message: 'Backblaze B2 client uninitialized in production environment.',
        };
      }
      return {
        status: 'healthy',
        bucket,
        endpoint,
        region,
        storage: 'in-memory',
        message: 'Object storage operational (in-memory test/dev fallback active)',
      };
    }

    try {
      const testKey = `_health/${Date.now()}-probe.txt`;
      // 1. Write probe
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: testKey,
          Body: 'health-check-probe',
          ContentType: 'text/plain',
        })
      );
      // 2. Read probe
      const readRes = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: testKey,
        })
      );
      // 3. Cleanup probe
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: testKey,
        })
      );

      return {
        status: 'healthy',
        bucket,
        endpoint,
        region,
        storage: 'backblaze-b2',
      };
    } catch (err: any) {
      console.error('[B2 HEALTH CHECK FAILED]', {
        bucket,
        endpoint,
        region,
        error: err,
        message: err?.message,
        stack: err?.stack,
      });

      return {
        status: 'error',
        bucket,
        endpoint,
        region,
        storage: 'backblaze-b2',
        message: err.message || 'Failed to verify Backblaze B2 bucket access',
        details: {
          code: err.name || err.Code,
          statusCode: err.$metadata?.httpStatusCode,
        },
      };
    }
  }

  /**
   * Clear in-memory storage (for test isolation)
   */
  public static reset() {
    this.inMemoryStore.clear();
  }
}

// Export StorageService and R2Service aliases for provider neutrality and backward compatibility
export const StorageService = ObjectStorageService;
export const R2Service = ObjectStorageService;
