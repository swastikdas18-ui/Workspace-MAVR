/**
 * Phase 21G: Data Export & Portability & GDPR Compliance Service
 * 
 * Generates portable workspace backup archives and implements GDPR Right-to-Erasure.
 */

import { inMemoryDb } from '../../packages/database';

export interface WorkspaceExportArchive {
  workspace: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    exportedAt: string;
    formatVersion: string;
  };
  manifest: {
    projectsCount: number;
    tasksCount: number;
    crmCount: number;
    documentsCount: number;
    activityLogsCount: number;
  };
  files: {
    'workspace_metadata.json': string;
    'projects.json': string;
    'tasks.json': string;
    'crm.json': string;
    'activity_logs.json': string;
  };
}

export interface UserDataExport {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
  memberships: any[];
  assignedTasks: any[];
  activityLogs: any[];
  exportedAt: string;
}

export class DataPortabilityService {
  /**
   * Export all workspace assets into structured JSON files.
   */
  public static async exportWorkspace(workspaceId: string): Promise<WorkspaceExportArchive> {
    const ws = inMemoryDb.workspaces.get(workspaceId);
    if (!ws) {
      throw new Error('Workspace not found');
    }

    const projects = Array.from(inMemoryDb.projects.values()).filter(
      (p) => p.workspaceId === workspaceId || p.workspace_id === workspaceId
    );
    const tasks = Array.from(inMemoryDb.tasks.values()).filter(
      (t) => t.workspaceId === workspaceId || t.workspace_id === workspaceId
    );
    const crm = Array.from(inMemoryDb.crmRecords.values()).filter(
      (c) => c.workspaceId === workspaceId || c.workspace_id === workspaceId
    );
    const docs = Array.from(inMemoryDb.documents.values()).filter(
      (d) => d.workspaceId === workspaceId || d.workspace_id === workspaceId
    );
    const activityLogs = Array.from(inMemoryDb.activityLogs.values()).filter(
      (a) => a.workspaceId === workspaceId || a.workspace_id === workspaceId
    );

    const now = new Date().toISOString();

    const metadata = {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId,
      createdAt: ws.createdAt,
      exportedAt: now,
      formatVersion: '2.0.0-phase21',
    };

    return {
      workspace: {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        createdAt: ws.createdAt,
        exportedAt: now,
        formatVersion: '2.0.0-phase21',
      },
      manifest: {
        projectsCount: projects.length,
        tasksCount: tasks.length,
        crmCount: crm.length,
        documentsCount: docs.length,
        activityLogsCount: activityLogs.length,
      },
      files: {
        'workspace_metadata.json': JSON.stringify(metadata, null, 2),
        'projects.json': JSON.stringify(projects, null, 2),
        'tasks.json': JSON.stringify(tasks, null, 2),
        'crm.json': JSON.stringify(crm, null, 2),
        'activity_logs.json': JSON.stringify(activityLogs, null, 2),
      },
    };
  }

  /**
   * Export user personal data for GDPR compliance.
   */
  public static async exportUserData(userId: string): Promise<UserDataExport> {
    const user = inMemoryDb.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const memberships = Array.from(inMemoryDb.workspaceMembers.values()).filter((m) => m.userId === userId);
    const assignedTasks = Array.from(inMemoryDb.tasks.values()).filter(
      (t) => t.assignedTo === userId || t.assigned_to === userId
    );
    const activityLogs = Array.from(inMemoryDb.activityLogs.values()).filter(
      (a) => a.userId === userId || a.actorId === userId
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      memberships,
      assignedTasks,
      activityLogs,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * GDPR Right-to-Erasure (Account & Data Deletion).
   */
  public static async deleteUser(userId: string): Promise<{ success: boolean; erasedAt: string }> {
    // Revoke sessions
    for (const [key, session] of inMemoryDb.sessions.entries()) {
      if (session.userId === userId) {
        inMemoryDb.sessions.delete(key);
      }
    }

    // Remove workspace memberships
    for (const [key, mem] of inMemoryDb.workspaceMembers.entries()) {
      if (mem.userId === userId) {
        inMemoryDb.workspaceMembers.delete(key);
      }
    }

    // Delete user entity
    inMemoryDb.users.delete(userId);

    return {
      success: true,
      erasedAt: new Date().toISOString(),
    };
  }
}
