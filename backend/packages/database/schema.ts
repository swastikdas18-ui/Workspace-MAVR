import { pgTable, text, timestamp, integer, bigint, boolean, pgEnum, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'employee', 'intern', 'guest']);
export const workspacePlanEnum = pgEnum('workspace_plan', ['free', 'pro', 'enterprise']);
export const teamMemberRoleEnum = pgEnum('team_member_role', ['lead', 'member']);
export const projectStatusEnum = pgEnum('project_status', ['planning', 'in_progress', 'review', 'completed', 'on_hold']);
export const projectMemberRoleEnum = pgEnum('project_member_role', ['owner', 'contributor', 'viewer']);
export const taskStatusEnum = pgEnum('task_status', ['backlog', 'todo', 'in_progress', 'review', 'done', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent', 'critical']);
export const documentVisibilityEnum = pgEnum('document_visibility', ['public', 'team', 'private', 'learning']);
export const crmStatusEnum = pgEnum('crm_status', ['new_lead', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost']);

// Users table
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role').notNull().default('employee'), // 'admin' | 'employee' | 'intern'
    platformRole: text('platform_role').notNull().default('none'), // 'founder' | 'platform_admin' | 'support' | 'none'
    title: text('title'),
    avatar: text('avatar'),
    teamId: text('team_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('idx_users_email').on(table.email),
    nameIdx: index('idx_users_name').on(table.name),
    roleIdx: index('idx_users_role').on(table.role),
    platformRoleIdx: index('idx_users_platform_role').on(table.platformRole),
    teamIdIdx: index('idx_users_team_id').on(table.teamId),
  })
);

// Workspaces table
export const workspaces = pgTable(
  'workspaces',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    plan: text('plan').default('free').notNull(), // 'free' | 'pro' | 'enterprise'
    logo: text('logo'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_workspaces_slug').on(table.slug),
    ownerIdx: index('idx_workspaces_owner_id').on(table.ownerId),
  })
);

// Workspace Members table (for multi-user membership & RBAC mapping)
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('employee'), // 'admin' | 'employee' | 'intern'
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_workspace_members_ws_id').on(table.workspaceId),
    userIdx: index('idx_workspace_members_user_id').on(table.userId),
    wsUserIdx: index('idx_workspace_members_ws_user').on(table.workspaceId, table.userId),
    roleIdx: index('idx_workspace_members_role').on(table.role),
  })
);

// Sessions table (Better Auth compatible)
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => ({
    tokenIdx: uniqueIndex('idx_sessions_token').on(table.token),
    userIdx: index('idx_sessions_user_id').on(table.userId),
    wsIdx: index('idx_sessions_ws_id').on(table.workspaceId),
    expiresIdx: index('idx_sessions_expires_at').on(table.expiresAt),
    lastActiveIdx: index('idx_sessions_last_active_at').on(table.lastActiveAt),
  })
);

// Teams table
export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    description: text('description'),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    leadId: text('lead_id').references(() => users.id),
    color: text('color').default('#3b82f6'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_teams_workspace_id').on(table.workspaceId),
    leadIdx: index('idx_teams_lead_id').on(table.leadId),
    nameIdx: index('idx_teams_name').on(table.name),
  })
);

// Team Members table
export const teamMembers = pgTable(
  'team_members',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleInTeam: text('role_in_team').default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index('idx_team_members_team_id').on(table.teamId),
    userIdx: index('idx_team_members_user_id').on(table.userId),
    teamUserIdx: index('idx_team_members_team_user').on(table.teamId, table.userId),
  })
);

// Projects table
export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description'),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    departmentId: text('department_id').references(() => departments.id),
    createdBy: text('created_by').notNull().references(() => users.id),
    status: text('status').default('in_progress').notNull(),
    progress: integer('progress').default(0).notNull(),
    startDate: timestamp('start_date').defaultNow().notNull(),
    dueDate: timestamp('due_date').notNull(),
    budget: text('budget'),
    startedAt: timestamp('started_at'),
    submittedForReviewAt: timestamp('submitted_for_review_at'),
    submittedBy: text('submitted_by').references(() => users.id),
    completedAt: timestamp('completed_at'),
    approvedBy: text('approved_by').references(() => users.id),
    reviewFeedback: text('review_feedback'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_projects_workspace_id').on(table.workspaceId),
    createdByIdx: index('idx_projects_created_by').on(table.createdBy),
    statusIdx: index('idx_projects_status').on(table.status),
    titleIdx: index('idx_projects_title').on(table.title),
  })
);

// Project Updates table
export const projectUpdates = pgTable(
  'project_updates',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    progress: integer('progress').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('idx_project_updates_project_id').on(table.projectId),
    userIdIdx: index('idx_project_updates_user_id').on(table.userId),
    createdAtIdx: index('idx_project_updates_created_at').on(table.createdAt),
  })
);

// Project Members table
export const projectMembers = pgTable(
  'project_members',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').default('contributor').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_project_members_project_id').on(table.projectId),
    userIdx: index('idx_project_members_user_id').on(table.userId),
    projUserIdx: index('idx_project_members_proj_user').on(table.projectId, table.userId),
  })
);

// Project Teams table
export const projectTeams = pgTable(
  'project_teams',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    projectIdx: index('idx_project_teams_project_id').on(table.projectId),
    teamIdx: index('idx_project_teams_team_id').on(table.teamId),
    projTeamIdx: index('idx_project_teams_proj_team').on(table.projectId, table.teamId),
  })
);

