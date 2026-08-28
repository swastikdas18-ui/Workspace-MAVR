/**
 * Usage Service & Real-Time Metering Engine — Phase 18 Update
 *
 * Tracks:
 * - Members count vs included seats (with 75/90/100% warnings)
 * - Projects count
 * - Storage usage (MB)
 * - Monthly API requests
 * - Active automations
 *
 * Generates:
 * - Current usage vs Plan Limits
 * - Structured seat warnings at 75% / 90% / 100%
 * - Overage cost estimates
 */

import { inMemoryDb } from '../../packages/database/index.js';
import { BillingRepository, PLAN_CONFIG, PlanTier } from '../repositories/billing-repository';
import { PricingEngine } from './pricing-engine';

export type SeatWarningLevel = 'ok' | 'approaching' | 'critical' | 'exceeded';

export interface SeatWarning {
  level: SeatWarningLevel;
  percent: number;
  message: string;
  upgradeMessage?: string;
}

export interface UsageSummary {
  workspaceId: string;
  plan: PlanTier;
  period: string;
  usage: {
    members:     { current: number; limit: number; percent: number };
    projects:    { current: number; limit: number; percent: number };
    storageMb:   { current: number; limit: number; percent: number };
    apiRequests: { current: number; limit: number; percent: number };
    automations: { current: number; limit: number; percent: number };
    activeUsers: { current: number; limit: number; percent: number };
  };
  seatWarning: SeatWarning;
  hasOverage: boolean;
  overageCostMonthly: number;
  warnings: string[];
  recommendation?: string;
}

export class UsageService {
  private static apiRequestCounter: Map<string, number> = new Map();

  /**
   * Track an API request for a workspace
   */
  public static incrementApiRequests(workspaceId: string, count = 1) {
    if (!workspaceId) return;
    const current = this.apiRequestCounter.get(workspaceId) || 0;
    this.apiRequestCounter.set(workspaceId, current + count);
  }

  /**
   * Evaluate seat warning level based on percent used
   */
  public static evaluateSeatWarning(
    plan: PlanTier,
    current: number,
    includedSeats: number,
  ): SeatWarning {
    const percent = includedSeats >= 9999 ? 0 : Math.round((current / includedSeats) * 100);
    const planDef = PLAN_CONFIG[plan];
    const hasOverage = planDef.extraSeatPrice > 0;
    const nextPlan = this.getNextPlan(plan);

    if (percent >= 100) {
      return {
        level: 'exceeded',
        percent,
        message: `🚫 Seat limit reached (${current}/${includedSeats}). Upgrade now to avoid access restrictions.`,
        upgradeMessage: hasOverage
          ? `Add extra seats at ₹${planDef.extraSeatPrice}/user/month, or upgrade to ${nextPlan}.`
          : `Upgrade to ${nextPlan} to add more team members.`,
      };
    }
    if (percent >= 90) {
      return {
        level: 'critical',
        percent,
        message: `⚠️ ${percent}% of included seats used (${current}/${includedSeats}).`,
        upgradeMessage: hasOverage
          ? `Each additional seat costs ₹${planDef.extraSeatPrice}/month on ${planDef.name}.`
          : `Upgrade to ${nextPlan} for more seats.`,
      };
    }
    if (percent >= 75) {
      return {
        level: 'approaching',
        percent,
        message: `Your workspace is at ${percent}% of included seats (${current}/${includedSeats}).`,
        upgradeMessage: `Consider upgrading to ${nextPlan} for more capacity.`,
      };
    }
    return { level: 'ok', percent, message: '' };
  }

  private static getNextPlan(plan: PlanTier): string {
    const order: PlanTier[] = ['free', 'starter', 'business', 'scale', 'enterprise'];
    const idx = order.indexOf(plan);
    const next = idx < order.length - 1 ? order[idx + 1] : 'Enterprise';
    const nextDef = PLAN_CONFIG[next as PlanTier];
    return nextDef ? `${nextDef.name} (₹${nextDef.priceMonthly.toLocaleString('en-IN')}/mo)` : 'Enterprise';
  }

