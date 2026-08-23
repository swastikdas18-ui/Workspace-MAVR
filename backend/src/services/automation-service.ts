import { AutomationRepository, AutomationRuleEntity } from '../repositories/automation-repository';
import { NotificationRepository } from '../repositories/notification-repository';
import { ActivityRepository } from '../repositories/activity-repository';
import { AuditRepository } from '../repositories/audit-repository';
import { TaskRepository } from '../repositories/task-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { WorkspaceRepository } from '../repositories/workspace-repository';
import { getDb } from '../../packages/database';

export interface ProcessEventContext {
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface RuleExecutionSummary {
  ruleId: string;
  ruleName: string;
  status: 'success' | 'failed';
  actionsExecuted: number;
  error?: string;
}

export class AutomationService {
  /**
   * Helper to interpolate variables in template strings e.g. {{title}}, {{name}}, {{customerName}}
   */
  private static interpolateString(template: string, data: Record<string, any>): string {
    if (!template || typeof template !== 'string') return template;

    return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}|\{\s*([a-zA-Z0-9_.]+)\s*\}/g, (match, key1, key2) => {
      const key = key1 || key2;
      const val = this.getNestedValue(data, key);
      return val !== undefined && val !== null ? String(val) : match;
    });
  }

  /**
   * Helper to resolve nested property paths
   */
  private static getNestedValue(obj: Record<string, any>, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let curr: any = obj;
    for (const part of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  /**
   * Deep interpolate object configs
   */
  private static interpolateConfig(config: any, data: Record<string, any>): any {
    if (typeof config === 'string') {
      return this.interpolateString(config, data);
    }
    if (Array.isArray(config)) {
      return config.map((item) => this.interpolateConfig(item, data));
    }
    if (config !== null && typeof config === 'object') {
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(config)) {
        res[k] = this.interpolateConfig(v, data);
      }
      return res;
    }
    return config;
  }

  /**
   * Resolve user IDs for notification recipients
   */
  private static async resolveRecipientIds(
    recipientSpec: string | undefined,
    workspaceId: string,
    eventData: Record<string, any>,
    context: ProcessEventContext
  ): Promise<string[]> {
    if (!recipientSpec) {
      // Default to actor or event user
      return [eventData.assignedTo || eventData.userId || context.actorId];
    }

    const interpolatedSpec = this.interpolateString(recipientSpec, eventData);
    const spec = interpolatedSpec.trim().toLowerCase();

    if (spec === 'actor') {
      return [context.actorId];
    }

    if (spec === 'admin' || spec === 'admins') {
      const members = await WorkspaceRepository.getWorkspaceMembers(workspaceId);
      const adminMembers = members.filter((m) => m.role === 'admin');
      if (adminMembers.length > 0) {
        return adminMembers.map((m) => m.userId);
      }
      const ws = await WorkspaceRepository.getWorkspaceById(workspaceId);
      return ws?.ownerId ? [ws.ownerId] : [context.actorId];
    }

    if (spec === 'owner' || spec === 'project_owner') {
      if (eventData.ownerId) return [eventData.ownerId];
      if (eventData.createdBy) return [eventData.createdBy];
      if (eventData.projectId) {
        const proj = await ProjectRepository.getProjectById(workspaceId, eventData.projectId);
        if (proj?.createdBy) return [proj.createdBy];
      }
      return [context.actorId];
    }

    if (spec === 'lead' || spec === 'team_lead') {
      if (eventData.leadId) return [eventData.leadId];
      return [context.actorId];
    }

    if (spec === 'assignee' || spec === 'member' || spec === 'user' || spec === 'target_user') {
      if (eventData.assignedTo) return [eventData.assignedTo];
      if (eventData.userId) return [eventData.userId];
      return [context.actorId];
    }

    if (spec === 'creator' || spec === 'author') {
      if (eventData.createdBy) return [eventData.createdBy];
      if (eventData.userId) return [eventData.userId];
      return [context.actorId];
    }

    // Direct user ID or UUID
    return [interpolatedSpec];
  }

  /**
   * Main entrypoint: process an event against active automation rules
   */
  static async processEvent(
    workspaceId: string,
    triggerType: string,
    entityType: string,
    entityId: string,
    eventData: Record<string, any> = {},
    context: ProcessEventContext = { actorId: 'system' }
  ): Promise<RuleExecutionSummary[]> {
    if (!workspaceId || !triggerType) return [];

    try {
      const activeRules = await AutomationRepository.getActiveRulesForTrigger(
        workspaceId,
        triggerType
      );

      if (!activeRules || activeRules.length === 0) {
        return [];
      }

      const mergedData: Record<string, any> = {
        ...eventData,
        id: entityId,
        entityId,
        entityType,
        triggerType,
        workspaceId,
        actorId: context.actorId,
        ...context,
      };

      const summaries: RuleExecutionSummary[] = [];

      for (const rule of activeRules) {
        const summary = await this.executeRule(rule, entityType, entityId, mergedData, context);
        summaries.push(summary);
      }

      return summaries;
    } catch (err) {
      console.error(`[AutomationService.processEvent Error] Trigger: ${triggerType}`, err);
      return [];
    }
  }

  /**
   * Execute a single automation rule with transaction support and error handling
   */
  static async executeRule(
    rule: AutomationRuleEntity,
    entityType: string,
    entityId: string,
    eventData: Record<string, any>,
    context: ProcessEventContext
  ): Promise<RuleExecutionSummary> {
    const executedActions: Array<{ actionType: string; result: any }> = [];
    const db = getDb();

    const runActions = async (tx?: any) => {
      for (const action of rule.actions) {
        const config = this.interpolateConfig(action.actionConfig || {}, eventData);

        switch (action.actionType) {
          case 'send_notification': {
            const rawRecipient = config.userId || config.recipient;
            const recipientIds = await this.resolveRecipientIds(
              rawRecipient,
              rule.workspaceId,
              eventData,
              context
            );

            const title = this.interpolateString(
              config.title || `Notification from ${rule.name}`,
              eventData
            );
            const message = this.interpolateString(
              config.message || `Automated workflow executed for ${entityType}.`,
              eventData
            );
            const notifType = config.type || 'automation';

            for (const uid of recipientIds) {
              await NotificationRepository.createNotification(
                {
                  workspaceId: rule.workspaceId,
                  userId: uid,
                  title,
                  message,
                  type: notifType,
                  metadata: {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    entityType,
                    entityId,
                  },
                },
                tx
              );
            }

            executedActions.push({
              actionType: 'send_notification',
              result: { recipientIds, title, message },
            });
            break;
          }

          case 'create_activity': {
            const targetEntityType = config.entityType || entityType;
            const targetEntityId = config.entityId || entityId;
            const actionText = config.action || 'automation_executed';

            await ActivityRepository.logActivity(
              {
                workspaceId: rule.workspaceId,
                userId: context.actorId || rule.createdBy,
                entityType: targetEntityType,
                entityId: targetEntityId,
                action: actionText,
                metadata: {
                  ruleId: rule.id,
                  ruleName: rule.name,
                  ...config.metadata,
                },
              },
              tx
            );

            executedActions.push({
              actionType: 'create_activity',
              result: { targetEntityType, targetEntityId, action: actionText },
            });
            break;
          }

          case 'create_audit': {
            const actionName = config.action || 'AUTOMATION_ACTION';
            const resource = config.resource || entityType;
            const resourceId = config.resourceId || entityId;

            await AuditRepository.logAudit(
              {
                workspaceId: rule.workspaceId,
                userId: context.actorId || rule.createdBy,
                action: actionName,
                resource,
                resourceId,
                newValues: {
                  ruleId: rule.id,
                  ruleName: rule.name,
                  ...(config.newValues || {}),
                },
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
              },
              tx
            );

            executedActions.push({
              actionType: 'create_audit',
              result: { action: actionName, resource, resourceId },
            });
            break;
          }

          case 'create_task': {
            const title = config.title || `Automated Task: ${rule.name}`;
            const description = config.description || `Generated by automation rule: ${rule.name}`;
            const projectId = config.projectId || eventData.projectId || eventData.id || '';
            let assignedTo = config.assignedTo || eventData.assignedTo || context.actorId;

            if (assignedTo === 'actor' || assignedTo === 'current_user') {
              assignedTo = context.actorId;
            } else if (assignedTo === 'member' && eventData.userId) {
              assignedTo = eventData.userId;
            }

            const priority = config.priority || 'medium';
            const isLearningTask = !!config.isLearningTask;
            const dueDate = config.dueDate ? new Date(config.dueDate) : new Date(Date.now() + 7 * 86400000);

            const createdTask = await TaskRepository.createTask(
              rule.workspaceId,
              context.actorId || rule.createdBy,
              {
                title,
                description,
                projectId,
                assignedTo,
                priority,
                isLearningTask,
                dueDate,
              }
            );

            executedActions.push({
              actionType: 'create_task',
              result: { taskId: createdTask.id, title, assignedTo },
            });
            break;
          }

          case 'assign_task': {
            const taskId = config.taskId || (entityType === 'task' ? entityId : undefined);
            let assignedTo = config.assignedTo || eventData.userId || context.actorId;

            if (assignedTo === 'actor' || assignedTo === 'current_user') {
              assignedTo = context.actorId;
            } else if (assignedTo === 'member' && eventData.userId) {
              assignedTo = eventData.userId;
            }

            if (taskId && assignedTo) {
              await TaskRepository.updateTask(taskId, rule.workspaceId, {
                assignedTo,
              });
              executedActions.push({
                actionType: 'assign_task',
                result: { taskId, assignedTo },
              });
            }
            break;
          }

          case 'update_task_status': {
            const taskId = config.taskId || (entityType === 'task' ? entityId : undefined);
            const status = config.status || 'completed';

            if (taskId) {
              await TaskRepository.updateTask(taskId, rule.workspaceId, {
                status,
              });
              executedActions.push({
                actionType: 'update_task_status',
                result: { taskId, status },
              });
            }
            break;
          }

          case 'update_project_status': {
            const projectId = config.projectId || (entityType === 'project' ? entityId : eventData.projectId);
            if (projectId) {
              const currentProj = await ProjectRepository.getProjectById(rule.workspaceId, projectId);
              let newProgress = currentProj?.progress || 0;

              if (config.progressIncrement !== undefined) {
                newProgress = Math.min(100, Math.max(0, newProgress + Number(config.progressIncrement)));
              } else if (config.progress !== undefined) {
                newProgress = Math.min(100, Math.max(0, Number(config.progress)));
              }

              const status = config.status || (newProgress >= 100 ? 'completed' : currentProj?.status || 'in_progress');

              await ProjectRepository.updateProject(rule.workspaceId, projectId, {
                status,
                progress: newProgress,
              });

              executedActions.push({
                actionType: 'update_project_status',
                result: { projectId, status, progress: newProgress },
              });
            }
            break;
          }

          default:
            throw new Error(`Unsupported action type: ${action.actionType}`);
        }
      }
    };

    try {
      await runActions();

      // Record successful execution
      await AutomationRepository.recordExecution({
        ruleId: rule.id,
        status: 'success',
        entityType,
        entityId,
        executionResult: {
          actionsCount: executedActions.length,
          executedActions,
        },
      });

      // Audit Log for the execution
      await AuditRepository.logAudit({
        workspaceId: rule.workspaceId,
        userId: context.actorId || rule.createdBy,
        action: 'automation_executed',
        resource: 'automation_rule',
        resourceId: rule.id,
        newValues: {
          ruleId: rule.id,
          ruleName: rule.name,
          status: 'success',
          triggerType: rule.triggerType,
          entityType,
          entityId,
          actionsCount: executedActions.length,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        status: 'success',
        actionsExecuted: executedActions.length,
      };
    } catch (err: any) {
      console.error(`[AutomationService] Rule execution failed for rule ${rule.id}:`, err);

      // Record failed execution
      await AutomationRepository.recordExecution({
        ruleId: rule.id,
        status: 'failed',
        entityType,
        entityId,
        executionResult: {
          error: err.message || 'Unknown automation execution error',
          executedActions,
        },
      });

      // Audit Log for failed execution
      await AuditRepository.logAudit({
        workspaceId: rule.workspaceId,
        userId: context.actorId || rule.createdBy,
        action: 'automation_executed',
        resource: 'automation_rule',
        resourceId: rule.id,
        newValues: {
          ruleId: rule.id,
          ruleName: rule.name,
          status: 'failed',
          error: err.message,
          triggerType: rule.triggerType,
          entityType,
          entityId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        status: 'failed',
        actionsExecuted: executedActions.length,
        error: err.message,
      };
    }
  }
}
