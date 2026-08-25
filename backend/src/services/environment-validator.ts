/**
 * Production Environment Validation Engine — Phase 20B
 * 
 * Verifies critical production credentials and infrastructure parameters at startup.
 * Enforces Zero-Trust configuration:
 * - No silent fallback values in production
 * - No hardcoded secrets
 * - Cryptographic length validation (SESSION_SECRET >= 32 chars, ENCRYPTION_KEY >= 32 chars)
 * - Returns structured audit report
 */

export interface VariableValidationDetail {
  name: string;
  critical: boolean;
  present: boolean;
  length?: number;
  maskedValue?: string;
  error?: string;
}

export interface EnvironmentValidationReport {
  status: 'valid' | 'invalid' | 'warning';
  environment: string;
  timestamp: string;
  totalChecked: number;
  validCount: number;
  missingCount: number;
  missingCritical: string[];
  missingOptional: string[];
  variables: Record<string, VariableValidationDetail>;
  isProductionReady: boolean;
}

export class EnvironmentValidator {
  public static readonly CRITICAL_VARS = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'RESEND_API_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
  ] as const;

  public static readonly INFRASTRUCTURE_VARS = [
    'B2_APPLICATION_KEY_ID',
    'B2_APPLICATION_KEY',
    'B2_BUCKET_ID',
    'SENTRY_DSN',
  ] as const;

  /**
   * Helper to mask secrets for logging and audit exports
   */
  private static maskSecret(val: string): string {
    if (!val || val.length <= 8) return '****';
    return `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
  }

  /**
   * Validate runtime environment configuration against production standards.
   */
  public static validateEnvironment(options?: {
    strict?: boolean;
    envSource?: Record<string, string | undefined>;
  }): EnvironmentValidationReport {
    const env = options?.envSource || process.env;
    const nodeEnv = env.NODE_ENV || 'development';
    const isProd = nodeEnv === 'production';
    const strict = options?.strict ?? isProd;

    const variables: Record<string, VariableValidationDetail> = {};
    const missingCritical: string[] = [];
    const missingOptional: string[] = [];

    // 1. Validate Critical Variables
    for (const varName of this.CRITICAL_VARS) {
      const val = env[varName];
      const isPresent = typeof val === 'string' && val.trim().length > 0;

      let error: string | undefined;
      if (!isPresent) {
        error = `Critical environment variable ${varName} is missing or empty.`;
        missingCritical.push(varName);
      } else {
        if (varName === 'SESSION_SECRET' && val.length < 32) {
          error = `SESSION_SECRET is insecure (${val.length} chars). Must be at least 32 characters for cryptographic strength.`;
          missingCritical.push(varName);
        }
        if (varName === 'ENCRYPTION_KEY' && val.length < 32) {
          error = `ENCRYPTION_KEY is insecure (${val.length} chars). Must be at least 32 characters for AES-256-GCM.`;
          missingCritical.push(varName);
        }
      }

      variables[varName] = {
        name: varName,
        critical: true,
        present: isPresent && !error,
        length: isPresent ? val.length : 0,
        maskedValue: isPresent ? this.maskSecret(val) : undefined,
        error,
      };
    }

    // 2. Validate Infrastructure & Monitoring Variables
    for (const varName of this.INFRASTRUCTURE_VARS) {
      // Support alternative variable name aliases (e.g. B2_KEY_ID vs B2_APPLICATION_KEY_ID, B2_BUCKET_NAME vs B2_BUCKET_ID)
      let val = env[varName];
      if (!val && varName === 'B2_APPLICATION_KEY_ID') val = env.B2_KEY_ID;
      if (!val && varName === 'B2_BUCKET_ID') val = env.B2_BUCKET_NAME;

      const isPresent = typeof val === 'string' && val.trim().length > 0;
      let error: string | undefined;
      if (!isPresent) {
        error = `Infrastructure variable ${varName} is unconfigured.`;
        missingOptional.push(varName);
      }

      variables[varName] = {
        name: varName,
        critical: false,
        present: isPresent,
        length: isPresent ? val.length : 0,
        maskedValue: isPresent ? this.maskSecret(val) : undefined,
        error,
      };
    }

    const totalChecked = Object.keys(variables).length;
    const validCount = Object.values(variables).filter((v) => v.present).length;
    const missingCount = totalChecked - validCount;

    const isProductionReady = missingCritical.length === 0;
    const status: 'valid' | 'invalid' | 'warning' =
      missingCritical.length > 0
        ? 'invalid'
        : missingOptional.length > 0
        ? 'warning'
        : 'valid';

    return {
      status,
      environment: nodeEnv,
      timestamp: new Date().toISOString(),
      totalChecked,
      validCount,
      missingCount,
      missingCritical,
      missingOptional,
      variables,
      isProductionReady,
    };
  }

  /**
   * Enforces fail-fast startup. Throws fatal exception if critical secrets are missing.
   */
  public static assertProductionReady(envSource?: Record<string, string | undefined>): EnvironmentValidationReport {
    const report = this.validateEnvironment({ strict: true, envSource });
    if (!report.isProductionReady) {
      throw new Error(
        `[Workspace OS Fatal] Production launch blocked. Missing or invalid critical variables: ${report.missingCritical.join(
          ', '
        )}`
      );
    }
    return report;
  }
}
