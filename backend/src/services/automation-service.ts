import { 
  AutomationRepository, 
  AutomationRuleEntity, 
  AutomationCondition, 
  AutomationActionEntity 
} from '../repositories/automation-repository';
import { NotificationRepository } from '../repositories/notification-repository';
import { TaskRepository } from '../repositories/task-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { ActivityRepository } from '../repositories/activity-repository';
import { EmailService } from './email-service';
import { inMemoryDb } from '../../packages/database/index.js';

export interface AutomationTriggerPayload {
  workspaceId: string;
  triggerType: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  entity?: Record<string, any>;
  previousState?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Onboarding' | 'Project Management' | 'CRM & Sales' | 'Task Escalation' | 'Compliance';
  icon: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  conditionConfig: AutomationCondition[];
  actionType: string;
  actionConfig: Record<string, any>;
  actions: Array<{ actionType: string; actionConfig: Record<string, any> }>;
}

export class AutomationService {
  /**
   * Pre-built Automation Templates Library
   */
  public static readonly TEMPLATES: AutomationTemplate[] = [
    {
      id: 'new_employee_onboarding',
      name: 'New Employee Onboarding',
      description: 'Automatically create onboarding tasks and send welcome orientation alert when a new member joins.',
      category: 'Onboarding',
      icon: 'UserPlus',
      triggerType: 'member_joined',
      triggerConfig: {},
      conditionConfig: [],
      actionType: 'create_task',
      actionConfig: {
        title: 'Complete Workspace Onboarding & Setup 2FA',
        description: 'Read the team wiki guidelines, set up your security credentials, and meet your team lead.',
        priority: 'high',
        due_in_days: 3,
      },
      actions: [
        {
          actionType: 'create_task',
          actionConfig: {
            title: 'Complete Workspace Onboarding & Setup 2FA',
            description: 'Read the team wiki guidelines and set up your credentials.',
            priority: 'high',
            due_in_days: 3,
          },
        },
        {
          actionType: 'send_notification',
          actionConfig: {
            title: 'Welcome to the Workspace!',
            message: 'Your onboarding checklist has been assigned to your execution queue.',
          },
        },
      ],
    },
    {
      id: 'project_kickoff',
      name: 'Project Kickoff',
      description: 'When a new initiative is created, automatically generate the architecture review task and notify the lead.',
      category: 'Project Management',
      icon: 'FolderPlus',
      triggerType: 'project_created',
      triggerConfig: {},
      conditionConfig: [],
      actionType: 'create_task',
      actionConfig: {
        title: 'Project Kickoff & Technical Architecture Review',
        description: 'Establish repository structure, CI/CD pipeline milestones, and initial scope.',
        priority: 'high',
        due_in_days: 5,
      },
      actions: [
        {
          actionType: 'create_task',
          actionConfig: {
            title: 'Project Kickoff & Technical Architecture Review',
            description: 'Establish repository structure and scope.',
            priority: 'high',
            due_in_days: 5,
          },
        },
        {
          actionType: 'send_notification',
          actionConfig: {
            title: 'New Initiative Initialized',
            message: 'Kickoff checklist and architectural task created for project.',
          },
        },
      ],
    },
    {
      id: 'lead_assignment',
      name: 'Lead Assignment & Notification',
      description: 'When a high-value lead is created, automatically notify executive leadership and log CRM activity.',
      category: 'CRM & Sales',
      icon: 'Target',
      triggerType: 'lead_created',
      triggerConfig: {},
      conditionConfig: [
        {
          field: 'deal_value',
          operator: 'gte',
          value: 10000,
        },
      ],
      actionType: 'send_notification',
      actionConfig: {
        title: 'High-Value Lead Created',
        message: 'A new strategic lead with value >= $10,000 has been registered in the CRM pipeline.',
      },
      actions: [
        {
          actionType: 'send_notification',
          actionConfig: {
            title: 'High-Value Lead Created',
            message: 'A new strategic lead has been registered in the CRM.',
          },
        },
        {
          actionType: 'create_crm_activity',
          actionConfig: {
            type: 'lead_triage',
            notes: 'High-value opportunity routed to executive sales queue.',
          },
        },
      ],
    },
    {
      id: 'project_completion',
      name: 'Project Completion & Celebration',
      description: 'When all deliverables in an initiative reach 100%, notify all team members and log milestone completion.',
      category: 'Project Management',
      icon: 'CheckCircle',
      triggerType: 'project_completed',
      triggerConfig: {},
      conditionConfig: [],
      actionType: 'send_notification',
      actionConfig: {
        title: 'Initiative Successfully Delivered!',
        message: 'Congratulations! All project deliverables have been approved and completed.',
      },
      actions: [
        {
          actionType: 'send_notification',
          actionConfig: {
            title: 'Initiative Delivered!',
            message: 'Congratulations! All project deliverables have been approved.',
          },
        },
      ],
    },
    {
      id: 'document_approval',
      name: 'Document Review & Approval',
      description: 'When a compliance or technical document is uploaded with public visibility, request admin review.',
      category: 'Compliance',
      icon: 'FileText',
      triggerType: 'document_uploaded',
      triggerConfig: {},
      conditionConfig: [
        {
          field: 'status',
          operator: 'equals',
          value: 'public',
        },
      ],
      actionType: 'send_notification',
      actionConfig: {
        title: 'Document Review Required',
        message: 'A new public workspace document was uploaded and requires administrative verification.',
      },
      actions: [
        {
          actionType: 'send_notification',
          actionConfig: {
            title: 'Document Review Required',
            message: 'Public document uploaded for review.',
          },
        },
      ],
    },
    {
      id: 'task_escalation',
      name: 'Task Escalation & Overdue Alert',
      description: 'When a high-priority work item becomes overdue, escalate to project leads with an urgent notification.',
      category: 'Task Escalation',
      icon: 'AlertTriangle',
      triggerType: 'task_overdue',
      triggerConfig: {},
      conditionConfig: [
        {
          field: 'priority',
          operator: 'in',
          value: ['high', 'urgent', 'critical'],
        },
      ],
      actionType: 'send_notification',
      actionConfig: {
        title: 'Task Escalation: Overdue High Priority Work Item',
        message: 'A critical work item has passed its due date. Immediate intervention required.',
      },
      actions: [
        {
          actionType: 'send_notification',
          actionConfig: {
            title: 'Task Escalation Alert',
            message: 'High priority work item is past due.',
          },
        },
      ],
    },
  ];