// Tasks table (Phase 2 Task Execution Engine)
export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').default('todo').notNull(), // 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'completed'
    priority: text('priority').default('medium').notNull(), // 'low' | 'medium' | 'high' | 'urgent' | 'critical'
    storyPoints: integer('story_points').default(1),
    estimatedHours: integer('estimated_hours'),
    actualHours: integer('actual_hours').default(0),
    assignedTo: text('assigned_to').notNull().references(() => users.id),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
    teamId: text('team_id').references(() => teams.id),
    createdBy: text('created_by').references(() => users.id),
    dueDate: timestamp('due_date').notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    reviewedBy: text('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at'),
    blockedReason: text('blocked_reason'),
    isBlocked: boolean('is_blocked').default(false),
    isLearningTask: boolean('is_learning_task').default(false),
    sourceMessageId: text('source_message_id'),
    sourceConversationId: text('source_conversation_id'),
    linkedConversationId: text('linked_conversation_id'),
    linkedMessageId: text('linked_message_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_tasks_workspace_id').on(table.workspaceId),
    departmentIdx: index('idx_tasks_department_id').on(table.departmentId),
    projectIdx: index('idx_tasks_project_id').on(table.projectId),
    assignedToIdx: index('idx_tasks_assigned_to').on(table.assignedTo),
    createdByIdx: index('idx_tasks_created_by').on(table.createdBy),
    teamIdx: index('idx_tasks_team_id').on(table.teamId),
    statusIdx: index('idx_tasks_status').on(table.status),
    priorityIdx: index('idx_tasks_priority').on(table.priority),
    titleIdx: index('idx_tasks_title').on(table.title),
    sourceMessageIdx: index('idx_tasks_source_message_id').on(table.sourceMessageId),
    linkedConversationIdx: index('idx_tasks_linked_conversation_id').on(table.linkedConversationId),
  })
);

// Task Updates / Activity Log Table
export const taskUpdates = pgTable(
  'task_updates',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'status_change' | 'comment' | 'progress_update' | 'assignment' | 'blocked' | 'unblocked' | 'created' | 'approved' | 'changes_requested'
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    comment: text('comment'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    taskIdx: index('idx_task_updates_task_id').on(table.taskId),
    userIdx: index('idx_task_updates_user_id').on(table.userId),
    createdAtIdx: index('idx_task_updates_created_at').on(table.createdAt),
  })
);

// Documents table (Backblaze B2 & S3-Compatible Object Storage)
export const documents = pgTable(
  'documents',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    fileUrl: text('file_url').notNull(),
    fileType: text('file_type').default('pdf').notNull(),
    fileSize: text('file_size').default('1.2 MB').notNull(),
    fileSizeBytes: integer('file_size_bytes').default(0).notNull(),
    mimeType: text('mime_type').default('application/pdf').notNull(),
    storageKey: text('storage_key'),
    storageUrl: text('storage_url'),
    r2Key: text('r2_key'),
    r2Url: text('r2_url'),
    ownerId: text('owner_id').notNull().references(() => users.id),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
    visibility: text('visibility').default('workspace').notNull(), // 'private' | 'department' | 'workspace' | 'admin_only' | 'public' | 'team' | 'learning'
    category: text('category').default('General').notNull(),
    downloadCount: integer('download_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_documents_workspace_id').on(table.workspaceId),
    ownerIdx: index('idx_documents_owner_id').on(table.ownerId),
    deptIdx: index('idx_documents_department_id').on(table.departmentId),
    visibilityIdx: index('idx_documents_visibility').on(table.visibility),
    titleIdx: index('idx_documents_title').on(table.title),
    categoryIdx: index('idx_documents_category').on(table.category),
    storageKeyIdx: index('idx_documents_storage_key').on(table.storageKey),
    r2KeyIdx: index('idx_documents_r2_key').on(table.r2Key),
  })
);

// CRM Records table
export const crmRecords = pgTable(
  'crm_records',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    customerName: text('customer_name').notNull(),
    company: text('company').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    dealValue: integer('deal_value').default(0).notNull(),
    status: text('status').default('new_lead').notNull(),
    ownerId: text('owner_id').notNull().references(() => users.id),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastContacted: timestamp('last_contacted').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_crm_records_workspace_id').on(table.workspaceId),
    ownerIdx: index('idx_crm_records_owner_id').on(table.ownerId),
    statusIdx: index('idx_crm_records_status').on(table.status),
    customerNameIdx: index('idx_crm_records_customer_name').on(table.customerName),
    companyIdx: index('idx_crm_records_company').on(table.company),
    emailIdx: index('idx_crm_records_email').on(table.email),
  })
);

// Workspace Invites table
export const workspaceInvites = pgTable(
  'workspace_invites',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('employee'), // 'employee' | 'intern'
    token: text('token').notNull().unique(),
    invitedBy: text('invited_by').notNull().references(() => users.id),
    teamId: text('team_id'),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_workspace_invites_workspace_id').on(table.workspaceId),
    tokenIdx: uniqueIndex('idx_workspace_invites_token').on(table.token),
    emailIdx: index('idx_workspace_invites_email').on(table.email),
    invitedByIdx: index('idx_workspace_invites_invited_by').on(table.invitedBy),
  })
);

// Task Comments table
export const taskComments = pgTable(
  'task_comments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    taskIdx: index('idx_task_comments_task_id').on(table.taskId),
    workspaceIdx: index('idx_task_comments_workspace_id').on(table.workspaceId),
    userIdx: index('idx_task_comments_user_id').on(table.userId),
  })
);

// Notifications table
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').notNull(), // 'task_assigned' | 'task_status_changed' | 'leave_submitted' | etc.
    priority: text('priority').default('medium').notNull(), // 'low' | 'medium' | 'high' | 'urgent'
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    link: text('link'),
    isRead: boolean('is_read').default(false).notNull(),
    archived: boolean('archived').default(false).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_notifications_workspace_id').on(table.workspaceId),
    recipientIdx: index('idx_notifications_recipient_id').on(table.recipientId),
    userIdx: index('idx_notifications_user_id').on(table.userId),
    priorityIdx: index('idx_notifications_priority').on(table.priority),
    isReadIdx: index('idx_notifications_is_read').on(table.isRead),
    archivedIdx: index('idx_notifications_archived').on(table.archived),
    createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  })
);

