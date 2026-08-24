/**
 * Billing & Subscription Repository
 * 
 * Supports:
 * - Free, Starter, Business, Enterprise Plans
 * - Plan Limits & Features Matrix
 * - Invoices & Payment History
 */

import { inMemoryDb, getDb, subscriptions, invoices, workspaces } from '../../packages/database';
import { eq, desc } from 'drizzle-orm';

export type PlanTier = 'free' | 'starter' | 'business' | 'enterprise';

export interface PlanLimits {
  maxMembers: number;
  maxProjects: number;
  maxStorageMb: number;
  maxApiRequestsMonthly: number;
  maxAutomations: number;
  hasSso: boolean;
  hasAuditLogs: boolean;
  hasDedicatedSupport: boolean;
}

export const PLAN_CONFIG: Record<PlanTier, { name: string; priceMonthly: number; priceYearly: number; limits: PlanLimits }> = {
  free: {
    name: 'Free Starter',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxMembers: 5,
      maxProjects: 3,
      maxStorageMb: 500, // 500 MB
      maxApiRequestsMonthly: 10000,
      maxAutomations: 3,
      hasSso: false,
      hasAuditLogs: false,
      hasDedicatedSupport: false,
    },
  },
  starter: {
    name: 'Team Starter',
    priceMonthly: 29,
    priceYearly: 290,
    limits: {
      maxMembers: 15,
      maxProjects: 20,
      maxStorageMb: 5000, // 5 GB
      maxApiRequestsMonthly: 50000,
      maxAutomations: 15,
      hasSso: false,
      hasAuditLogs: true,
      hasDedicatedSupport: false,
    },
  },
  business: {
    name: 'Business Pro',
    priceMonthly: 79,
    priceYearly: 790,
    limits: {
      maxMembers: 50,
      maxProjects: 100,
      maxStorageMb: 50000, // 50 GB
      maxApiRequestsMonthly: 500000,
      maxAutomations: 50,
      hasSso: true,
      hasAuditLogs: true,
      hasDedicatedSupport: true,
    },
  },
  enterprise: {
    name: 'Enterprise Scale',
    priceMonthly: 249,
    priceYearly: 2490,
    limits: {
      maxMembers: 9999,
      maxProjects: 9999,
      maxStorageMb: 1000000, // 1 TB
      maxApiRequestsMonthly: 10000000,
      maxAutomations: 9999,
      hasSso: true,
      hasAuditLogs: true,
      hasDedicatedSupport: true,
    },
  },
};

export class BillingRepository {
  /**
   * Get subscription for a workspace
   */
  public static async getSubscription(workspaceId: string) {
    const db = getDb();
    if (db) {
      const rows = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);
      if (rows.length > 0) return rows[0];
    }

    // In-memory fallback
    for (const sub of inMemoryDb.subscriptions.values()) {
      if (sub.workspaceId === workspaceId) return sub;
    }

    // Default Free subscription if none exists
    const defaultSub = {
      id: `sub-${Date.now()}`,
      workspaceId,
      plan: 'free' as PlanTier,
      status: 'active',
      billingCycle: 'monthly',
      seats: 5,
      pricePerMonth: 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDb.subscriptions.set(defaultSub.id, defaultSub);
    return defaultSub;
  }

  /**
   * Update or Upgrade subscription
   */
  public static async updateSubscription(
    workspaceId: string,
    plan: PlanTier,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) {
    const planDetails = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
    const price = billingCycle === 'monthly' ? planDetails.priceMonthly : planDetails.priceYearly;

    const sub = await this.getSubscription(workspaceId);
    const updatedSub = {
      ...sub,
      plan,
      pricePerMonth: price,
      billingCycle,
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };

    inMemoryDb.subscriptions.set(sub.id, updatedSub);

    // Sync workspace plan tag
    const ws = inMemoryDb.workspaces.get(workspaceId);
    if (ws) {
      ws.plan = plan;
      inMemoryDb.workspaces.set(workspaceId, ws);
    }

    // Issue invoice if paid tier
    if (price > 0) {
      await this.createInvoice({
        workspaceId,
        amount: price * 100,
        currency: 'usd',
        status: 'paid',
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        periodStart: updatedSub.currentPeriodStart,
        periodEnd: updatedSub.currentPeriodEnd,
      });
    }

    return updatedSub;
  }

  /**
   * Cancel subscription (marks cancelAtPeriodEnd = true)
   */
  public static async cancelSubscription(workspaceId: string) {
    const sub = await this.getSubscription(workspaceId);
    const updated = {
      ...sub,
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    };
    inMemoryDb.subscriptions.set(sub.id, updated);
    return updated;
  }

  /**
   * Create invoice record
   */
  public static async createInvoice(data: {
    workspaceId: string;
    amount: number;
    currency?: string;
    status?: string;
    invoiceNumber: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    const id = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoice = {
      id,
      workspaceId: data.workspaceId,
      amount: data.amount,
      currency: data.currency || 'usd',
      status: data.status || 'paid',
      invoiceNumber: data.invoiceNumber,
      pdfUrl: `/api/billing/invoices/${id}/pdf`,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      paidAt: new Date(),
      createdAt: new Date(),
    };

    inMemoryDb.invoices.set(id, invoice);
    return invoice;
  }

  /**
   * Get invoices for a workspace
   */
  public static async getInvoices(workspaceId: string) {
    const results: any[] = [];
    for (const inv of inMemoryDb.invoices.values()) {
      if (inv.workspaceId === workspaceId) {
        results.push(inv);
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