  /**
   * Evaluates if a given condition matches the event entity payload
   */
  public static evaluateCondition(
    condition: AutomationCondition,
    payload: AutomationTriggerPayload
  ): boolean {
    const { field, operator, value } = condition;
    const entity = payload.entity || {};

    // Extract actual value from entity, payload metadata, or previousState
    let actualValue = entity[field];
    if (actualValue === undefined && payload.metadata) {
      actualValue = payload.metadata[field];
    }
    if (actualValue === undefined) {
      if (field === 'priority') actualValue = entity.priority;
      if (field === 'status') actualValue = entity.status;
      if (field === 'team' || field === 'team_id') actualValue = entity.teamId || entity.team_id;
      if (field === 'assignee' || field === 'assigned_to') actualValue = entity.assignedTo || entity.assigned_to;
      if (field === 'project' || field === 'project_id') actualValue = entity.projectId || entity.project_id;
      if (field === 'deal_value') actualValue = entity.value || entity.amount || entity.deal_value || 0;
      if (field === 'task_count') actualValue = entity.taskCount || entity.task_count || 0;
    }

    switch (operator) {
      case 'equals':
        return String(actualValue ?? '').toLowerCase() === String(value ?? '').toLowerCase();

      case 'not_equals':
        return String(actualValue ?? '').toLowerCase() !== String(value ?? '').toLowerCase();

      case 'contains':
        return String(actualValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());

      case 'in':
        if (Array.isArray(value)) {
          return value.map((v) => String(v).toLowerCase()).includes(String(actualValue ?? '').toLowerCase());
        }
        return false;

      case 'not_in':
        if (Array.isArray(value)) {
          return !value.map((v) => String(v).toLowerCase()).includes(String(actualValue ?? '').toLowerCase());
        }
        return true;

      case 'gt':
        return Number(actualValue ?? 0) > Number(value ?? 0);

      case 'gte':
        return Number(actualValue ?? 0) >= Number(value ?? 0);

      case 'lt':
        return Number(actualValue ?? 0) < Number(value ?? 0);

      case 'lte':
        return Number(actualValue ?? 0) <= Number(value ?? 0);

      case 'is_empty':
        return actualValue === undefined || actualValue === null || String(actualValue).trim() === '';

      case 'is_not_empty':
        return actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== '';

      case 'before':
        if (!actualValue || !value) return false;
        return new Date(actualValue).getTime() < new Date(value).getTime();

      case 'after':
        if (!actualValue || !value) return false;
        return new Date(actualValue).getTime() > new Date(value).getTime();

      case 'is_today':
        if (!actualValue) return false;
        return new Date(actualValue).toISOString().substring(0, 10) === new Date().toISOString().substring(0, 10);

      case 'is_overdue':
        if (!actualValue) return false;
        return new Date(actualValue).getTime() < Date.now();

      default:
        return true;
    }
  }