// Notification Preferences table (User Toggles per Category)
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    peopleEmployeeInvites: boolean('people_employee_invites').default(true).notNull(),
    peopleEmployeeJoined: boolean('people_employee_joined').default(true).notNull(),
    peopleLeaveRequests: boolean('people_leave_requests').default(true).notNull(),
    projectsInitiativeUpdates: boolean('projects_initiative_updates').default(true).notNull(),
    projectsReviewRequests: boolean('projects_review_requests').default(true).notNull(),
    projectsAssignments: boolean('projects_assignments').default(true).notNull(),
    tasksAssignments: boolean('tasks_assignments').default(true).notNull(),
    tasksCompletions: boolean('tasks_completions').default(true).notNull(),
    tasksOverdueAlerts: boolean('tasks_overdue_alerts').default(true).notNull(),
    crmLeadAssignment: boolean('crm_lead_assignment').default(true).notNull(),
    crmDealUpdates: boolean('crm_deal_updates').default(true).notNull(),
    mentions: boolean('mentions').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex('idx_notification_prefs_workspace_user').on(table.workspaceId, table.userId),
  })
);

// Activity Logs table
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // 'task' | 'project' | 'document' | 'team' | 'crm' | 'invite' | 'workspace'
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(), // 'created' | 'assigned' | 'completed' | 'updated' | 'uploaded' | 'accepted' | 'stage_changed'
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_activity_logs_workspace_id').on(table.workspaceId),
    entityTypeIdx: index('idx_activity_logs_entity_type').on(table.entityType),
    entityIdIdx: index('idx_activity_logs_entity_id').on(table.entityId),
    createdAtIdx: index('idx_activity_logs_created_at').on(table.createdAt),
  })
);

// Audit Logs table
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id').notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_audit_logs_workspace_id').on(table.workspaceId),
    userIdx: index('idx_audit_logs_user_id').on(table.userId),
    resourceIdx: index('idx_audit_logs_resource').on(table.resource),
    createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
  })
);

// Automation Rules table
export const automationRules = pgTable(
  'automation_rules',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    entityType: text('entity_type').notNull().default('system'), // 'project' | 'task' | 'team' | 'crm' | 'document' | 'system'
    triggerType: text('trigger_type').notNull(), // 'task_created' | 'task_assigned' | 'task_started' | 'task_completed' | 'task_overdue' | 'task_blocked' | 'project_created' | 'project_completed' | 'member_joined' | 'document_uploaded' | 'lead_created' | 'deal_won'
    triggerConfig: jsonb('trigger_config'),
    conditionConfig: jsonb('condition_config'),
    actionType: text('action_type'),
    actionConfig: jsonb('action_config'),
    enabled: boolean('enabled').default(true).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_automation_rules_workspace_id').on(table.workspaceId),
    triggerTypeIdx: index('idx_automation_rules_trigger_type').on(table.triggerType),
    entityTypeIdx: index('idx_automation_rules_entity_type').on(table.entityType),
    isActiveIdx: index('idx_automation_rules_is_active').on(table.isActive),
    enabledIdx: index('idx_automation_rules_enabled').on(table.enabled),
    createdByIdx: index('idx_automation_rules_created_by').on(table.createdBy),
  })
);

// Automation Actions table
export const automationActions = pgTable(
  'automation_actions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    ruleId: text('rule_id').notNull().references(() => automationRules.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(), // 'send_notification' | 'send_email' | 'create_activity' | 'create_audit' | 'create_task' | 'assign_task' | 'update_status' | 'update_task_status' | 'update_project_status' | 'create_document' | 'create_project' | 'create_crm_activity' | 'add_comment' | 'webhook'
    actionConfig: jsonb('action_config').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    ruleIdx: index('idx_automation_actions_rule_id').on(table.ruleId),
    actionTypeIdx: index('idx_automation_actions_action_type').on(table.actionType),
  })
);

// Automation Executions table
export const automationExecutions = pgTable(
  'automation_executions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id'),
    ruleId: text('rule_id').notNull().references(() => automationRules.id, { onDelete: 'cascade' }),
    triggeredBy: text('triggered_by'),
    status: text('status').notNull(), // 'success' | 'failed' | 'skipped' | 'partial'
    executionTime: integer('execution_time').default(0).notNull(),
    errorMessage: text('error_message'),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    executionResult: jsonb('execution_result'),
    executedAt: timestamp('executed_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_automation_executions_workspace_id').on(table.workspaceId),
    ruleIdx: index('idx_automation_executions_rule_id').on(table.ruleId),
    statusIdx: index('idx_automation_executions_status').on(table.status),
    executedAtIdx: index('idx_automation_executions_executed_at').on(table.executedAt),
  })
);

// User Presence table (Real-time collaboration status)
export const userPresence = pgTable(
  'user_presence',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('offline'), // 'online' | 'away' | 'offline'
    lastSeen: timestamp('last_seen').defaultNow().notNull(),
    connectedAt: timestamp('connected_at').defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    userIdx: index('idx_user_presence_user_id').on(table.userId),
    wsIdx: index('idx_user_presence_ws_id').on(table.workspaceId),
    statusIdx: index('idx_user_presence_status').on(table.status),
    lastSeenIdx: index('idx_user_presence_last_seen').on(table.lastSeen),
  })
);

