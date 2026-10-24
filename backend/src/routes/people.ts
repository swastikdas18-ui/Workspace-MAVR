import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { PeopleService } from '../services/people-service.js';
import { getAuthorizationContext } from '../middleware/rbac.js';
import { inMemoryDb } from '../../packages/database/index.js';
import { normalizeRole } from '../lib/permissions.js';
import { validateBody } from '../middleware/validator.js';
import {
  updateProfileSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  addDepartmentMemberSchema,
  setDepartmentLeadSchema,
  moveDepartmentMemberSchema,
  reassignManagerSchema,
  transferDepartmentSchema,
  requestLeaveSchema,
  reviewLeaveSchema,
  attendanceCheckInSchema,
  attendanceCheckOutSchema,
  createGoalSchema,
  updateGoalProgressSchema,
  createReviewCycleSchema,
  submitSelfReviewSchema,
  submitManagerReviewSchema,
} from '../schemas/index.js';

export const peopleRouter = new Hono();
export const departmentRouter = new Hono();

// Enforce auth & session verification across all routes
peopleRouter.use('*', authMiddleware);
departmentRouter.use('*', authMiddleware);

/**
 * Phase 36 (HIGH-01): requireAdmin now resolves workspace membership role
 * via getAuthorizationContext instead of trusting user.role.
 */
const requireAdmin = async (c: any, next: any) => {
  const authCtx = await getAuthorizationContext(c);
  if (authCtx.roleInWorkspace !== 'admin') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Forbidden: Admin privilege required.' } }, 403);
  }
  c.set('authContext', authCtx);
  return next();
};

/**
 * Phase 36 (HIGH-01): requireLeadOrAdmin now resolves workspace membership role
 * via getAuthorizationContext instead of trusting user.role.
 */
const requireLeadOrAdmin = async (c: any, next: any) => {
  const authCtx = await getAuthorizationContext(c);
  if (authCtx.roleInWorkspace !== 'admin' && authCtx.roleInWorkspace !== 'lead') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Forbidden: Manager or Admin privilege required.' } }, 403);
  }
  c.set('authContext', authCtx);
  return next();
};

const requireStaff = async (c: any, next: any) => {
  const authCtx = await getAuthorizationContext(c);
  if (authCtx.roleInWorkspace === 'intern') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Forbidden: Interns do not have access to staff directory.' } }, 403);
  }
  c.set('authContext', authCtx);
  return next();
};

/**
 * GET /api/people/profiles - List employee directory with search and multi-facet filtering
 */
peopleRouter.get('/profiles', requireStaff, async (c) => {
  try {
    const workspace = c.get('workspace');
    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const search = c.req.query('search');
    const departmentId = c.req.query('departmentId');
    const managerId = c.req.query('managerId');
    const status = c.req.query('status');
    const employmentType = c.req.query('employmentType');

    const profiles = await PeopleService.listDirectory(workspace.id, {
      search,
      departmentId,
      managerId,
      status,
      employmentType,
    });

    return c.json({ profiles, total: profiles.length }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list directory.' } }, 500);
  }
});

/**
 * GET /api/people/profiles/:userId - Get specific employee profile
 */
peopleRouter.get('/profiles/:userId', requireStaff, async (c) => {
  try {
    const workspace = c.get('workspace');
    const userId = c.req.param('userId');

    const profile = await PeopleService.getProfile(workspace.id, userId);
    if (!profile) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } }, 404);
    }

    return c.json({ profile }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get profile.' } }, 500);
  }
});

/**
 * PUT /api/people/profiles/:userId - Update employee profile
 */
peopleRouter.put('/profiles/:userId', validateBody(updateProfileSchema), async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);
    const targetUserId = c.req.param('userId');
    const body = await c.req.json();

    const profile = await PeopleService.updateProfile(authCtx.workspaceId, targetUserId, authCtx.userId, authCtx.roleInWorkspace, body);
    return c.json({ profile, message: 'Profile updated successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to update profile.' } }, status);
  }
});

/**
 * GET /api/people/departments - List all departments
 */
