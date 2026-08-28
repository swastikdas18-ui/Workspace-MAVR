import crypto from 'crypto';
import Razorpay from 'razorpay';
import { inMemoryDb } from '../../packages/database/index.js';
import { PLAN_CONFIG, PlanTier, BillingRepository } from '../repositories/billing-repository';
import { env } from '../config/env';

export interface RazorpayCustomer {
  id: string;
  workspaceId: string;
  razorpayCustomerId: string;
  email: string;
  name: string;
  contact?: string;
  createdAt: Date;
}

export interface RazorpaySubscription {
  id: string;
  workspaceId: string;
  razorpaySubscriptionId: string;
  razorpayPlanId: string;
  planTier: PlanTier;
  status: 'active' | 'authenticated' | 'pending' | 'halted' | 'cancelled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

export interface RazorpayPayment {
  id: string;
  workspaceId: string;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  amount: number; // in paise
  currency: string;
  status: 'captured' | 'failed' | 'refunded';
  method?: string;
  errorDescription?: string;
  createdAt: Date;
}

export class PaymentRepository {
  private static razorpayInstance: Razorpay | null = null;

  /**
   * SECURITY (Phase 17 — Fix #6): no default webhook secret. The credential
   * must be configured via RAZORPAY_WEBHOOK_SECRET or signature verification
   * fails closed.
   */
  private static get webhookSecret(): string {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || secret.trim().length === 0) {
      throw new Error(
        '[PaymentRepository] RAZORPAY_WEBHOOK_SECRET is not configured. ' +
          'Webhook signatures cannot be verified without it.'
      );
    }
    return secret;
  }

  /**
   * Get or initialize Razorpay SDK Client Instance
   */
  public static getRazorpayClient(): Razorpay {
    if (!this.razorpayInstance) {
      const keyId = env.RAZORPAY_KEY_ID;
      const keySecret = env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new Error(
          '[PaymentRepository] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured.'
        );
      }
      this.razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return this.razorpayInstance;
  }

  /**
   * Create or fetch Razorpay customer
   */
  public static async createCustomer(data: {
    workspaceId: string;
    email: string;
    name: string;
    contact?: string;
  }): Promise<RazorpayCustomer> {
    for (const cust of inMemoryDb.billingCustomers.values()) {
      if (cust.workspaceId === data.workspaceId) return cust;
    }

    const id = `bcust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let rzpCustId = `cust_${Date.now().toString().slice(-8)}`;

    try {
      if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_ID.includes('mock') && env.NODE_ENV === 'production') {
        const client = this.getRazorpayClient();
        const rzpCustomer = await client.customers.create({
          name: data.name,
          email: data.email,
          contact: data.contact,
          notes: { workspaceId: data.workspaceId },
        });
        if (rzpCustomer && rzpCustomer.id) {
          rzpCustId = rzpCustomer.id;
        }
      }
    } catch (err) {
      console.warn('[Razorpay Customer Create Warning]:', err);
    }

    const customer: RazorpayCustomer = {
      id,
      workspaceId: data.workspaceId,
      razorpayCustomerId: rzpCustId,
      email: data.email,
      name: data.name,
      contact: data.contact,
      createdAt: new Date(),
    };

    inMemoryDb.billingCustomers.set(id, customer);
    return customer;
  }

  /**
   * Create real Razorpay subscription with frontend checkout package
   */
  public static async createSubscription(data: {
    workspaceId: string;
    planTier: PlanTier;
    userEmail?: string;
    userName?: string;
  }): Promise<{
    subscription: RazorpaySubscription;
    subscriptionId: string;
    customerId: string;
    razorpayKey: string;
    checkoutData: {
      key: string;
      subscription_id: string;
      name: string;
      description: string;
      currency: string;
      amount: number;
      prefill: {
        email?: string;
        name?: string;
      };
      theme: {
        color: string;
      };
    };
  }> {
    const planInfo = PLAN_CONFIG[data.planTier] || PLAN_CONFIG.business;
    const id = `bsub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let rzpSubId = `sub_${Date.now().toString().slice(-8)}`;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Ensure customer exists
    const customer = await this.createCustomer({
      workspaceId: data.workspaceId,
      email: data.userEmail || 'admin@workspaceos.dev',
      name: data.userName || 'Workspace Admin',
    });

    try {
      if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_ID.includes('mock') && env.NODE_ENV === 'production') {
        const client = this.getRazorpayClient();
        const rzpSub: any = await (client.subscriptions as any).create({
          plan_id: `plan_${data.planTier}_monthly`,
          total_count: 12,
          customer_notify: 1,
          customer_id: customer.razorpayCustomerId,
          notes: {
            workspaceId: data.workspaceId,
            planTier: data.planTier,
          },
        });
        if (rzpSub && rzpSub.id) {
          rzpSubId = rzpSub.id;
        }
      }
    } catch (err) {
      console.warn('[Razorpay Subscription Create Warning]:', err);
    }