// Subscriptions table (Free, Starter, Business, Enterprise)
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    plan: text('plan').default('free').notNull(), // 'free' | 'starter' | 'business' | 'enterprise'
    status: text('status').default('active').notNull(), // 'active' | 'trialing' | 'past_due' | 'canceled'
    billingCycle: text('billing_cycle').default('monthly').notNull(), // 'monthly' | 'yearly'
    seats: integer('seats').default(5).notNull(),
    pricePerMonth: integer('price_per_month').default(0).notNull(),
    currentPeriodStart: timestamp('current_period_start').defaultNow().notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: uniqueIndex('idx_subscriptions_ws_id').on(table.workspaceId),
    planIdx: index('idx_subscriptions_plan').on(table.plan),
    statusIdx: index('idx_subscriptions_status').on(table.status),
  })
);

// Usage Metrics Table (Meters consumption for members, projects, storage, api requests, automations)
export const usageMetrics = pgTable(
  'usage_metrics',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    period: text('period').notNull(), // 'YYYY-MM'
    membersCount: integer('members_count').default(1).notNull(),
    projectsCount: integer('projects_count').default(0).notNull(),
    storageBytes: bigint('storage_bytes', { mode: 'number' }).default(0).notNull(),
    apiRequestsCount: integer('api_requests_count').default(0).notNull(),
    automationsCount: integer('automations_count').default(0).notNull(),
    activeUsersCount: integer('active_users_count').default(1).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsPeriodIdx: uniqueIndex('idx_usage_metrics_ws_period').on(table.workspaceId, table.period),
    wsIdx: index('idx_usage_metrics_ws_id').on(table.workspaceId),
  })
);

// Invoices table
export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // e.g. 4900 for $49.00
    currency: text('currency').default('usd').notNull(),
    status: text('status').default('paid').notNull(), // 'paid' | 'open' | 'void' | 'uncollectible'
    invoiceNumber: text('invoice_number').notNull(),
    pdfUrl: text('pdf_url'),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    paidAt: timestamp('paid_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_invoices_ws_id').on(table.workspaceId),
    statusIdx: index('idx_invoices_status').on(table.status),
    invNumIdx: uniqueIndex('idx_invoices_number').on(table.invoiceNumber),
  })
);

// 1. Wiki Pages (Notion-Lite Knowledge Base)
export const wikiPages = pgTable(
  'wiki_pages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    title: text('title').default('Untitled Page').notNull(),
    icon: text('icon').default('📄'),
    coverImage: text('cover_image'),
    slug: text('slug').notNull(),
    contentJson: jsonb('content_json').default({}).notNull(),
    departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
    visibility: text('visibility').default('workspace').notNull(), // 'private' | 'department' | 'workspace' | 'admin_only' | 'public' | 'team' | 'learning'
    createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_wiki_pages_ws_id').on(table.workspaceId),
    parentIdx: index('idx_wiki_pages_parent_id').on(table.parentId),
    deptIdx: index('idx_wiki_pages_department_id').on(table.departmentId),
    slugWsIdx: uniqueIndex('idx_wiki_pages_slug_ws').on(table.workspaceId, table.slug),
  })
);

// 2. Wiki Page Versions
export const wikiPageVersions = pgTable(
  'wiki_page_versions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    pageId: text('page_id').notNull().references(() => wikiPages.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    contentSnapshot: jsonb('content_snapshot').notNull(),
    createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pageVerIdx: index('idx_wiki_versions_page_ver').on(table.pageId, table.versionNumber),
  })
);

// 3. Wiki Comments
export const wikiComments = pgTable(
  'wiki_comments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    pageId: text('page_id').notNull().references(() => wikiPages.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    blockId: text('block_id'),
    comment: text('comment').notNull(),
    resolved: boolean('resolved').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pageIdx: index('idx_wiki_comments_page_id').on(table.pageId),
  })
);

// 4. Task Time Entries (Stopwatch & Billable Hours)
export const taskTimeEntries = pgTable(
  'task_time_entries',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    durationMinutes: integer('duration_minutes').default(0).notNull(),
    billable: boolean('billable').default(true).notNull(),
    hourlyRate: integer('hourly_rate').default(1500).notNull(), // in INR (₹1,500/hr)
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_time_entries_ws_id').on(table.workspaceId),
    taskIdx: index('idx_time_entries_task_id').on(table.taskId),
    userIdx: index('idx_time_entries_user_id').on(table.userId),
    startTimeIdx: index('idx_time_entries_start_time').on(table.startTime),
  })
);

// 4b. Employee Billing Profiles (Admin configured rates and targets)
export const employeeBillingProfiles = pgTable(
  'employee_billing_profiles',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    costRate: integer('cost_rate').default(1000).notNull(),
    billableRate: integer('billable_rate').default(2000).notNull(),
    utilizationTarget: integer('utilization_target').default(75).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsUserIdx: uniqueIndex('idx_emp_billing_ws_user').on(table.workspaceId, table.userId),
    wsIdx: index('idx_emp_billing_ws_id').on(table.workspaceId),
    userIdx: index('idx_emp_billing_user_id').on(table.userId),
  })
);

// 5. Guest Users (Client Portal)
export const guestUsers = pgTable(
  'guest_users',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    company: text('company').notNull(),
    magicToken: text('magic_token').notNull().unique(),
    tokenExpiresAt: timestamp('token_expires_at').notNull(),
    lastActiveAt: timestamp('last_active_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('idx_guest_users_token').on(table.magicToken),
    wsIdx: index('idx_guest_users_ws_id').on(table.workspaceId),
  })
);

// 6. Guest Permissions
export const guestPermissions = pgTable(
  'guest_permissions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    guestId: text('guest_id').notNull().references(() => guestUsers.id, { onDelete: 'cascade' }),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    canApprove: boolean('can_approve').default(true).notNull(),
    canComment: boolean('can_comment').default(true).notNull(),
    canDownload: boolean('can_download').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    guestProjIdx: uniqueIndex('idx_guest_perm_guest_proj').on(table.guestId, table.projectId),
  })
);