  /**
   * Calculate real-time consumption metrics for a workspace
   */
  public static async getWorkspaceUsage(workspaceId: string): Promise<UsageSummary> {
    const sub = await BillingRepository.getSubscription(workspaceId);
    const plan = (sub.plan as PlanTier) || 'free';

    // Normalize legacy 'growth' plan
    const normalizedPlan: PlanTier = plan === ('growth' as any) ? 'scale' : plan;
    const planDef = PLAN_CONFIG[normalizedPlan] || PLAN_CONFIG.free;
    const planLimits = planDef.limits;
    const includedSeats = planDef.includedSeats;

    // 1. Members count
    let membersCount = 0;
    for (const m of inMemoryDb.workspaceMembers.values()) {
      if (m.workspaceId === workspaceId) membersCount++;
    }
    if (membersCount === 0) membersCount = 1;

    // 2. Projects count
    let projectsCount = 0;
    for (const p of inMemoryDb.projects.values()) {
      if (p.workspaceId === workspaceId) projectsCount++;
    }

    // 3. Storage (MB)
    let totalBytes = 0;
    for (const d of inMemoryDb.documents.values()) {
      if (d.workspaceId === workspaceId) {
        if (typeof d.fileSizeBytes === 'number') totalBytes += d.fileSizeBytes;
        else if (typeof d.fileSize === 'number') totalBytes += d.fileSize;
        else if (typeof d.fileSize === 'string') {
          const match = d.fileSize.match(/([\d.]+)\s*(MB|KB|GB|B)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            if (unit === 'MB') totalBytes += val * 1048576;
            else if (unit === 'KB') totalBytes += val * 1024;
            else if (unit === 'GB') totalBytes += val * 1073741824;
            else totalBytes += val;
          } else totalBytes += 102400;
        } else totalBytes += 102400;
      }
    }
    const storageMb = Number((totalBytes / 1048576).toFixed(2));

    // 4. API requests
    const apiRequests = this.apiRequestCounter.get(workspaceId) || 0;

    // 5. Active automations
    let automationsCount = 0;
    for (const r of inMemoryDb.automationRules.values()) {
      if (r.workspaceId === workspaceId && r.isActive !== false) automationsCount++;
    }

    const calcPercent = (curr: number, limit: number) => {
      if (limit >= 9999) return 0;
      return Math.min(100, Math.round((curr / limit) * 100));
    };

    // Seat warning
    const seatWarning = this.evaluateSeatWarning(normalizedPlan, membersCount, includedSeats);

    // Overage cost
    const overageData = PricingEngine.getSeatOverage(normalizedPlan, membersCount);
    const hasOverage = overageData.hasOverage;
    const overageCostMonthly = overageData.overageCostMonthly;

    const warnings: string[] = [];
    if (seatWarning.level !== 'ok') warnings.push(seatWarning.message);
    if (projectsCount >= planLimits.maxProjects && planLimits.maxProjects < 9999) {
      warnings.push(`Project limit reached (${projectsCount}/${planLimits.maxProjects})`);
    }
    if (storageMb >= planLimits.maxStorageMb) {
      warnings.push(`Storage capacity reached (${storageMb}MB / ${planLimits.maxStorageMb}MB)`);
    }
    if (automationsCount >= planLimits.maxAutomations && planLimits.maxAutomations > 0 && planLimits.maxAutomations < 9999) {
      warnings.push(`Automation rule capacity reached (${automationsCount}/${planLimits.maxAutomations})`);
    }

    let recommendation: string | undefined;
    if (seatWarning.level === 'exceeded' || seatWarning.level === 'critical') {
      recommendation = seatWarning.upgradeMessage;
    } else if (normalizedPlan === 'free' && (projectsCount >= 2 || membersCount >= 3)) {
      recommendation = 'Upgrade to Starter (₹999/mo) for 10 members, unlimited projects, CRM & Wiki.';
    } else if (normalizedPlan === 'starter') {
      recommendation = 'Upgrade to Business (₹2,999/mo) for 25 seats, Time Tracking, Automations & Client Approvals.';
    } else if (normalizedPlan === 'business' && membersCount > 20) {
      recommendation = 'Upgrade to Scale (₹7,999/mo) for 75 included seats, API Access & Advanced Analytics.';
    }

    const currentPeriod = new Date().toISOString().substring(0, 7);

    return {
      workspaceId,
      plan: normalizedPlan,
      period: currentPeriod,
      usage: {
        members:     { current: membersCount, limit: includedSeats, percent: calcPercent(membersCount, includedSeats) },
        projects:    { current: projectsCount, limit: planLimits.maxProjects, percent: calcPercent(projectsCount, planLimits.maxProjects) },
        storageMb:   { current: storageMb, limit: planLimits.maxStorageMb, percent: calcPercent(storageMb, planLimits.maxStorageMb) },
        apiRequests: { current: apiRequests, limit: planLimits.maxApiRequestsMonthly, percent: calcPercent(apiRequests, planLimits.maxApiRequestsMonthly) },
        automations: { current: automationsCount, limit: planLimits.maxAutomations, percent: calcPercent(automationsCount, planLimits.maxAutomations) },
        activeUsers: { current: membersCount, limit: includedSeats, percent: calcPercent(membersCount, includedSeats) },
      },
      seatWarning,
      hasOverage,
      overageCostMonthly,
      warnings,
      recommendation,
    };
  }
}