peopleRouter.get('/departments', requireStaff, async (c) => {
  try {
    const workspace = c.get('workspace');
    const departments = await PeopleService.listDepartments(workspace.id);
    return c.json({ departments }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list departments.' } }, 500);
  }
});

/**
 * POST /api/people/departments - Create new department (Admin only)
 */
peopleRouter.post('/departments', requireAdmin, validateBody(createDepartmentSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json();

    const department = await PeopleService.createDepartment(workspace.id, user.id, body);
    return c.json({ department, message: 'Department created successfully.' }, 201);
  } catch (err: any) {
    console.error('[POST /api/people/departments] Error:', err);
    return c.json({ 
      error: { 
        code: 'BAD_REQUEST', 
        message: err.message || 'Failed to create department.',
        detail: err.detail || err.cause || String(err)
      } 
    }, 400);
  }
});

/**
 * PUT /api/people/departments/:id - Update department (Admin only)
 */
peopleRouter.put('/departments/:id', requireAdmin, validateBody(updateDepartmentSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    const department = await PeopleService.updateDepartment(workspace.id, user.id, id, body);
    if (!department) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Department not found.' } }, 404);
    }
    return c.json({ department, message: 'Department updated successfully.' }, 200);
  } catch (err: any) {
    console.error('[PUT /api/people/departments/:id] Error:', err);
    return c.json({ 
      error: { 
        code: 'BAD_REQUEST', 
        message: err.message || 'Failed to update department.',
        detail: err.detail || err.cause || String(err)
      } 
    }, 400);
  }
});

/**
 * DELETE /api/people/departments/:id - Delete department (Admin only)
 */
peopleRouter.delete('/departments/:id', requireAdmin, async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const id = c.req.param('id');

    await PeopleService.deleteDepartment(workspace.id, user.id, id);
    return c.json({ success: true, message: 'Department deleted successfully.' }, 200);
  } catch (err: any) {
    console.error('[DELETE /api/people/departments/:id] Error:', err);
    return c.json({ 
      error: { 
        code: 'BAD_REQUEST', 
        message: err.message || 'Failed to delete department.',
        detail: err.detail || err.cause || String(err)
      } 
    }, 400);
  }
});

// --- Department Handlers (accessible via both /api/people/departments and /departments) ---
const listDepartmentMembersHandler = async (c: any) => {
  try {
    const authCtx = await getAuthorizationContext(c);
    if (authCtx.roleInWorkspace === 'intern') {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Forbidden: Interns do not have access to department members.' } }, 403);
    }
    const workspace = c.get('workspace');
    const departmentId = c.req.param('id');

    const members = await PeopleService.getDepartmentMembers(workspace.id, departmentId);
    return c.json({ members, total: members.length }, 200);
  } catch (err: any) {
    const status = err.status || 500;
    return c.json({ error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list department members.' } }, status);
  }
};

const addDepartmentMemberHandler = async (c: any) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const departmentId = c.req.param('id');
    const body = await c.req.json();

    const targetUserId = body.userId || body.memberId || body.user_id || body.member_id;

    const profile = await PeopleService.addDepartmentMember(workspace.id, user.id, departmentId, targetUserId);
    return c.json({ profile, message: 'Member added to department successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to add member to department.' } }, status);
  }
};

const removeDepartmentMemberHandler = async (c: any) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const departmentId = c.req.param('id');
    const memberId = c.req.param('memberId');

    const profile = await PeopleService.removeDepartmentMember(workspace.id, user.id, departmentId, memberId);
    return c.json({ success: true, profile, message: 'Member removed from department successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to remove member from department.' } }, status);
  }
};

const setDepartmentLeadHandler = async (c: any) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const departmentId = c.req.param('id');
    const body = await c.req.json();

    const leadId = body.leadId !== undefined ? body.leadId : body.headId !== undefined ? body.headId : body.userId || null;
    const department = await PeopleService.setDepartmentLead(workspace.id, user.id, departmentId, leadId);
    return c.json({ department, message: 'Department lead updated successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to update department lead.' } }, status);
  }
};

const moveMemberHandler = async (c: any) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const departmentId = c.req.param('id');
    const paramMemberId = c.req.param('memberId');
    const body = await c.req.json();

    const targetUserId = paramMemberId || body.userId || body.memberId;
    const toDepartmentId = body.toDepartmentId || body.targetDepartmentId || body.departmentId;

    const profile = await PeopleService.moveDepartmentMember(workspace.id, user.id, departmentId, toDepartmentId, targetUserId);
    return c.json({ profile, message: 'Member moved to new department successfully.' }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to move department member.' } }, status);
  }
};