// 7. Deliverable Approvals
export const deliverableApprovals = pgTable(
  'deliverable_approvals',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
    guestId: text('guest_id').notNull().references(() => guestUsers.id, { onDelete: 'cascade' }),
    status: text('status').default('pending').notNull(),
    feedback: text('feedback'),
    signatureHash: text('signature_hash'),
    signedAt: timestamp('signed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_deliv_approvals_ws_id').on(table.workspaceId),
    projIdx: index('idx_deliv_approvals_proj_id').on(table.projectId),
  })
);

// 8. Email Connections
export const emailConnections = pgTable(
  'email_connections',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').default('google').notNull(),
    emailAddress: text('email_address').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),
    syncEnabled: boolean('sync_enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsUserIdx: uniqueIndex('idx_email_conn_ws_user').on(table.workspaceId, table.userId),
  })
);

// 9. Calendar Events
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    crmRecordId: text('crm_record_id').references(() => crmRecords.id, { onDelete: 'set null' }),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    meetingUrl: text('meeting_url'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    attendees: jsonb('attendees').default([]).notNull(),
    status: text('status').default('confirmed').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_cal_events_ws_id').on(table.workspaceId),
    crmIdx: index('idx_cal_events_crm_id').on(table.crmRecordId),
    startTimeIdx: index('idx_cal_events_start_time').on(table.startTime),
  })
);

// Razorpay & Extended Revenue Tables
export const billingCustomers = pgTable(
  'billing_customers',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    razorpayCustomerId: text('razorpay_customer_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    contact: text('contact'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: uniqueIndex('idx_billing_customers_ws').on(table.workspaceId),
    rzpCustIdx: uniqueIndex('idx_billing_customers_rzp_id').on(table.razorpayCustomerId),
  })
);

export const billingSubscriptions = pgTable(
  'billing_subscriptions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    razorpaySubscriptionId: text('razorpay_subscription_id').notNull().unique(),
    razorpayPlanId: text('razorpay_plan_id').notNull(),
    planTier: text('plan_tier').notNull(),
    status: text('status').default('active').notNull(),
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    chargeAt: timestamp('charge_at'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_billing_subs_ws').on(table.workspaceId),
    rzpSubIdx: uniqueIndex('idx_billing_subs_rzp_id').on(table.razorpaySubscriptionId),
    statusIdx: index('idx_billing_subs_status').on(table.status),
  })
);

export const billingPayments = pgTable(
  'billing_payments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    razorpayPaymentId: text('razorpay_payment_id').notNull().unique(),
    razorpayOrderId: text('razorpay_order_id'),
    razorpaySubscriptionId: text('razorpay_subscription_id'),
    amount: integer('amount').notNull(),
    currency: text('currency').default('INR').notNull(),
    status: text('status').notNull(),
    method: text('method'),
    errorDescription: text('error_description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_billing_payments_ws').on(table.workspaceId),
    rzpPayIdx: uniqueIndex('idx_billing_payments_rzp_id').on(table.razorpayPaymentId),
  })
);

export const billingWebhooks = pgTable(
  'billing_webhooks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text('event_id').notNull().unique(),
    event: text('event').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').default('processed').notNull(),
    processedAt: timestamp('processed_at').defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: uniqueIndex('idx_billing_webhooks_event_id').on(table.eventId),
  })
);

export const taskRecurrenceRules = pgTable(
  'task_recurrence_rules',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    frequency: text('frequency').notNull(),
    interval: integer('interval').default(1).notNull(),
    nextRunAt: timestamp('next_run_at').notNull(),
    paused: boolean('paused').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_task_recurrence_ws').on(table.workspaceId),
    taskIdx: uniqueIndex('idx_task_recurrence_task').on(table.taskId),
    nextRunIdx: index('idx_task_recurrence_next_run').on(table.nextRunAt),
  })
);

export const taskAssignees = pgTable(
  'task_assignees',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    taskUserIdx: uniqueIndex('idx_task_assignees_task_user').on(table.taskId, table.userId),
    taskIdx: index('idx_task_assignees_task').on(table.taskId),
    userIdx: index('idx_task_assignees_user').on(table.userId),
  })
);

export const taskDependencies = pgTable(
  'task_dependencies',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    dependsOnTaskId: text('depends_on_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    type: text('type').default('finish_to_start').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    taskDepIdx: uniqueIndex('idx_task_dep_pair').on(table.taskId, table.dependsOnTaskId),
    taskIdx: index('idx_task_dep_task').on(table.taskId),
  })
);

export const crmPipelines = pgTable(
  'crm_pipelines',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_crm_pipelines_ws').on(table.workspaceId),
  })
);

export const crmPipelineStages = pgTable(
  'crm_pipeline_stages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    pipelineId: text('pipeline_id').notNull().references(() => crmPipelines.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').default('#3B82F6').notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pipelineIdx: index('idx_crm_stages_pipeline').on(table.pipelineId),
    orderIdx: index('idx_crm_stages_order').on(table.pipelineId, table.orderIndex),
  })
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    prefix: text('prefix').notNull(),
    scopes: jsonb('scopes').default([]).notNull(),
    lastUsedAt: timestamp('last_used_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_api_keys_ws').on(table.workspaceId),
    hashIdx: uniqueIndex('idx_api_keys_hash').on(table.keyHash),
  })
);

export const webhooks = pgTable(
  'webhooks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    events: jsonb('events').default([]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_webhooks_ws').on(table.workspaceId),
  })
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    payload: jsonb('payload').notNull(),
    responseCode: integer('response_code'),
    responseBody: text('response_body'),
    status: text('status').notNull(),
    attempts: integer('attempts').default(1).notNull(),
    deliveredAt: timestamp('delivered_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    webhookIdx: index('idx_webhook_deliv_wh').on(table.webhookId),
    statusIdx: index('idx_webhook_deliv_status').on(table.status),
  })
);