  /**
   * Evaluates all conditions of a rule against the trigger payload
   */
  public static evaluateAllConditions(
    conditions: AutomationCondition[] | Record<string, any> | undefined,
    payload: AutomationTriggerPayload
  ): boolean {
    if (!conditions) return true;

    // Array of conditions: evaluate AND
    if (Array.isArray(conditions)) {
      if (conditions.length === 0) return true;
      return conditions.every((cond) => this.evaluateCondition(cond, payload));
    }

    // Single condition object
    if (typeof conditions === 'object' && conditions.field && conditions.operator) {
      return this.evaluateCondition(conditions as AutomationCondition, payload);
    }

    return true;
  }

  /**
   * Helper to interpolate variables like {{title}} or {{projectId}}
   */
  private static interpolate(template: string, context: Record<string, any>): string {
    if (!template || typeof template !== 'string') return template;
    return template
      .replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
        const val = context[key];
        return val !== undefined ? String(val) : `{{${key}}}`;
      })
      .replace(/\{\s*([a-zA-Z0-9_.-]+)\s*\}/g, (_, key) => {
        const val = context[key];
        return val !== undefined ? String(val) : `{${key}}`;
      });
  }

  /**
   * Execute a single action within a rule
   */
  public static async executeAction(
    action: { actionType: string; actionConfig: Record<string, any> },
    rule: AutomationRuleEntity,
    payload: AutomationTriggerPayload
  ): Promise<any> {
    const { actionType, actionConfig } = action;
    const workspaceId = rule.workspaceId;
    const actorId = payload.actorId || rule.createdBy;
    const entity = payload.entity || {};

    // Build rich context map for variable interpolation
    const interpContext: Record<string, any> = {
      ...payload.metadata,
      ...entity,
      ...payload,
      title: entity.title || entity.name,
      name: entity.name || entity.title || rule.name,
      projectId: entity.projectId || entity.project_id || (payload.entityType === 'project' ? entity.id : undefined),
      taskId: entity.taskId || (payload.entityType === 'task' ? entity.id : undefined),
      userId: actorId,
      teamName: entity.teamName || entity.name,
      customerName: entity.customerName || entity.name || entity.title,
      company: entity.company,
      dealValue: entity.value || entity.amount || entity.dealValue,
      status: entity.status,
      priority: entity.priority,
    };

    switch (actionType) {
      case 'create_task': {
        const rawProjectId = actionConfig.projectId || actionConfig.project_id || entity.projectId || entity.project_id || entity.id;
        const projectId = this.interpolate(rawProjectId, interpContext);
        let rawAssignedTo = actionConfig.assignedTo || actionConfig.assigned_to || payload.actorId || rule.createdBy;
        if (rawAssignedTo === 'assignee' || rawAssignedTo === 'actor') {
          rawAssignedTo = entity.userId || entity.memberId || entity.assignedTo || payload.actorId || rule.createdBy;
        }
        const assignedTo = this.interpolate(rawAssignedTo, interpContext);
        const dueInDays = Number(actionConfig.due_in_days) || 7;
        const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000);

        const rawTitle = actionConfig.title || `Task: ${rule.name}`;
        const title = this.interpolate(rawTitle, interpContext);
        const rawDescription = actionConfig.description || `Generated by automation: ${rule.name}`;
        const description = this.interpolate(rawDescription, interpContext);

        const newTask = await TaskRepository.createTask(workspaceId, actorId, {
          title,
          description,
          priority: actionConfig.priority || 'medium',
          storyPoints: actionConfig.storyPoints || actionConfig.story_points || 1,
          estimatedHours: actionConfig.estimatedHours || actionConfig.estimated_hours || 4,
          assignedTo,
          projectId: projectId || 'proj-general',
          dueDate,
        });

        return { taskId: newTask.id, title: newTask.title };
      }

      case 'assign_task': {
        const taskId = actionConfig.taskId || entity.id;
        let targetUser = actionConfig.assignedTo || actionConfig.assigned_to || actorId;
        if (targetUser === 'assignee' || targetUser === 'actor') {
          targetUser = entity.userId || entity.memberId || entity.assignedTo || actorId;
        }
        if (taskId) {
          await TaskRepository.updateTask(workspaceId, taskId, {
            assignedTo: targetUser,
          });
          return { taskId, assignedTo: targetUser };
        }
        return { skipped: true, reason: 'No taskId specified' };
      }

      case 'update_status':
      case 'update_task_status': {
        const taskId = actionConfig.taskId || entity.id;
        const nextStatus = actionConfig.status || 'in_progress';
        if (taskId) {
          await TaskRepository.updateTask(workspaceId, taskId, {
            status: nextStatus,
          });
          return { taskId, status: nextStatus };
        }
        return { skipped: true, reason: 'No taskId specified' };
      }

      case 'send_notification': {
        let targetUserId = actionConfig.userId || actionConfig.user_id || actionConfig.recipient || payload.actorId || rule.createdBy;
        if (targetUserId === 'admin') {
          targetUserId = rule.createdBy;
        } else if (targetUserId === 'assignee' || targetUserId === 'actor') {
          targetUserId = entity.userId || entity.memberId || entity.assignedTo || payload.actorId || rule.createdBy;
        }

        const rawTitle = actionConfig.title || `Automation: ${rule.name}`;
        const title = this.interpolate(rawTitle, interpContext);
        const rawMessage = actionConfig.message || `Automated alert triggered by rule "${rule.name}".`;
        const message = this.interpolate(rawMessage, interpContext);

        const notif = await NotificationRepository.createNotification({
          workspaceId,
          userId: targetUserId,
          title,
          message,
          type: actionConfig.type || 'automation_alert',
          metadata: { ruleId: rule.id, payload: payload.metadata },
        });
        return { notificationId: notif.id };
      }

      case 'send_email': {
        const rawTo = actionConfig.to || actionConfig.email;
        const to = this.interpolate(rawTo, interpContext);
        if (to) {
          const rawSubject = actionConfig.subject || `Workspace OS Alert: ${rule.name}`;
          const subject = this.interpolate(rawSubject, interpContext);
          const rawHtml = actionConfig.html || `<p>${actionConfig.message || 'Automation triggered'}</p>`;
          const html = this.interpolate(rawHtml, interpContext);

          await EmailService.sendEmail({
            to,
            subject,
            html,
          });
          return { emailSent: true, to };
        }
        return { skipped: true, reason: 'No email recipient specified' };
      }

      case 'create_activity':
      case 'create_activity_log': {
        const actionName = actionConfig.action || 'automation_executed';
        const actRecord = await ActivityRepository.logActivity({
          workspaceId,
          userId: actorId,
          entityType: payload.entityType || 'task',
          entityId: payload.entityId || entity.id || 'system',
          action: actionName,
          metadata: { ruleId: rule.id, ruleName: rule.name, ...actionConfig },
        });
        return { activityId: actRecord.id };
      }

      case 'create_audit':
      case 'create_audit_log': {
        const actionName = actionConfig.action || 'AUTOMATION_ACTION_EXECUTED';
        const resourceName = actionConfig.resource || payload.entityType || 'task';
        const auditRecord = await AuditRepository.logAudit({
          workspaceId,
          userId: actorId,
          action: actionName,
          resource: resourceName,
          resourceId: payload.entityId || entity.id || rule.id,
          newValues: { ruleId: rule.id, ruleName: rule.name, ...actionConfig },
        });
        return { auditId: auditRecord.id };
      }

      case 'update_attendance': {
        const targetUserId = entity.userId || payload.actorId || rule.createdBy;
        const newStatus = actionConfig.status || 'on_leave';
        const today = new Date().toISOString().split('T')[0];
        const existing = Array.from(inMemoryDb.attendanceRecords.values()).find(
          (a) => a.workspaceId === workspaceId && a.userId === targetUserId && a.date === today
        );
        if (existing) {
          existing.status = newStatus;
          inMemoryDb.attendanceRecords.set(existing.id, existing);
        } else {
          const recId = 'att-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
          inMemoryDb.attendanceRecords.set(recId, {
            id: recId,
            workspaceId,
            userId: targetUserId,
            date: today,
            status: newStatus,
            workedHours: 0,
            checkInAt: null,
            checkOutAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        return { attendanceUpdated: true, status: newStatus };
      }

      case 'create_document': {
        const docId = 'doc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const rawTitle = actionConfig.title || `Document: ${rule.name}`;
        const title = this.interpolate(rawTitle, interpContext);

        const docRecord = {
          id: docId,
          workspaceId,
          title,
          fileUrl: actionConfig.fileUrl || 'https://storage.workspaceos.dev/docs/auto-generated.pdf',
          fileType: actionConfig.fileType || 'pdf',
          fileSize: actionConfig.fileSize || '150 KB',
          ownerId: actorId,
          visibility: actionConfig.visibility || 'team',
          category: actionConfig.category || 'General',
          createdAt: new Date(),
          downloadCount: 0,
        };
        inMemoryDb.documents.set(docId, docRecord);
        return { documentId: docId };
      }

      case 'create_project': {
        const rawTitle = actionConfig.title || `Initiative: ${rule.name}`;
        const title = this.interpolate(rawTitle, interpContext);
        const rawDescription = actionConfig.description || `Generated by automation: ${rule.name}`;
        const description = this.interpolate(rawDescription, interpContext);

        const newProj = await ProjectRepository.createProject({
          workspaceId,
          createdBy: actorId,
          title,
          description,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          budget: actionConfig.budget || '$0',
        });
        return { projectId: newProj.id };
      }

      case 'create_crm_activity': {
        const crmId = 'crm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const rawName = actionConfig.name || `Activity: ${rule.name}`;
        const name = this.interpolate(rawName, interpContext);

        inMemoryDb.crmRecords.set(crmId, {
          id: crmId,
          workspaceId,
          name,
          company: actionConfig.company || 'Internal',
          value: actionConfig.value || 0,
          stage: actionConfig.stage || 'lead',
          ownerId: actorId,
          createdAt: new Date(),
        });
        return { crmId };
      }

      case 'add_comment': {
        const taskId = actionConfig.taskId || entity.id;
        const rawCommentText = actionConfig.content || actionConfig.comment || `Automated note: ${rule.name}`;
        const commentText = this.interpolate(rawCommentText, interpContext);

        if (taskId) {
          const comment = await TaskRepository.addComment(taskId, actorId, commentText, workspaceId);
          return { commentId: comment.id };
        }
        return { skipped: true, reason: 'No taskId for comment' };
      }

      case 'webhook': {
        const webhookUrl = actionConfig.url || actionConfig.webhookUrl;
        if (webhookUrl) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: rule.triggerType,
                rule: { id: rule.id, name: rule.name },
                payload,
                timestamp: new Date().toISOString(),
              }),
              signal: controller.signal,
            });
            clearTimeout(timeout);
            return { webhookStatus: response.status };
          } catch (e: any) {
            return { webhookError: e.message };
          }
        }
        return { skipped: true, reason: 'No webhook URL provided' };
      }

      default:
        throw new Error(`Unsupported action type: "${actionType}"`);
    }
  }

  /**
   * Main Pipeline: Process an event trigger across all active rules in the workspace
   */
  public static async processTrigger(
    payload: AutomationTriggerPayload
  ): Promise<Array<{ ruleId: string; ruleName: string; status: string; executionTime: number }>> {
    const { workspaceId, triggerType } = payload;
    const rules = await AutomationRepository.listRules(workspaceId);

    // Filter rules matching triggerType and enabled status
    const matchingRules = rules.filter(
      (r) => r.enabled && (r.triggerType === triggerType || r.triggerType === '*' || r.triggerType === 'all')
    );

    const results: Array<{ ruleId: string; ruleName: string; status: string; executionTime: number }> = [];

    for (const rule of matchingRules) {
      const startTime = Date.now();
      let status: 'success' | 'failed' | 'skipped' = 'success';
      let errorMessage: string | null = null;
      const actionResults: any[] = [];

      try {
        // 1. Evaluate Conditions (IF)
        const conditionsMatch = this.evaluateAllConditions(rule.conditionConfig, payload);
        if (!conditionsMatch) {
          status = 'skipped';
          const executionTime = Date.now() - startTime;
          await AutomationRepository.recordExecution({
            workspaceId,
            ruleId: rule.id,
            status: 'skipped',
            triggeredBy: payload.actorId || triggerType,
            executionTime,
            entityType: payload.entityType || rule.entityType,
            entityId: payload.entityId,
            executionResult: { reason: 'Conditions not met' },
          });
          results.push({ ruleId: rule.id, ruleName: rule.name, status: 'skipped', executionTime });
          continue;
        }

        // 2. Execute Actions (THEN)
        const actionsToExecute = rule.actions && rule.actions.length > 0 
          ? rule.actions 
          : rule.actionType 
          ? [{ actionType: rule.actionType, actionConfig: rule.actionConfig || {} }] 
          : [];

        for (const action of actionsToExecute) {
          const res = await this.executeAction(action, rule, payload);
          actionResults.push(res);
        }

        const executionTime = Date.now() - startTime;

        // 3. Record Execution Audit Trail
        await AutomationRepository.recordExecution({
          workspaceId,
          ruleId: rule.id,
          status: 'success',
          triggeredBy: payload.actorId || triggerType,
          executionTime,
          entityType: payload.entityType || rule.entityType,
          entityId: payload.entityId,
          executionResult: { actions: actionResults },
        });

        // 4. Audit Log
        await AuditRepository.log({
          workspaceId,
          userId: payload.actorId || rule.createdBy,
          action: 'automation_executed',
          resource: 'automation_rule',
          resourceId: rule.id,
          details: { ruleName: rule.name, triggerType, actionCount: actionsToExecute.length },
        });

        results.push({ ruleId: rule.id, ruleName: rule.name, status: 'success', executionTime });
      } catch (err: any) {
        status = 'failed';
        errorMessage = err.message || 'Execution error';
        const executionTime = Date.now() - startTime;

        await AutomationRepository.recordExecution({
          workspaceId,
          ruleId: rule.id,
          status: 'failed',
          triggeredBy: payload.actorId || triggerType,
          executionTime,
          errorMessage,
          entityType: payload.entityType || rule.entityType,
          entityId: payload.entityId,
          executionResult: { error: errorMessage },
        });

        results.push({ ruleId: rule.id, ruleName: rule.name, status: 'failed', executionTime });
      }
    }

    return results;
  }

  /**
   * Backward compatible helper for EventService
   */
  public static async processEvent(
    workspaceId: string,
    triggerType: string,
    entityType: string,
    entityId: string,
    entityData: Record<string, any>,
    context?: { actorId?: string; ipAddress?: string; userAgent?: string }
  ) {
    return this.processTrigger({
      workspaceId,
      triggerType,
      actorId: context?.actorId,
      entityType,
      entityId,
      entity: entityData,
      metadata: context,
    });
  }

  /**
   * Install a pre-built template into a workspace
   */
  public static async installTemplate(
    workspaceId: string,
    userId: string,
    templateId: string
  ): Promise<AutomationRuleEntity> {
    const template = this.TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      const error: any = new Error(`Template [${templateId}] not found.`);
      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return AutomationRepository.createRule(workspaceId, userId, {
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
      conditionConfig: template.conditionConfig,
      actionType: template.actionType,
      actionConfig: template.actionConfig,
      enabled: true,
      isActive: true,
      createdBy: userId,
      actions: template.actions,
    });
  }
}
