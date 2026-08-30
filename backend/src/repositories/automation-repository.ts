import { eq, and, desc, inArray, count } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';

export interface AutomationCondition {
  field: string; // 'priority' | 'status' | 'team' | 'team_id' | 'assignee' | 'assigned_to' | 'project' | 'project_id' | 'department' | 'task_count' | 'deal_value' | 'due_date'
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_empty' | 'is_not_empty' | 'before' | 'after' | 'is_today' | 'is_overdue';
  value?: any;
}

export interface AutomationActionEntity {
  id: string;
  ruleId: string;
  actionType: string;
  actionConfig: Record<string, any>;
  createdAt: Date;
}

export interface AutomationRuleEntity {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  entityType: string;
  triggerType: string;
  triggerConfig?: Record<string, any>;
  conditionConfig?: AutomationCondition[] | Record<string, any>;
  actionType?: string;
  actionConfig?: Record<string, any>;
  enabled: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  actions: AutomationActionEntity[];
  executionCount?: number;
  lastExecutedAt?: Date | null;
}

export interface AutomationExecutionEntity {
  id: string;
  workspaceId: string;
  ruleId: string;
  ruleName?: string;
  triggeredBy?: string;
  status: 'success' | 'failed' | 'skipped' | 'partial';
  executionTime: number; // in ms
  errorMessage: string | null;
  entityType?: string;
  entityId?: string;
  executionResult: Record<string, any> | null;
  executedAt: Date;
  createdAt: Date;
}

export interface CreateRuleParams {
  id?: string;
  workspaceId?: string;
  name: string;
  description?: string | null;
  entityType?: string;
  triggerType: string;
  triggerConfig?: Record<string, any>;
  conditionConfig?: AutomationCondition[] | Record<string, any>;
  actionType?: string;
  actionConfig?: Record<string, any>;
  enabled?: boolean;
  isActive?: boolean;
  createdBy?: string;
  actions?: Array<{
    id?: string;
    actionType: string;
    actionConfig: Record<string, any>;
  }>;
}

export interface UpdateRuleParams {
  name?: string;
  description?: string | null;
  entityType?: string;
  triggerType?: string;
  triggerConfig?: Record<string, any>;
  conditionConfig?: AutomationCondition[] | Record<string, any>;
  actionType?: string;
  actionConfig?: Record<string, any>;
  enabled?: boolean;
  isActive?: boolean;
  actions?: Array<{
    id?: string;
    actionType: string;
    actionConfig: Record<string, any>;
  }>;
}