export const backupReports = pgTable(
  'backup_reports',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    filename: text('filename').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    checksum: text('checksum').notNull(),
    status: text('status').default('pending').notNull(),
    verificationStatus: text('verification_status').default('unverified').notNull(),
    verificationDetails: jsonb('verification_details').default({}),
    durationMs: integer('duration_ms').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('idx_backup_reports_status').on(table.status),
    createdIdx: index('idx_backup_reports_created').on(table.createdAt),
  })
);

export const emailHealthMetrics = pgTable(
  'email_health_metrics',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id'),
    emailId: text('email_id').notNull(),
    recipient: text('recipient').notNull(),
    eventType: text('event_type').notNull(),
    bounceType: text('bounce_type'),
    metadata: jsonb('metadata').default({}),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_email_health_ws').on(table.workspaceId),
    eventIdx: index('idx_email_health_event').on(table.eventType),
    emailIdx: index('idx_email_health_email').on(table.emailId),
  })
);

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventName: text('event_name').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_events_ws').on(table.workspaceId),
    userIdx: index('idx_events_user').on(table.userId),
    eventNameIdx: index('idx_events_name').on(table.eventName),
    createdIdx: index('idx_events_created').on(table.createdAt),
  })
);

export const onboardingState = pgTable(
  'onboarding_state',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    completedSteps: jsonb('completed_steps').$type<string[]>().default([]),
    dismissed: boolean('dismissed').default(false).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: uniqueIndex('idx_onboarding_ws').on(table.workspaceId),
  })
);

export const messageTasks = pgTable(
  'message_tasks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    msgTaskUnique: uniqueIndex('idx_message_tasks_unique').on(table.messageId, table.taskId),
    workspaceIdx: index('idx_message_tasks_workspace_id').on(table.workspaceId),
    messageIdx: index('idx_message_tasks_message_id').on(table.messageId),
    taskIdx: index('idx_message_tasks_task_id').on(table.taskId),
    createdByIdx: index('idx_message_tasks_created_by').on(table.createdBy),
  })
);
export const betaFeedback = pgTable(
  'beta_feedback',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    category: text('category').default('bug').notNull(),
    severity: text('severity').default('p2_major').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    screenshotUrl: text('screenshot_url'),
    status: text('status').default('open').notNull(),
    founderNotes: text('founder_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_feedback_ws').on(table.workspaceId),
    userIdx: index('idx_feedback_user').on(table.userId),
    statusIdx: index('idx_feedback_status').on(table.status),
    severityIdx: index('idx_feedback_severity').on(table.severity),
  })
);

export const customerSuccessProfiles = pgTable(
  'customer_success_profiles',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    companyName: text('company_name').notNull(),
    tier: text('tier').default('closed_beta').notNull(),
    healthScore: integer('health_score').default(100).notNull(),
    onboardingStatus: text('onboarding_status').default('in_progress').notNull(),
    totalUsers: integer('total_users').default(1).notNull(),
    activeUsers7d: integer('active_users_7d').default(1).notNull(),
    tasksCompleted7d: integer('tasks_completed_7d').default(0).notNull(),
    openTicketsCount: integer('open_tickets_count').default(0).notNull(),
    lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
    notes: text('notes'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: uniqueIndex('idx_cs_ws').on(table.workspaceId),
    healthIdx: index('idx_cs_health').on(table.healthScore),
  })
);

export const npsSurveys = pgTable(
  'nps_surveys',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    score: integer('score').notNull(),
    comment: text('comment'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_nps_ws').on(table.workspaceId),
    userIdx: index('idx_nps_user').on(table.userId),
    scoreIdx: index('idx_nps_score').on(table.score),
    submittedIdx: index('idx_nps_submitted').on(table.submittedAt),
  })
);

// Relational Definitions
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  workspacesOwned: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  assignedTasks: many(tasks),
  crmLeads: many(crmRecords),
  documents: many(documents),
  automationRulesCreated: many(automationRules),
  presence: many(userPresence),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  teams: many(teams),
  projects: many(projects),
  tasks: many(tasks),
  documents: many(documents),
  crmRecords: many(crmRecords),
  automationRules: many(automationRules),
  userPresences: many(userPresence),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [sessions.workspaceId],
    references: [workspaces.id],
  }),
}));

export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [automationRules.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [automationRules.createdBy],
    references: [users.id],
  }),
  actions: many(automationActions),
  executions: many(automationExecutions),
}));

export const automationActionsRelations = relations(automationActions, ({ one }) => ({
  rule: one(automationRules, {
    fields: [automationActions.ruleId],
    references: [automationRules.id],
  }),
}));

export const automationExecutionsRelations = relations(automationExecutions, ({ one }) => ({
  rule: one(automationRules, {
    fields: [automationExecutions.ruleId],
    references: [automationRules.id],
  }),
}));

// ==========================================
// PHASE 4: PEOPLE OPERATING SYSTEM TABLES
// ==========================================

// Departments table
export const departments = pgTable(
  'departments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    headId: text('head_id').references(() => users.id, { onDelete: 'set null' }),
    parentId: text('parent_id'),
    color: text('color').default('#7C3AED'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_departments_workspace_id').on(table.workspaceId),
    nameIdx: index('idx_departments_name').on(table.name),
    headIdx: index('idx_departments_head_id').on(table.headId),
  })
);

