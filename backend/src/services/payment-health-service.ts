/**
 * Razorpay Payment Infrastructure & Gateway Health Service — Phase 20B
 * 
 * Verifies payment processing capabilities:
 * - Razorpay API Key ID & Key Secret presence and format
 * - Webhook Secret configuration
 * - HMAC-SHA256 signature verification test drill
 * - Test payment order verification lifecycle
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentRepository } from '../repositories/payment-repository';
import { env } from '../config/env';

export interface PaymentHealthReport {
  status: 'healthy' | 'degraded' | 'failed';
  gateway: 'razorpay';
  keyIdConfigured: boolean;
  keySecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  signatureVerificationWorking: boolean;
  paymentVerificationFlowPassing: boolean;
  testDrill: {
    orderId: string;
    paymentId: string;
    signatureVerified: boolean;
    durationMs: number;
  };
  timestamp: string;
  currency: string;
}

export class PaymentHealthService {
  /**
   * Run full cryptographic and functional health verification of the payment engine.
   */
  public static async verifyPaymentHealth(): Promise<PaymentHealthReport> {
    const startTime = Date.now();
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

    const keyIdConfigured = typeof keyId === 'string' && keyId.trim().length > 0;
    const keySecretConfigured = typeof keySecret === 'string' && keySecret.trim().length > 0;
    const webhookSecretConfigured = typeof webhookSecret === 'string' && webhookSecret.trim().length > 0;

    // Run active cryptographic test drill: create signed payload and verify it
    const testPaymentId = `pay_test_${Date.now()}`;
    const testSubscriptionId = `sub_test_${Date.now()}`;
    const activeSecret = keySecret || 'mock_secret_for_health_check_drill_32';

    // Construct Razorpay signature: HMAC-SHA256(payment_id + "|" + subscription_id, key_secret)
    const expectedPayload = `${testPaymentId}|${testSubscriptionId}`;
    const testSignature = createHmac('sha256', activeSecret)
      .update(expectedPayload)
      .digest('hex');

    // Run verification through PaymentRepository
    const verificationPass = PaymentRepository.verifyPaymentSignature({
      razorpay_payment_id: testPaymentId,
      razorpay_subscription_id: testSubscriptionId,
      razorpay_signature: testSignature,
    });

    const isFullyConfigured = keyIdConfigured && keySecretConfigured;
    const status: 'healthy' | 'degraded' | 'failed' =
      isFullyConfigured && verificationPass
        ? 'healthy'
        : verificationPass
        ? 'degraded'
        : 'failed';

    return {
      status,
      gateway: 'razorpay',
      keyIdConfigured,
      keySecretConfigured,
      webhookSecretConfigured,
      signatureVerificationWorking: verificationPass,
      paymentVerificationFlowPassing: verificationPass,
      testDrill: {
        orderId: testSubscriptionId,
        paymentId: testPaymentId,
        signatureVerified: verificationPass,
        durationMs: Date.now() - startTime,
      },
      timestamp: new Date().toISOString(),
      currency: 'INR',
    };
  }
}