export class AutomationRepository {
  /**
   * List all rules for a workspace with their actions
   */
  static async listRules(workspaceId: string): Promise<AutomationRuleEntity[]> {
    const db = getDb();
    if (db) {
      try {
        const ruleRows = await db
          .select()
          .from(schema.automationRules)
          .where(eq(schema.automationRules.workspaceId, workspaceId))
          .orderBy(desc(schema.automationRules.createdAt));

        if (ruleRows.length > 0) {
          const ruleIds = ruleRows.map((r) => r.id);
          const actionRows = await db
            .select()
            .from(schema.automationActions)
            .where(inArray(schema.automationActions.ruleId, ruleIds));

          const actionsByRuleId = new Map<string, AutomationActionEntity[]>();
          for (const act of actionRows) {
            const list = actionsByRuleId.get(act.ruleId) || [];
            list.push({
              id: act.id,
              ruleId: act.ruleId,
              actionType: act.actionType,
              actionConfig: (act.actionConfig as Record<string, any>) || {},
              createdAt: act.createdAt,
            });
            actionsByRuleId.set(act.ruleId, list);
          }

          return ruleRows.map((r) => {
            const explicitActions = actionsByRuleId.get(r.id) || [];
            const primaryAction = r.actionType
              ? [
                  {
                    id: 'act-' + r.id,
                    ruleId: r.id,
                    actionType: r.actionType,
                    actionConfig: (r.actionConfig as Record<string, any>) || {},
                    createdAt: r.createdAt,
                  },
                ]
              : [];

            const finalActions = explicitActions.length > 0 ? explicitActions : primaryAction;

            return {
              id: r.id,
              workspaceId: r.workspaceId,
              name: r.name,
              description: r.description,
              entityType: r.entityType || 'system',
              triggerType: r.triggerType,
              triggerConfig: (r.triggerConfig as Record<string, any>) || {},
              conditionConfig: (r.conditionConfig as any) || [],
              actionType: r.actionType || finalActions[0]?.actionType || 'send_notification',
              actionConfig: (r.actionConfig as Record<string, any>) || finalActions[0]?.actionConfig || {},
              enabled: (r as any).enabled !== undefined ? (r as any).enabled : r.isActive,
              isActive: r.isActive,
              createdBy: r.createdBy,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
              actions: finalActions,
            };
          });
        }
      } catch {
        // Fallback to inMemoryDb
      }
    }

    const rules = Array.from(inMemoryDb.automationRules.values())
      .filter((r) => r.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return rules.map((r) => {
      const actions = Array.from(inMemoryDb.automationActions.values()).filter(
        (a) => a.ruleId === r.id
      );

      const primaryAction = r.actionType
        ? [
            {
              id: 'act-' + r.id,
              ruleId: r.id,
              actionType: r.actionType,
              actionConfig: r.actionConfig || {},
              createdAt: r.createdAt || new Date(),
            },
          ]
        : [];

      const finalActions = actions.length > 0 ? actions : primaryAction;

      return {
        id: r.id,
        workspaceId: r.workspaceId,
        name: r.name,
        description: r.description || null,
        entityType: r.entityType || 'system',
        triggerType: r.triggerType,
        triggerConfig: r.triggerConfig || {},
        conditionConfig: r.conditionConfig || [],
        actionType: r.actionType || finalActions[0]?.actionType || 'send_notification',
        actionConfig: r.actionConfig || finalActions[0]?.actionConfig || {},
        enabled: r.enabled !== undefined ? r.enabled : (r.isActive !== false),
        isActive: r.isActive !== false,
        createdBy: r.createdBy,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
        actions: finalActions,
      };
    });
  }

  /**
   * Alias for backward compatibility
   */
  static async getRules(workspaceId: string): Promise<AutomationRuleEntity[]> {
    return this.listRules(workspaceId);
  }

  /**
   * Get single rule by ID
   */
  static async getRuleById(
    workspaceId: string,
    ruleId: string
  ): Promise<AutomationRuleEntity | null> {
    const rules = await this.listRules(workspaceId);
    return rules.find((r) => r.id === ruleId) || null;
  }

  /**
   * Find single rule by ID across workspaces or by ruleId
   */
  static async findRuleById(
    ruleId: string,
    workspaceId?: string
  ): Promise<AutomationRuleEntity | null> {
    if (workspaceId) {
      return this.getRuleById(workspaceId, ruleId);
    }
    const memRule = inMemoryDb.automationRules.get(ruleId);
    if (memRule) {
      return this.getRuleById(memRule.workspaceId, ruleId);
    }
    return null;
  }

  /**
   * Create a new automation rule with triggers, conditions, and actions
   */
  static async createRule(
    param1: string | CreateRuleParams,
    param2?: string,
    param3?: CreateRuleParams
  ): Promise<AutomationRuleEntity> {
    let workspaceId: string;
    let userId: string;
    let data: CreateRuleParams;

    if (typeof param1 === 'object') {
      data = param1;
      workspaceId = data.workspaceId;
      userId = data.createdBy;
    } else {
      workspaceId = param1;
      userId = param2 || param3?.createdBy || 'system';
      data = param3 || { workspaceId, createdBy: userId, name: 'Untitled', triggerType: 'task_created' };
    }

    const ruleId = data.id || 'rule-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const isEnabled = data.enabled !== undefined ? data.enabled : (data.isActive !== false);

    const primaryActionType = data.actionType || data.actions?.[0]?.actionType || 'send_notification';
    const primaryActionConfig = data.actionConfig || data.actions?.[0]?.actionConfig || {};

    const ruleRecord = {
      id: ruleId,
      workspaceId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      entityType: data.entityType || 'system',
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      conditionConfig: data.conditionConfig || [],
      actionType: primaryActionType,
      actionConfig: primaryActionConfig,
      enabled: isEnabled,
      isActive: isEnabled,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.automationRules.set(ruleId, ruleRecord);

    const actionsList: AutomationActionEntity[] = [];

    if (data.actions && data.actions.length > 0) {
      for (const act of data.actions) {
        const actionId = act.id || 'act-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const actionRecord: AutomationActionEntity = {
          id: actionId,
          ruleId,
          actionType: act.actionType,
          actionConfig: act.actionConfig || {},
          createdAt: now,
        };
        inMemoryDb.automationActions.set(actionId, actionRecord);
        actionsList.push(actionRecord);
      }
    } else {
      const actionId = 'act-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      const actionRecord: AutomationActionEntity = {
        id: actionId,
        ruleId,
        actionType: primaryActionType,
        actionConfig: primaryActionConfig,
        createdAt: now,
      };
      inMemoryDb.automationActions.set(actionId, actionRecord);
      actionsList.push(actionRecord);
    }

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.automationRules).values({
          id: ruleId,
          workspaceId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          entityType: data.entityType || 'system',
          triggerType: data.triggerType,
          triggerConfig: data.triggerConfig || {},
          conditionConfig: data.conditionConfig || [],
          actionType: primaryActionType,
          actionConfig: primaryActionConfig,
          enabled: isEnabled,
          isActive: isEnabled,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        });

