import { pgTable, text, timestamp, integer, boolean, pgEnum, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'employee', 'intern']);
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
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => ({
    tokenIdx: uniqueIndex('idx_sessions_token').on(table.token),
    userIdx: index('idx_sessions_user_id').on(table.userId),
    wsIdx: index('idx_sessions_ws_id').on(table.workspaceId),
    expiresIdx: index('idx_sessions_expires_at').on(table.expiresAt),
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
    storageBytes: integer('storage_bytes').notNull().default(0),
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
