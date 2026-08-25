/**
 * Pricing Engine — Per-Seat Expansion & Annual Billing Calculator
 *
 * Implements:
 * - Per-seat overage billing (Business: ₹99/seat, Scale: ₹89/seat)
 * - Annual billing discount (monthly × 10 = 2 months free)
 * - Cost breakdowns for UI display and invoice generation
 */

import { PLAN_CONFIG, PlanTier } from '../repositories/billing-repository';

export interface SubscriptionCostBreakdown {
  plan: PlanTier;
  billingCycle: 'monthly' | 'yearly';
  activeUsers: number;
  includedSeats: number;
  extraSeats: number;
  basePriceMonthly: number;    // base plan price/month
  extraSeatCost: number;       // overageSeats × seatPrice (per month)
  totalMonthly: number;        // base + overage/month
  totalYearly: number;         // totalMonthly × 10
  annualSavings: number;       // totalMonthly × 2 (savings vs 12 months)
  effectiveMonthlyFromAnnual: number; // totalYearly / 12
  currency: 'INR';
  gstAmount: number;           // 18% GST on total
  totalWithGst: number;        // total + GST
}

export interface SeatOverage {
  plan: PlanTier;
  includedSeats: number;
  activeUsers: number;
  extraSeats: number;
  extraSeatPrice: number;
  overageCostMonthly: number;
  hasOverage: boolean;
}

export class PricingEngine {
  /**
   * Full cost breakdown for a given plan + active user count
   *
   * Examples:
   *   Business, 25 users → ₹2,999/month
   *   Business, 30 users → ₹2,999 + (5 × ₹99) = ₹3,494/month
   *   Scale, 80 users    → ₹7,999 + (5 × ₹89) = ₹8,444/month
   */
  static calculateSubscriptionCost(
    plan: PlanTier,
    activeUsers: number,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): SubscriptionCostBreakdown {
    const planDef = PLAN_CONFIG[plan];
    const includedSeats = planDef.includedSeats;
    const basePriceMonthly = planDef.priceMonthly;
    const extraSeatPrice = planDef.extraSeatPrice;

    // Seat overage (only on Business and Scale)
    const extraSeats = Math.max(0, activeUsers - includedSeats);
    const extraSeatCost = extraSeatPrice > 0 ? extraSeats * extraSeatPrice : 0;

    const totalMonthly = basePriceMonthly + extraSeatCost;
    const totalYearly = totalMonthly * 10;               // 2 months free
    const annualSavings = totalMonthly * 2;              // what you save vs paying 12 months
    const effectiveMonthlyFromAnnual = totalYearly / 12;

    const gstRate = 0.18;
    const effectiveAmount = billingCycle === 'yearly' ? totalYearly : totalMonthly;
    const gstAmount = Math.round(effectiveAmount * gstRate);
    const totalWithGst = effectiveAmount + gstAmount;

    return {
      plan,
      billingCycle,
      activeUsers,
      includedSeats,
      extraSeats,
      basePriceMonthly,
      extraSeatCost,
      totalMonthly,
      totalYearly,
      annualSavings,
      effectiveMonthlyFromAnnual: Math.round(effectiveMonthlyFromAnnual),
      currency: 'INR',
      gstAmount,
      totalWithGst,
    };
  }

  /**
   * Get seat overage details for a workspace
   */
  static getSeatOverage(plan: PlanTier, activeUsers: number): SeatOverage {
    const planDef = PLAN_CONFIG[plan];
    const includedSeats = planDef.includedSeats;
    const extraSeatPrice = planDef.extraSeatPrice;
    const extraSeats = Math.max(0, activeUsers - includedSeats);
    const overageCostMonthly = extraSeatPrice > 0 ? extraSeats * extraSeatPrice : 0;

    return {
      plan,
      includedSeats,
      activeUsers,
      extraSeats,
      extraSeatPrice,
      overageCostMonthly,
      hasOverage: extraSeats > 0 && extraSeatPrice > 0,
    };
  }

  /**
   * Get annual price for a plan (monthly × 10)
   */
  static getAnnualPrice(plan: PlanTier): number {
    return PLAN_CONFIG[plan].priceMonthly * 10;
  }

  /**
   * Get monthly price for a plan
   */
  static getMonthlyPrice(plan: PlanTier): number {
    return PLAN_CONFIG[plan].priceMonthly;
  }

  /**
   * Format INR amount as readable string
   */
  static formatINR(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  /**
   * Suggest upgrade plan based on active users
   */
  static suggestUpgrade(currentPlan: PlanTier, activeUsers: number): PlanTier | null {
    const order: PlanTier[] = ['free', 'starter', 'business', 'scale', 'enterprise'];
    const currentIdx = order.indexOf(currentPlan);

    for (let i = currentIdx + 1; i < order.length - 1; i++) {
      const candidate = order[i];
      const def = PLAN_CONFIG[candidate];
      if (def.includedSeats >= activeUsers) return candidate;
    }
    return activeUsers > 75 ? 'scale' : null;
  }

  /**
   * Calculate ARPU (Average Revenue Per User) across a set of subscriptions
   */
  static calculateARPU(subscriptions: { plan: PlanTier; seats: number; pricePerMonth: number }[]): number {
    const paid = subscriptions.filter((s) => PLAN_CONFIG[s.plan as PlanTier]?.priceMonthly > 0);
    if (paid.length === 0) return 0;
    const totalRevenue = paid.reduce((sum, s) => sum + (s.pricePerMonth || 0), 0);
    const totalSeats = paid.reduce((sum, s) => sum + Math.max(1, s.seats || 1), 0);
    return Math.round(totalRevenue / totalSeats);
  }

  /**
   * Calculate ARPS (Average Revenue Per Seat)
   */
  static calculateARPS(subscriptions: { plan: PlanTier; seats: number; pricePerMonth: number }[]): number {
    return this.calculateARPU(subscriptions);
  }

  /**
   * Calculate expansion revenue (overage billing total)
   */
  static calculateExpansionRevenue(
    subscriptions: { plan: PlanTier; seats: number; pricePerMonth: number }[],
  ): number {
    return subscriptions.reduce((sum, sub) => {
      const planDef = PLAN_CONFIG[sub.plan as PlanTier];
      if (!planDef || planDef.extraSeatPrice === 0) return sum;
      const extraSeats = Math.max(0, (sub.seats || 0) - planDef.includedSeats);
      return sum + extraSeats * planDef.extraSeatPrice;
    }, 0);
  }
}
