/**
 * Phase 22: Customer Success & Company Health Scoring Service
 */

import { inMemoryDb, getDb } from '../../packages/database/index.js';
import * as schema from '../../packages/database/schema.js';
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
   * Get all cohort company health profiles from actual workspace records
   */
  static async getAllCompanyProfiles(): Promise<CompanyHealthProfile[]> {
    const allWorkspaces = Array.from(inMemoryDb.workspaces.values());
    const profiles: CompanyHealthProfile[] = [];

    for (const ws of allWorkspaces) {
      // Calculate real members & activity for workspace
      const members = Array.from(inMemoryDb.workspaceMembers.values()).filter((m) => m.workspaceId === ws.id);
      const totalUsers = Math.max(1, members.length);
      
      const wsTasks = Array.from(inMemoryDb.tasks.values()).filter((t) => t.workspaceId === ws.id);
      const tasksCompleted7d = wsTasks.filter((t) => t.status === 'completed').length;

      // Ensure a profile record exists
      if (!inMemoryDb.customerSuccessProfiles.has(ws.id)) {
        inMemoryDb.customerSuccessProfiles.set(ws.id, {
          id: `cs-${ws.id}`,
          workspaceId: ws.id,
          companyName: ws.name,
          tier: 'closed_beta',
          onboardingStatus: tasksCompleted7d > 0 ? 'completed' : 'in_progress',
          totalUsers,
          activeUsers7d: totalUsers,
          tasksCompleted7d,
          openTicketsCount: 0,
          lastActiveAt: ws.updatedAt || ws.createdAt || new Date(),
          notes: null,
          updatedAt: new Date(),
        });
      }

      profiles.push(await this.calculateCompanyHealth(ws.id));
    }

    profiles.sort((a, b) => b.healthScore - a.healthScore);
    return profiles;
  }
}

