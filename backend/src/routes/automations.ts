import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { AutomationRepository } from '../repositories/automation-repository';
import { AutomationService } from '../services/automation-service';
import { AuditRepository } from '../repositories/audit-repository';
import { AnalyticsRepository } from '../repositories/analytics-repository';

export const automationRouter = new Hono();

// All automation endpoints require authentication and active workspace
automationRouter.use('*', authMiddleware);

/**
 * GET / - List all automation rules for active workspace
 * Allowed: ADMIN, EMPLOYEE. Forbidden: INTERN
 */
automationRouter.get('/', requireRole(['ADMIN', 'EMPLOYEE']), async (c) => {
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
});

/**
 * GET /rules - Alias for list rules
 */
automationRouter.get('/rules', requireRole(['ADMIN', 'EMPLOYEE']), async (c) => {
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
});

/**
 * GET /rules/:id - Get rule by ID
 */
automationRouter.get('/rules/:id', requireRole(['ADMIN', 'EMPLOYEE']), async (c) => {
  try {
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const rule = await AutomationRepository.findRuleById(id);
    if (!rule || rule.workspaceId !== workspace.id) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } },
        404
      );
    }

    return c.json({ rule }, 200);
  } catch (err: any) {
    console.error('[Automation Get Rule API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get automation rule.' } },
      500
    );
  }
});

/**
 * POST / - Create a new automation rule
 * Allowed: ADMIN only.
 */
automationRouter.post('/', requireRole(['ADMIN']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const body = await c.req.json();
    const { name, description, entityType, triggerType, isActive, actions } = body;

    if (!name || !entityType || !triggerType) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, entityType, and triggerType are required.',
          },
        },
        400
      );
    }

    const rule = await AutomationRepository.createRule({
      workspaceId: workspace.id,
      name,
      description: description || null,
      entityType,
      triggerType,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: user.id,
      actions: actions || [],
    });

    // Audit Log
    await AuditRepository.logAudit({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'CREATE_AUTOMATION_RULE',
      resource: 'automation_rule',
      resourceId: rule.id,
      newValues: {
        name: rule.name,
        entityType: rule.entityType,
        triggerType: rule.triggerType,
        actionsCount: rule.actions?.length || 0,
      },
    });

    return c.json({ rule }, 201);
  } catch (err: any) {
    console.error('[Automation Create Rule API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to create automation rule.' } },
      500
    );
  }
});

/**
 * POST /rules - Alias for create rule
 */
automationRouter.post('/rules', requireRole(['ADMIN']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const body = await c.req.json();
    const { name, description, entityType, triggerType, isActive, actions } = body;

    if (!name || !entityType || !triggerType) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, entityType, and triggerType are required.',
          },
        },
        400
      );
    }

    const rule = await AutomationRepository.createRule({
      workspaceId: workspace.id,
      name,
      description: description || null,
      entityType,
      triggerType,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: user.id,
      actions: actions || [],
    });

    // Audit Log
    await AuditRepository.logAudit({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'CREATE_AUTOMATION_RULE',
      resource: 'automation_rule',
      resourceId: rule.id,
      newValues: {
        name: rule.name,
        entityType: rule.entityType,
        triggerType: rule.triggerType,
        actionsCount: rule.actions?.length || 0,
      },
    });

    return c.json({ rule }, 201);
  } catch (err: any) {
    console.error('[Automation Create Rule API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to create automation rule.' } },
      500
    );
  }
});

/**
 * PUT /rules/:id - Update an automation rule
 * Allowed: ADMIN only.
 */
automationRouter.put('/rules/:id', requireRole(['ADMIN']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const existingRule = await AutomationRepository.findRuleById(id);
    if (!existingRule || existingRule.workspaceId !== workspace.id) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } },
        404
      );
    }

    const body = await c.req.json();
    const updatedRule = await AutomationRepository.updateRule(id, body);

    // Audit Log
    await AuditRepository.logAudit({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'UPDATE_AUTOMATION_RULE',
      resource: 'automation_rule',
      resourceId: id,
      oldValues: {
        name: existingRule.name,
        isActive: existingRule.isActive,
        triggerType: existingRule.triggerType,
      },
      newValues: {
        name: updatedRule?.name,
        isActive: updatedRule?.isActive,
        triggerType: updatedRule?.triggerType,
      },
    });

    return c.json({ rule: updatedRule }, 200);
  } catch (err: any) {
    console.error('[Automation Update Rule API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to update automation rule.' } },
      500
    );
  }
});

