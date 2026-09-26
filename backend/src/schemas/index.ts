import { z } from 'zod';

// ============================================================================
// 1. PROJECTS SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(['planning', 'in_progress', 'review', 'completed', 'cancelled', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
  departmentId: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  team_id: z.string().optional().nullable(),
  memberIds: z.array(z.string().nullable().optional()).optional(),
  member_ids: z.array(z.string().nullable().optional()).optional(),
  tags: z.array(z.string()).optional(),
  budget: z.union([z.number(), z.string()]).optional().nullable(),
}).refine((data) => {
  const title = (data.title || data.name || '').trim();
  return title.length > 0;
}, {
  message: 'Project title is required.',
  path: ['title'],
});

export const updateProjectSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['planning', 'in_progress', 'review', 'completed', 'cancelled', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
  progress: z.number().min(0).max(100).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  team_id: z.string().optional().nullable(),
  memberIds: z.array(z.string().nullable().optional()).optional(),
  member_ids: z.array(z.string().nullable().optional()).optional(),
  tags: z.array(z.string()).optional(),
  budget: z.union([z.number(), z.string()]).optional().nullable(),
}).refine((data) => {
  if (data.title !== undefined) {
    return data.title.trim().length > 0;
  }
  if (data.name !== undefined) {
    return data.name.trim().length > 0;
  }
  return true;
}, {
  message: 'Project title is required.',
  path: ['title'],
});

export const projectProgressSchema = z.object({
  progress: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]),
  note: z.string().optional(),
  comment: z.string().optional(),
});

export const projectRequestChangesSchema = z.object({
  feedback: z.string().optional(),
  reviewFeedback: z.string().optional(),
  note: z.string().optional(),
});

// ============================================================================
// 2. TASKS SCHEMAS
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required.').refine((s) => s.trim().length > 0, {
    message: 'Task title is required.',
  }),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done', 'completed', 'cancelled']).optional(),
  projectId: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  team_id: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  storyPoints: z.union([z.number(), z.string()]).optional().nullable(),
  story_points: z.union([z.number(), z.string()]).optional().nullable(),
  estimatedHours: z.union([z.number(), z.string()]).optional().nullable(),
  estimated_hours: z.union([z.number(), z.string()]).optional().nullable(),
  tags: z.array(z.string()).optional(),
  blockedReason: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().optional().refine((s) => s === undefined || s.trim().length > 0, {
    message: 'Task title cannot be empty.',
  }),
  description: z.string().optional().nullable(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
  assignedTo: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  team_id: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  storyPoints: z.union([z.number(), z.string()]).optional().nullable(),
  story_points: z.union([z.number(), z.string()]).optional().nullable(),
  estimatedHours: z.union([z.number(), z.string()]).optional().nullable(),
  estimated_hours: z.union([z.number(), z.string()]).optional().nullable(),
  tags: z.array(z.string()).optional(),
  isBlocked: z.boolean().optional(),
  blockedReason: z.string().optional().nullable(),
});

export const submitTaskReviewSchema = z.object({
  notes: z.string().optional(),
});

export const approveTaskSchema = z.object({
  feedback: z.string().optional(),
});

export const requestTaskChangesSchema = z.object({
  feedback: z.string().min(1, 'Feedback is required when requesting changes.'),
});

export const blockTaskSchema = z.object({
  reason: z.string().min(1, 'Blocked reason is required.'),
});

export const taskCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty.'),
});

// ============================================================================
// 3. TEAMS SCHEMAS
// ============================================================================

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  description: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional(),
  member_ids: z.array(z.string()).optional(),
});

export const addTeamMembersSchema = z.object({
  userId: z.string().optional(),
  user_id: z.string().optional(),
  memberId: z.string().optional(),
  member_id: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  memberIds: z.array(z.string()).optional(),
  member_ids: z.array(z.string()).optional(),
  role: z.string().optional(),
}).refine((data) => {
  const hasSingle = Boolean(data.userId || data.user_id || data.memberId || data.member_id);
  const hasMultiple = Boolean(
    (data.userIds && data.userIds.length > 0) ||
    (data.memberIds && data.memberIds.length > 0) ||
    (data.member_ids && data.member_ids.length > 0)
  );
  return hasSingle || hasMultiple;
}, {
  message: 'User ID is required.',
  path: ['userId'],
});

