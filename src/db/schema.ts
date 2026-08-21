/**
 * Workspace OS - Drizzle ORM Database Schema (PostgreSQL / Neon)
 * Defines all core tables with role-based attributes and relational constraints.
 */

// Note: Drizzle ORM schema representation for Workspace OS
export const schemaDefinitions = {
  users: `
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "employee", "intern"] }).notNull().default("employee"),
  title: text("title"),
  avatar: text("avatar"),
  teamId: text("team_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});`,

  workspaces: `
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["free", "pro", "enterprise"] }).default("pro").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`,

  teams: `
export const teams = pgTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => users.id),
  color: text("color").default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`,

  teamMembers: `
export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleInTeam: text("role_in_team", { enum: ["lead", "member"] }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});`,

  projects: `
export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  createdBy: text("created_by").notNull().references(() => users.id),
  status: text("status", { enum: ["planning", "in_progress", "review", "completed", "on_hold"] }).default("in_progress").notNull(),
  progress: integer("progress").default(0).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  budget: text("budget"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`,

  projectMembers: `
export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "contributor", "viewer"] }).default("contributor").notNull(),
});`,

  tasks: `
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "review", "completed"] }).default("todo").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium").notNull(),
  assignedTo: text("assigned_to").notNull().references(() => users.id),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  dueDate: timestamp("due_date").notNull(),
  isLearningTask: boolean("is_learning_task").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`,

  documents: `
export const documents = pgTable("documents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").default("pdf").notNull(),
  fileSize: text("file_size").default("1.2 MB").notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  visibility: text("visibility", { enum: ["public", "team", "private", "learning"] }).default("team").notNull(),
  category: text("category").default("General").notNull(),
  downloadCount: integer("download_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});`,

  crmRecords: `
export const crmRecords = pgTable("crm_records", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerName: text("customer_name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dealValue: integer("deal_value").default(0).notNull(),
  status: text("status", { enum: ["new_lead", "contacted", "proposal_sent", "negotiation", "won", "lost"] }).default("new_lead").notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastContacted: timestamp("last_contacted").defaultNow().notNull(),
});`
};
