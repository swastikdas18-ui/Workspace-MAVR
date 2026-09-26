import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';
import { validateBody } from '../middleware/validator';
import { createAutomationRuleSchema, updateAutomationRuleSchema } from '../schemas';
import { AutomationRepository } from '../repositories/automation-repository';
import { AutomationService } from '../services/automation-service';
import { AuditRepository } from '../repositories/audit-repository';

export const automationRouter = new Hono();

// All automation endpoints require authentication and active workspace
automationRouter.use('*', authMiddleware);

/**
 * GET /api/automations & /api/automations/rules - List all automation rules for active workspace
 * Allowed: ADMIN & EMPLOYEE
 */
const listRulesHandler = async (c: any) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const rules = await AutomationRepository.listRules(workspace.id);
    return c.json({ rules, total: rules.length }, 200);
  } catch (err: any) {
    console.error('[Automation List Rules API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list automation rules.' } },
      500
    );
  }
};

automationRouter.get('/', requireWorkspaceRole(['admin']), listRulesHandler);
automationRouter.get('/rules', requireWorkspaceRole(['admin']), listRulesHandler);

/**
 * GET /api/automations/templates - List pre-built automation templates
 * Allowed: ADMIN only
 */
automationRouter.get('/templates', requireWorkspaceRole(['admin']), async (c) => {
  return c.json({ templates: AutomationService.TEMPLATES }, 200);
});

/**
 * POST /api/automations/templates/:templateId/install - Install a pre-built template
 * Allowed: ADMIN only
 */
automationRouter.post('/templates/:templateId/install', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const templateId = c.req.param('templateId');
    const rule = await AutomationService.installTemplate(workspace.id, user.id, templateId);

    return c.json({ rule, message: 'Automation template installed successfully.' }, 201);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to install template.' } },
      status
    );
  }
});

/**
 * GET /api/automations/rules/:id - Get single rule
 * Allowed: ADMIN only
 */
automationRouter.get('/rules/:id', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const ruleId = c.req.param('id');
    const rule = await AutomationRepository.getRuleById(workspace.id, ruleId);

    if (!rule) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } }, 404);
    }

    return c.json({ rule }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get rule.' } },
      500
    );
  }
});

/**
 * POST /api/automations/rules - Create new automation rule
 * Allowed: ADMIN only
 */
automationRouter.post('/rules', requireWorkspaceRole(['admin']), validateBody(createAutomationRuleSchema), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json();

    const triggerType = body.triggerType || body.trigger_type;
    const triggerConfig = body.triggerConfig || body.trigger_config || {};
    const conditionConfig = body.conditionConfig || body.condition_config || body.conditions || [];
    const actionType = body.actionType || body.action_type || body.actions?.[0]?.actionType;
    const actionConfig = body.actionConfig || body.action_config || body.actions?.[0]?.actionConfig || {};

    const rule = await AutomationRepository.createRule(workspace.id, user.id, {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      entityType: body.entityType || body.entity_type || 'system',
      triggerType,
      triggerConfig,
      conditionConfig,
      actionType,
      actionConfig,
      enabled: body.enabled !== undefined ? body.enabled : (body.isActive !== false),
      isActive: body.isActive !== undefined ? body.isActive : (body.enabled !== false),
      createdBy: user.id,
      actions: body.actions,
    });

    await AuditRepository.log({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'automation_rule_created',
      resource: 'automation_rule',
      resourceId: rule.id,
      details: { name: rule.name, triggerType },
    });

    return c.json({ rule, message: 'Automation rule created successfully.' }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create automation rule.' } },
      400
    );
  }
});

/**
 * PUT & PATCH /api/automations/rules/:id - Update automation rule
 * Allowed: ADMIN only
 */
const updateRuleHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const ruleId = c.req.param('id');
    const body = await c.req.json();

    const triggerType = body.triggerType || body.trigger_type;
    const triggerConfig = body.triggerConfig || body.trigger_config;
    const conditionConfig = body.conditionConfig || body.condition_config || body.conditions;
    const actionType = body.actionType || body.action_type;
    const actionConfig = body.actionConfig || body.action_config;

    const rule = await AutomationRepository.updateRule(workspace.id, ruleId, {
      name: body.name !== undefined ? body.name.trim() : undefined,
      description: body.description !== undefined ? body.description : undefined,
      entityType: body.entityType || body.entity_type,
      triggerType,
      triggerConfig,
      conditionConfig,
      actionType,
      actionConfig,
      enabled: body.enabled !== undefined ? body.enabled : body.isActive,
      isActive: body.isActive !== undefined ? body.isActive : body.enabled,
      actions: body.actions,
    });

    if (!rule) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } }, 404);
    }

    await AuditRepository.log({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'automation_rule_updated',
      resource: 'automation_rule',
      resourceId: rule.id,
      details: { name: rule.name },
    });

    return c.json({ rule, message: 'Automation rule updated successfully.' }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to update rule.' } },
      400
    );
  }
};