// Registered on peopleRouter (under /api/people/departments/... or /departments/...)
peopleRouter.get('/departments/:id/members', listDepartmentMembersHandler);
peopleRouter.post('/departments/:id/members', requireAdmin, validateBody(addDepartmentMemberSchema), addDepartmentMemberHandler);
peopleRouter.delete('/departments/:id/members/:memberId', requireAdmin, removeDepartmentMemberHandler);
peopleRouter.patch('/departments/:id/lead', requireAdmin, validateBody(setDepartmentLeadSchema), setDepartmentLeadHandler);
peopleRouter.patch('/departments/:id/members/:memberId/move', requireAdmin, validateBody(moveDepartmentMemberSchema), moveMemberHandler);
peopleRouter.post('/departments/:id/members/move', requireAdmin, validateBody(moveDepartmentMemberSchema), moveMemberHandler);

// Registered on departmentRouter (mounted directly at /departments and /api/departments)
departmentRouter.get('/:id/members', listDepartmentMembersHandler);
departmentRouter.post('/:id/members', requireAdmin, validateBody(addDepartmentMemberSchema), addDepartmentMemberHandler);
departmentRouter.delete('/:id/members/:memberId', requireAdmin, removeDepartmentMemberHandler);
departmentRouter.patch('/:id/lead', requireAdmin, validateBody(setDepartmentLeadSchema), setDepartmentLeadHandler);
departmentRouter.patch('/:id/members/:memberId/move', requireAdmin, validateBody(moveDepartmentMemberSchema), moveMemberHandler);
departmentRouter.post('/:id/members/move', requireAdmin, validateBody(moveDepartmentMemberSchema), moveMemberHandler);

/**
 * GET /api/people/org-chart - Get visual hierarchy org chart
 */
peopleRouter.get('/org-chart', requireStaff, async (c) => {
  try {
    const workspace = c.get('workspace');
    const orgChart = await PeopleService.getOrgChart(workspace.id);
    return c.json(orgChart, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get org chart.' } }, 500);
  }
});

/**
 * POST /api/people/org-chart/reassign - Reassign employee manager (Admin only)
 */
peopleRouter.post('/org-chart/reassign', requireAdmin, validateBody(reassignManagerSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json();

    const profile = await PeopleService.reassignManager(workspace.id, user.id, body.userId, body.managerId || null);
    return c.json({ profile, message: 'Manager reassigned successfully.' }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to reassign manager.' } }, 400);
  }
});

/**
 * POST /api/people/org-chart/transfer - Transfer employee department (Admin only)
 */
peopleRouter.post('/org-chart/transfer', requireAdmin, validateBody(transferDepartmentSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json();

    const profile = await PeopleService.transferDepartment(workspace.id, user.id, body.userId, body.departmentId || null);
    return c.json({ profile, message: 'Department transferred successfully.' }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to transfer department.' } }, 400);
  }
});

/**
 * GET /api/people/leaves - List leave requests
 */
peopleRouter.get('/leaves', async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);

    const requestedUserId = c.req.query('userId');
    const status = c.req.query('status');

    // Employees and interns only see their own requests by default
    const filterUserId = authCtx.roleInWorkspace === 'admin' || authCtx.roleInWorkspace === 'lead' ? requestedUserId : authCtx.userId;

    const leaves = await PeopleService.listLeaves(authCtx.workspaceId, { userId: filterUserId, status });
    return c.json({ leaves }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list leaves.' } }, 500);
  }
});

/**
 * POST /api/people/leaves - Request leave
 */
peopleRouter.post('/leaves', validateBody(requestLeaveSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json();

    const leave = await PeopleService.requestLeave(workspace.id, user.id, body);
    return c.json({ leave, message: 'Leave requested successfully.' }, 201);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to request leave.' } }, 400);
  }
});

/**
 * PATCH /api/people/leaves/:id/approve - Approve leave request
 */
peopleRouter.patch('/leaves/:id/approve', validateBody(reviewLeaveSchema), async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);
    const leaveId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));

    const leave = await PeopleService.reviewLeave(authCtx.workspaceId, leaveId, authCtx.userId, authCtx.roleInWorkspace, 'approved', body.reviewNotes);
    return c.json({ leave, message: 'Leave request approved.' }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to approve leave.' } }, status);
  }
});

