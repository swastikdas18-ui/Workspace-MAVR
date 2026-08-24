import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { User, Workspace, WorkspaceMember, Session } from './types';

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

  public reset() {
    this.users.clear();
    this.workspaces.clear();
    this.workspaceMembers.clear();
    this.sessions.clear();
    this.teams.clear();
    this.teamMembers.clear();
    this.projects.clear();
    this.projectMembers.clear();
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

  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const databaseUrl = process.env.DATABASE_URL;

  if (isProduction) {
    if (!databaseUrl) {
      throw new Error('[Workspace OS Fatal] DATABASE_URL is required in production. In-memory fallback is strictly forbidden.');
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

