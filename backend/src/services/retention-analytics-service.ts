/**
 * Phase 23B: Real Cohort Retention Analytics Service
 * 
 * Computes authentic D1, D7, and D30 cohort retention from real user signup
 * timestamps and subsequent activity events. Zero hardcoded constants.
 */

import { inMemoryDb } from '../../packages/database/index.js';

export interface RetentionMetrics {
  d1Percent: number | null;
  d7Percent: number | null;
  d30Percent: number | null;
  cohortSize: number;
  retainedUsersD1: number;
  retainedUsersD7: number;
  retainedUsersD30: number;
  status: 'real' | 'insufficient_data';
  confidence: 'real' | 'insufficient_data';
}

export class RetentionAnalyticsService {
  /**
   * Calculates actual D1, D7, and D30 cohort retention rates.
   */
  public static async calculateRetention(minCohortSize = 1): Promise<RetentionMetrics> {
    const allUsers = Array.from(inMemoryDb.users.values());
    const allEvents = Array.from(inMemoryDb.events.values());

    const cohortSize = allUsers.length;

    if (cohortSize === 0) {
      return {
        d1Percent: null,
        d7Percent: null,
        d30Percent: null,
        cohortSize: 0,
        retainedUsersD1: 0,
        retainedUsersD7: 0,
        retainedUsersD30: 0,
        status: 'insufficient_data',
        confidence: 'insufficient_data',
      };
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    let retainedD1 = 0;
    let retainedD7 = 0;
    let retainedD30 = 0;

    for (const user of allUsers) {
      const signupTime = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
      const userEvents = allEvents.filter((e) => e.userId === user.id);

      let hasD1 = false;
      let hasD7 = false;
      let hasD30 = false;

      for (const evt of userEvents) {
        const evtTime = new Date(evt.createdAt).getTime();
        const diffMs = evtTime - signupTime;

        // D1 Window: 24h to 48h post-signup
        if (diffMs >= 1 * DAY_MS && diffMs < 2 * DAY_MS) {
          hasD1 = true;
        }
        // D7 Window: 7d to 8d post-signup
        if (diffMs >= 7 * DAY_MS && diffMs < 8 * DAY_MS) {
          hasD7 = true;
        }
        // D30 Window: 30d to 31d post-signup
        if (diffMs >= 30 * DAY_MS && diffMs < 31 * DAY_MS) {
          hasD30 = true;
        }
      }

      if (hasD1) retainedD1++;
      if (hasD7) retainedD7++;
      if (hasD30) retainedD30++;
    }

    const d1Percent = cohortSize > 0 ? Math.round((retainedD1 / cohortSize) * 100) : 0;
    const d7Percent = cohortSize > 0 ? Math.round((retainedD7 / cohortSize) * 100) : 0;
    const d30Percent = cohortSize > 0 ? Math.round((retainedD30 / cohortSize) * 100) : 0;

    return {
      d1Percent,
      d7Percent,
      d30Percent,
      cohortSize,
      retainedUsersD1: retainedD1,
      retainedUsersD7: retainedD7,
      retainedUsersD30: retainedD30,
      status: cohortSize >= minCohortSize ? 'real' : 'insufficient_data',
      confidence: cohortSize >= minCohortSize ? 'real' : 'insufficient_data',
    };
  }
}