/**
 * PATCH /api/people/leaves/:id/reject - Reject leave request
 */
peopleRouter.patch('/leaves/:id/reject', validateBody(reviewLeaveSchema), async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);
    const leaveId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));

    const leave = await PeopleService.reviewLeave(authCtx.workspaceId, leaveId, authCtx.userId, authCtx.roleInWorkspace, 'rejected', body.reviewNotes);
    return c.json({ leave, message: 'Leave request rejected.' }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to reject leave.' } }, status);
  }
});

/**
 * PATCH /api/people/leaves/:id/review - Review leave request (backwards compatibility)
 */
peopleRouter.patch('/leaves/:id/review', async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);
    const leaveId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const decision = (body.decision || body.status || 'approved').toLowerCase() as 'approved' | 'rejected';

    const leave = await PeopleService.reviewLeave(authCtx.workspaceId, leaveId, authCtx.userId, authCtx.roleInWorkspace, decision, body.reviewNotes);
    return c.json({ leave, message: `Leave request ${decision}.` }, 200);
  } catch (err: any) {
    const status = err.status || 400;
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to review leave.' } }, status);
  }
});

/**
 * GET /api/people/leaves/balances - Get leave balance quotas
 */
peopleRouter.get('/leaves/balances', async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const targetUserId = c.req.query('userId') || user.id;

    const balances = await PeopleService.getLeaveBalances(workspace.id, targetUserId);
    return c.json({ balances }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get leave balances.' } }, 500);
  }
});

/**
 * POST /api/people/attendance/check-in - Check in for the day
 */
peopleRouter.post('/attendance/check-in', validateBody(attendanceCheckInSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));

    const record = await PeopleService.checkIn(workspace.id, user.id, c.req.header('x-forwarded-for') || '127.0.0.1', body.notes);
    return c.json({ record, message: 'Checked in successfully.' }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to check in.' } }, 400);
  }
});

/**
 * POST /api/people/attendance/check-out - Check out for the day
 */
peopleRouter.post('/attendance/check-out', validateBody(attendanceCheckOutSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));

    const record = await PeopleService.checkOut(workspace.id, user.id, body.notes);
    return c.json({ record, message: 'Checked out successfully.' }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to check out.' } }, 400);
  }
});

/**
 * GET /api/people/attendance/today - Get current day attendance status
 */
peopleRouter.get('/attendance/today', async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');

    const record = await PeopleService.getTodayAttendance(workspace.id, user.id);
    return c.json({ record, isCheckedIn: !!record && !!record.checkInAt && !record.checkOutAt }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get today attendance.' } }, 500);
  }
});

/**
 * GET /api/people/attendance/history - Get attendance logs
 */
peopleRouter.get('/attendance/history', async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);

    const requestedUserId = c.req.query('userId');
    const filterUserId = authCtx.roleInWorkspace === 'admin' ? requestedUserId : authCtx.userId;

    const history = await PeopleService.listAttendance(authCtx.workspaceId, {
      userId: filterUserId,
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      limit: Number(c.req.query('limit')) || 100,
    });

    return c.json({ history }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list attendance.' } }, 500);
  }
});

/**
 * GET /api/people/attendance/metrics - Get today's attendance summary metrics
 */
peopleRouter.get('/attendance/metrics', requireAdmin, async (c) => {
  try {
    const workspace = c.get('workspace');
    const metrics = await PeopleService.getAttendanceMetrics(workspace.id);
    return c.json(metrics, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get attendance metrics.' } }, 500);
  }
});

/**
 * GET /api/people/goals - List Goals & OKRs
 */
peopleRouter.get('/goals', async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);

    const requestedUserId = c.req.query('userId');
    const departmentId = c.req.query('departmentId');
    const category = c.req.query('category');
    const status = c.req.query('status');

    const filterUserId = authCtx.roleInWorkspace === 'admin' || authCtx.roleInWorkspace === 'lead' ? requestedUserId : authCtx.userId;

    const goals = await PeopleService.listGoals(authCtx.workspaceId, {
      userId: filterUserId,
      departmentId,
      category,
      status,
    });

    return c.json({ goals }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list goals.' } }, 500);
  }
});

