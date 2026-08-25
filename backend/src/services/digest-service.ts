/**
 * DigestService — Daily & Weekly Workspace Summary Engine
 *
 * Aggregates workspace activity into a structured digest and dispatches
 * premium HTML emails via EmailService.
 */

import { inMemoryDb } from '../../packages/database';
import { EmailService } from './email-service';

export interface DigestData {
  workspaceName: string;
  tasksDueToday: Task_DueItem[];
  overdueTasksCount: number;
  newComments: number;
  newDocuments: number;
  crmMovements: number;
  pendingApprovals: number;
  wikiUpdates: number;
  frequency: 'daily' | 'weekly';
  workspaceUrl: string;
}

export interface Task_DueItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
}

export interface DigestPreferences {
  userId: string;
  workspaceId: string;
  frequency: 'daily' | 'weekly' | 'none';
  hour: number; // UTC hour to send digest (default: 8 AM IST = 2 UTC)
}

// In-memory preferences store
const digestPreferences = new Map<string, DigestPreferences>();

export class DigestService {
  /**
   * Generate daily digest data for a workspace
   */
  static generateDailyDigest(workspaceId: string): DigestData {
    const workspace = inMemoryDb.workspaces.get(workspaceId);
    const workspaceName = workspace?.name || 'Your Workspace';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const workspaceUrl = `${process.env.FRONTEND_URL || 'https://workspace-mavr.onrender.com'}/app`;

    // Tasks due today
    const tasksDueToday: Task_DueItem[] = [];
    let overdueTasksCount = 0;

    for (const task of inMemoryDb.tasks.values()) {
      if (task.workspaceId !== workspaceId || task.status === 'completed') continue;

      if (task.dueDate) {
        const dueDateStr = new Date(task.dueDate).toISOString().split('T')[0];
        if (dueDateStr === todayStr) {
          const assignee = task.assignedTo ? (inMemoryDb.users.get(task.assignedTo)?.name || 'Unassigned') : 'Unassigned';
          tasksDueToday.push({ id: task.id, title: task.title, assignee, dueDate: dueDateStr });
        } else if (new Date(task.dueDate) < today) {
          overdueTasksCount++;
        }
      }
    }

    // New comments (past 24h)
    const oneDayAgo = new Date(Date.now() - 86400000);
    let newComments = 0;
    for (const comment of inMemoryDb.taskComments.values()) {
      if (comment.workspaceId === workspaceId && new Date(comment.createdAt) > oneDayAgo) {
        newComments++;
      }
    }

    // New documents (past 24h)
    let newDocuments = 0;
    for (const doc of inMemoryDb.documents.values()) {
      if (doc.workspaceId === workspaceId && new Date(doc.createdAt) > oneDayAgo) {
        newDocuments++;
      }
    }

    // CRM movements (past 24h)
    let crmMovements = 0;
    for (const lead of inMemoryDb.crmRecords.values()) {
      if (lead.workspaceId === workspaceId && new Date(lead.updatedAt || lead.createdAt) > oneDayAgo) {
        crmMovements++;
      }
    }

    // Pending client approvals
    let pendingApprovals = 0;
    for (const approval of inMemoryDb.deliverableApprovals.values()) {
      if (approval.workspaceId === workspaceId && approval.status === 'pending') {
        pendingApprovals++;
      }
    }

    // Wiki updates (past 24h)
    let wikiUpdates = 0;
    for (const page of inMemoryDb.wikiPages.values()) {
      if (page.workspaceId === workspaceId && new Date(page.updatedAt || page.createdAt) > oneDayAgo) {
        wikiUpdates++;
      }
    }

    return {
      workspaceName,
      tasksDueToday,
      overdueTasksCount,
      newComments,
      newDocuments,
      crmMovements,
      pendingApprovals,
      wikiUpdates,
      frequency: 'daily',
      workspaceUrl,
    };
  }

  /**
   * Generate weekly digest (broader date window)
   */
  static generateWeeklyDigest(workspaceId: string): DigestData {
    const digest = this.generateDailyDigest(workspaceId);
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    // Widen to 7-day window for weekly digest
    let weeklyComments = 0;
    for (const comment of inMemoryDb.taskComments.values()) {
      if (comment.workspaceId === workspaceId && new Date(comment.createdAt) > oneWeekAgo) {
        weeklyComments++;
      }
    }

    let weeklyDocuments = 0;
    for (const doc of inMemoryDb.documents.values()) {
      if (doc.workspaceId === workspaceId && new Date(doc.createdAt) > oneWeekAgo) {
        weeklyDocuments++;
      }
    }

    let weeklyCrmMovements = 0;
    for (const lead of inMemoryDb.crmRecords.values()) {
      if (lead.workspaceId === workspaceId && new Date(lead.updatedAt || lead.createdAt) > oneWeekAgo) {
        weeklyCrmMovements++;
      }
    }

    return {
      ...digest,
      newComments: weeklyComments,
      newDocuments: weeklyDocuments,
      crmMovements: weeklyCrmMovements,
      frequency: 'weekly',
    };
  }

  /**
   * Send digest to all workspace members with matching preferences
   */
  static async sendDigestToWorkspace(workspaceId: string, frequency: 'daily' | 'weekly'): Promise<{ sent: number }> {
    const digestData = frequency === 'weekly'
      ? this.generateWeeklyDigest(workspaceId)
      : this.generateDailyDigest(workspaceId);

    let sent = 0;

    for (const member of inMemoryDb.workspaceMembers.values()) {
      if (member.workspaceId !== workspaceId) continue;

      const user = inMemoryDb.users.get(member.userId);
      if (!user) continue;

      // Check preferences (default: daily)
      const prefKey = `${workspaceId}:${member.userId}`;
      const prefs = digestPreferences.get(prefKey);
      if (prefs?.frequency === 'none') continue;
      if (prefs && prefs.frequency !== frequency) continue;

      try {
        await EmailService.sendDailyDigest(user.email, user.name, {
          ...digestData,
          tasksDueToday: digestData.tasksDueToday.length,
        });
        sent++;
      } catch (err) {
        console.warn(`[DigestService] Email failed for ${user.email}:`, err);
      }
    }

    return { sent };
  }

  /**
   * Set digest preferences for a user
   */
  static setPreferences(userId: string, workspaceId: string, frequency: 'daily' | 'weekly' | 'none'): DigestPreferences {
    const prefs: DigestPreferences = { userId, workspaceId, frequency, hour: 2 }; // 8 AM IST
    digestPreferences.set(`${workspaceId}:${userId}`, prefs);
    return prefs;
  }

  /**
   * Get preferences for a user
   */
  static getPreferences(userId: string, workspaceId: string): DigestPreferences {
    return digestPreferences.get(`${workspaceId}:${userId}`) || {
      userId, workspaceId, frequency: 'daily', hour: 2,
    };
  }
}
