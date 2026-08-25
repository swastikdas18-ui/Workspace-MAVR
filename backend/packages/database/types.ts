import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

export type Workspace = InferSelectModel<typeof schema.workspaces>;
export type NewWorkspace = InferInsertModel<typeof schema.workspaces>;

export type WorkspaceMember = InferSelectModel<typeof schema.workspaceMembers>;
export type NewWorkspaceMember = InferInsertModel<typeof schema.workspaceMembers>;

export type Session = InferSelectModel<typeof schema.sessions>;
export type NewSession = InferInsertModel<typeof schema.sessions>;

export type Team = InferSelectModel<typeof schema.teams>;
export type NewTeam = InferInsertModel<typeof schema.teams>;

export type TeamMember = InferSelectModel<typeof schema.teamMembers>;
export type NewTeamMember = InferInsertModel<typeof schema.teamMembers>;

export type Project = InferSelectModel<typeof schema.projects>;
export type NewProject = InferInsertModel<typeof schema.projects>;

export type ProjectMember = InferSelectModel<typeof schema.projectMembers>;
export type NewProjectMember = InferInsertModel<typeof schema.projectMembers>;

export type Task = InferSelectModel<typeof schema.tasks>;
export type NewTask = InferInsertModel<typeof schema.tasks>;

export type Document = InferSelectModel<typeof schema.documents>;
export type NewDocument = InferInsertModel<typeof schema.documents>;

export type CrmRecord = InferSelectModel<typeof schema.crmRecords>;
export type NewCrmRecord = InferInsertModel<typeof schema.crmRecords>;

export type WorkspaceInvite = InferSelectModel<typeof schema.workspaceInvites>;
export type NewWorkspaceInvite = InferInsertModel<typeof schema.workspaceInvites>;

export type TaskComment = InferSelectModel<typeof schema.taskComments>;
export type NewTaskComment = InferInsertModel<typeof schema.taskComments>;

export type Notification = InferSelectModel<typeof schema.notifications>;
export type NewNotification = InferInsertModel<typeof schema.notifications>;

export type ActivityLog = InferSelectModel<typeof schema.activityLogs>;
export type NewActivityLog = InferInsertModel<typeof schema.activityLogs>;

export type AuditLog = InferSelectModel<typeof schema.auditLogs>;
export type NewAuditLog = InferInsertModel<typeof schema.auditLogs>;

export type AutomationRule = InferSelectModel<typeof schema.automationRules>;
export type NewAutomationRule = InferInsertModel<typeof schema.automationRules>;

export type AutomationAction = InferSelectModel<typeof schema.automationActions>;
export type NewAutomationAction = InferInsertModel<typeof schema.automationActions>;

export type AutomationExecution = InferSelectModel<typeof schema.automationExecutions>;
export type NewAutomationExecution = InferInsertModel<typeof schema.automationExecutions>;

export type UserPresence = InferSelectModel<typeof schema.userPresence>;
export type NewUserPresence = InferInsertModel<typeof schema.userPresence>;

export type UserRole = 'platform_admin' | 'admin' | 'employee' | 'intern';
