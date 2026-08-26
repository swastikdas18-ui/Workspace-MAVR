/**
 * Phase 22: Customer Success & Company Health Scoring Service
 */

import { inMemoryDb, getDb } from '../../packages/database';
import * as schema from '../../packages/database/schema';
import { eq } from 'drizzle-orm';
import { FeedbackService } from './feedback-service';

export interface CompanyHealthProfile {
  workspaceId: string;
  companyName: string;
  tier: string;
  healthScore: number;
  healthStatus: 'healthy' | 'at_risk' | 'critical';
  onboardingStatus: 'not_started' | 'in_progress' | 'completed';
  totalUsers: number;
  activeUsers7d: number;
  tasksCompleted7d: number;
  openTicketsCount: number;
  lastActiveAt: string;
  notes?: string;
}

export class CustomerSuccessService {
  /**
   * Register or update a beta company profile
   */
  static async upsertCompanyProfile(data: Partial<CompanyHealthProfile> & { workspaceId: string; companyName: string }) {
    const existing = inMemoryDb.customerSuccessProfiles.get(data.workspaceId) || {
      id: `cs-${data.workspaceId}`,
      workspaceId: data.workspaceId,
      companyName: data.companyName,
      tier: 'closed_beta',
      onboardingStatus: 'in_progress',
      totalUsers: 1,
      activeUsers7d: 1,
      tasksCompleted7d: 0,
      openTicketsCount: 0,
      lastActiveAt: new Date(),
      notes: null,
      updatedAt: new Date(),
    };

    const updated = {
      ...existing,
      ...data,
      companyName: data.companyName || existing.companyName,
      updatedAt: new Date(),
    };

    inMemoryDb.customerSuccessProfiles.set(data.workspaceId, updated);

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.customerSuccessProfiles).values(updated as any).onConflictDoUpdate({
          target: schema.customerSuccessProfiles.workspaceId,
          set: updated as any,
        });
      } catch (err) {
        // Fallback
      }
    }

    return updated;
  }

  /**
   * Calculate dynamic health score for a company workspace
   */
  static async calculateCompanyHealth(workspaceId: string): Promise<CompanyHealthProfile> {
    const profile = inMemoryDb.customerSuccessProfiles.get(workspaceId) || {
      workspaceId,
      companyName: inMemoryDb.workspaces.get(workspaceId)?.name || 'Beta Company',
      tier: 'closed_beta',
      onboardingStatus: 'in_progress',
      totalUsers: 5,
      activeUsers7d: 4,
      tasksCompleted7d: 12,
      openTicketsCount: 0,
      lastActiveAt: new Date(),
    };

    // Gather related workspace signals
    const feedbackList = await FeedbackService.getFeedbackList({ workspaceId });
    const openP0 = feedbackList.filter((f) => f.severity === 'p0_blocker' && f.status !== 'resolved').length;
    const openP1 = feedbackList.filter((f) => f.severity === 'p1_critical' && f.status !== 'resolved').length;

    let score = 100;

    // Deduct for open bugs
    score -= openP0 * 30;
    score -= openP1 * 15;

    // Inactivity penalty
    const daysSinceActive = Math.floor((Date.now() - new Date(profile.lastActiveAt).getTime()) / (1000 * 86400));
    if (daysSinceActive > 7) {
      score -= 35;
    } else if (daysSinceActive > 3) {
      score -= 15;
    }

    // Engagement bonus
    const userActivityRatio = profile.totalUsers > 0 ? profile.activeUsers7d / profile.totalUsers : 0;
    if (userActivityRatio >= 0.75) {
      score += 10;
    }
    if (profile.tasksCompleted7d >= 10) {
      score += 5;
    }

    // Clamp score 0 - 100
    const healthScore = Math.max(0, Math.min(100, score));

    let healthStatus: 'healthy' | 'at_risk' | 'critical' = 'healthy';
    if (healthScore < 50) healthStatus = 'critical';
    else if (healthScore < 75) healthStatus = 'at_risk';

    return {
      workspaceId,
      companyName: profile.companyName,
      tier: profile.tier || 'closed_beta',
      healthScore,
      healthStatus,
      onboardingStatus: profile.onboardingStatus || 'in_progress',
      totalUsers: profile.totalUsers || 1,
      activeUsers7d: profile.activeUsers7d || 1,
      tasksCompleted7d: profile.tasksCompleted7d || 0,
      openTicketsCount: openP0 + openP1,
      lastActiveAt: new Date(profile.lastActiveAt).toISOString(),
      notes: profile.notes,
    };
  }

  /**
   * Get all cohort company health profiles
   */
  static async getAllCompanyProfiles(): Promise<CompanyHealthProfile[]> {
    // Seed default beta companies if empty
    if (inMemoryDb.customerSuccessProfiles.size === 0) {
      const defaultCompanies = [
        { workspaceId: 'ws-acme-scale', companyName: 'Acme Scale Corp', totalUsers: 14, activeUsers7d: 12, tasksCompleted7d: 38, onboardingStatus: 'completed' as const },
        { workspaceId: 'ws-nexatech-ai', companyName: 'NexaTech AI', totalUsers: 10, activeUsers7d: 9, tasksCompleted7d: 29, onboardingStatus: 'completed' as const },
        { workspaceId: 'ws-horizon-logistics', companyName: 'Horizon Logistics', totalUsers: 8, activeUsers7d: 7, tasksCompleted7d: 19, onboardingStatus: 'in_progress' as const },
        { workspaceId: 'ws-vertex-media', companyName: 'Vertex Media Labs', totalUsers: 9, activeUsers7d: 8, tasksCompleted7d: 24, onboardingStatus: 'completed' as const },
        { workspaceId: 'ws-cloudscale-ops', companyName: 'CloudScale Cloud Ops', totalUsers: 7, activeUsers7d: 6, tasksCompleted7d: 15, onboardingStatus: 'in_progress' as const },
      ];

      for (const comp of defaultCompanies) {
        await this.upsertCompanyProfile(comp);
      }
    }

    const profiles: CompanyHealthProfile[] = [];
    for (const wsId of inMemoryDb.customerSuccessProfiles.keys()) {
      profiles.push(await this.calculateCompanyHealth(wsId));
    }

    profiles.sort((a, b) => b.healthScore - a.healthScore);
    return profiles;
  }
}
