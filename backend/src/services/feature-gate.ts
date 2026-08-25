/**
 * Feature Gate Engine — Centralized Access Control for Plan Features
 *
 * Single source of truth for all feature access decisions.
 * Replaces any hardcoded plan checks scattered across the codebase.
 *
 * Usage:
 *   FeatureGate.hasFeature('business', 'time_tracking')  → true
 *   FeatureGate.hasFeature('starter', 'api_keys')        → false
 *   FeatureGate.assertFeature('free', 'automations')     → throws FEATURE_RESTRICTED
 */

import { PLAN_CONFIG, PlanTier, WorkspaceFeature } from '../repositories/billing-repository';

export class FeatureGateError extends Error {
  constructor(
    public readonly feature: WorkspaceFeature,
    public readonly currentPlan: PlanTier,
    public readonly requiredPlan: PlanTier,
  ) {
    super(
      `Feature "${feature}" is not available on the ${currentPlan} plan. ` +
      `Upgrade to ${requiredPlan} or higher to unlock this feature.`,
    );
    this.name = 'FeatureGateError';
  }
}

// Minimum plan required for each feature (in ascending order)
const FEATURE_MIN_PLAN: Record<WorkspaceFeature, PlanTier> = {
  // Free tier
  projects:             'free',
  tasks:                'free',
  // Starter tier
  crm:                  'starter',
  documents:            'starter',
  wiki:                 'starter',
  guest_portal_view:    'starter',
  // Business tier
  time_tracking:        'business',
  automations:          'business',
  client_approvals:     'business',
  invoices:             'business',
  utilization_reports:  'business',
  // Scale tier
  api_keys:             'scale',
  webhooks:             'scale',
  analytics:            'scale',
  founder_console:      'scale',
  priority_support:     'scale',
  // Enterprise tier
  sso:                  'enterprise',
  dedicated_infra:      'enterprise',
};

const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'business', 'scale', 'enterprise'];

function planRank(plan: PlanTier): number {
  return PLAN_ORDER.indexOf(plan);
}

export class FeatureGate {
  /**
   * Check whether a plan has access to a feature
   */
  static hasFeature(plan: PlanTier, feature: WorkspaceFeature): boolean {
    const requiredPlan = FEATURE_MIN_PLAN[feature];
    if (!requiredPlan) return false;
    return planRank(plan) >= planRank(requiredPlan);
  }

  /**
   * Assert access to a feature — throws FeatureGateError if denied
   */
  static assertFeature(plan: PlanTier, feature: WorkspaceFeature): void {
    if (!this.hasFeature(plan, feature)) {
      const requiredPlan = FEATURE_MIN_PLAN[feature] ?? 'enterprise';
      throw new FeatureGateError(feature, plan, requiredPlan);
    }
  }

  /**
   * Get all features enabled for a plan
   */
  static getEnabledFeatures(plan: PlanTier): WorkspaceFeature[] {
    return PLAN_CONFIG[plan]?.features as WorkspaceFeature[] ?? [];
  }

  /**
   * Get minimum plan required to access a feature
   */
  static getRequiredPlan(feature: WorkspaceFeature): PlanTier {
    return FEATURE_MIN_PLAN[feature] ?? 'enterprise';
  }

  /**
   * Get features that will be unlocked by upgrading to a target plan
   */
  static getUnlockedByUpgrade(currentPlan: PlanTier, targetPlan: PlanTier): WorkspaceFeature[] {
    const current = new Set(this.getEnabledFeatures(currentPlan));
    const target = this.getEnabledFeatures(targetPlan);
    return target.filter((f) => !current.has(f));
  }

  /**
   * Check multiple features at once — returns { feature: boolean } map
   */
  static checkMany(plan: PlanTier, features: WorkspaceFeature[]): Record<WorkspaceFeature, boolean> {
    return Object.fromEntries(
      features.map((f) => [f, this.hasFeature(plan, f)]),
    ) as Record<WorkspaceFeature, boolean>;
  }

  /**
   * Get plan comparison matrix for pricing page
   */
  static getPlanMatrix(): {
    feature: WorkspaceFeature;
    label: string;
    minPlan: PlanTier;
    availableOn: PlanTier[];
  }[] {
    const featureLabels: Record<WorkspaceFeature, string> = {
      projects:            'Projects & Milestones',
      tasks:               'Tasks & Subtasks',
      crm:                 'CRM & Lead Management',
      documents:           'Document Vault',
      wiki:                'Team Wiki',
      guest_portal_view:   'Client Guest Portal (View)',
      time_tracking:       'Time Tracking & Billable Hours',
      automations:         'Workflow Automations',
      client_approvals:    'Client Approvals & Sign-offs',
      invoices:            'GST Invoices',
      utilization_reports: 'Utilization Reports',
      api_keys:            'API Keys & Developer Access',
      webhooks:            'Webhooks & Integrations',
      analytics:           'Advanced Analytics',
      founder_console:     'Founder Dashboard',
      priority_support:    'Priority Support',
      sso:                 'Single Sign-On (SSO)',
      dedicated_infra:     'Dedicated Infrastructure',
    };

    return (Object.keys(FEATURE_MIN_PLAN) as WorkspaceFeature[]).map((feature) => {
      const minPlan = FEATURE_MIN_PLAN[feature];
      const minRank = planRank(minPlan);
      const availableOn = PLAN_ORDER.filter((p) => planRank(p) >= minRank);
      return {
        feature,
        label: featureLabels[feature] || feature,
        minPlan,
        availableOn,
      };
    });
  }
}