// Employee Profiles table
export const employeeProfiles = pgTable(
  'employee_profiles',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
    designation: text('designation').notNull().default('Team Member'),
    managerId: text('manager_id').references(() => users.id, { onDelete: 'set null' }),
    joiningDate: timestamp('joining_date').defaultNow().notNull(),
    employmentType: text('employment_type').notNull().default('full_time'), // 'full_time' | 'part_time' | 'contractor' | 'intern'
    skills: jsonb('skills').$type<string[]>().default([]),
    bio: text('bio'),
    location: text('location').default('Remote'),
    phone: text('phone'),
    emergencyContact: text('emergency_contact'),
    status: text('status').notNull().default('active'), // 'active' | 'on_leave' | 'probation' | 'terminated'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_employee_profiles_workspace_id').on(table.workspaceId),
    userIdx: uniqueIndex('idx_employee_profiles_user_id').on(table.userId),
    departmentIdx: index('idx_employee_profiles_department_id').on(table.departmentId),
    managerIdx: index('idx_employee_profiles_manager_id').on(table.managerId),
    statusIdx: index('idx_employee_profiles_status').on(table.status),
  })
);

// Leave Requests table
export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    leaveType: text('leave_type').notNull().default('annual'), // 'annual' | 'sick' | 'casual' | 'unpaid' | 'maternity_paternity'
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    daysCount: integer('days_count').notNull().default(1),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'cancelled'
    reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_leave_requests_workspace_id').on(table.workspaceId),
    userIdx: index('idx_leave_requests_user_id').on(table.userId),
    statusIdx: index('idx_leave_requests_status').on(table.status),
    datesIdx: index('idx_leave_requests_dates').on(table.startDate, table.endDate),
  })
);

// Attendance Records table
export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // 'YYYY-MM-DD'
    checkInAt: timestamp('check_in_at'),
    checkOutAt: timestamp('check_out_at'),
    workedHours: integer('worked_hours').default(0), // in minutes
    status: text('status').notNull().default('present'), // 'present' | 'absent' | 'late' | 'half_day' | 'on_leave'
    notes: text('notes'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_attendance_records_workspace_id').on(table.workspaceId),
    userDateIdx: uniqueIndex('idx_attendance_user_date').on(table.userId, table.date),
    statusIdx: index('idx_attendance_records_status').on(table.status),
  })
);

// Goals (OKRs) table
export const goals = pgTable(
  'goals',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category').notNull().default('individual'), // 'individual' | 'team' | 'company'
    targetValue: integer('target_value').default(100),
    currentValue: integer('current_value').default(0),
    unit: text('unit').default('%'),
    progress: integer('progress').default(0), // 0 - 100
    status: text('status').notNull().default('on_track'), // 'on_track' | 'behind' | 'at_risk' | 'completed'
    linkedProjectIds: jsonb('linked_project_ids').$type<string[]>().default([]),
    linkedTaskIds: jsonb('linked_task_ids').$type<string[]>().default([]),
    startDate: timestamp('start_date').defaultNow().notNull(),
    dueDate: timestamp('due_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_goals_workspace_id').on(table.workspaceId),
    userIdx: index('idx_goals_user_id').on(table.userId),
    departmentIdx: index('idx_goals_department_id').on(table.departmentId),
    statusIdx: index('idx_goals_status').on(table.status),
  })
);

// Goal Updates table
export const goalUpdates = pgTable(
  'goal_updates',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    goalId: text('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    progressValue: integer('progress_value').notNull(),
    progressPercent: integer('progress_percent').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    goalIdx: index('idx_goal_updates_goal_id').on(table.goalId),
    userIdx: index('idx_goal_updates_user_id').on(table.userId),
  })
);

// Performance Reviews table
export const performanceReviews = pgTable(
  'performance_reviews',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reviewerId: text('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    cycle: text('cycle').notNull(), // 'Q1 2026', 'Q2 2026', 'Annual 2026'
    status: text('status').notNull().default('draft'), // 'draft' | 'self_review' | 'manager_review' | 'completed'
    selfRatings: jsonb('self_ratings').$type<Record<string, any>>().default({}),
    managerRatings: jsonb('manager_ratings').$type<Record<string, any>>().default({}),
    finalRating: text('final_rating').default('4.0'), // '1.0' - '5.0'
    strengths: text('strengths'),
    growthAreas: text('growth_areas'),
    finalComments: text('final_comments'),
    submittedAt: timestamp('submitted_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_performance_reviews_workspace_id').on(table.workspaceId),
    userIdx: index('idx_performance_reviews_user_id').on(table.userId),
    reviewerIdx: index('idx_performance_reviews_reviewer_id').on(table.reviewerId),
    cycleIdx: index('idx_performance_reviews_cycle').on(table.cycle),
    statusIdx: index('idx_performance_reviews_status').on(table.status),
  })
);

// Relations for Phase 4
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [departments.workspaceId],
    references: [workspaces.id],
  }),
  head: one(users, {
    fields: [departments.headId],
    references: [users.id],
  }),
  members: many(employeeProfiles),
}));

export const employeeProfilesRelations = relations(employeeProfiles, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [employeeProfiles.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [employeeProfiles.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [employeeProfiles.departmentId],
    references: [departments.id],
  }),
  manager: one(users, {
    fields: [employeeProfiles.managerId],
    references: [users.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [leaveRequests.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [leaveRequests.reviewerId],
    references: [users.id],
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [attendanceRecords.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [attendanceRecords.userId],
    references: [users.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [goals.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [goals.departmentId],
    references: [departments.id],
  }),
  updates: many(goalUpdates),
}));

export const goalUpdatesRelations = relations(goalUpdates, ({ one }) => ({
  goal: one(goals, {
    fields: [goalUpdates.goalId],
    references: [goals.id],
  }),
  user: one(users, {
    fields: [goalUpdates.userId],
    references: [users.id],
  }),
}));

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [performanceReviews.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [performanceReviews.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [performanceReviews.reviewerId],
    references: [users.id],
  }),
}));

// ==========================================
// CHAT & INTERNAL COMMUNICATION SYSTEM (Phase 18)
// ==========================================

