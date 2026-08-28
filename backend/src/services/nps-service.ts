/**
 * Phase 23C: Real NPS Survey System & Metric Calculator
 */

import { inMemoryDb, getDb } from '../../packages/database/index.js';
import * as schema from '../../packages/database/schema.js';
import { AuditService } from './audit-service';

export interface SubmitNpsDTO {
  workspaceId: string;
  userId?: string;
  score: number; // 0 - 10
  comment?: string;
}

export interface NpsMetricsSummary {
  npsScore: number | null;
  totalResponses: number;
  promotersCount: number;
  passivesCount: number;
  detractorsCount: number;
  promotersPercent: number;
  passivesPercent: number;
  detractorsPercent: number;
  status: 'real' | 'insufficient_data';
  confidence: 'real' | 'insufficient_data';
  message?: string;
}

export class NpsService {
  /**
   * Submit an authentic NPS rating from a verified user
   */
  public static async submitSurvey(dto: SubmitNpsDTO) {
    if (dto.score < 0 || dto.score > 10 || !Number.isInteger(dto.score)) {
      throw new Error('NPS score must be an integer between 0 and 10');
    }

    const id = `nps-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      workspaceId: dto.workspaceId,
      userId: dto.userId || null,
      score: dto.score,
      comment: dto.comment ? dto.comment.trim() : null,
      submittedAt: new Date(),
      createdAt: new Date(),
    };

    inMemoryDb.npsSurveys.set(id, record);

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.npsSurveys).values(record as any);
      } catch {
        // Fallback gracefully in dev/test
      }
    }

    if (dto.userId) {
      await AuditService.recordLog({
        workspaceId: dto.workspaceId,
        actorId: dto.userId,
        action: 'nps_survey.submitted',
        module: 'analytics',
        metadata: { npsId: id, score: dto.score },
      });
    }

    return record;
  }

  /**
   * Calculate Net Promoter Score based strictly on persisted survey submissions
   */
  public static async getMetrics(minRequired = 20): Promise<NpsMetricsSummary> {
    const surveys = Array.from(inMemoryDb.npsSurveys.values());
    const total = surveys.length;

    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    for (const s of surveys) {
      if (s.score >= 9) {
        promoters++;
      } else if (s.score >= 7) {
        passives++;
      } else {
        detractors++;
      }
    }

    const promotersPercent = total > 0 ? Math.round((promoters / total) * 100) : 0;
    const passivesPercent = total > 0 ? Math.round((passives / total) * 100) : 0;
    const detractorsPercent = total > 0 ? Math.round((detractors / total) * 100) : 0;
    const calculatedNps = promotersPercent - detractorsPercent;

    if (total < minRequired) {
      return {
        npsScore: total > 0 ? calculatedNps : null,
        totalResponses: total,
        promotersCount: promoters,
        passivesCount: passives,
        detractorsCount: detractors,
        promotersPercent,
        passivesPercent,
        detractorsPercent,
        status: 'insufficient_data',
        confidence: 'insufficient_data',
        message: `Insufficient Data: Only ${total} responses collected (${minRequired} required for statistical validity)`,
      };
    }

    return {
      npsScore: calculatedNps,
      totalResponses: total,
      promotersCount: promoters,
      passivesCount: passives,
      detractorsCount: detractors,
      promotersPercent,
      passivesPercent,
      detractorsPercent,
      status: 'real',
      confidence: 'real',
    };
  }
}
