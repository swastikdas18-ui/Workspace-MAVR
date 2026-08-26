import { pgTable, text, timestamp, integer, bigint, boolean, pgEnum, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'employee', 'intern', 'guest']);
export const workspacePlanEnum = pgEnum('workspace_plan', ['free', 'pro', 'enterprise']);
export const teamMemberRoleEnum = pgEnum('team_member_role', ['lead', 'member']);
export const projectStatusEnum = pgEnum('project_status', ['planning', 'in_progress', 'review', 'completed', 'on_hold']);
export const projectMemberRoleEnum = pgEnum('project_member_role', ['owner', 'contributor', 'viewer']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'completed']);
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
    plan: text('plan').default('pro').notNull(), // 'free' | 'pro' | 'enterprise'
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
    createdBy: text('created_by').notNull().references(() => users.id),
    status: text('status').default('in_progress').notNull(),
    progress: integer('progress').default(0).notNull(),
    startDate: timestamp('start_date').defaultNow().notNull(),
    dueDate: timestamp('due_date').notNull(),
    budget: text('budget'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_projects_workspace_id').on(table.workspaceId),
    createdByIdx: index('idx_projects_created_by').on(table.createdBy),
    statusIdx: index('idx_projects_status').on(table.status),
    titleIdx: index('idx_projects_title').on(table.title),
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

// Tasks table
export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').default('todo').notNull(),
    priority: text('priority').default('medium').notNull(),
    assignedTo: text('assigned_to').notNull().references(() => users.id),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    dueDate: timestamp('due_date').notNull(),
    isLearningTask: boolean('is_learning_task').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_tasks_workspace_id').on(table.workspaceId),
    projectIdx: index('idx_tasks_project_id').on(table.projectId),
    assignedToIdx: index('idx_tasks_assigned_to').on(table.assignedTo),
    statusIdx: index('idx_tasks_status').on(table.status),
    priorityIdx: index('idx_tasks_priority').on(table.priority),
    titleIdx: index('idx_tasks_title').on(table.title),
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
    visibility: text('visibility').default('team').notNull(), // 'public' | 'team' | 'private' | 'learning'
    category: text('category').default('General').notNull(),
    downloadCount: integer('download_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_documents_workspace_id').on(table.workspaceId),
    ownerIdx: index('idx_documents_owner_id').on(table.ownerId),
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
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').notNull(), // 'task_created' | 'task_assigned' | 'task_completed' | 'project_created' | 'project_updated' | 'document_uploaded' | 'invite_accepted' | 'team_created' | 'crm_stage_changed' | 'system'
    isRead: boolean('is_read').default(false).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_notifications_workspace_id').on(table.workspaceId),
    userIdx: index('idx_notifications_user_id').on(table.userId),
    isReadIdx: index('idx_notifications_is_read').on(table.isRead),
    createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
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
    entityType: text('entity_type').notNull(), // 'project' | 'task' | 'team' | 'crm' | 'document'
    triggerType: text('trigger_type').notNull(), // 'project_created' | 'project_updated' | 'project_completed' | 'task_created' | 'task_assigned' | 'task_completed' | 'task_overdue' | 'team_created' | 'member_added' | 'crm_created' | 'crm_stage_changed' | 'crm_won' | 'crm_lost' | 'document_uploaded'
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
    createdByIdx: index('idx_automation_rules_created_by').on(table.createdBy),
  })
);

