# DATABASE AUDIT — Workspace OS (Release Candidate)

**Audit Date**: September 3, 2026  
**Auditor**: Antigravity Core Reliability & Systems Audit Team  
**Database**: PostgreSQL (Neon Serverless) via Drizzle ORM (`backend/packages/database/schema.ts`)  
**Scope**: All schema definitions, indexes, foreign keys, cascade paths, nullability constraints, and migration safety  
**Status**: **HIGH-RISK SCHEMA INTEGRITY & CASCADE OMISSIONS FOUND**

---

## 1. Executive Summary

A comprehensive line-by-line audit of [`backend/packages/database/schema.ts`](file:///d:/Development/MAVR/Workspace-MAVR/backend/packages/database/schema.ts) against the 10 target modules reveals significant relational integrity gaps. While table structures have grown to support rich workplace features, **crucial foreign keys omit cascading delete constraints, key indexing paths for composite filters are missing, several tables omit `workspace_id` foreign keys, and zero test suites run against actual PostgreSQL DDL.**

---

## 2. Table-by-Table Schema Analysis

### 2.1 Chat & Internal Communication System
1. **`conversations` (`schema.ts:1566`)**:
   - `departmentId` (`text('department_id')`) and `projectId` (`text('project_id')`) lack foreign key constraints referencing `departments.id` and `projects.id`.
   - **Risk**: Deleting a project or department leaves orphaned conversations whose type remains `'project'` or `'department'`, leading to broken channel references and 404/500 errors when loading channel metadata.
2. **`conversation_members` (`schema.ts:1591`)**:
   - `workspaceId` is defined as `text('workspace_id').notNull()`, but **lacks a foreign key constraint referencing `workspaces.id` with `onDelete: 'cascade'`**.
   - Foreign key to `users.id` correctly specifies `onDelete: 'cascade'`.
   - Unique index `idx_conv_members_unique` on `(conversationId, userId)` is present and properly enforces idempotency.
3. **`messages` (`schema.ts:1610`)**:
   - `workspaceId` is defined as `text('workspace_id').notNull()`, but **omits `references(() => workspaces.id, { onDelete: 'cascade' })`**.
   - `mentions` is stored as `jsonb('mentions')`. Lacks a GIN index on `mentions`. Querying messages by user mention in SQL requires a sequential table scan across all JSONB payloads.
4. **`message_reactions` (`schema.ts:1632`)**:
   - `conversationId` is stored as `text('conversation_id').notNull()`, but **omits a foreign key constraint referencing `conversations.id` with `onDelete: 'cascade'`**.
   - If a conversation is deleted, messages are cascaded, but reactions referencing the conversation can remain orphaned if message cascading triggers before manual cleanup.
5. **`conversation_reads` (`schema.ts:1649`)**:
   - **Omits `workspace_id` entirely**.
   - Requires joining `conversations` to enforce workspace boundary isolation or to perform workspace-wide data purges (e.g. GDPR or tenant deletion).

### 2.2 Notifications & Preferences
1. **`notifications` (`schema.ts:378`)**:
   - `workspaceId`, `recipientId`, and `userId` have valid foreign keys with `onDelete: 'cascade'`.
   - `actorId` properly specifies `onDelete: 'set null'`.
   - **Missing Composite Index**: The most frequent notification query is:
     `WHERE workspace_id = $1 AND recipient_id = $2 AND is_read = false ORDER BY created_at DESC`
     Currently, separate single-column indexes exist on `workspaceId`, `recipientId`, `isRead`, and `createdAt`. PostgreSQL must perform an expensive multi-index BitmapAnd bitmap index scan.
     **Required Composite Index**: `CREATE INDEX idx_notifs_recip_read_created ON notifications (workspace_id, recipient_id, is_read, created_at DESC)`.
2. **`notification_preferences` (`schema.ts:410`)**:
   - Correctly defines `uniqueIndex('idx_notification_prefs_workspace_user').on(table.workspaceId, table.userId)`.
   - Foreign keys to `workspaces` and `users` are properly configured with `onDelete: 'cascade'`.

### 2.3 Tasks & Projects
1. **`tasks` (`schema.ts:217`)**:
   - `projectId` is defined as `text('project_id').references(() => projects.id, { onDelete: 'cascade' })`.
   - `teamId` is defined as `text('team_id')` without a foreign key to `teams.id`.
   - `assignedTo` is `text('assigned_to')` without a foreign key to `users.id`.
   - **Risk**: Deleting an employee user record deletes the user, but leaves tasks referencing a non-existent `assignedTo` string, breaking profile and assignee resolution.
2. **`task_recurrence_rules` (`schema.ts:925`) & `task_dependencies` (`schema.ts:960`)**:
   - Foreign keys to `tasks.id` are defined, but circular dependency checks are missing at the database trigger or constraint level.

### 2.4 CRM & People OS
1. **`crm_records` (`schema.ts:310`)**:
   - `assignedTo` has no foreign key constraint to `users.id`.
   - Status transitions rely on client/application validation; no SQL CHECK constraint prevents invalid status strings outside the application enum.
2. **`departments` (`schema.ts:1450`)**:
   - `headId` (`text('head_id')`) references `users.id`, but omits `onDelete: 'set null'`. If a department head user account is deleted, the cascade will fail or block user deletion with a foreign key violation error.
3. **`leave_requests` (`schema.ts:1500`)**:
   - `reviewerId` lacks `onDelete: 'set null'`.

### 2.5 Wiki & Knowledge System
1. **`wiki_pages` (`schema.ts:641`)**:
   - `authorId` lacks `onDelete: 'cascade'` or `'set null'`.
   - Hierarchical `parentPageId` lacks a cascade or cyclic path constraint. Deleting a parent wiki page can orphan all child pages in the navigation tree.

---

## 3. Database Health Scorecard

| Area | Status | Severity | Remediation |
| :--- | :---: | :---: | :--- |
| **Foreign Key Coverage** | ⚠️ Gaps Found | High | Add missing FKs on `conversation_members.workspace_id`, `messages.workspace_id`, `tasks.assigned_to` |
| **Composite Indexing** | ⚠️ Suboptimal | Medium | Add composite indexes on `(workspace_id, recipient_id, is_read, created_at)` and `(conversation_id, sender_id, created_at)` |
| **Orphan Risk** | ❌ Vulnerable | High | Add `onDelete: 'set null'` on `departments.head_id`, `leave_requests.reviewer_id` |
| **Tenant Isolation in Schema** | ⚠️ Incomplete | Medium | Add `workspace_id` to `conversation_reads` to allow direct tenant-level cascading |
| **Migration Safety** | ❌ Untested | Critical | 100% of test suites run in-memory; 0 Drizzle migrations run against real PostgreSQL in CI/CD |

---

## 4. Migration & Deployment Safety Checklist

1. **Test-Time Database Parity**:
   - All 33 automated test suites currently bypass Drizzle and PostgreSQL by running strictly against `inMemoryDb`. Any schema drift, syntax incompatibility with PostgreSQL 16 (e.g. JSONB casting, enum types), or missing NOT NULL columns will only be discovered in production upon connecting to Neon Serverless.
2. **Drizzle Migration Generator**:
   - Ensure `drizzle-kit generate` produces clean migration scripts without dropping existing production columns.
   - Run `npx drizzle-kit check` in CI/CD before any deployment to Render.