    const subscription: RazorpaySubscription = {
      id,
      workspaceId: data.workspaceId,
      razorpaySubscriptionId: rzpSubId,
      razorpayPlanId: `plan_${data.planTier}_monthly`,
      planTier: data.planTier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
    };

    inMemoryDb.billingSubscriptions.set(id, subscription);

    // Sync in workspace memory
    const ws = inMemoryDb.workspaces.get(data.workspaceId);
    if (ws) {
      ws.plan = data.planTier;
      inMemoryDb.workspaces.set(data.workspaceId, ws);
    }

    const checkoutData = {
      key: env.RAZORPAY_KEY_ID,
      subscription_id: rzpSubId,
      name: 'Workspace OS',
      description: `${planInfo.name} Plan (Monthly License)`,
      currency: 'INR',
      amount: planInfo.priceMonthly * 100, // paise
      prefill: {
        email: data.userEmail,
        name: data.userName,
      },
      theme: {
        color: '#2563EB',
      },
    };

    return {
      subscription,
      subscriptionId: rzpSubId,
      customerId: customer.razorpayCustomerId,
      razorpayKey: env.RAZORPAY_KEY_ID,
      checkoutData,
    };
  }

  /**
   * Verify Payment Signature (from client frontend Standard Checkout)
   */
  public static verifyPaymentSignature(data: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }): boolean {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = data;
    if (!razorpay_signature || !razorpay_payment_id) return false;

    const payload = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(razorpay_signature);
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  }

  /**
   * Record Razorpay payment
   */
  public static async recordPayment(data: {
    workspaceId: string;
    razorpayPaymentId: string;
    razorpayOrderId?: string;
    razorpaySubscriptionId?: string;
    amount: number;
    currency?: string;
    status: 'captured' | 'failed' | 'refunded';
    method?: string;
    errorDescription?: string;
  }): Promise<RazorpayPayment> {
    const id = `bpay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payment: RazorpayPayment = {
      id,
      workspaceId: data.workspaceId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpayOrderId: data.razorpayOrderId,
      razorpaySubscriptionId: data.razorpaySubscriptionId,
      amount: data.amount,
      currency: data.currency || 'INR',
      status: data.status,
      method: data.method || 'upi',
      errorDescription: data.errorDescription,
      createdAt: new Date(),
    };

    inMemoryDb.billingPayments.set(id, payment);
    return payment;
  }

  /**
   * Verify Razorpay Webhook Signature
   */
  public static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature);
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  }

  /**
   * Process and store incoming Razorpay Webhook event & automatically update workspace limits
   */
  public static async processWebhookEvent(eventId: string, event: string, payload: any) {
    if (inMemoryDb.billingWebhooks.has(eventId)) {
      return { duplicate: true, status: 'ignored' };
    }

    inMemoryDb.billingWebhooks.set(eventId, {
      id: eventId,
      eventId,
      event,
      payload,
      status: 'processed',
      processedAt: new Date(),
    });

    // Automatic Plan & Limit Synchronization
    const wsId = payload?.payload?.subscription?.entity?.notes?.workspaceId || payload?.notes?.workspaceId;
    const planTier = payload?.payload?.subscription?.entity?.notes?.planTier || payload?.notes?.planTier;

    if (wsId && planTier) {
      const ws = inMemoryDb.workspaces.get(wsId);
      if (ws) {
        ws.plan = planTier;
        inMemoryDb.workspaces.set(wsId, ws);
      }
    }

    return { duplicate: false, status: 'processed' };
  }

  /**
   * Get billing status
   */
  public static async getBillingStatus(workspaceId: string) {
    let activeSub: RazorpaySubscription | null = null;
    for (const sub of inMemoryDb.billingSubscriptions.values()) {
      if (sub.workspaceId === workspaceId) {
        activeSub = sub;
        break;
      }
    }

    const payments: RazorpayPayment[] = [];
    for (const p of inMemoryDb.billingPayments.values()) {
      if (p.workspaceId === workspaceId) payments.push(p);
    }

    return {
      activeSub,
      payments: payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    };
  }
}