// Automation Actions table
export const automationActions = pgTable(
  'automation_actions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    ruleId: text('rule_id').notNull().references(() => automationRules.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(), // 'send_notification' | 'create_activity' | 'create_audit' | 'create_task' | 'assign_task' | 'update_task_status' | 'update_project_status'
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
    ruleId: text('rule_id').notNull().references(() => automationRules.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // 'success' | 'failed'
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    executionResult: jsonb('execution_result'),
    executedAt: timestamp('executed_at').defaultNow().notNull(),
  },
  (table) => ({
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
    plan: text('plan').notNull().default('free'), // 'free' | 'starter' | 'business' | 'enterprise'
    status: text('status').notNull().default('active'), // 'active' | 'trialing' | 'past_due' | 'canceled'
    billingCycle: text('billing_cycle').notNull().default('monthly'), // 'monthly' | 'yearly'
    seats: integer('seats').notNull().default(5),
    pricePerMonth: integer('price_per_month').notNull().default(0), // in USD dollars or cents
    currentPeriodStart: timestamp('current_period_start').defaultNow().notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
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
    membersCount: integer('members_count').notNull().default(1),
    projectsCount: integer('projects_count').notNull().default(0),
    storageBytes: bigint('storage_bytes', { mode: 'number' }).notNull().default(0),
    apiRequestsCount: integer('api_requests_count').notNull().default(0),
    automationsCount: integer('automations_count').notNull().default(0),
    activeUsersCount: integer('active_users_count').notNull().default(1),
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
    currency: text('currency').notNull().default('usd'),
    status: text('status').notNull().default('paid'), // 'paid' | 'open' | 'void' | 'uncollectible'
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

// ============================================================================
// PHASE 12: ENTERPRISE MSME EXTENSIONS SCHEMAS
// ============================================================================

// 1. Wiki Pages (Notion-Lite Knowledge Base)
export const wikiPages = pgTable(
  'wiki_pages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    title: text('title').notNull().default('Untitled Page'),
    icon: text('icon').default('📄'),
    coverImage: text('cover_image'),
    slug: text('slug').notNull(),
    contentJson: jsonb('content_json').notNull().default({}),
    visibility: text('visibility').notNull().default('team'), // 'public' | 'team' | 'private' | 'learning'
    createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_wiki_pages_ws_id').on(table.workspaceId),
    parentIdx: index('idx_wiki_pages_parent_id').on(table.parentId),
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
    resolved: boolean('resolved').notNull().default(false),
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
    durationMinutes: integer('duration_minutes').notNull().default(0),
    billable: boolean('billable').notNull().default(true),
    hourlyRate: integer('hourly_rate').notNull().default(1500), // in INR (₹1,500/hr)
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
    canApprove: boolean('can_approve').notNull().default(true),
    canComment: boolean('can_comment').notNull().default(true),
    canDownload: boolean('can_download').notNull().default(true),
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
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'changes_requested'
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

// 8. Email Connections (Google / IMAP Integration)
export const emailConnections = pgTable(
  'email_connections',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('google'),
    emailAddress: text('email_address').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),
    syncEnabled: boolean('sync_enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsUserIdx: uniqueIndex('idx_email_conn_ws_user').on(table.workspaceId, table.userId),
  })
);

// 9. Calendar Events (Google Calendar Sync linked to Leads & Projects)
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
    attendees: jsonb('attendees').notNull().default([]),
    status: text('status').notNull().default('confirmed'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_cal_events_ws_id').on(table.workspaceId),
    crmIdx: index('idx_cal_events_crm_id').on(table.crmRecordId),
    startTimeIdx: index('idx_cal_events_start_time').on(table.startTime),
  })
);

// ============================================================================
// PHASE 14: ENTERPRISE REVENUE & BETA READINESS SCHEMAS
// ============================================================================

// 1. Razorpay Billing Customers
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

// 2. Razorpay Billing Subscriptions
export const billingSubscriptions = pgTable(
  'billing_subscriptions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    razorpaySubscriptionId: text('razorpay_subscription_id').notNull().unique(),
    razorpayPlanId: text('razorpay_plan_id').notNull(),
    planTier: text('plan_tier').notNull(), // 'starter' | 'business' | 'growth' | 'enterprise'
    status: text('status').notNull().default('active'), // 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired'
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    chargeAt: timestamp('charge_at'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_billing_subs_ws').on(table.workspaceId),
    rzpSubIdx: uniqueIndex('idx_billing_subs_rzp_id').on(table.razorpaySubscriptionId),
    statusIdx: index('idx_billing_subs_status').on(table.status),
  })
);

// 3. Razorpay Payments
export const billingPayments = pgTable(
  'billing_payments',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    razorpayPaymentId: text('razorpay_payment_id').notNull().unique(),
    razorpayOrderId: text('razorpay_order_id'),
    razorpaySubscriptionId: text('razorpay_subscription_id'),
    amount: integer('amount').notNull(), // in paise (e.g. 149900 = ₹1,499.00)
    currency: text('currency').notNull().default('INR'),
    status: text('status').notNull(), // 'captured' | 'failed' | 'refunded'
    method: text('method'), // 'card' | 'upi' | 'netbanking'
    errorDescription: text('error_description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_billing_payments_ws').on(table.workspaceId),
    rzpPayIdx: uniqueIndex('idx_billing_payments_rzp_id').on(table.razorpayPaymentId),
  })
);

// 4. Razorpay Webhooks History (Prevents duplicate webhook processing & replays)
export const billingWebhooks = pgTable(
  'billing_webhooks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text('event_id').notNull().unique(),
    event: text('event').notNull(), // e.g. 'subscription.charged'
    payload: jsonb('payload').notNull(),
    status: text('status').notNull().default('processed'), // 'processed' | 'failed' | 'ignored'
    processedAt: timestamp('processed_at').defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: uniqueIndex('idx_billing_webhooks_event_id').on(table.eventId),
  })
);

// 5. Recurring Task Engine (task_recurrence_rules)
export const taskRecurrenceRules = pgTable(
  'task_recurrence_rules',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    frequency: text('frequency').notNull(), // 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    interval: integer('interval').notNull().default(1),
    nextRunAt: timestamp('next_run_at').notNull(),
    paused: boolean('paused').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_task_recurrence_ws').on(table.workspaceId),
    taskIdx: uniqueIndex('idx_task_recurrence_task').on(table.taskId),
    nextRunIdx: index('idx_task_recurrence_next_run').on(table.nextRunAt),
  })
);

