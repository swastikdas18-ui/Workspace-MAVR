/**
 * Phase 22: Weekly Beta Report Generator Service
 */

import { inMemoryDb } from '../../packages/database/index.js';
import { CustomerSuccessService } from './customer-success-service';
import { FeedbackService } from './feedback-service';
import { ProductAnalyticsService } from './product-analytics-service';
import { NpsService } from './nps-service';

export interface WeeklyBetaReport {
  generatedAt: string;
  reportPeriod: string;
  summary: {
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    activeUsers: number;
    activationRatePercent: number;
    d7RetentionPercent: number | null;
    d30RetentionPercent: number | null;
    mrr: number;
    arr: number;
    npsScore: number | null;
    criticalBugsOpen: number;
  };
  featureAdoption: {
    tasksCreatedAndCompleted: number;
    crmLeadsManaged: number;
    documentsShared: number;
    automationsFired: number;
    searchesExecuted: number;
    guestApprovals: number;
  };
  feedbackSummary: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    resolutionRatePercent: number;
    bySeverity: Record<string, number>;
  };
  cohortHealthBreakdown: Array<{
    companyName: string;
    healthScore: number;
    healthStatus: string;
    activeUsers: number;
    totalUsers: number;
  }>;
  markdownSummary: string;
}

export class BetaReportService {
  static async generateWeeklyReport(): Promise<WeeklyBetaReport> {
    const companies = await CustomerSuccessService.getAllCompanyProfiles();
    const feedbackMetrics = await FeedbackService.getFeedbackMetrics();
    const analytics = await ProductAnalyticsService.getFounderAnalytics();
    const nps = await NpsService.getMetrics();

    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((c) => c.healthStatus !== 'critical').length;
    const totalUsers = companies.reduce((acc, c) => acc + c.totalUsers, 0);
    const activeUsers = companies.reduce((acc, c) => acc + c.activeUsers7d, 0);

    // Compute real feature usage directly from database / in-memory entities
    const tasksCreatedAndCompleted = inMemoryDb.tasks.size;
    const crmLeadsManaged = inMemoryDb.crmRecords.size;
    const documentsShared = inMemoryDb.documents.size;
    const automationsFired = inMemoryDb.automationExecutions.size;
    const searchesExecuted = Array.from(inMemoryDb.events.values()).filter((e) => e.eventName.includes('search')).length;
    const guestApprovals = inMemoryDb.deliverableApprovals.size;

    const featureAdoption = {
      tasksCreatedAndCompleted,
      crmLeadsManaged,
      documentsShared,
      automationsFired,
      searchesExecuted,
      guestApprovals,
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400 * 1000);
    const reportPeriod = `${weekAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`;

    const criticalBugsOpen = feedbackMetrics.openP0 + feedbackMetrics.openP1;

    const markdownSummary = `
# Workspace OS — Weekly Closed Beta Operations Report
**Period**: ${reportPeriod} | **Generated**: ${now.toISOString()}

### 1. Executive Performance Highlights
- **Enrolled Beta Cohorts**: ${totalCompanies} Companies (${activeCompanies} Active)
- **Active User Base**: ${activeUsers} / ${totalUsers} Active Users
- **Activation Rate**: ${analytics.activationFunnel.activationRatePercent}%
- **D7 / D30 Cohort Retention**: ${analytics.retention.d7Percent !== null ? `${analytics.retention.d7Percent}%` : 'Insufficient Data'} / ${analytics.retention.d30Percent !== null ? `${analytics.retention.d30Percent}%` : 'Insufficient Data'}
- **Financial Run-Rate**: $${analytics.revenue.mrr} MRR ($${analytics.revenue.arr} ARR, ${analytics.revenue.churnRatePercent}% Churn)
- **Net Promoter Score**: ${nps.npsScore !== null ? `+${nps.npsScore}` : 'Insufficient Data (requires 20 responses)'}

### 2. Feature & Workstream Adoption
- **Tasks Processed**: ${featureAdoption.tasksCreatedAndCompleted}
- **CRM Leads Advanced**: ${featureAdoption.crmLeadsManaged}
- **Documents Centralized**: ${featureAdoption.documentsShared}
- **Automations Executed**: ${featureAdoption.automationsFired}
- **Unified Lexical Searches**: ${featureAdoption.searchesExecuted}
- **Guest Client Deliverable Approvals**: ${featureAdoption.guestApprovals}

### 3. Stability & Quality Metrics
- **Open P0 Blockers**: ${feedbackMetrics.openP0}
- **Open P1 Criticals**: ${feedbackMetrics.openP1}
- **Feedback Resolution Rate**: ${feedbackMetrics.resolutionRatePercent}% (${feedbackMetrics.resolved}/${feedbackMetrics.total} tickets resolved)
`.trim();

    return {
      generatedAt: now.toISOString(),
      reportPeriod,
      summary: {
        totalCompanies,
        activeCompanies,
        totalUsers,
        activeUsers,
        activationRatePercent: analytics.activationFunnel.activationRatePercent,
        d7RetentionPercent: analytics.retention.d7Percent,
        d30RetentionPercent: analytics.retention.d30Percent,
        mrr: analytics.revenue.mrr,
        arr: analytics.revenue.arr,
        npsScore: nps.npsScore,
        criticalBugsOpen,
      },
      featureAdoption,
      feedbackSummary: {
        totalTickets: feedbackMetrics.total,
        openTickets: feedbackMetrics.total - feedbackMetrics.resolved,
        resolvedTickets: feedbackMetrics.resolved,
        resolutionRatePercent: feedbackMetrics.resolutionRatePercent,
        bySeverity: feedbackMetrics.bySeverity,
      },
      cohortHealthBreakdown: companies.map((c) => ({
        companyName: c.companyName,
        healthScore: c.healthScore,
        healthStatus: c.healthStatus,
        activeUsers: c.activeUsers7d,
        totalUsers: c.totalUsers,
      })),
      markdownSummary,
    };
  }
}