/**
 * POST /api/people/goals - Create new Goal (OKR)
 */
peopleRouter.post('/goals', validateBody(createGoalSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json();

    const goal = await PeopleService.createGoal(workspace.id, user.id, body);
    return c.json({ goal, message: 'Goal created successfully.' }, 201);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create goal.' } }, 400);
  }
});

/**
 * PATCH /api/people/goals/:id/progress - Check-in Goal progress update
 */
peopleRouter.patch('/goals/:id/progress', validateBody(updateGoalProgressSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const goalId = c.req.param('id');
    const role = normalizeRole(workspace.roleInWorkspace || user.role);

    // Caller must own the goal unless admin
    const existing = inMemoryDb.goals.get(goalId);
    if (existing && role !== 'admin' && existing.userId !== user.id) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Cannot update progress on another user goal.' } }, 403);
    }

    const body = await c.req.json();

    const progressValue = Number(body.progressValue) || 0;
    const progressPercent = Math.min(100, Math.max(0, Number(body.progressPercent) || 0));

    const goal = await PeopleService.updateGoalProgress(workspace.id, goalId, user.id, progressValue, progressPercent, body.notes);
    return c.json({ goal, message: 'Goal progress updated.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to update goal progress.' } }, status);
  }
});

/**
 * GET /api/people/performance/reviews - List performance review cycles
 */
peopleRouter.get('/performance/reviews', async (c) => {
  try {
    const authCtx = await getAuthorizationContext(c);

    const requestedUserId = c.req.query('userId');
    const filterUserId = authCtx.roleInWorkspace === 'admin' ? requestedUserId : authCtx.userId;

    const reviews = await PeopleService.listReviews(authCtx.workspaceId, {
      userId: filterUserId,
      reviewerId: c.req.query('reviewerId'),
      cycle: c.req.query('cycle'),
      status: c.req.query('status'),
    });

    return c.json({ reviews }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to list reviews.' } }, 500);
  }
});

/**
 * POST /api/people/performance/reviews - Create performance review cycle (Admin only)
 */
peopleRouter.post('/performance/reviews', requireAdmin, validateBody(createReviewCycleSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const body = await c.req.json();

    const review = await PeopleService.createReviewCycle(workspace.id, user.id, body);
    return c.json({ review, message: 'Performance review initiated.' }, 201);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to create review.' } }, 400);
  }
});

/**
 * POST /api/people/performance/reviews/:id/self - Submit self review
 */
peopleRouter.post('/performance/reviews/:id/self', validateBody(submitSelfReviewSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const reviewId = c.req.param('id');

    // Self review can only be submitted by the review subject
    const existing = inMemoryDb.performanceReviews.get(reviewId);
    if (existing && existing.userId !== user.id) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Cannot submit self-review for another user.' } }, 403);
    }

    const body = await c.req.json();

    const review = await PeopleService.submitSelfReview(workspace.id, reviewId, user.id, body.selfRatings || {}, body.comments);
    return c.json({ review, message: 'Self review submitted.' }, 200);
  } catch (err: any) {
    const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 400);
    return c.json({ error: { code: err.code || 'BAD_REQUEST', message: err.message || 'Failed to submit self review.' } }, status);
  }
});

/**
 * POST /api/people/performance/reviews/:id/manager - Submit manager review & final ratings
 */
peopleRouter.post('/performance/reviews/:id/manager', requireLeadOrAdmin, validateBody(submitManagerReviewSchema), async (c) => {
  try {
    const workspace = c.get('workspace');
    const user = c.get('user');
    const reviewId = c.req.param('id');
    const body = await c.req.json();

    const review = await PeopleService.submitManagerReview(
      workspace.id,
      reviewId,
      user.id,
      body.managerRatings || {},
      body.comments,
      body.strengths,
      body.growthAreas
    );
    return c.json({ review, message: 'Manager review completed.' }, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'BAD_REQUEST', message: err.message || 'Failed to submit manager review.' } }, 400);
  }
});

/**
 * GET /api/people/analytics - Executive People Telemetry
 */
peopleRouter.get('/analytics', requireAdmin, async (c) => {
  try {
    const workspace = c.get('workspace');
    const analytics = await PeopleService.getPeopleAnalytics(workspace.id);
    return c.json(analytics, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Failed to get people analytics.' } }, 500);
  }
});