export const moveTeamMemberSchema = z.object({
  userId: z.string().optional(),
  user_id: z.string().optional(),
  toTeamId: z.string().optional(),
  targetTeamId: z.string().optional(),
}).refine((data) => {
  const userId = data.userId || data.user_id;
  const toTeamId = data.toTeamId || data.targetTeamId;
  return Boolean(userId && toTeamId);
}, {
  message: 'userId and toTeamId required.',
  path: ['userId'],
});

export const changeTeamLeadSchema = z.object({
  leadId: z.string().optional(),
  lead_id: z.string().optional(),
}).refine((data) => {
  return Boolean(data.leadId || data.lead_id);
}, {
  message: 'leadId required.',
  path: ['leadId'],
});

// ============================================================================
// 4. CRM SCHEMAS
// ============================================================================

export const createCrmLeadSchema = z.object({
  customerName: z.string().optional(),
  customer_name: z.string().optional(),
  name: z.string().optional(),
  company: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  dealValue: z.number().optional().nullable(),
  deal_value: z.number().optional().nullable(),
  status: z.string().optional(),
  ownerId: z.string().optional().nullable(),
  owner_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine((data) => {
  const name = (data.customerName || data.customer_name || data.name || '').trim();
  return name.length > 0;
}, {
  message: 'Customer name is required.',
  path: ['customerName'],
});

export const updateCrmLeadSchema = z.object({
  customerName: z.string().optional(),
  customer_name: z.string().optional(),
  name: z.string().optional(),
  company: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  dealValue: z.number().optional().nullable(),
  deal_value: z.number().optional().nullable(),
  status: z.string().optional(),
  ownerId: z.string().optional().nullable(),
  owner_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ============================================================================
// 5. INVITES SCHEMAS
// ============================================================================

export const createInviteSchema = z.object({
  email: z.string().email('Email address is required.').or(z.string().min(1, 'Email address is required.')),
  role: z.enum(['admin', 'employee', 'intern']).optional(),
  teamId: z.string().optional().nullable(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required.'),
  name: z.string().min(1, 'Name is required.'),
  password: z.string().min(1, 'Password is required.'),
});

// ============================================================================
// 6. WORKSPACE SCHEMAS
// ============================================================================

export const switchWorkspaceSchema = z.object({
  workspaceId: z.string().optional(),
  id: z.string().optional(),
}).refine((data) => {
  return Boolean(data.workspaceId || data.id);
}, {
  message: 'workspaceId is required.',
  path: ['workspaceId'],
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required.'),
  slug: z.string().optional(),
  plan: z.string().optional(),
});

export const updateWorkspaceSettingsSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  plan: z.string().optional(),
  logo: z.string().optional().nullable(),
});

// ============================================================================
// 7. BILLING SCHEMAS
// ============================================================================

export const upgradeBillingSchema = z.object({
  plan: z.enum(['free', 'starter', 'business', 'scale', 'enterprise'], {
    message: 'Plan must be one of: free, starter, business, scale, enterprise',
  }),
  billingCycle: z.enum(['monthly', 'annual', 'yearly']).optional(),
});

// ============================================================================
// 8. PEOPLE SCHEMAS
// ============================================================================

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.string().optional(),
  employmentType: z.string().optional(),
  joiningDate: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required.'),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  headId: z.string().optional().nullable(),
  parentDepartmentId: z.string().optional().nullable(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  headId: z.string().optional().nullable(),
  parentDepartmentId: z.string().optional().nullable(),
});

export const addDepartmentMemberSchema = z.object({
  userId: z.string().optional(),
  memberId: z.string().optional(),
  user_id: z.string().optional(),
  member_id: z.string().optional(),
}).refine((data) => {
  return Boolean(data.userId || data.memberId || data.user_id || data.member_id);
}, {
  message: 'userId or memberId is required.',
  path: ['userId'],
});

export const setDepartmentLeadSchema = z.object({
  leadId: z.string().optional().nullable(),
  headId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

export const moveDepartmentMemberSchema = z.object({
  userId: z.string().optional(),
  memberId: z.string().optional(),
  toDepartmentId: z.string().optional(),
  targetDepartmentId: z.string().optional(),
  departmentId: z.string().optional(),
});

export const reassignManagerSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
  managerId: z.string().optional().nullable(),
});

export const transferDepartmentSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
  departmentId: z.string().optional().nullable(),
});

export const requestLeaveSchema = z.object({
  startDate: z.string().min(1, 'startDate is required.'),
  endDate: z.string().min(1, 'endDate is required.'),
  type: z.string().optional(),
  reason: z.string().min(1, 'reason is required.'),
});

