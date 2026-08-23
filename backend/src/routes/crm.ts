import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { CrmService } from '../services/crm-service';
import { normalizeRole } from '../lib/permissions';

export const crmRouter = new Hono();

crmRouter.use('*', authMiddleware);

/**
 * GET /api/crm and /api/crm/leads - List CRM records
 */
const getLeadsHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const leads = await CrmService.getCrmRecords(workspace.id, user.id, role);
    return c.json({ leads }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json(
      { error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to fetch CRM leads.' } },
      status
    );
  }
};

crmRouter.get('/', requirePermission('crm:read'), getLeadsHandler);
crmRouter.get('/leads', requirePermission('crm:read'), getLeadsHandler);

const getSingleLeadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const leadId = c.req.param('id');
    const lead = await CrmService.getCrmRecordById(workspace.id, user.id, role, leadId);
    return c.json({ lead }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'CRM_RECORD_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to fetch CRM lead.' } },
      status
    );
  }
};

crmRouter.get('/:id', requirePermission('crm:read'), getSingleLeadHandler);
crmRouter.get('/leads/:id', requirePermission('crm:read'), getSingleLeadHandler);

/**
 * POST /api/crm and /api/crm/leads - Create new CRM lead
 */
const createLeadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const body = await c.req.json();

    if (!body.customer_name && !body.customerName) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Customer name is required.' } }, 400);
    }

    const lead = await CrmService.createCrmRecord(workspace.id, user.id, role, {
      customerName: body.customer_name || body.customerName,
      company: body.company || '',
      email: body.email || '',
      phone: body.phone || '',
      dealValue: body.deal_value || body.dealValue || 0,
      status: body.status || 'new_lead',
      ownerId: body.owner_id || body.ownerId,
      notes: body.notes || '',
    });

    return c.json({ lead }, 201);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to create CRM lead.' } },
      status
    );
  }
};

crmRouter.post('/', requirePermission('crm:create'), createLeadHandler);
crmRouter.post('/leads', requirePermission('crm:create'), createLeadHandler);

/**
 * PATCH /api/crm/:id and /api/crm/leads/:id - Update CRM lead
 */
const updateLeadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const leadId = c.req.param('id');
    const body = await c.req.json();

    const updates: any = {};
    if (body.customer_name !== undefined) updates.customerName = body.customer_name;
    if (body.customerName !== undefined) updates.customerName = body.customerName;
    if (body.company !== undefined) updates.company = body.company;
    if (body.email !== undefined) updates.email = body.email;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.deal_value !== undefined) updates.dealValue = body.deal_value;
    if (body.dealValue !== undefined) updates.dealValue = body.dealValue;
    if (body.status !== undefined) updates.status = body.status;
    if (body.owner_id !== undefined) updates.ownerId = body.owner_id;
    if (body.ownerId !== undefined) updates.ownerId = body.ownerId;
    if (body.notes !== undefined) updates.notes = body.notes;

    const lead = await CrmService.updateCrmRecord(workspace.id, user.id, role, leadId, updates);
    return c.json({ lead }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'WORKSPACE_BOUNDARY_VIOLATION' || err.code === 'FORBIDDEN' ? 403 : err.code === 'CRM_RECORD_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to update CRM lead.' } },
      status
    );
  }
};

crmRouter.patch('/:id', updateLeadHandler);
crmRouter.patch('/leads/:id', updateLeadHandler);
crmRouter.put('/:id', updateLeadHandler);
crmRouter.put('/leads/:id', updateLeadHandler);

/**
 * DELETE /api/crm/:id and /api/crm/leads/:id - Delete CRM lead (Admin only)
 */
const deleteLeadHandler = async (c: any) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const role = normalizeRole(workspace.roleInWorkspace || user.role);
    const leadId = c.req.param('id');

    await CrmService.deleteCrmRecord(workspace.id, user.id, role, leadId);
    return c.json({ success: true, message: 'CRM lead deleted successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : err.code === 'CRM_RECORD_NOT_FOUND' ? 404 : 400);
    return c.json(
      { error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to delete CRM lead.' } },
      status
    );
  }
};

crmRouter.delete('/:id', requirePermission('crm:delete'), deleteLeadHandler);
crmRouter.delete('/leads/:id', requirePermission('crm:delete'), deleteLeadHandler);
