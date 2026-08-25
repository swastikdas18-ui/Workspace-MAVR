/**
 * Billing & Subscription Repository — Phase 18 Revenue Architecture
 *
 * Plans: Free | Starter | Business | Scale | Enterprise
 * Per-seat expansion billing on Business and Scale
 * Annual billing: monthlyPrice × 10 (2 months free)
 */

import { inMemoryDb, getDb, subscriptions, invoices, workspaces } from '../../packages/database';
import { eq, desc } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'starter' | 'business' | 'scale' | 'enterprise';

export type WorkspaceFeature =
  | 'projects'
  | 'tasks'
  | 'crm'
  | 'documents'
  | 'wiki'
  | 'guest_portal_view'
  | 'time_tracking'
  | 'automations'
  | 'client_approvals'
  | 'invoices'
  | 'utilization_reports'
  | 'api_keys'
  | 'webhooks'
  | 'analytics'
  | 'founder_console'
  | 'priority_support'
  | 'sso'
  | 'dedicated_infra';

export interface PlanLimits {
  maxMembers: number;       // included seats
  maxProjects: number;
  maxStorageMb: number;
  maxApiRequestsMonthly: number;
  maxAutomations: number;
  hasSso: boolean;
  hasAuditLogs: boolean;
  hasDedicatedSupport: boolean;
  hasApiAccess: boolean;
  hasCustomRoles: boolean;
}

