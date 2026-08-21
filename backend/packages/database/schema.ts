import { pgTable, text, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'employee', 'intern']);
export const workspacePlanEnum = pgEnum('workspace_plan', ['free', 'pro', 'enterprise']);
export const teamMemberRoleEnum = pgEnum('team_member_role', ['lead', 'member']);
export const projectStatusEnum = pgEnum('project_status', ['planning', 'in_progress', 'review', 'completed', 'on_hold']);
export const projectMemberRoleEnum = pgEnum('project_member_role', ['owner', 'contributor', 'viewer']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const documentVisibilityEnum = pgEnum('document_visibility', ['public', 'team', 'private', 'learning']);
export const crmStatusEnum = pgEnum('crm_status', ['new_lead', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost']);

// Users table
export const users = pgTable('users', {
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
});

// Workspaces table
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').default('pro').notNull(), // 'free' | 'pro' | 'enterprise'
  logo: text('logo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Workspace Members table (for multi-user membership & RBAC mapping)
export const workspaceMembers = pgTable('workspace_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('employee'), // 'admin' | 'employee' | 'intern'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Sessions table (Better Auth compatible)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// Teams table
export const teams = pgTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  leadId: text('lead_id').references(() => users.id),
  color: text('color').default('#3b82f6'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Team Members table
export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleInTeam: text('role_in_team').default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
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
});

// Project Members table
export const projectMembers = pgTable('project_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('contributor').notNull(),
});

// Tasks table
export const tasks = pgTable('tasks', {
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
});

// Documents table
export const documents = pgTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').default('pdf').notNull(),
  fileSize: text('file_size').default('1.2 MB').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  visibility: text('visibility').default('team').notNull(), // 'public' | 'team' | 'private' | 'learning'
  category: text('category').default('General').notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// CRM Records table
export const crmRecords = pgTable('crm_records', {
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
});

// Relational Definitions
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  workspacesOwned: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  assignedTasks: many(tasks),
  crmLeads: many(crmRecords),
  documents: many(documents),
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
