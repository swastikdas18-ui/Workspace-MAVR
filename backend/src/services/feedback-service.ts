/**
 * Phase 22: Feedback Service & Founder Review Queue
 */

import { inMemoryDb, getDb } from '../../packages/database';
import * as schema from '../../packages/database/schema';
import { eq, desc, and } from 'drizzle-orm';
import { AuditService } from './audit-service';
import { ProductAnalyticsService } from './product-analytics-service';

export interface CreateFeedbackDTO {
  workspaceId: string;
  userId?: string;
  category: 'bug' | 'feature_request' | 'ux_friction' | 'performance' | 'praise' | 'other';
  severity: 'p0_blocker' | 'p1_critical' | 'p2_major' | 'p3_minor';
  title: string;
  description: string;
  screenshotUrl?: string;
}

export interface FeedbackFilterDTO {
  workspaceId?: string;
  category?: string;
  severity?: string;
  status?: string;
  limit?: number;
}

export class FeedbackService {
  /**
   * Submit new closed-beta user feedback
   */
  static async submitFeedback(dto: CreateFeedbackDTO) {
    const id = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      workspaceId: dto.workspaceId,
      userId: dto.userId || null,
      category: dto.category || 'bug',
      severity: dto.severity || 'p2_major',
      title: dto.title.trim(),
      description: dto.description.trim(),
      screenshotUrl: dto.screenshotUrl || null,
      status: 'open',
      founderNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryDb.betaFeedback.set(id, record);

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.betaFeedback).values(record as any);
      } catch (err) {
        // Safe fallback in dev/test
      }
    }

    // Record audit and product analytics
    await AuditService.recordLog({
      workspaceId: dto.workspaceId,
      actorId: dto.userId || 'system',
      action: 'beta_feedback.submitted',
      module: 'beta',
      metadata: { feedbackId: id, severity: dto.severity, category: dto.category },
    });

    await ProductAnalyticsService.trackEvent({
      workspaceId: dto.workspaceId,
      userId: dto.userId,
      eventName: 'beta.feedback_submitted',
      entityType: 'beta_feedback',
      entityId: id,
      metadata: { severity: dto.severity, category: dto.category },
    });

    return record;
  }

  /**
   * Founder Feedback Review Queue
   */
  static async getFeedbackList(filter: FeedbackFilterDTO = {}) {
    let items = Array.from(inMemoryDb.betaFeedback.values());

    if (filter.workspaceId) {
      items = items.filter((f) => f.workspaceId === filter.workspaceId);
    }
    if (filter.category && filter.category !== 'all') {
      items = items.filter((f) => f.category === filter.category);
    }
    if (filter.severity && filter.severity !== 'all') {
      items = items.filter((f) => f.severity === filter.severity);
    }
    if (filter.status && filter.status !== 'all') {
      items = items.filter((f) => f.status === filter.status);
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = filter.limit || 100;
    return items.slice(0, limit);
  }

  /**
   * Update feedback status & founder review notes
   */
  static async updateFeedbackStatus(
    feedbackId: string,
    updates: { status?: string; founderNotes?: string },
    actorId?: string
  ) {
    const existing = inMemoryDb.betaFeedback.get(feedbackId);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    inMemoryDb.betaFeedback.set(feedbackId, updated);

    const db = getDb();
    if (db) {
      try {
        await db
          .update(schema.betaFeedback)
          .set(updates as any)
          .where(eq(schema.betaFeedback.id, feedbackId));
      } catch (err) {
        // Fallback
      }
    }

    if (actorId) {
      await AuditService.recordLog({
        workspaceId: existing.workspaceId,
        actorId,
        action: 'beta_feedback.status_updated',
        module: 'beta',
        metadata: { feedbackId, newStatus: updates.status, notes: updates.founderNotes },
      });
    }

    return updated;
  }

  /**
   * Aggregate Beta Feedback Metrics
   */
  static async getFeedbackMetrics() {
    const all = Array.from(inMemoryDb.betaFeedback.values());
    const total = all.length;
    const openP0 = all.filter((f) => f.severity === 'p0_blocker' && f.status !== 'resolved' && f.status !== 'wont_fix').length;
    const openP1 = all.filter((f) => f.severity === 'p1_critical' && f.status !== 'resolved' && f.status !== 'wont_fix').length;
    const resolved = all.filter((f) => f.status === 'resolved').length;
    const resolutionRatePercent = total > 0 ? Math.round((resolved / total) * 100) : 100;

    const byCategory: Record<string, number> = {
      bug: 0,
      feature_request: 0,
      ux_friction: 0,
      performance: 0,
      praise: 0,
      other: 0,
    };

    const bySeverity: Record<string, number> = {
      p0_blocker: 0,
      p1_critical: 0,
      p2_major: 0,
      p3_minor: 0,
    };

    for (const f of all) {
      if (byCategory[f.category] !== undefined) byCategory[f.category]++;
      if (bySeverity[f.severity] !== undefined) bySeverity[f.severity]++;
    }

    return {
      total,
      resolved,
      resolutionRatePercent,
      openP0,
      openP1,
      byCategory,
      bySeverity,
    };
  }
}