export const conversations = pgTable(
  'conversations',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'dm' | 'department' | 'project' | 'announcement'
    title: text('title'),
    description: text('description'),
    departmentId: text('department_id'),
    projectId: text('project_id'),
    createdById: text('created_by_id').notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    lastMessageAt: timestamp('last_message_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_conversations_workspace_id').on(table.workspaceId),
    typeIdx: index('idx_conversations_type').on(table.type),
    departmentIdx: index('idx_conversations_department_id').on(table.departmentId),
    projectIdx: index('idx_conversations_project_id').on(table.projectId),
    lastMessageIdx: index('idx_conversations_last_message_at').on(table.lastMessageAt),
  })
);

export const conversationMembers = pgTable(
  'conversation_members',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').default('member').notNull(), // 'admin' | 'member'
    lastReadAt: timestamp('last_read_at').defaultNow(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    convUserUnique: uniqueIndex('idx_conv_members_unique').on(table.conversationId, table.userId),
    convIdx: index('idx_conv_members_conv_id').on(table.conversationId),
    userIdx: index('idx_conv_members_user_id').on(table.userId),
    workspaceIdx: index('idx_conv_members_workspace_id').on(table.workspaceId),
  })
);

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull(),
    senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    parentId: text('parent_id'),
    isPinned: boolean('is_pinned').default(false).notNull(),
    attachments: jsonb('attachments').$type<MessageAttachment[]>().default([]),
    mentions: jsonb('mentions').$type<string[]>().default([]),
    isEdited: boolean('is_edited').default(false).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    convIdx: index('idx_messages_conversation_id').on(table.conversationId),
    senderIdx: index('idx_messages_sender_id').on(table.senderId),
    workspaceIdx: index('idx_messages_workspace_id').on(table.workspaceId),
    createdIdx: index('idx_messages_created_at').on(table.createdAt),
    parentIdx: index('idx_messages_parent_id').on(table.parentId),
    pinnedIdx: index('idx_messages_is_pinned').on(table.isPinned),
  })
);

export const messageReactions = pgTable(
  'message_reactions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    msgUserEmojiUnique: uniqueIndex('idx_msg_reactions_unique').on(table.messageId, table.userId, table.emoji),
    messageIdx: index('idx_msg_reactions_message_id').on(table.messageId),
    userIdx: index('idx_msg_reactions_user_id').on(table.userId),
  })
);

export const conversationReads = pgTable(
  'conversation_reads',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lastReadMessageId: text('last_read_message_id'),
    lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
  },
  (table) => ({
    convUserUnique: uniqueIndex('idx_conv_reads_unique').on(table.conversationId, table.userId),
    convIdx: index('idx_conv_reads_conv_id').on(table.conversationId),
    userIdx: index('idx_conv_reads_user_id').on(table.userId),
  })
);


export const messageMentions = pgTable(
  'message_mentions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    mentionedUserId: text('mentioned_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    mentionType: text('mention_type').notNull(), // 'user' | 'team' | 'admins' | 'everyone'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    msgMentionUnique: uniqueIndex('idx_message_mentions_unique').on(table.messageId, table.mentionedUserId, table.mentionType),
    workspaceIdx: index('idx_message_mentions_workspace_id').on(table.workspaceId),
    messageIdx: index('idx_message_mentions_message_id').on(table.messageId),
    mentionedUserIdx: index('idx_message_mentions_user_id').on(table.mentionedUserId),
    mentionTypeIdx: index('idx_message_mentions_type').on(table.mentionType),
  })
);

export const chatSlashCommands = pgTable(
  'chat_slash_commands',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    command: text('command').notNull(), // 'task' | 'project' | 'sop' | 'remind' | 'poll'
    rawInput: text('raw_input').notNull(),
    args: text('args').notNull(),
    result: jsonb('result').notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_chat_slash_commands_workspace_id').on(table.workspaceId),
    convIdx: index('idx_chat_slash_commands_conv_id').on(table.conversationId),
    userIdx: index('idx_chat_slash_commands_user_id').on(table.userId),
    commandIdx: index('idx_chat_slash_commands_command').on(table.command),
  })
);

export const conversationContext = pgTable(
  'conversation_context',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
    teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    convUniqueIdx: uniqueIndex('idx_conversation_context_conv_unique').on(table.conversationId),
    workspaceIdx: index('idx_conversation_context_workspace_id').on(table.workspaceId),
    convIdx: index('idx_conversation_context_conv_id').on(table.conversationId),
    projectIdx: index('idx_conversation_context_project_id').on(table.projectId),
    departmentIdx: index('idx_conversation_context_department_id').on(table.departmentId),
    teamIdx: index('idx_conversation_context_team_id').on(table.teamId),
  })
);

// Phase 2F: Saved Messages table
export const savedMessages = pgTable(
  'saved_messages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userMsgWsUnique: uniqueIndex('idx_saved_messages_user_msg_ws_unique').on(table.userId, table.workspaceId, table.messageId),
    userIdx: index('idx_saved_messages_user_id').on(table.userId),
    workspaceIdx: index('idx_saved_messages_workspace_id').on(table.workspaceId),
    messageIdx: index('idx_saved_messages_message_id').on(table.messageId),
    createdAtIdx: index('idx_saved_messages_created_at').on(table.createdAt),
  })
);

// Phase 2G: Announcement Acknowledgements table
export const announcementAcknowledgements = pgTable(
  'announcement_acknowledgements',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    announcementId: text('announcement_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    acknowledgedAt: timestamp('acknowledged_at').defaultNow().notNull(),
  },
  (table) => ({
    annUserUnique: uniqueIndex('idx_announcement_ack_unique').on(table.announcementId, table.userId),
    announcementIdx: index('idx_announcement_ack_announcement_id').on(table.announcementId),
    userIdx: index('idx_announcement_ack_user_id').on(table.userId),
    workspaceIdx: index('idx_announcement_ack_workspace_id').on(table.workspaceId),
    ackAtIdx: index('idx_announcement_ack_at').on(table.acknowledgedAt),
  })
);