/**
 * PATCH /rules/:id/toggle - Toggle rule active/inactive
 * Allowed: ADMIN only.
 */
automationRouter.patch('/rules/:id/toggle', requireRole(['ADMIN']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const existingRule = await AutomationRepository.findRuleById(id);
    if (!existingRule || existingRule.workspaceId !== workspace.id) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } },
        404
      );
    }

    const updatedRule = await AutomationRepository.updateRule(id, {
      isActive: !existingRule.isActive,
    });

    // Audit Log
    await AuditRepository.logAudit({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'TOGGLE_AUTOMATION_RULE',
      resource: 'automation_rule',
      resourceId: id,
      oldValues: { isActive: existingRule.isActive },
      newValues: { isActive: updatedRule?.isActive },
    });

    return c.json({ rule: updatedRule }, 200);
  } catch (err: any) {
    console.error('[Automation Toggle Rule API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to toggle automation rule.' } },
      500
    );
  }
});

/**
 * DELETE /rules/:id - Delete an automation rule
 * Allowed: ADMIN only.
 */
automationRouter.delete('/rules/:id', requireRole(['ADMIN']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const existingRule = await AutomationRepository.findRuleById(id);
    if (!existingRule || existingRule.workspaceId !== workspace.id) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Automation rule not found.' } },
        404
      );
    }

    await AutomationRepository.deleteRule(id);

    // Audit Log
    await AuditRepository.logAudit({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'DELETE_AUTOMATION_RULE',
      resource: 'automation_rule',
      resourceId: id,
      oldValues: {
        name: existingRule.name,
        triggerType: existingRule.triggerType,
      },
    });

    return c.json({ success: true, message: 'Automation rule deleted successfully.' }, 200);
  } catch (err: any) {
    console.error('[Automation Delete Rule API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to delete automation rule.' } },
      500
    );
  }
});

/**
 * GET /executions - List execution history
 * Allowed: ADMIN, EMPLOYEE. Forbidden: INTERN
 */
automationRouter.get('/executions', requireRole(['ADMIN', 'EMPLOYEE']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const ruleId = c.req.query('ruleId');
    const limit = Number(c.req.query('limit')) || 50;
    const offset = Number(c.req.query('offset')) || 0;

    const executions = await AutomationRepository.listExecutions(workspace.id, {
      ruleId,
      limit,
      offset,
    });

    return c.json({ executions, total: executions.length }, 200);
  } catch (err: any) {
    console.error('[Automation List Executions API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list executions.' } },
      500
    );
  }
});

/**
 * GET /metrics - Get automation metrics
 * Allowed: ADMIN, EMPLOYEE
 */
automationRouter.get('/metrics', requireRole(['ADMIN', 'EMPLOYEE']), async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const metrics = await AnalyticsRepository.getAutomationMetrics(workspace.id);
    return c.json(metrics, 200);
  } catch (err: any) {
    console.error('[Automation Metrics API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get automation metrics.' } },
      500
    );
  }
});

/**
 * POST /trigger - Test execution / manual trigger
 * Allowed: ADMIN only
 */
automationRouter.post('/trigger', requireRole(['ADMIN']), async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'No active workspace associated with session.' } },
        404
      );
    }

    const body = await c.req.json();
    const { triggerType, entityType, entityId, eventData } = body;

    if (!triggerType || !entityType || !entityId) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'triggerType, entityType, and entityId are required.',
          },
        },
        400
      );
    }

    const results = await AutomationService.processEvent(
      workspace.id,
      triggerType,
      entityType,
      entityId,
      eventData || {},
      {
        actorId: user.id,
      }
    );

    return c.json({ success: true, executions: results }, 200);
  } catch (err: any) {
    console.error('[Automation Manual Trigger API Error]:', err);
    return c.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to trigger automation.' } },
      500
    );
  }
});
