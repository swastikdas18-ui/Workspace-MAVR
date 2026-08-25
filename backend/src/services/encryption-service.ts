import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * SECURITY (Phase 17): The master key is derived lazily from the
 * ENCRYPTION_KEY environment variable on first use. There is no fallback
 * secret — the service throws when the credential is absent instead of
 * silently encrypting with a committed default key.
 */
let cachedMasterKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;

  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      '[EncryptionService Fatal] ENCRYPTION_KEY is not configured. ' +
        'Refusing to encrypt/decrypt with an undefined master key.'
    );
  }
  if (secret.length < 32) {
    throw new Error(
      '[EncryptionService Fatal] ENCRYPTION_KEY must be at least 32 characters for AES-256 derivation.'
    );
  }

  cachedMasterKey = crypto.createHash('sha256').update(secret).digest();
  return cachedMasterKey;
}

/** Test/bootstrap hook: forces re-derivation of the master key. */
export function resetEncryptionKeyCache(): void {
  cachedMasterKey = null;
}

export interface EncryptedPayload {
  encryptedToken: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export class EncryptionService {
  private static currentKeyVersion = 1;

  /**
   * Encrypt plain text using AES-256-GCM
   */
  public static encryptToken(plainText: string): EncryptedPayload {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encryptedToken: encrypted,
      iv: iv.toString('hex'),
      authTag,
      keyVersion: this.currentKeyVersion,
    };
  }

  /**
   * Decrypt token payload using AES-256-GCM
   */
  public static decryptToken(payload: EncryptedPayload): string {
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);

    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(payload.encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Rotate encryption keys
   */
  public static rotateKeys(newVersion: number) {
    this.currentKeyVersion = newVersion;
    return this.currentKeyVersion;
  }
}