// 6. Multi-Assignee Tasks (task_assignees)
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

// 7. Task Dependencies (task_dependencies)
export const taskDependencies = pgTable(
  'task_dependencies',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    dependsOnTaskId: text('depends_on_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('finish_to_start'), // 'finish_to_start' | 'start_to_start' | 'finish_to_finish'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    taskDepIdx: uniqueIndex('idx_task_dep_pair').on(table.taskId, table.dependsOnTaskId),
    taskIdx: index('idx_task_dep_task').on(table.taskId),
  })
);

// 8. Custom CRM Pipelines (crm_pipelines)
export const crmPipelines = pgTable(
  'crm_pipelines',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_crm_pipelines_ws').on(table.workspaceId),
  })
);

// 9. Custom CRM Pipeline Stages (crm_pipeline_stages)
export const crmPipelineStages = pgTable(
  'crm_pipeline_stages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    pipelineId: text('pipeline_id').notNull().references(() => crmPipelines.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#3B82F6'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pipelineIdx: index('idx_crm_stages_pipeline').on(table.pipelineId),
    orderIdx: index('idx_crm_stages_order').on(table.pipelineId, table.orderIndex),
  })
);

// 10. Developer API Keys (api_keys)
export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    prefix: text('prefix').notNull(), // 'ws_live_...'
    scopes: jsonb('scopes').notNull().default([]), // ['read', 'write', 'crm', 'tasks', 'documents']
    lastUsedAt: timestamp('last_used_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_api_keys_ws').on(table.workspaceId),
    hashIdx: uniqueIndex('idx_api_keys_hash').on(table.keyHash),
  })
);

// 11. Outbound Webhooks (webhooks)
export const webhooks = pgTable(
  'webhooks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    events: jsonb('events').notNull().default([]), // ['task.created', 'lead.won', 'invoice.paid']
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_webhooks_ws').on(table.workspaceId),
  })
);

// 12. Outbound Webhook Deliveries (webhook_deliveries)
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    payload: jsonb('payload').notNull(),
    responseCode: integer('response_code'),
    responseBody: text('response_body'),
    status: text('status').notNull(), // 'delivered' | 'failed' | 'retrying'
    attempts: integer('attempts').notNull().default(1),
    deliveredAt: timestamp('delivered_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    webhookIdx: index('idx_webhook_deliv_wh').on(table.webhookId),
    statusIdx: index('idx_webhook_deliv_status').on(table.status),
  })
);

// 13. Backup Reports (backup_reports) — Phase 19B
export const backupReports = pgTable(
  'backup_reports',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    filename: text('filename').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    checksum: text('checksum').notNull(),
    status: text('status').notNull().default('pending'), // 'completed' | 'failed' | 'pending'
    verificationStatus: text('verification_status').notNull().default('unverified'), // 'verified' | 'failed' | 'unverified'
    verificationDetails: jsonb('verification_details').default({}),
    durationMs: integer('duration_ms').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('idx_backup_reports_status').on(table.status),
    createdIdx: index('idx_backup_reports_created').on(table.createdAt),
  })
);

// 14. Email Health Metrics (email_health_metrics) — Phase 19B
export const emailHealthMetrics = pgTable(
  'email_health_metrics',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id'),
    emailId: text('email_id').notNull(),
    recipient: text('recipient').notNull(),
    eventType: text('event_type').notNull(), // 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
    bounceType: text('bounce_type'), // 'hard' | 'soft'
    metadata: jsonb('metadata').default({}),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: index('idx_email_health_ws').on(table.workspaceId),
    eventIdx: index('idx_email_health_event').on(table.eventType),
    emailIdx: index('idx_email_health_email').on(table.emailId),
  })
);

// 15. Product Analytics Events (events) — Phase 21A
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

// 16. Workspace Onboarding State (onboarding_state) — Phase 21B
export const onboardingState = pgTable(
  'onboarding_state',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    completedSteps: jsonb('completed_steps').$type<string[]>().default([]),
    dismissed: boolean('dismissed').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wsIdx: uniqueIndex('idx_onboarding_ws').on(table.workspaceId),
  })
);

// 17. Notification Preferences (notification_preferences) — Phase 21C
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    emailDigest: boolean('email_digest').notNull().default(true),
    taskAssigned: boolean('task_assigned').notNull().default(true),
    taskDue: boolean('task_due').notNull().default(true),
    taskCompleted: boolean('task_completed').notNull().default(true),
    projectUpdated: boolean('project_updated').notNull().default(true),
    documentMention: boolean('document_mention').notNull().default(true),
    crmStageChanged: boolean('crm_stage_changed').notNull().default(true),
    automationExecuted: boolean('automation_executed').notNull().default(true),
    invoicePaid: boolean('invoice_paid').notNull().default(true),
    workspaceInvite: boolean('workspace_invite').notNull().default(true),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userWsIdx: uniqueIndex('idx_notif_pref_user_ws').on(table.userId, table.workspaceId),
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
