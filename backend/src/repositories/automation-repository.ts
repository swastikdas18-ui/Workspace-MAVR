import { eq, and, desc, inArray } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database';

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
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  actions: AutomationActionEntity[];
}

export interface AutomationExecutionEntity {
  id: string;
  ruleId: string;
  ruleName?: string;
  status: 'success' | 'failed';
  entityType: string;
  entityId: string;
  executionResult: Record<string, any> | null;
  executedAt: Date;
}

export interface CreateRuleParams {
  id?: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  entityType: string;
  triggerType: string;
  isActive?: boolean;
  createdBy: string;
  actions: Array<{
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
  static async getRules(workspaceId: string): Promise<AutomationRuleEntity[]> {
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

          return ruleRows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            name: r.name,
            description: r.description,
            entityType: r.entityType,
            triggerType: r.triggerType,
            isActive: r.isActive,
            createdBy: r.createdBy,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            actions: actionsByRuleId.get(r.id) || [],
          }));
        }
      } catch (err) {
        // Fallback to in-memory
      }
    }

    // In-memory fallback
    const rules = Array.from(inMemoryDb.automationRules.values()).filter(
      (r) => r.workspaceId === workspaceId
    );

    return rules.map((r) => ({
      ...r,
      actions: Array.from(inMemoryDb.automationActions.values()).filter((a) => a.ruleId === r.id),
    }));
  }

  /**
   * Alias for getRules
   */
  static async listRules(workspaceId: string): Promise<AutomationRuleEntity[]> {
    return this.getRules(workspaceId);
  }

  /**
   * Find a single rule by ID with actions
   */
  static async findRuleById(ruleId: string): Promise<AutomationRuleEntity | null> {
    const db = getDb();
    if (db) {
      try {
        const [ruleRow] = await db
          .select()
          .from(schema.automationRules)
          .where(eq(schema.automationRules.id, ruleId));

        if (ruleRow) {
          const actionRows = await db
            .select()
            .from(schema.automationActions)
            .where(eq(schema.automationActions.ruleId, ruleId));

          return {
            id: ruleRow.id,
            workspaceId: ruleRow.workspaceId,
            name: ruleRow.name,
            description: ruleRow.description,
            entityType: ruleRow.entityType,
            triggerType: ruleRow.triggerType,
            isActive: ruleRow.isActive,
            createdBy: ruleRow.createdBy,
            createdAt: ruleRow.createdAt,
            updatedAt: ruleRow.updatedAt,
            actions: actionRows.map((act) => ({
              id: act.id,
              ruleId: act.ruleId,
              actionType: act.actionType,
              actionConfig: (act.actionConfig as Record<string, any>) || {},
              createdAt: act.createdAt,
            })),
          };
        }
      } catch (err) {
        // Fallback to in-memory
      }
    }

    // In-memory fallback
    const rule = inMemoryDb.automationRules.get(ruleId);
    if (!rule) return null;

    return {
      ...rule,
      actions: Array.from(inMemoryDb.automationActions.values()).filter((a) => a.ruleId === ruleId),
    };
  }

  /**
   * Get active rules for an event trigger
   */
  static async getActiveRulesForTrigger(
    workspaceId: string,
    triggerType: string
  ): Promise<AutomationRuleEntity[]> {
    const db = getDb();
    if (db) {
      try {
        const ruleRows = await db
          .select()
          .from(schema.automationRules)
          .where(
            and(
              eq(schema.automationRules.workspaceId, workspaceId),
              eq(schema.automationRules.triggerType, triggerType),
              eq(schema.automationRules.isActive, true)
            )
          );

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

          return ruleRows.map((r) => ({
            id: r.id,
            workspaceId: r.workspaceId,
            name: r.name,
            description: r.description,
            entityType: r.entityType,
            triggerType: r.triggerType,
            isActive: r.isActive,
            createdBy: r.createdBy,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            actions: actionsByRuleId.get(r.id) || [],
          }));
        }
      } catch (err) {
        // Fallback to in-memory
      }
    }

    // In-memory fallback
    const rules = Array.from(inMemoryDb.automationRules.values()).filter(
      (r) => r.workspaceId === workspaceId && r.triggerType === triggerType && r.isActive === true
    );

    return rules.map((r) => ({
      ...r,
      actions: Array.from(inMemoryDb.automationActions.values()).filter((a) => a.ruleId === r.id),
    }));
  }

  /**
   * Create a new automation rule with actions
   */
  static async createRule(params: CreateRuleParams, tx?: any): Promise<AutomationRuleEntity> {
    const ruleId = params.id || `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const isActive = params.isActive !== undefined ? params.isActive : true;

    const executeWithExecutor = async (executor: any) => {
      const [insertedRule] = await executor
        .insert(schema.automationRules)
        .values({
          id: ruleId,
          workspaceId: params.workspaceId,
          name: params.name,
          description: params.description || null,
          entityType: params.entityType,
          triggerType: params.triggerType,
          isActive,
          createdBy: params.createdBy,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const createdActions: AutomationActionEntity[] = [];
      if (params.actions && params.actions.length > 0) {
        for (const act of params.actions) {
          const actionId = act.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const [insertedAct] = await executor
            .insert(schema.automationActions)
            .values({
              id: actionId,
              ruleId,
              actionType: act.actionType,
              actionConfig: act.actionConfig,
              createdAt: now,
            })
            .returning();

          createdActions.push({
            id: insertedAct.id,
            ruleId: insertedAct.ruleId,
            actionType: insertedAct.actionType,
            actionConfig: (insertedAct.actionConfig as Record<string, any>) || {},
            createdAt: insertedAct.createdAt,
          });
        }
      }

      return {
        id: insertedRule.id,
        workspaceId: insertedRule.workspaceId,
        name: insertedRule.name,
        description: insertedRule.description,
        entityType: insertedRule.entityType,
        triggerType: insertedRule.triggerType,
        isActive: insertedRule.isActive,
        createdBy: insertedRule.createdBy,
        createdAt: insertedRule.createdAt,
        updatedAt: insertedRule.updatedAt,
        actions: createdActions,
      };
    };

    const syncInMemory = (res: AutomationRuleEntity) => {
      inMemoryDb.automationRules.set(res.id, {
        id: res.id,
        workspaceId: res.workspaceId,
        name: res.name,
        description: res.description,
        entityType: res.entityType,
        triggerType: res.triggerType,
        isActive: res.isActive,
        createdBy: res.createdBy,
        createdAt: res.createdAt,
        updatedAt: res.updatedAt,
        actions: res.actions,
      });
      for (const act of res.actions) {
        inMemoryDb.automationActions.set(act.id, act);
      }
    };

    if (tx) {
      try {
        const result = await executeWithExecutor(tx);
        syncInMemory(result);
        return result;
      } catch {
        // Continue to db or in-memory
      }
    }

    const db = getDb();
    if (db) {
      try {
        const result = await executeWithExecutor(db);
        syncInMemory(result);
        return result;
      } catch (err) {
        // Fallback to in-memory
      }
    }

    // In-memory fallback
    const ruleEntity: AutomationRuleEntity = {
      id: ruleId,
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description || null,
      entityType: params.entityType,
      triggerType: params.triggerType,
      isActive,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      actions: [],
    };
    inMemoryDb.automationRules.set(ruleId, ruleEntity);

    const createdActions: AutomationActionEntity[] = [];
    for (const act of params.actions) {
      const actionId = act.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const actEntity: AutomationActionEntity = {
        id: actionId,
        ruleId,
        actionType: act.actionType,
        actionConfig: act.actionConfig,
        createdAt: now,
      };
      inMemoryDb.automationActions.set(actionId, actEntity);
      createdActions.push(actEntity);
    }

    ruleEntity.actions = createdActions;
    return ruleEntity;
  }

  /**
   * Update an existing automation rule
   */
  static async updateRule(
    ruleId: string,
    workspaceIdOrParams: string | UpdateRuleParams,
    paramsOrTx?: UpdateRuleParams | any,
    tx?: any
  ): Promise<AutomationRuleEntity | null> {
    let workspaceId: string | undefined;
    let params: UpdateRuleParams;
    let executorParam = tx;

    if (typeof workspaceIdOrParams === 'string') {
      workspaceId = workspaceIdOrParams;
      params = paramsOrTx || {};
    } else {
      params = workspaceIdOrParams || {};
      executorParam = paramsOrTx;
    }

    const now = new Date();

    const executeWithExecutor = async (executor: any) => {
      const updateData: any = { updatedAt: now };
      if (params.name !== undefined) updateData.name = params.name;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.entityType !== undefined) updateData.entityType = params.entityType;
      if (params.triggerType !== undefined) updateData.triggerType = params.triggerType;
      if (params.isActive !== undefined) updateData.isActive = params.isActive;

      const condition = workspaceId
        ? and(eq(schema.automationRules.id, ruleId), eq(schema.automationRules.workspaceId, workspaceId))
        : eq(schema.automationRules.id, ruleId);

      const [updatedRule] = await executor
        .update(schema.automationRules)
        .set(updateData)
        .where(condition)
        .returning();

      if (!updatedRule) return null;

      // If new actions are specified, replace existing actions
      if (params.actions) {
        await executor
          .delete(schema.automationActions)
          .where(eq(schema.automationActions.ruleId, ruleId));

        const createdActions: AutomationActionEntity[] = [];
        for (const act of params.actions) {
          const actionId = act.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const [insertedAct] = await executor
            .insert(schema.automationActions)
            .values({
              id: actionId,
              ruleId,
              actionType: act.actionType,
              actionConfig: act.actionConfig,
              createdAt: now,
            })
            .returning();

          createdActions.push({
            id: insertedAct.id,
            ruleId: insertedAct.ruleId,
            actionType: insertedAct.actionType,
            actionConfig: (insertedAct.actionConfig as Record<string, any>) || {},
            createdAt: insertedAct.createdAt,
          });
        }

        return {
          id: updatedRule.id,
          workspaceId: updatedRule.workspaceId,
          name: updatedRule.name,
          description: updatedRule.description,
          entityType: updatedRule.entityType,
          triggerType: updatedRule.triggerType,
          isActive: updatedRule.isActive,
          createdBy: updatedRule.createdBy,
          createdAt: updatedRule.createdAt,
          updatedAt: updatedRule.updatedAt,
          actions: createdActions,
        };
      }

      // Fetch existing actions
      const actionRows = await executor
        .select()
        .from(schema.automationActions)
        .where(eq(schema.automationActions.ruleId, ruleId));

      return {
        id: updatedRule.id,
        workspaceId: updatedRule.workspaceId,
        name: updatedRule.name,
        description: updatedRule.description,
        entityType: updatedRule.entityType,
        triggerType: updatedRule.triggerType,
        isActive: updatedRule.isActive,
        createdBy: updatedRule.createdBy,
        createdAt: updatedRule.createdAt,
        updatedAt: updatedRule.updatedAt,
        actions: actionRows.map((a: any) => ({
          id: a.id,
          ruleId: a.ruleId,
          actionType: a.actionType,
          actionConfig: (a.actionConfig as Record<string, any>) || {},
          createdAt: a.createdAt,
        })),
      };
    };

    if (executorParam) {
      try {
        const res = await executeWithExecutor(executorParam);
        if (res) return res;
      } catch {
        // Continue
      }
    }

    const db = getDb();
    if (db) {
      try {
        const res = await executeWithExecutor(db);
        if (res) return res;
      } catch (err) {
        // Fallback to in-memory
      }
    }

    // In-memory fallback
    const rule = inMemoryDb.automationRules.get(ruleId);
    if (!rule || (workspaceId && rule.workspaceId !== workspaceId)) return null;

    if (params.name !== undefined) rule.name = params.name;
    if (params.description !== undefined) rule.description = params.description;
    if (params.entityType !== undefined) rule.entityType = params.entityType;
    if (params.triggerType !== undefined) rule.triggerType = params.triggerType;
    if (params.isActive !== undefined) rule.isActive = params.isActive;
    rule.updatedAt = now;

    if (params.actions) {
      for (const [key, val] of inMemoryDb.automationActions.entries()) {
        if (val.ruleId === ruleId) {
          inMemoryDb.automationActions.delete(key);
        }
      }

      const createdActions: AutomationActionEntity[] = [];
      for (const act of params.actions) {
        const actionId = act.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const actEntity: AutomationActionEntity = {
          id: actionId,
          ruleId,
          actionType: act.actionType,
          actionConfig: act.actionConfig,
          createdAt: now,
        };
        inMemoryDb.automationActions.set(actionId, actEntity);
        createdActions.push(actEntity);
      }
      rule.actions = createdActions;
    }

    return {
      ...rule,
      actions: Array.from(inMemoryDb.automationActions.values()).filter((a) => a.ruleId === ruleId),
    };
  }

  /**
   * Delete an automation rule
   */
  static async deleteRule(ruleId: string, workspaceId?: string, tx?: any): Promise<boolean> {
    const executeWithExecutor = async (executor: any) => {
      const condition = workspaceId
        ? and(eq(schema.automationRules.id, ruleId), eq(schema.automationRules.workspaceId, workspaceId))
        : eq(schema.automationRules.id, ruleId);

      const [deleted] = await executor
        .delete(schema.automationRules)
        .where(condition)
        .returning();

      return !!deleted;
    };

    if (tx) {
      try {
        const deleted = await executeWithExecutor(tx);
        if (deleted) {
          inMemoryDb.automationRules.delete(ruleId);
          return true;
        }
      } catch {
        // Continue
      }
    }

    const db = getDb();
    if (db) {
      try {
        const deleted = await executeWithExecutor(db);
        if (deleted) {
          inMemoryDb.automationRules.delete(ruleId);
          return true;
        }
      } catch (err) {
        // Fallback
      }
    }

    // In-memory fallback
    const rule = inMemoryDb.automationRules.get(ruleId);
    if (!rule || (workspaceId && rule.workspaceId !== workspaceId)) return false;

    inMemoryDb.automationRules.delete(ruleId);
    for (const [key, val] of inMemoryDb.automationActions.entries()) {
      if (val.ruleId === ruleId) {
        inMemoryDb.automationActions.delete(key);
      }
    }
    return true;
  }

  /**
   * Record rule execution history
   */
  static async recordExecution(
    data: {
      id?: string;
      ruleId: string;
      status: 'success' | 'failed';
      entityType: string;
      entityId: string;
      executionResult?: Record<string, any>;
    },
    tx?: any
  ): Promise<AutomationExecutionEntity> {
    const execId = data.id || `exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();

    const executeWithExecutor = async (executor: any) => {
      const [row] = await executor
        .insert(schema.automationExecutions)
        .values({
          id: execId,
          ruleId: data.ruleId,
          status: data.status,
          entityType: data.entityType,
          entityId: data.entityId,
          executionResult: data.executionResult || null,
          executedAt: now,
        })
        .returning();

      return {
        id: row.id,
        ruleId: row.ruleId,
        status: row.status as 'success' | 'failed',
        entityType: row.entityType,
        entityId: row.entityId,
        executionResult: (row.executionResult as Record<string, any>) || null,
        executedAt: row.executedAt,
      };
    };

    if (tx) {
      try {
        const res = await executeWithExecutor(tx);
        inMemoryDb.automationExecutions.set(res.id, res);
        return res;
      } catch {
        // Continue
      }
    }

    const db = getDb();
    if (db) {
      try {
        const res = await executeWithExecutor(db);
        inMemoryDb.automationExecutions.set(res.id, res);
        return res;
      } catch (err) {
        // Fallback to in-memory
      }
    }

    // In-memory fallback
    const execEntity: AutomationExecutionEntity = {
      id: execId,
      ruleId: data.ruleId,
      status: data.status,
      entityType: data.entityType,
      entityId: data.entityId,
      executionResult: data.executionResult || null,
      executedAt: now,
    };
    inMemoryDb.automationExecutions.set(execId, execEntity);
    return execEntity;
  }

  /**
   * List executions for a workspace
   */
  static async listExecutions(
    workspaceId: string,
    options: { ruleId?: string; limit?: number; offset?: number } = {}
  ): Promise<AutomationExecutionEntity[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const db = getDb();
    if (db) {
      try {
        const query = db
          .select({
            id: schema.automationExecutions.id,
            ruleId: schema.automationExecutions.ruleId,
            ruleName: schema.automationRules.name,
            status: schema.automationExecutions.status,
            entityType: schema.automationExecutions.entityType,
            entityId: schema.automationExecutions.entityId,
            executionResult: schema.automationExecutions.executionResult,
            executedAt: schema.automationExecutions.executedAt,
          })
          .from(schema.automationExecutions)
          .innerJoin(
            schema.automationRules,
            eq(schema.automationExecutions.ruleId, schema.automationRules.id)
          )
          .where(
            options.ruleId
              ? and(
                  eq(schema.automationRules.workspaceId, workspaceId),
                  eq(schema.automationExecutions.ruleId, options.ruleId)
                )
              : eq(schema.automationRules.workspaceId, workspaceId)
          )
          .orderBy(desc(schema.automationExecutions.executedAt))
          .limit(limit)
          .offset(offset);

        const rows = await query;
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            ruleId: r.ruleId,
            ruleName: r.ruleName,
            status: r.status as 'success' | 'failed',
            entityType: r.entityType,
            entityId: r.entityId,
            executionResult: (r.executionResult as Record<string, any>) || null,
            executedAt: r.executedAt,
          }));
        }
      } catch (err) {
        // Fallback to in-memory
      }
    }

    // In-memory fallback
    const executions = Array.from(inMemoryDb.automationExecutions.values());
    const matched: AutomationExecutionEntity[] = [];

    for (const exec of executions) {
      const rule = inMemoryDb.automationRules.get(exec.ruleId);
      if (rule && rule.workspaceId === workspaceId) {
        if (!options.ruleId || exec.ruleId === options.ruleId) {
          matched.push({
            ...exec,
            ruleName: rule.name,
          });
        }
      }
    }

    matched.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    return matched.slice(offset, offset + limit);
  }

  /**
   * Get execution history alias
   */
  static async getExecutionHistory(
    workspaceId: string,
    limit: number = 50
  ): Promise<AutomationExecutionEntity[]> {
    return this.listExecutions(workspaceId, { limit });
  }
}