automationRouter.put('/rules/:id', requireWorkspaceRole(['admin']), validateBody(updateAutomationRuleSchema), updateRuleHandler);
automationRouter.patch('/rules/:id', requireWorkspaceRole(['admin']), validateBody(updateAutomationRuleSchema), updateRuleHandler);

/**
 * PATCH /api/automations/rules/:id/toggle - Toggle rule enabled/active state
 * Allowed: ADMIN only
 */
automationRouter.patch('/rules/:id/toggle', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const ruleId = c.req.param('id');
    const rule = await AutomationRepository.toggleRule(workspace.id, ruleId);

    if (!rule) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } }, 404);
    }

    return c.json({ rule, message: `Rule ${rule.enabled ? 'activated' : 'deactivated'}.` }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to toggle rule.' } },
      400
    );
  }
});

/**
 * POST /api/automations/rules/:id/duplicate - Duplicate an existing rule
 * Allowed: ADMIN only
 */
automationRouter.post('/rules/:id/duplicate', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const ruleId = c.req.param('id');
    const rule = await AutomationRepository.duplicateRule(workspace.id, ruleId, user.id);

    if (!rule) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } }, 404);
    }

    return c.json({ rule, message: 'Automation rule duplicated successfully.' }, 201);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to duplicate rule.' } },
      400
    );
  }
});

/**
 * DELETE /api/automations/rules/:id - Delete an automation rule
 * Allowed: ADMIN only
 */
automationRouter.delete('/rules/:id', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const ruleId = c.req.param('id');
    await AutomationRepository.deleteRule(workspace.id, ruleId);

    await AuditRepository.log({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'automation_rule_deleted',
      resource: 'automation_rule',
      resourceId: ruleId,
      details: {},
    });

    return c.json({ success: true, message: 'Automation rule deleted successfully.' }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Failed to delete rule.' } },
      400
    );
  }
});

/**
 * GET /api/automations/executions - List audit execution logs
 * Allowed: ADMIN only
 */
automationRouter.get('/executions', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const ruleId = c.req.query('ruleId');
    const status = c.req.query('status');
    const limit = Number(c.req.query('limit')) || 50;
    const offset = Number(c.req.query('offset')) || 0;

    const executions = await AutomationRepository.listExecutions(workspace.id, {
      ruleId,
      status,
      limit,
      offset,
    });

    return c.json({ executions, total: executions.length }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list executions.' } },
      500
    );
  }
});

/**
 * GET /api/automations/analytics & /api/automations/metrics - Get executive analytics
 * Allowed: ADMIN only
 */
const analyticsHandler = async (c: any) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const analytics = await AutomationRepository.getAnalytics(workspace.id);
    const rules = await AutomationRepository.listRules(workspace.id);

    return c.json(
      {
        totalRules: rules.length,
        automationRules: rules.length,
        activeRules: rules.filter((r) => r.enabled).length,
        totalExecutions: analytics.totalExecutions,
        automationExecutions: analytics.successCount + analytics.failedCount,
        successfulExecutions: analytics.successCount,
        successCount: analytics.successCount,
        failedExecutions: analytics.failedCount,
        failedCount: analytics.failedCount,
        successRate: analytics.successRate,
        topRules: analytics.topRules,
      },
      200
    );
  } catch (err: any) {
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get analytics.' } },
      500
    );
  }
};

automationRouter.get('/analytics', requireWorkspaceRole(['admin']), analyticsHandler);
automationRouter.get('/metrics', requireWorkspaceRole(['admin']), analyticsHandler);

/**
 * POST /api/automations/trigger - Test or manually execute an automation trigger
 * Allowed: ADMIN only
 */
automationRouter.post('/trigger', requireWorkspaceRole(['admin']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const body = await c.req.json();
    const triggerType = body.triggerType || body.trigger_type || body.event;

    if (!triggerType) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Trigger type is required.' } }, 400);
    }

    const results = await AutomationService.processTrigger({
      workspaceId: workspace.id,
      triggerType,
      actorId: user.id,
      entityType: body.entityType || body.entity_type,
      entityId: body.entityId || body.entity_id,
      entity: body.entity || body.payload || {},
      metadata: body.metadata || {},
    });

    return c.json({ success: true, executions: results }, 200);
  } catch (err: any) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: err.message || 'Trigger execution failed.' } },
      400
    );
  }
});