        for (const act of actionsList) {
          await db.insert(schema.automationActions).values({
            id: act.id,
            ruleId,
            actionType: act.actionType,
            actionConfig: act.actionConfig,
            createdAt: now,
          });
        }
      } catch {
        // In memory saved
      }
    }

    return {
      ...ruleRecord,
      actions: actionsList,
    };
  }

  /**
   * Update an existing automation rule
   */
  static async updateRule(
    workspaceId: string,
    ruleId: string,
    updates: UpdateRuleParams
  ): Promise<AutomationRuleEntity | null> {
    const existing = inMemoryDb.automationRules.get(ruleId);
    if (!existing || existing.workspaceId !== workspaceId) {
      const dbRule = await this.getRuleById(workspaceId, ruleId);
      if (!dbRule) return null;
    }

    const now = new Date();
    const isEnabled = updates.enabled !== undefined 
      ? updates.enabled 
      : (updates.isActive !== undefined ? updates.isActive : (existing?.enabled ?? existing?.isActive ?? true));

    const updatedRecord = {
      ...existing,
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : (existing?.name || ''),
      description: updates.description !== undefined ? updates.description : (existing?.description || null),
      triggerType: updates.triggerType || existing?.triggerType || 'task_created',
      triggerConfig: updates.triggerConfig !== undefined ? updates.triggerConfig : (existing?.triggerConfig || {}),
      conditionConfig: updates.conditionConfig !== undefined ? updates.conditionConfig : (existing?.conditionConfig || []),
      actionType: updates.actionType || existing?.actionType || 'send_notification',
      actionConfig: updates.actionConfig !== undefined ? updates.actionConfig : (existing?.actionConfig || {}),
      enabled: isEnabled,
      isActive: isEnabled,
      updatedAt: now,
    };

    inMemoryDb.automationRules.set(ruleId, updatedRecord);

    if (updates.actions) {
      Array.from(inMemoryDb.automationActions.entries()).forEach(([id, act]) => {
        if (act.ruleId === ruleId) inMemoryDb.automationActions.delete(id);
      });

      for (const act of updates.actions) {
        const actionId = act.id || 'act-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        inMemoryDb.automationActions.set(actionId, {
          id: actionId,
          ruleId,
          actionType: act.actionType,
          actionConfig: act.actionConfig || {},
          createdAt: now,
        });
      }
    }

    const db = getDb();
    if (db) {
      try {
        const setValues: any = {
          updatedAt: now,
        };
        if (updates.name !== undefined) setValues.name = updates.name.trim();
        if (updates.description !== undefined) setValues.description = updates.description;
        if (updates.triggerType !== undefined) setValues.triggerType = updates.triggerType;
        if (updates.triggerConfig !== undefined) setValues.triggerConfig = updates.triggerConfig;
        if (updates.conditionConfig !== undefined) setValues.conditionConfig = updates.conditionConfig;
        if (updates.actionType !== undefined) setValues.actionType = updates.actionType;
        if (updates.actionConfig !== undefined) setValues.actionConfig = updates.actionConfig;
        if (updates.enabled !== undefined || updates.isActive !== undefined) {
          setValues.enabled = isEnabled;
          setValues.isActive = isEnabled;
        }

        await db
          .update(schema.automationRules)
          .set(setValues)
          .where(
            and(
              eq(schema.automationRules.id, ruleId),
              eq(schema.automationRules.workspaceId, workspaceId)
            )
          );

        if (updates.actions) {
          await db
            .delete(schema.automationActions)
            .where(eq(schema.automationActions.ruleId, ruleId));

          for (const act of updates.actions) {
            const actionId = act.id || 'act-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
            await db.insert(schema.automationActions).values({
              id: actionId,
              ruleId,
              actionType: act.actionType,
              actionConfig: act.actionConfig || {},
              createdAt: now,
            });
          }
        }
      } catch {
        // Handled in memory
      }
    }

    return this.getRuleById(workspaceId, ruleId);
  }

  /**
   * Toggle enabled / active status of an automation rule
   */
  static async toggleRule(
    workspaceId: string,
    ruleId: string
  ): Promise<AutomationRuleEntity | null> {
    const existing = await this.getRuleById(workspaceId, ruleId);
    if (!existing) return null;

    const nextState = !existing.enabled;
    return this.updateRule(workspaceId, ruleId, {
      enabled: nextState,
      isActive: nextState,
    });
  }

  /**
   * Duplicate an existing automation rule
   */
  static async duplicateRule(
    workspaceId: string,
    ruleId: string,
    userId: string
  ): Promise<AutomationRuleEntity | null> {
    const existing = await this.getRuleById(workspaceId, ruleId);
    if (!existing) return null;

    return this.createRule(workspaceId, userId, {
      name: `${existing.name} (Copy)`,
      description: existing.description,
      entityType: existing.entityType,
      triggerType: existing.triggerType,
      triggerConfig: existing.triggerConfig,
      conditionConfig: existing.conditionConfig,
      actionType: existing.actionType,
      actionConfig: existing.actionConfig,
      enabled: true,
      isActive: true,
      createdBy: userId,
      actions: existing.actions.map((a) => ({
        actionType: a.actionType,
        actionConfig: a.actionConfig,
      })),
    });
  }

  /**
   * Delete an automation rule and its associated actions & executions
   */
  static async deleteRule(workspaceId: string, ruleId: string): Promise<boolean> {
    const existing = inMemoryDb.automationRules.get(ruleId);
    if (existing && existing.workspaceId === workspaceId) {
      inMemoryDb.automationRules.delete(ruleId);
      Array.from(inMemoryDb.automationActions.entries()).forEach(([id, a]) => {
        if (a.ruleId === ruleId) inMemoryDb.automationActions.delete(id);
      });
      Array.from(inMemoryDb.automationExecutions.entries()).forEach(([id, e]) => {
        if (e.ruleId === ruleId) inMemoryDb.automationExecutions.delete(id);
      });
    }

    const db = getDb();
    if (db) {
      try {
        await db
          .delete(schema.automationExecutions)
          .where(eq(schema.automationExecutions.ruleId, ruleId));
        await db
          .delete(schema.automationActions)
          .where(eq(schema.automationActions.ruleId, ruleId));
        await db
          .delete(schema.automationRules)
          .where(
            and(
              eq(schema.automationRules.id, ruleId),
              eq(schema.automationRules.workspaceId, workspaceId)
            )
          );
      } catch {
        // Handled in memory
      }
    }

    return true;
  }

  /**
   * Record an execution audit entry in the log
   */
  static async recordExecution(params: {
    workspaceId: string;
    ruleId: string;
    status: 'success' | 'failed' | 'skipped' | 'partial';
    triggeredBy?: string;
    executionTime?: number;
    errorMessage?: string | null;
    entityType?: string;
    entityId?: string;
    executionResult?: Record<string, any> | null;
  }): Promise<AutomationExecutionEntity> {
    const executionId = 'exec-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const now = new Date();

    const record: AutomationExecutionEntity = {
      id: executionId,
      workspaceId: params.workspaceId,
      ruleId: params.ruleId,
      triggeredBy: params.triggeredBy || 'system',
      status: params.status,
      executionTime: params.executionTime || 0,
      errorMessage: params.errorMessage || null,
      entityType: params.entityType || 'system',
      entityId: params.entityId || 'system',
      executionResult: params.executionResult || null,
      executedAt: now,
      createdAt: now,
    };

    inMemoryDb.automationExecutions.set(executionId, record);

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.automationExecutions).values({
          id: executionId,
          workspaceId: params.workspaceId,
          ruleId: params.ruleId,
          triggeredBy: params.triggeredBy || 'system',
          status: params.status,
          executionTime: params.executionTime || 0,
          errorMessage: params.errorMessage || null,
          entityType: params.entityType || 'system',
          entityId: params.entityId || 'system',
          executionResult: params.executionResult || null,
          executedAt: now,
          createdAt: now,
        });
      } catch {
        // Handled
      }
    }

    return record;
  }

  /**
   * List execution logs for a workspace
   */
  static async listExecutions(
    workspaceId: string,
    options?: {
      ruleId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<AutomationExecutionEntity[]> {
    const { ruleId, status, limit = 50, offset = 0 } = options || {};

    const db = getDb();
    if (db) {
      try {
        let query = db
          .select({
            id: schema.automationExecutions.id,
            workspaceId: schema.automationExecutions.workspaceId,
            ruleId: schema.automationExecutions.ruleId,
            ruleName: schema.automationRules.name,
            triggeredBy: schema.automationExecutions.triggeredBy,
            status: schema.automationExecutions.status,
            executionTime: schema.automationExecutions.executionTime,
            errorMessage: schema.automationExecutions.errorMessage,
            entityType: schema.automationExecutions.entityType,
            entityId: schema.automationExecutions.entityId,
            executionResult: schema.automationExecutions.executionResult,
            executedAt: schema.automationExecutions.executedAt,
            createdAt: schema.automationExecutions.createdAt,
          })
          .from(schema.automationExecutions)
          .leftJoin(
            schema.automationRules,
            eq(schema.automationExecutions.ruleId, schema.automationRules.id)
          )
          .where(
            and(
              eq(schema.automationRules.workspaceId, workspaceId),
              ruleId ? eq(schema.automationExecutions.ruleId, ruleId) : undefined
            )
          )
          .orderBy(desc(schema.automationExecutions.executedAt))
          .limit(limit)
          .offset(offset);

        const rows = await query;
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId || workspaceId,
            ruleId: r.ruleId,
            ruleName: r.ruleName || 'Automation Rule',
            triggeredBy: r.triggeredBy || 'system',
            status: (r.status as any) || 'success',
            executionTime: r.executionTime || 0,
            errorMessage: r.errorMessage || null,
            entityType: r.entityType || undefined,
            entityId: r.entityId || undefined,
            executionResult: (r.executionResult as any) || null,
            executedAt: r.executedAt,
            createdAt: r.createdAt,
          }));
        }
      } catch {
        // Fallback to inMemoryDb
      }
    }

    const rules = await this.listRules(workspaceId);
    const ruleIdSet = new Set(rules.map((r) => r.id));
    const ruleNameMap = new Map(rules.map((r) => [r.id, r.name]));

    let list = Array.from(inMemoryDb.automationExecutions.values()).filter(
      (e) => ruleIdSet.has(e.ruleId) || e.workspaceId === workspaceId
    );

    if (ruleId) {
      list = list.filter((e) => e.ruleId === ruleId);
    }
    if (status) {
      list = list.filter((e) => e.status === status);
    }

    list.sort(
      (a, b) =>
        new Date(b.executedAt || b.createdAt).getTime() -
        new Date(a.executedAt || a.createdAt).getTime()
    );

    return list.slice(offset, offset + limit).map((e) => ({
      id: e.id,
      workspaceId: e.workspaceId || workspaceId,
      ruleId: e.ruleId,
      ruleName: ruleNameMap.get(e.ruleId) || 'Automation Rule',
      triggeredBy: e.triggeredBy || 'system',
      status: e.status || 'success',
      executionTime: e.executionTime || 0,
      errorMessage: e.errorMessage || null,
      entityType: e.entityType || 'system',
      entityId: e.entityId || 'system',
      executionResult: e.executionResult || null,
      executedAt: e.executedAt ? new Date(e.executedAt) : new Date(),
      createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
    }));
  }

  /**
   * Get executive analytics for automations
   */
  static async getAnalytics(workspaceId: string): Promise<{
    totalExecutions: number;
    successCount: number;
    successRate: number;
    failedCount: number;
    topRules: Array<{ id: string; name: string; executions: number; successRate: number }>;
  }> {
    const rules = await this.listRules(workspaceId);
    const executions = await this.listExecutions(workspaceId, { limit: 500 });

    const totalExecutions = executions.length;
    const successCount = executions.filter((e) => e.status === 'success').length;
    const failedCount = executions.filter((e) => e.status === 'failed').length;
    const successRate = totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 100;

    const ruleExecutionStats = new Map<string, { total: number; success: number }>();
    for (const exec of executions) {
      const stats = ruleExecutionStats.get(exec.ruleId) || { total: 0, success: 0 };
      stats.total++;
      if (exec.status === 'success') stats.success++;
      ruleExecutionStats.set(exec.ruleId, stats);
    }

    const topRules = rules
      .map((r) => {
        const stats = ruleExecutionStats.get(r.id) || { total: 0, success: 0 };
        return {
          id: r.id,
          name: r.name,
          executions: stats.total,
          successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100,
        };
      })
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 5);

    return {
      totalExecutions,
      successCount,
      successRate,
      failedCount,
      topRules,
    };
  }
}
