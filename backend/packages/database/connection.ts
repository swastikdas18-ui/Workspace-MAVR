import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import { User, Workspace, WorkspaceMember, Session } from './types.js';

// In-Memory resilient persistence store (strictly reserved for test isolation)
export class InMemoryDatabase {
  public users: Map<string, User> = new Map();
  public workspaces: Map<string, Workspace> = new Map();
  public workspaceMembers: Map<string, WorkspaceMember> = new Map();
  public sessions: Map<string, Session> = new Map();
  public teams: Map<string, any> = new Map();
  public teamMembers: Map<string, any> = new Map();
  public projects: Map<string, any> = new Map();
  public projectMembers: Map<string, any> = new Map();
  public projectTeams: Map<string, any> = new Map();
  public tasks: Map<string, any> = new Map();
  public taskComments: Map<string, any> = new Map();
  public documents: Map<string, any> = new Map();
  public crmRecords: Map<string, any> = new Map();
  public workspaceInvites: Map<string, any> = new Map();
  public notifications: Map<string, any> = new Map();
  public activityLogs: Map<string, any> = new Map();
  public auditLogs: Map<string, any> = new Map();
  public automationRules: Map<string, any> = new Map();
  public automationActions: Map<string, any> = new Map();
  public automationExecutions: Map<string, any> = new Map();
  public userPresence: Map<string, any> = new Map();
  public subscriptions: Map<string, any> = new Map();
  public usageMetrics: Map<string, any> = new Map();
  public invoices: Map<string, any> = new Map();

  // Phase 12 Maps
  public wikiPages: Map<string, any> = new Map();
  public wikiPageVersions: Map<string, any> = new Map();
  public wikiComments: Map<string, any> = new Map();
  public taskTimeEntries: Map<string, any> = new Map();
  public employeeBillingProfiles: Map<string, any> = new Map();
  public guestUsers: Map<string, any> = new Map();
  public guestPermissions: Map<string, any> = new Map();
  public guestSessions: Map<string, any> = new Map();
  public deliverableApprovals: Map<string, any> = new Map();
  public emailConnections: Map<string, any> = new Map();
  public calendarConnections: Map<string, any> = new Map();
  public calendarEvents: Map<string, any> = new Map();

  // Phase 14 Maps
  public billingCustomers: Map<string, any> = new Map();
  public billingSubscriptions: Map<string, any> = new Map();
  public billingPayments: Map<string, any> = new Map();
  public billingWebhooks: Map<string, any> = new Map();
  public taskRecurrenceRules: Map<string, any> = new Map();
  public taskAssignees: Map<string, any> = new Map();
  public taskDependencies: Map<string, any> = new Map();
  public crmPipelines: Map<string, any> = new Map();
  public crmPipelineStages: Map<string, any> = new Map();
  public apiKeys: Map<string, any> = new Map();
  public webhooks: Map<string, any> = new Map();
  public webhookDeliveries: Map<string, any> = new Map();

  // Phase 21 Maps
  public events: Map<string, any> = new Map();
  public onboardingState: Map<string, any> = new Map();
  public notificationPreferences: Map<string, any> = new Map();

  // Phase 22 Maps
  public betaFeedback: Map<string, any> = new Map();
  public customerSuccessProfiles: Map<string, any> = new Map();

  // Phase 23 Maps
  public npsSurveys: Map<string, any> = new Map();

  public reset() {
    this.users.clear();
    this.workspaces.clear();
    this.workspaceMembers.clear();
    this.sessions.clear();
    this.teams.clear();
    this.teamMembers.clear();
    this.projects.clear();
    this.projectMembers.clear();
    this.projectTeams.clear();
    this.tasks.clear();
    this.taskComments.clear();
    this.documents.clear();
    this.crmRecords.clear();
    this.workspaceInvites.clear();
    this.notifications.clear();
    this.activityLogs.clear();
    this.auditLogs.clear();
    this.automationRules.clear();
    this.automationActions.clear();
    this.automationExecutions.clear();
    this.userPresence.clear();
    this.subscriptions.clear();
    this.usageMetrics.clear();
    this.invoices.clear();

    // Phase 12 resets
    this.wikiPages.clear();
    this.wikiPageVersions.clear();
    this.wikiComments.clear();
    this.taskTimeEntries.clear();
    this.employeeBillingProfiles.clear();
    this.guestUsers.clear();
    this.guestPermissions.clear();
    this.guestSessions.clear();
    this.deliverableApprovals.clear();
    this.emailConnections.clear();
    this.calendarConnections.clear();
    this.calendarEvents.clear();

    // Phase 14 resets
    this.billingCustomers.clear();
    this.billingSubscriptions.clear();
    this.billingPayments.clear();
    this.billingWebhooks.clear();
    this.taskRecurrenceRules.clear();
    this.taskAssignees.clear();
    this.taskDependencies.clear();
    this.crmPipelines.clear();
    this.crmPipelineStages.clear();
    this.apiKeys.clear();
    this.webhooks.clear();
    this.webhookDeliveries.clear();

    // Phase 21 resets
    this.events.clear();
    this.onboardingState.clear();
    this.notificationPreferences.clear();

    // Phase 22 resets
    this.betaFeedback.clear();
    this.customerSuccessProfiles.clear();

    // Phase 23 resets
    this.npsSurveys.clear();
  }
}

export const inMemoryDb = new InMemoryDatabase();

let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Returns active Drizzle ORM instance connected to PostgreSQL.
 * Throws a fatal error in production if DATABASE_URL is missing or connection fails.
 */
export function getDb(): NeonHttpDatabase<typeof schema> | null {
  if (dbInstance) return dbInstance;

  const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
  const isProduction = process.env.NODE_ENV === 'production' || isVercel;
  const isTest = process.env.NODE_ENV === 'test';
  const databaseUrl = process.env.DATABASE_URL;

  if (isProduction) {
    if (!databaseUrl) {
      throw new Error('[Workspace OS Fatal] DATABASE_URL is required in production/Vercel. In-memory fallback is strictly forbidden.');
    }
    try {
      const sql = neon(databaseUrl);
      dbInstance = drizzle(sql, { schema });
      return dbInstance;
    } catch (err: any) {
      throw new Error(`[Workspace OS Fatal] PostgreSQL connection failed in production: ${err.message}`);
    }
  }

  if (databaseUrl && !isTest) {
    try {
      const sql = neon(databaseUrl);
      dbInstance = drizzle(sql, { schema });
      return dbInstance;
    } catch (err: any) {
      console.warn('[Workspace OS] Failed to connect to PostgreSQL in dev mode:', err.message);
    }
  }

  return null;
}

export { schema };
export * from './types';

