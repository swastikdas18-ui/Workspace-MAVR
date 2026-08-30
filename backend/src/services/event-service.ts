import { NotificationRepository } from '../repositories/notification-repository';
import { ActivityRepository } from '../repositories/activity-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { AutomationService } from './automation-service';
import { getDb } from '../../packages/database/index.js';
import { EventBus } from '../realtime/event-bus';

export interface BaseEventContext {
  workspaceId: string;
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class EventService {
  /**
   * Generic emit method
   */
  static async emit(
    ctx: BaseEventContext,
    triggerType: string,
    entityType: string,
    entityId: string,
    eventData: Record<string, any> = {}
  ) {
    try {
      // 1. Publish to Realtime EventBus for WebSocket propagation
      EventBus.publishWorkspaceEvent(
        ctx.workspaceId,
        triggerType,
        { entityType, entityId, ...eventData },
        { actorId: ctx.actorId, entityType, entityId }
      );

      // 2. Process Automations
      await AutomationService.processEvent(
        ctx.workspaceId,
        triggerType,
        entityType,
        entityId,
        eventData,
        {
          actorId: ctx.actorId,
          ipAddress: ctx.ipAddress || undefined,
          userAgent: ctx.userAgent || undefined,
        }
      );
    } catch (err) {
      console.error(`[EventService.emit Error] Trigger: ${triggerType}`, err);
    }
  }

  /**
   * Emit when a new task is created
   */
  static async emitTaskCreated(
    ctx: BaseEventContext,
    task: { id: string; title: string; projectId: string; assignedTo?: string; isLearningTask?: boolean; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'task',
          entityId: task.id,
          action: 'created',
          metadata: {
            title: task.title,
            projectId: task.projectId,
            isLearningTask: task.isLearningTask,
          },
        },
        tx
      );

      // 2. Notification if assigned to someone else
      if (task.assignedTo && task.assignedTo !== ctx.actorId) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: task.assignedTo,
            title: 'New Task Assigned',
            message: `You have been assigned to task "${task.title}".`,
            type: 'task_assigned',
            metadata: { taskId: task.id, projectId: task.projectId },
          },
          tx
        );
      }

      // 3. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'CREATE_TASK',
          resource: 'task',
          resourceId: task.id,
          newValues: { title: task.title, projectId: task.projectId, assignedTo: task.assignedTo },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Fallback to standalone execution if tx is unsupported
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'task_created',
      'task',
      task.id,
      { ...task },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'task_created', task, {
      actorId: ctx.actorId,
      entityType: 'task',
      entityId: task.id,
    });
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'task_updated', task, {
      actorId: ctx.actorId,
      entityType: 'task',
      entityId: task.id,
    });
  }

  /**
   * Emit when a task is reassigned
   */
  static async emitTaskAssigned(
    ctx: BaseEventContext,
    task: { id: string; title: string; projectId: string; previousAssignee?: string; newAssignee?: string; assignedTo?: string; [key: string]: any }
  ) {
    const assignee = task.assignedTo || task.newAssignee || '';
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'task',
          entityId: task.id,
          action: 'assigned',
          metadata: {
            title: task.title,
            newAssignee: assignee,
            assignedTo: assignee,
            previousAssignee: task.previousAssignee,
          },
        },
        tx
      );

      // 2. Notification to new assignee
      if (assignee && assignee !== ctx.actorId) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: assignee,
            title: 'Task Assigned To You',
            message: `You were assigned to "${task.title}".`,
            type: 'task_assigned',
            metadata: { taskId: task.id, projectId: task.projectId },
          },
          tx
        );
      }

      // 3. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'ASSIGN_TASK',
          resource: 'task',
          resourceId: task.id,
          oldValues: { assignedTo: task.previousAssignee },
          newValues: { assignedTo: assignee },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'task_assigned',
      'task',
      task.id,
      { ...task, assignedTo: assignee },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'task_assigned',
      { ...task, assignedTo: assignee },
      {
        actorId: ctx.actorId,
        entityType: 'task',
        entityId: task.id,
        targetUserId: assignee,
      }
    );
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'task_updated',
      { ...task, assignedTo: assignee },
      {
        actorId: ctx.actorId,
        entityType: 'task',
        entityId: task.id,
      }
    );
  }

  /**
   * Emit when a task is completed
   */
  static async emitTaskCompleted(
    ctx: BaseEventContext,
    task: { id: string; title: string; projectId: string; creatorId?: string; assignedTo?: string; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'task',
          entityId: task.id,
          action: 'completed',
          metadata: {
            title: task.title,
            projectId: task.projectId,
          },
        },
        tx
      );

      // 2. Notification to task creator if different from actor
      if (task.creatorId && task.creatorId !== ctx.actorId) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: task.creatorId,
            title: 'Task Completed',
            message: `Task "${task.title}" has been marked as completed.`,
            type: 'task_completed',
            metadata: { taskId: task.id, projectId: task.projectId },
          },
          tx
        );
      }

      // 3. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'COMPLETE_TASK',
          resource: 'task',
          resourceId: task.id,
          newValues: { status: 'completed' },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'task_completed',
      'task',
      task.id,
      { ...task, status: 'completed' },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'task_completed',
      { ...task, status: 'completed' },
      {
        actorId: ctx.actorId,
        entityType: 'task',
        entityId: task.id,
      }
    );
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'task_updated',
      { ...task, status: 'completed' },
      {
        actorId: ctx.actorId,
        entityType: 'task',
        entityId: task.id,
      }
    );
  }

  /**
   * Emit when a task is approved
   */
  static async emitTaskApproved(
    ctx: BaseEventContext,
    task: { id: string; title: string; projectId: string; assignedTo?: string; [key: string]: any }
  ) {
    // 1. Process Automations with 'task_approved'
    await AutomationService.processEvent(
      ctx.workspaceId,
      'task_approved',
      'task',
      task.id,
      { ...task, status: 'done' },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // 2. Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'task_approved',
      { ...task, status: 'done' },
      {
        actorId: ctx.actorId,
        entityType: 'task',
        entityId: task.id,
      }
    );
  }

  /**
   * Emit when a task is updated
   */
  static async emitTaskUpdated(
    ctx: BaseEventContext,
    task: { id: string; title: string; projectId: string; oldValues?: Record<string, any>; newValues?: Record<string, any>; [key: string]: any }
  ) {
    const changes = task.newValues || {};
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'task',
          entityId: task.id,
          action: 'updated',
          metadata: {
            title: task.title,
            changes,
          },
        },
        tx
      );

      // 2. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'UPDATE_TASK',
          resource: 'task',
          resourceId: task.id,
          oldValues: task.oldValues || null,
          newValues: changes,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'task_updated',
      'task',
      task.id,
      { ...task, ...changes },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'task_updated',
      { ...task, ...changes, newValues: changes },
      {
        actorId: ctx.actorId,
        entityType: 'task',
        entityId: task.id,
      }
    );
  }

  /**
   * Emit when a task becomes overdue
   */
  static async emitTaskOverdue(
    ctx: BaseEventContext,
    task: { id: string; title: string; projectId: string; assignedTo?: string; dueDate?: Date; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'task',
          entityId: task.id,
          action: 'overdue',
          metadata: {
            title: task.title,
            projectId: task.projectId,
            dueDate: task.dueDate,
          },
        },
        tx
      );

      // 2. Notification to assignee
      if (task.assignedTo) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: task.assignedTo,
            title: 'Task Overdue',
            message: `Task "${task.title}" is overdue.`,
            type: 'task_overdue',
            metadata: { taskId: task.id, projectId: task.projectId },
          },
          tx
        );
      }
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'task_overdue',
      'task',
      task.id,
      { ...task },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );
  }

  /**
   * Emit when a new project is created
   */
  static async emitProjectCreated(
    ctx: BaseEventContext,
    project: { id: string; title: string; memberIds?: string[]; budget?: string; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'project',
          entityId: project.id,
          action: 'created',
          metadata: {
            title: project.title,
            budget: project.budget,
          },
        },
        tx
      );

      // 2. Notification to assigned members
      if (project.memberIds && project.memberIds.length > 0) {
        for (const memberId of project.memberIds) {
          if (memberId !== ctx.actorId) {
            await NotificationRepository.createNotification(
              {
                workspaceId: ctx.workspaceId,
                userId: memberId,
                title: 'Added to Project',
                message: `You were added as a team member to "${project.title}".`,
                type: 'project_created',
                metadata: { projectId: project.id },
              },
              tx
            );
          }
        }
      }

      // 3. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'CREATE_PROJECT',
          resource: 'project',
          resourceId: project.id,
          newValues: { title: project.title, budget: project.budget },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'project_created',
      'project',
      project.id,
      { ...project },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'project_created', project, {
      actorId: ctx.actorId,
      entityType: 'project',
      entityId: project.id,
    });
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'project_updated', project, {
      actorId: ctx.actorId,
      entityType: 'project',
      entityId: project.id,
    });
  }

  /**
   * Emit when a project is updated (status, progress, budget)
   */
  static async emitProjectUpdated(
    ctx: BaseEventContext,
    project: { id: string; title: string; oldValues?: Record<string, any>; newValues: Record<string, any>; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'project',
          entityId: project.id,
          action: 'updated',
          metadata: {
            title: project.title,
            changes: project.newValues,
          },
        },
        tx
      );

      // 2. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'UPDATE_PROJECT',
          resource: 'project',
          resourceId: project.id,
          oldValues: project.oldValues || null,
          newValues: project.newValues,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    const eventContext = {
      actorId: ctx.actorId,
      ipAddress: ctx.ipAddress || undefined,
      userAgent: ctx.userAgent || undefined,
    };

    // Process Automation Engine Rules for project_updated
    await AutomationService.processEvent(
      ctx.workspaceId,
      'project_updated',
      'project',
      project.id,
      { ...project, ...project.newValues },
      eventContext
    );

    // If status changed to completed, also trigger project_completed
    if (project.newValues?.status === 'completed') {
      await AutomationService.processEvent(
        ctx.workspaceId,
        'project_completed',
        'project',
        project.id,
        { ...project, ...project.newValues },
        eventContext
      );
    }

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'project_updated',
      { ...project, ...project.newValues },
      {
        actorId: ctx.actorId,
        entityType: 'project',
        entityId: project.id,
      }
    );
    if (project.newValues?.status === 'completed') {
      EventBus.publishWorkspaceEvent(
        ctx.workspaceId,
        'project_completed',
        { ...project, ...project.newValues },
        {
          actorId: ctx.actorId,
          entityType: 'project',
          entityId: project.id,
        }
      );
    }
  }

  /**
   * Emit when a project is completed
   */
  static async emitProjectCompleted(
    ctx: BaseEventContext,
    project: { id: string; title: string; progress?: number; [key: string]: any }
  ) {
    return this.emitProjectUpdated(ctx, {
      id: project.id,
      title: project.title,
      newValues: { status: 'completed', progress: project.progress ?? 100, ...project },
    });
  }

  /**
   * Emit when a document is uploaded
   */
  static async emitDocumentUploaded(
    ctx: BaseEventContext,
    doc: { id: string; title: string; fileType?: string; visibility: string; category?: string; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'document',
          entityId: doc.id,
          action: 'uploaded',
          metadata: {
            title: doc.title,
            fileType: doc.fileType,
            visibility: doc.visibility,
            category: doc.category,
          },
        },
        tx
      );

      // 2. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'UPLOAD_DOCUMENT',
          resource: 'document',
          resourceId: doc.id,
          newValues: { title: doc.title, visibility: doc.visibility, fileType: doc.fileType },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'document_uploaded',
      'document',
      doc.id,
      { ...doc },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'document_uploaded', doc, {
      actorId: ctx.actorId,
      entityType: 'document',
      entityId: doc.id,
    });
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'document_updated', doc, {
      actorId: ctx.actorId,
      entityType: 'document',
      entityId: doc.id,
    });
  }

  /**
   * Emit when a workspace invite is accepted
   */
  static async emitInviteAccepted(
    ctx: BaseEventContext,
    invite: { id: string; email: string; role: string; invitedBy: string; teamId?: string | null; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'invite',
          entityId: invite.id,
          action: 'accepted',
          metadata: {
            email: invite.email,
            role: invite.role,
          },
        },
        tx
      );

      // 2. Notification to the inviter
      if (invite.invitedBy) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: invite.invitedBy,
            title: 'Invite Accepted',
            message: `${invite.email} has accepted your invitation to join the workspace.`,
            type: 'invite_accepted',
            metadata: { inviteId: invite.id, email: invite.email },
          },
          tx
        );
      }

      // 3. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'ACCEPT_INVITE',
          resource: 'workspace_invite',
          resourceId: invite.id,
          newValues: { email: invite.email, role: invite.role },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    // Process member_added automation
    await AutomationService.processEvent(
      ctx.workspaceId,
      'member_added',
      'team',
      invite.teamId || invite.id,
      { ...invite, userId: ctx.actorId },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );
  }

  /**
   * Emit when a team is created
   */
  static async emitTeamCreated(
    ctx: BaseEventContext,
    team: { id: string; name: string; leadId?: string; memberIds?: string[]; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'team',
          entityId: team.id,
          action: 'created',
          metadata: {
            name: team.name,
            leadId: team.leadId,
          },
        },
        tx
      );

      // 2. Notification to lead if different from actor
      if (team.leadId && team.leadId !== ctx.actorId) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: team.leadId,
            title: 'Appointed Team Lead',
            message: `You have been appointed lead of team "${team.name}".`,
            type: 'team_created',
            metadata: { teamId: team.id },
          },
          tx
        );
      }

      // 3. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'CREATE_TEAM',
          resource: 'team',
          resourceId: team.id,
          newValues: { name: team.name, leadId: team.leadId },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'team_created',
      'team',
      team.id,
      { ...team },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'team_created', team, {
      actorId: ctx.actorId,
      entityType: 'team',
      entityId: team.id,
    });
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'team_updated', team, {
      actorId: ctx.actorId,
      entityType: 'team',
      entityId: team.id,
    });
  }

  /**
   * Emit when a member is added to a team
   */
  static async emitMemberAdded(
    ctx: BaseEventContext,
    data: { teamId: string; teamName?: string; userId: string; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'team',
          entityId: data.teamId,
          action: 'member_added',
          metadata: {
            teamName: data.teamName,
            memberId: data.userId,
          },
        },
        tx
      );

      // 2. Notification to member
      if (data.userId !== ctx.actorId) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: data.userId,
            title: 'Added to Team',
            message: `You were added to team "${data.teamName || 'Team'}".`,
            type: 'team_joined',
            metadata: { teamId: data.teamId },
          },
          tx
        );
      }
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'member_added',
      'team',
      data.teamId,
      { ...data },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'member_added', data, {
      actorId: ctx.actorId,
      entityType: 'team_member',
      entityId: data.userId,
      targetUserId: data.userId,
    });
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'team_updated', data, {
      actorId: ctx.actorId,
      entityType: 'team',
      entityId: data.teamId,
    });
  }

  /**
   * Emit when a new CRM record is created
   */
  static async emitCrmCreated(
    ctx: BaseEventContext,
    crm: { id: string; customerName: string; company: string; status: string; dealValue?: number; ownerId?: string; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'crm',
          entityId: crm.id,
          action: 'created',
          metadata: {
            customerName: crm.customerName,
            company: crm.company,
            status: crm.status,
            dealValue: crm.dealValue,
          },
        },
        tx
      );

      // 2. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'CREATE_CRM_RECORD',
          resource: 'crm_record',
          resourceId: crm.id,
          newValues: { customerName: crm.customerName, company: crm.company, status: crm.status },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        await execute();
      }
    } else {
      await execute();
    }

    // Process Automation Engine Rules
    await AutomationService.processEvent(
      ctx.workspaceId,
      'crm_created',
      'crm',
      crm.id,
      { ...crm },
      {
        actorId: ctx.actorId,
        ipAddress: ctx.ipAddress || undefined,
        userAgent: ctx.userAgent || undefined,
      }
    );

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'crm_created', crm, {
      actorId: ctx.actorId,
      entityType: 'crm',
      entityId: crm.id,
    });
    EventBus.publishWorkspaceEvent(ctx.workspaceId, 'crm_updated', crm, {
      actorId: ctx.actorId,
      entityType: 'crm',
      entityId: crm.id,
    });
  }

  /**
   * Emit when CRM record status / stage changes
   */
  static async emitCrmStageChanged(
    ctx: BaseEventContext,
    crm: { id: string; customerName: string; company: string; previousStatus?: string; newStatus: string; dealValue?: number; ownerId?: string; [key: string]: any }
  ) {
    const db = getDb();
    const execute = async (tx?: any) => {
      // 1. Activity Log
      await ActivityRepository.logActivity(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          entityType: 'crm',
          entityId: crm.id,
          action: 'stage_changed',
          metadata: {
            customerName: crm.customerName,
            company: crm.company,
            previousStatus: crm.previousStatus,
            newStatus: crm.newStatus,
            dealValue: crm.dealValue,
          },
        },
        tx
      );

      // 2. Notification to owner if different from actor
      if (crm.ownerId && crm.ownerId !== ctx.actorId) {
        await NotificationRepository.createNotification(
          {
            workspaceId: ctx.workspaceId,
            userId: crm.ownerId,
            title: 'Deal Stage Updated',
            message: `Deal with "${crm.customerName}" (${crm.company}) moved to ${crm.newStatus.replace('_', ' ')}.`,
            type: 'crm_stage_changed',
            metadata: { crmId: crm.id, newStatus: crm.newStatus },
          },
          tx
        );
      }

      // 3. Audit Log
      await AuditRepository.logAudit(
        {
          workspaceId: ctx.workspaceId,
          userId: ctx.actorId,
          action: 'UPDATE_CRM_STAGE',
          resource: 'crm_record',
          resourceId: crm.id,
          oldValues: { status: crm.previousStatus },
          newValues: { status: crm.newStatus },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
        tx
      );
    };

    if (db) {
      try {
        await db.transaction(async (tx) => {
          await execute(tx);
        });
      } catch {
        // Handled
        await execute();
      }
    } else {
      await execute();
    }

    const eventContext = {
      actorId: ctx.actorId,
      ipAddress: ctx.ipAddress || undefined,
      userAgent: ctx.userAgent || undefined,
    };

    // 1. Trigger crm_stage_changed
    await AutomationService.processEvent(
      ctx.workspaceId,
      'crm_stage_changed',
      'crm',
      crm.id,
      { ...crm, status: crm.newStatus },
      eventContext
    );

    // 2. If won -> trigger crm_won
    if (crm.newStatus === 'won') {
      await AutomationService.processEvent(
        ctx.workspaceId,
        'crm_won',
        'crm',
        crm.id,
        { ...crm, status: 'won' },
        eventContext
      );
    }

    // 3. If lost -> trigger crm_lost
    if (crm.newStatus === 'lost') {
      await AutomationService.processEvent(
        ctx.workspaceId,
        'crm_lost',
        'crm',
        crm.id,
        { ...crm, status: 'lost' },
        eventContext
      );
    }

    // Real-Time EventBus Broadcast
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'crm_stage_changed',
      { ...crm, status: crm.newStatus },
      {
        actorId: ctx.actorId,
        entityType: 'crm',
        entityId: crm.id,
      }
    );
    EventBus.publishWorkspaceEvent(
      ctx.workspaceId,
      'crm_updated',
      { ...crm, status: crm.newStatus },
      {
        actorId: ctx.actorId,
        entityType: 'crm',
        entityId: crm.id,
      }
    );
    if (crm.newStatus === 'won') {
      EventBus.publishWorkspaceEvent(
        ctx.workspaceId,
        'crm_won',
        { ...crm, status: 'won' },
        {
          actorId: ctx.actorId,
          entityType: 'crm',
          entityId: crm.id,
        }
      );
    }
    if (crm.newStatus === 'lost') {
      EventBus.publishWorkspaceEvent(
        ctx.workspaceId,
        'crm_lost',
        { ...crm, status: 'lost' },
        {
          actorId: ctx.actorId,
          entityType: 'crm',
          entityId: crm.id,
        }
      );
    }
  }

  /**
   * Alias for emitCrmCreated
   */
  static async emitCrmLeadCreated(
    ctx: BaseEventContext,
    crm: { id: string; customerName: string; company: string; status: string; dealValue?: number; ownerId?: string; [key: string]: any }
  ) {
    return this.emitCrmCreated(ctx, crm);
  }

  /**
   * Emit when CRM record is lost
   */
  static async emitCrmLost(
    ctx: BaseEventContext,
    crm: { id: string; customerName: string; company: string; reason?: string; dealValue?: number; [key: string]: any }
  ) {
    return this.emitCrmStageChanged(ctx, {
      ...crm,
      newStatus: 'lost',
      previousStatus: crm.previousStatus || 'negotiation',
    });
  }

  /**
   * Emit when a user performs a global or entity search
   */
  static async emitSearchPerformed(
    ctx: BaseEventContext,
    data: { query: string; resultCount: number; entityTypes: string[] }
  ) {
    if (!data.query || !data.query.trim()) return;

    try {
      await ActivityRepository.logActivity({
        workspaceId: ctx.workspaceId,
        userId: ctx.actorId,
        entityType: 'search',
        entityId: `search-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: 'search_performed',
        metadata: {
          query: data.query.trim(),
          resultCount: data.resultCount,
          entityTypes: data.entityTypes,
        },
      });

      // Real-Time EventBus Broadcast
      EventBus.publishWorkspaceEvent(
        ctx.workspaceId,
        'search_metrics_updated',
        data,
        { actorId: ctx.actorId, entityType: 'search' }
      );
    } catch (err) {
      console.error('[EventService.emitSearchPerformed Error]:', err);
    }
  }
}