export interface PlanDefinition {
  name: string;
  currency: 'INR';
  priceMonthly: number;
  priceYearly: number;        // monthlyPrice × 10
  includedSeats: number;      // seats included in base price
  extraSeatPrice: number;     // ₹/extra seat/month (0 = not available)
  features: WorkspaceFeature[];
  limits: PlanLimits;
  tagline: string;
  highlight?: boolean;        // "Most Popular" badge
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN CONFIGURATION — Source of Truth
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_CONFIG: Record<PlanTier, PlanDefinition> = {
  free: {
    name: 'Free',
    currency: 'INR',
    priceMonthly: 0,
    priceYearly: 0,
    includedSeats: 3,
    extraSeatPrice: 0,
    tagline: 'For individuals and tiny teams',
    features: ['projects', 'tasks'],
    limits: {
      maxMembers: 3,
      maxProjects: 2,
      maxStorageMb: 200,
      maxApiRequestsMonthly: 5000,
      maxAutomations: 0,
      hasSso: false,
      hasAuditLogs: false,
      hasDedicatedSupport: false,
      hasApiAccess: false,
      hasCustomRoles: false,
    },
  },

  starter: {
    name: 'Starter',
    currency: 'INR',
    priceMonthly: 999,
    priceYearly: 9990,          // 999 × 10
    includedSeats: 10,
    extraSeatPrice: 0,          // No per-seat expansion on Starter
    tagline: 'For growing teams that need structure',
    features: [
      'projects', 'tasks', 'crm', 'documents', 'wiki', 'guest_portal_view',
    ],
    limits: {
      maxMembers: 10,
      maxProjects: 9999,
      maxStorageMb: 2000,       // 2 GB
      maxApiRequestsMonthly: 50000,
      maxAutomations: 0,
      hasSso: false,
      hasAuditLogs: true,
      hasDedicatedSupport: false,
      hasApiAccess: false,
      hasCustomRoles: false,
    },
  },

  business: {
    name: 'Business',
    currency: 'INR',
    priceMonthly: 2999,
    priceYearly: 29990,         // 2999 × 10
    includedSeats: 25,
    extraSeatPrice: 99,         // ₹99/extra seat/month
    tagline: 'For agencies and professional teams',
    highlight: true,            // Most Popular
    features: [
      'projects', 'tasks', 'crm', 'documents', 'wiki', 'guest_portal_view',
      'time_tracking', 'automations', 'client_approvals', 'invoices',
      'utilization_reports',
    ],
    limits: {
      maxMembers: 9999,         // Unlimited with overage billing
      maxProjects: 9999,
      maxStorageMb: 10000,      // 10 GB
      maxApiRequestsMonthly: 500000,
      maxAutomations: 50,
      hasSso: false,
      hasAuditLogs: true,
      hasDedicatedSupport: true,
      hasApiAccess: false,
      hasCustomRoles: false,
    },
  },

  scale: {
    name: 'Scale',
    currency: 'INR',
    priceMonthly: 7999,
    priceYearly: 79990,         // 7999 × 10
    includedSeats: 75,
    extraSeatPrice: 89,         // ₹89/extra seat/month
    tagline: 'For large teams that need full control',
    features: [
      'projects', 'tasks', 'crm', 'documents', 'wiki', 'guest_portal_view',
      'time_tracking', 'automations', 'client_approvals', 'invoices',
      'utilization_reports', 'api_keys', 'webhooks', 'analytics',
      'founder_console', 'priority_support',
    ],
    limits: {
      maxMembers: 9999,         // Unlimited with overage billing
      maxProjects: 9999,
      maxStorageMb: 100000,     // 100 GB
      maxApiRequestsMonthly: 5000000,
      maxAutomations: 9999,
      hasSso: false,
      hasAuditLogs: true,
      hasDedicatedSupport: true,
      hasApiAccess: true,
      hasCustomRoles: true,
    },
  },

  enterprise: {
    name: 'Enterprise',
    currency: 'INR',
    priceMonthly: 0,            // Custom — contact sales
    priceYearly: 0,
    includedSeats: 9999,
    extraSeatPrice: 0,
    tagline: 'For large organizations with custom needs',
    features: [
      'projects', 'tasks', 'crm', 'documents', 'wiki', 'guest_portal_view',
      'time_tracking', 'automations', 'client_approvals', 'invoices',
      'utilization_reports', 'api_keys', 'webhooks', 'analytics',
      'founder_console', 'priority_support', 'sso', 'dedicated_infra',
    ],
    limits: {
      maxMembers: 9999,
      maxProjects: 9999,
      maxStorageMb: 10000000,   // 10 TB
      maxApiRequestsMonthly: 100000000,
      maxAutomations: 9999,
      hasSso: true,
      hasAuditLogs: true,
      hasDedicatedSupport: true,
      hasApiAccess: true,
      hasCustomRoles: true,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BILLING REPOSITORY
// ─────────────────────────────────────────────────────────────────────────────

export class BillingRepository {
  /**
   * Get subscription for a workspace
   */
  public static async getSubscription(workspaceId: string) {
    try {
      const db = getDb();
      if (db) {
        const rows = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1);
        if (rows.length > 0) return rows[0];
      }
    } catch (dbErr) {
      console.warn('[BillingRepository.getSubscription DB Warning]:', dbErr);
    }

    // In-memory fallback
    for (const sub of inMemoryDb.subscriptions.values()) {
      if (sub.workspaceId === workspaceId) return sub;
    }

    // Check workspace plan tag
    const ws = inMemoryDb.workspaces.get(workspaceId);
    const rawPlan = ws?.plan as string;
    // Migrate legacy 'growth' plan to 'scale'
    const planToSet: PlanTier = rawPlan === 'growth' ? 'scale'
      : (['free', 'starter', 'business', 'scale', 'enterprise'].includes(rawPlan) ? rawPlan as PlanTier : 'free');

    const planDef = PLAN_CONFIG[planToSet];

    // Default 14-day trial subscription
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const defaultTrialSub = {
      id: `sub-${Date.now()}`,
      workspaceId,
      plan: planToSet,
      status: 'trialing',
      billingCycle: 'monthly' as const,
      seats: planDef.includedSeats,
      pricePerMonth: planDef.priceMonthly,
      trialStart: now,
      trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryDb.subscriptions.set(defaultTrialSub.id, defaultTrialSub);
    return defaultTrialSub;
  }

  /**
   * Get Trial status and days remaining
   */
  public static async getTrialStatus(workspaceId: string) {
    const sub = await this.getSubscription(workspaceId);
    const now = Date.now();
    const trialEnd = sub.trialEnd
      ? new Date(sub.trialEnd).getTime()
      : sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).getTime()
        : now + 14 * 86400000;
    const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    const isTrialActive = (sub.status === 'trialing') && daysRemaining > 0;

    let promptLevel: 'none' | 'info' | 'warning' | 'urgent' = 'none';
    if (daysRemaining <= 1) promptLevel = 'urgent';
    else if (daysRemaining <= 3) promptLevel = 'warning';
    else if (daysRemaining <= 7) promptLevel = 'info';

    return {
      isTrialActive,
      plan: sub.plan,
      trialStart: sub.trialStart || sub.currentPeriodStart,
      trialEnd: new Date(trialEnd),
      daysRemaining,
      promptLevel,
      upgradeRequired: daysRemaining === 0 && sub.status === 'trialing',
    };
  }

  /**
   * Update or upgrade subscription — supports billingCycle + seat tracking
   */
  public static async updateSubscription(
    workspaceId: string,
    plan: PlanTier,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    activeSeats?: number,
  ) {
    const planDef = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
    const basePrice = billingCycle === 'monthly' ? planDef.priceMonthly : planDef.priceYearly;

    // Calculate overage cost if seats provided
    let totalPrice = basePrice;
    if (activeSeats && activeSeats > planDef.includedSeats && planDef.extraSeatPrice > 0) {
      const overageSeats = activeSeats - planDef.includedSeats;
      const overageCost = overageSeats * planDef.extraSeatPrice;
      totalPrice = billingCycle === 'monthly'
        ? basePrice + overageCost
        : basePrice + (overageCost * 10); // annualize overage
    }

    const sub = await this.getSubscription(workspaceId);
    const updatedSub = {
      ...sub,
      plan,
      pricePerMonth: totalPrice,
      billingCycle,
      status: 'active',
      seats: activeSeats || planDef.includedSeats,
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

    // Issue INR invoice for paid tiers
    if (totalPrice > 0) {
      await this.createInvoice({
        workspaceId,
        amount: totalPrice * 100,  // stored in paise
        currency: 'INR',
        status: 'paid',
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        periodStart: updatedSub.currentPeriodStart,
        periodEnd: updatedSub.currentPeriodEnd,
        plan,
        billingCycle,
      });
    }

    return updatedSub;
  }

  /**
   * Cancel subscription (marks cancelAtPeriodEnd = true)
   */
  public static async cancelSubscription(workspaceId: string) {
    const sub = await this.getSubscription(workspaceId);
    const updated = { ...sub, cancelAtPeriodEnd: true, updatedAt: new Date() };
    inMemoryDb.subscriptions.set(sub.id, updated);
    return updated;
  }

  /**
   * Create invoice record (INR)
   */
  public static async createInvoice(data: {
    workspaceId: string;
    amount: number;       // in paise (₹1 = 100)
    currency?: string;
    status?: string;
    invoiceNumber: string;
    periodStart: Date;
    periodEnd: Date;
    plan?: PlanTier;
    billingCycle?: string;
  }) {
    const id = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoice = {
      id,
      workspaceId: data.workspaceId,
      amount: data.amount,
      currency: data.currency || 'INR',
      status: data.status || 'paid',
      invoiceNumber: data.invoiceNumber,
      pdfUrl: `/api/billing/invoices/${id}/pdf`,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      plan: data.plan || 'free',
      billingCycle: data.billingCycle || 'monthly',
      paidAt: new Date(),
      createdAt: new Date(),
    };

    inMemoryDb.invoices.set(id, invoice);
    return invoice;
  }

  /**
   * Get invoices for a workspace (newest first)
   */
  public static async getInvoices(workspaceId: string) {
    const results: any[] = [];
    for (const inv of inMemoryDb.invoices.values()) {
      if (inv.workspaceId === workspaceId) results.push(inv);
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all paid subscriptions across all workspaces (for founder console)
   */
  public static getAllSubscriptions() {
    return Array.from(inMemoryDb.subscriptions.values());
  }

  /**
   * Get all payment records (for MRR calculation)
   */
  public static getAllPayments() {
    return Array.from(inMemoryDb.billingPayments?.values() || []);
  }
}