export const reviewLeaveSchema = z.object({
  reviewNotes: z.string().optional(),
});

export const attendanceCheckInSchema = z.object({
  notes: z.string().optional(),
});

export const attendanceCheckOutSchema = z.object({
  notes: z.string().optional(),
});

export const createGoalSchema = z.object({
  title: z.string().min(1, 'title is required.'),
  dueDate: z.string().min(1, 'dueDate is required.'),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
});

export const updateGoalProgressSchema = z.object({
  progressValue: z.union([z.number(), z.string()]).optional(),
  progressPercent: z.union([z.number(), z.string()]).optional(),
  notes: z.string().optional(),
});

export const createReviewCycleSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
  reviewerId: z.string().min(1, 'reviewerId is required.'),
  cycle: z.string().optional(),
  dueDate: z.string().optional(),
});

export const submitSelfReviewSchema = z.object({
  selfRatings: z.record(z.string(), z.any()).optional(),
  comments: z.string().optional(),
});

export const submitManagerReviewSchema = z.object({
  managerRatings: z.record(z.string(), z.any()).optional(),
  comments: z.string().optional(),
  strengths: z.string().optional(),
  growthAreas: z.string().optional(),
});

// ============================================================================
// 9. AUTOMATIONS SCHEMAS
// ============================================================================

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required.'),
  triggerType: z.string().optional(),
  trigger_type: z.string().optional(),
  description: z.string().optional().nullable(),
  entityType: z.string().optional(),
  entity_type: z.string().optional(),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  trigger_config: z.record(z.string(), z.any()).optional(),
  conditionConfig: z.any().optional(),
  condition_config: z.any().optional(),
  conditions: z.any().optional(),
  actionType: z.string().optional(),
  action_type: z.string().optional(),
  actionConfig: z.record(z.string(), z.any()).optional(),
  action_config: z.record(z.string(), z.any()).optional(),
  actions: z.array(z.any()).optional(),
  enabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => {
  return Boolean(data.triggerType || data.trigger_type);
}, {
  message: 'Trigger type is required.',
  path: ['triggerType'],
});

export const updateAutomationRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  entityType: z.string().optional(),
  entity_type: z.string().optional(),
  triggerType: z.string().optional(),
  trigger_type: z.string().optional(),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  trigger_config: z.record(z.string(), z.any()).optional(),
  conditionConfig: z.any().optional(),
  condition_config: z.any().optional(),
  conditions: z.any().optional(),
  actionType: z.string().optional(),
  action_type: z.string().optional(),
  actionConfig: z.record(z.string(), z.any()).optional(),
  action_config: z.record(z.string(), z.any()).optional(),
  actions: z.array(z.any()).optional(),
  enabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// 10. MSME EXTENSIONS SCHEMAS (Wiki, Time Tracking, Guest Portal, Integration)
// ============================================================================

export const createWikiPageSchema = z.object({
  title: z.string().optional(),
  parentId: z.string().optional().nullable(),
  icon: z.string().optional(),
  contentJson: z.any().optional(),
  departmentId: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  visibility: z.string().optional(),
});

export const updateWikiPageSchema = z.object({
  title: z.string().optional(),
  parentId: z.string().optional().nullable(),
  icon: z.string().optional(),
  contentJson: z.any().optional(),
  departmentId: z.string().optional().nullable(),
  visibility: z.string().optional(),
});

export const addWikiCommentSchema = z.object({
  blockId: z.string().optional().nullable(),
  comment: z.string().optional(),
});

export const startTimeTrackingSchema = z.object({
  taskId: z.string().optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().optional(),
  notes: z.string().optional(),
});

export const manualTimeTrackingSchema = z.object({
  taskId: z.string().optional(),
  startTime: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]).optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().optional(),
  notes: z.string().optional(),
});

export const guestSignApprovalSchema = z.object({
  signatureName: z.string().min(1, 'signatureName is required.'),
  feedback: z.string().optional(),
});

export const guestInviteSchema = z.object({
  email: z.string().min(1, 'email is required.'),
  name: z.string().min(1, 'name is required.'),
  company: z.string().optional(),
  projectId: z.string().optional(),
});

export const calendarEventSchema = z.object({
  crmRecordId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  attendees: z.array(z.string()).optional(),
});

export const emailLogSchema = z.object({
  crmRecordId: z.string().optional().nullable(),
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  snippet: z.string().optional(),
  direction: z.string().optional(),
});
