# RBAC Architecture Audit & Migration Report

**Target Scope**: Backend Repositories, Services, Middlewares, and HTTP Route Controllers  
**Goal**: Verify whether the entire system uses a single, unified authorization model anchored to verified Workspace Membership  
**Status**: ARCHITECTURAL INCONSISTENCIES IDENTIFIED  

---

## Executive Summary

The codebase currently contains **three coexisting, competing authorization paradigms**:
1. **Modern Workspace RBAC (`AuthorizationContext`)**:
   Resolves the active membership role via `getAuthorizationContext(c)` or `resolveMembershipRole(c)` directly from `workspace_members.role` (PostgreSQL source of truth). This provides true multi-tenant role isolation and zero client trust.
2. **Permission-Based Middleware (`requirePermission(action)` / `can(role, action)`)**:
   Uses action strings (e.g. `'projects:read'`, `'tasks:create'`) backed by `can()` in `backend/src/lib/permissions.ts`. However, many routes mount `requirePermission` on entry, yet downstream handlers re-derive roles ad-hoc using fallback patterns like `workspace.roleInWorkspace || user.role`.
3. **Legacy / Ad-Hoc Authorization**:
   Direct string checks (`role === "admin"`, `user.role`, `effectiveRole === "employee"`), bypassing centralized permissions and relying on unverified session attributes or global user roles.

Below is the exhaustive classification of all backend modules across the four mandated sections.

---

## 1. Fully Compliant Modules

These modules either exclusively resolve verified workspace context through `getAuthorizationContext` / `resolveMembershipRole` or enforce strict capability-level authorization (`requirePermission` / `can`) without falling back to unvalidated global user roles.

### 1.1 People Management (`backend/src/routes/people.ts`)
- **Status**: **Fully Compliant**
- **Mechanism**:
  - Implements `getAuthorizationContext(c)` on all sensitive endpoints (directory profile updates, leave approvals/rejections, attendance inspection, OKR progress, performance review submission).
  - Uses `requireAdmin` and `requireLeadOrAdmin` middlewares built directly on top of `getAuthorizationContext(c)`.
  - Zero reliance on client-supplied `user.role` for authorization decisions.

### 1.2 Enterprise Audit & Compliance Center (`backend/src/routes/audit.ts`)
- **Status**: **Fully Compliant**
- **Mechanism**:
  - Protected globally with `auditRouter.use('*', authMiddleware, requireWorkspaceRole(['admin']))`.
  - Resolves membership role through `resolveMembershipRole(c)` which queries the database for active workspace membership.

### 1.3 Executive Reporting & Telemetry (`backend/src/routes/executive.ts`)
- **Status**: **Fully Compliant**
- **Mechanism**:
  - Protected globally with `executiveRouter.use('*', authMiddleware, requireWorkspaceRole(['admin']))`.
  - Fully isolates metrics to `c.get('workspace').id`.

### 1.4 Data Portability & Archive Center (`backend/src/routes/portability.ts`)
- **Status**: **Fully Compliant**
- **Mechanism**:
  - Enforces `requireWorkspaceRole(['admin'])` on workspace-level backups (`POST /export-workspace`).
  - User personal data export (`GET /export-user`) strictly scopes to the authenticated `user.id`.

### 1.5 Beta Operations & Founder Readiness (`backend/src/routes/phase16-routes.ts: founderConsoleRouter`)
- **Status**: **Fully Compliant**
- **Mechanism**:
  - Uses `requireFounder()`, `requirePlatformAdmin()`, and `requireSupport()` from `backend/src/middleware/platform-admin.ts`.
  - Protects cross-workspace founder telemetry with strict platform role verification rather than workspace-level roles.

---

## 2. Partially Compliant Modules

These modules implement `requirePermission()` or `requireWorkspaceRole()` at the routing layer, but their internal route handlers or underlying domain services drop down to legacy `role ===` checks, pass raw strings, or rely on composite fallback expressions (`workspace.roleInWorkspace || user.role`).

### 2.1 Projects Module (`backend/src/routes/projects.ts` & `backend/src/services/project-service.ts`)
- **Status**: **Partially Compliant**
- **Compliance Gaps**:
  - **Route Level**: While `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, and `DELETE /:id` use `requirePermission('projects:*')`, workflow transition routes (`POST /:id/start`, `POST /:id/progress`, `POST /:id/submit-review`, `POST /:id/approve`, `POST /:id/request-changes`) omit route-level permission middleware.
  - **Fallback Role Derivation**: Every route derives role via `const role = normalizeRole(workspace.roleInWorkspace || user.role)` instead of `resolveMembershipRole(c)`.
  - **Critical Flaw in `PATCH /:id`**: Line 141 passes `user.role` directly to `ProjectService.updateProject()` instead of `roleInWorkspace`.
  - **Service Level**: `ProjectService` contains extensive direct role checks:
    - Line 331: `if (role === 'intern')`
    - Line 362: `if (role === 'employee' && !isLead && !isOwner && !isMember ...)`
    - Line 578: `if (role === 'employee' && !isLead)`
    - Line 826: `} else if (role === 'admin') {`
    - Line 955: `if (role === 'employee' && !isOwner && !isMember)`

### 2.2 Tasks Module (`backend/src/routes/tasks.ts` & `backend/src/services/task-service.ts`)
- **Status**: **Partially Compliant**
- **Compliance Gaps**:
  - **Route Level**: Only `POST /` (`tasks:create`) and `DELETE /:id` (`tasks:delete`) use `requirePermission()`. Endpoints like `GET /`, `GET /:id`, `PUT /:id`, `PATCH /:id`, `POST /:id/start`, `POST /:id/submit-review`, `POST /:id/approve`, and `POST /:id/comments` do NOT use `requirePermission()`.
  - **Fallback Role Derivation**: Routes derive roles using `normalizeRole(workspace.roleInWorkspace || user.role)`.
  - **Service Level**: `TaskService` performs direct branching on role strings:
    - Line 245: `if (role === 'intern' || !can(role, 'tasks:create', undefined, { userId, workspaceId }))`
    - Line 390: `if (role === 'intern' && existing.assignedTo !== userId)`
    - Line 397: `if (role === 'employee')`
    - Line 491: `if (role === 'intern')`
    - Line 777: `if (role === 'intern')`
    - Line 1058: `if (role === 'employee' && existing.createdBy !== userId)`
    - Line 1115: `if (role === 'intern')`

### 2.3 Teams Module (`backend/src/routes/teams.ts` & `backend/src/services/team-service.ts`)
- **Status**: **Partially Compliant**
- **Compliance Gaps**:
  - **Route Level**: Uses `requirePermission('teams:*')` on all mutation routes.
  - **Fallback Role Derivation**: Route handlers resolve role via `normalizeRole(workspace.roleInWorkspace || user.role)`.
  - **Service Level**: `TeamService` mixes `can()` checks with direct role checks:
    - Line 34: `if (!can(role, 'teams:read', undefined, { userId, workspaceId }))`
    - Line 46: `if (role === 'employee' || role === 'intern')`
    - Line 75: `if (!can(role, 'teams:create', undefined, { userId, workspaceId }))`

### 2.4 Documents Module (`backend/src/routes/documents.ts` & `backend/src/services/document-service.ts`)
- **Status**: **Partially Compliant**
- **Compliance Gaps**:
  - **Route Level**: Read, upload, and download endpoints use `requirePermission()`. However, `DELETE /api/documents/:id` lacks `requirePermission('documents:delete')` at the routing layer and delegates deletion authorization entirely to the service.
  - **Fallback Role Derivation**: Uses `normalizeRole(workspace.roleInWorkspace || user.role)`.
  - **Service Level**: Direct string checks in `DocumentService`:
    - Line 40: `if (role === 'employee' || role === 'intern')`
    - Line 49: `if (role === 'admin')`

### 2.5 CRM Module (`backend/src/routes/crm.ts` & `backend/src/services/crm-service.ts`)
- **Status**: **Partially Compliant**
- **Compliance Gaps**:
  - **Route Level**: Routes `GET /`, `GET /:id`, `POST /`, and `DELETE /:id` enforce `requirePermission('crm:*')`. However, `PATCH /:id` and `PUT /:id` omit `requirePermission('crm:update')` on the route and rely entirely on `CrmService.updateCrmRecord()`.
  - **Service Level**: Mixes `can()` with direct role checks:
    - Line 40: `if (!can(role, 'crm:read', undefined, { userId, workspaceId }))`
    - Line 45: `if (role === 'intern') return []`
    - Line 50: `if (role === 'employee')`

### 2.6 Billing Module (`backend/src/routes/billing.ts` & `backend/src/routes/protected-modules.ts: billingRouter`)
- **Status**: **Partially Compliant**
- **Compliance Gaps**:
  - Uses `requireWorkspaceRole(['admin'])` and `requireWorkspaceRole(['admin', 'employee'])`.
  - Does not use `requirePermission('billing:read')` or `requirePermission('billing:manage')` despite these actions being defined in `backend/src/lib/permissions.ts`.

---

## 3. Legacy Authorization Modules

These modules do not utilize `AuthorizationContext`, `requirePermission`, or `can()`. They rely on direct property inspections, ad-hoc string comparisons, or missing authorization gates.

### 3.1 Work Inbox Module (`backend/src/routes/inbox.ts` & `backend/src/services/work-inbox-service.ts`)
- **Authorization Pattern**:
  - Route handler sets: `const role = workspace.roleInWorkspace || user.role || 'employee';`
  - Passes raw string to `WorkInboxService.getWorkInbox` and `WorkInboxService.executeQuickAction`.
- **Legacy Role Checks in Service**:
  - Line 49: `const isAdmin = role === 'admin';`
  - Line 50: `const isIntern = role === 'intern';`
  - Line 355: `if (isAdmin || role === 'employee')`
  - Line 466: `const isAdmin = role === 'admin';`
  - Line 545: `if (role === 'intern')`
- **Missing Architecture**: No usage of `requirePermission`, `can()`, or `AuthorizationContext`.

### 3.2 Realtime Chat Module (`backend/src/routes/chat.ts` & `backend/src/services/chat-service.ts`)
- **Authorization Pattern**:
  - Only uses `authMiddleware` on the router. No RBAC middleware is mounted.
  - Route handlers derive role ad-hoc: `const role = workspace.roleInWorkspace || user.role || 'employee';`
  - Ad-hoc checks inside handlers:
    - Line 109: `const isAdmin = role === 'admin';`
    - Line 115: `if ((conv.type === 'department' || conv.type === 'project') && !isMember && !isAdmin)`
    - Line 239: `await ChatService.deleteMessage(workspace.id, messageId, user.id, role);`
- **Missing Architecture**: No permission checks; completely absent from `backend/src/lib/permissions.ts`.

### 3.3 Presence Module (`backend/src/routes/presence.ts`)
- **Authorization Pattern**:
  - Only uses `authMiddleware`.
  - Line 26: `const userRole = workspace?.roleInWorkspace || user.role || 'employee';`
  - Direct string evaluation in `PresenceManager.getWorkspacePresence(workspaceId, userRole)`.
- **Missing Architecture**: No `AuthorizationContext` or `can()`.

### 3.4 Search Services (`backend/src/services/search-service.ts` & `backend/src/services/search-v2-service.ts`)
- **Authorization Pattern**:
  - Both `/api/search` and `/api/search/v2` routers have zero RBAC middleware.
  - Inside `SearchService`:
    - Lines 70, 181, 232, 281, 329, 376, 423: `const role = normalizeRole(user.role);` (**Crucial flaw**: inspects global user role rather than workspace role!).
    - Direct role comparisons:
      - Line 84: `if (role === 'intern')`
      - Line 108: `} else if (role === 'employee')`
      - Line 186: `if (role === 'intern')`
      - Line 238: `if (role === 'intern')`
- **Missing Architecture**: Does not use `can('*:read')` or `AuthorizationContext`.

### 3.5 Workspace Core & Settings (`backend/src/routes/workspace.ts`)
- **Authorization Pattern**:
  - Does not use `requirePermission('workspace:*')` or `requireWorkspaceRole()`.
  - Inline custom checks using `resolveMembershipRole(c)`:
    - Line 179: `if (effectiveRole === 'employee' || effectiveRole === 'intern') return 403`
    - Line 224: `if (effectiveRole === 'employee' || effectiveRole === 'intern') return 403`
    - Line 267: `if (effectiveRole === 'employee' || effectiveRole === 'intern') return 403`
- **Missing Architecture**: Bypasses `requirePermission('workspace:manage')` and `requirePermission('members:manage')`.

### 3.6 MSME Extensions — Wiki & Time Tracking (`backend/src/routes/msme-extensions.ts`)
- **Authorization Pattern**:
  - `wikiRouter.get()`: Extracts `const role = (workspace?.roleInWorkspace || user?.role || 'employee').toLowerCase()` and implements manual filtering logic.
  - `timeRouter.delete('/entries/:id')`: Inlines custom check `if (effectiveRole !== 'admin' && entry.userId !== user?.id)`.
  - `timeRouter.get('/entries')`: Inlines custom check `const filters = role === 'admin' ? {} : { userId: user?.id }`.
- **Missing Architecture**: Bypasses `can('wiki:read')`, `can('time:read')`, and `can('time:manage')`.

### 3.7 Founding Partner Router (`backend/src/routes/founding-partner.ts`)
- **Authorization Pattern**:
  - Public submission at `POST /apply` auto-provisions CRM records against the first workspace in database without workspace context.
  - `GET /metrics` has no authentication or authorization checks.
- **Missing Architecture**: No tenant isolation or RBAC middleware.

### 3.8 Onboarding & Notifications (`backend/src/routes/onboarding.ts`, `backend/src/routes/notifications.ts`)
- **Authorization Pattern**:
  - Both routers mount only `authMiddleware`.
  - Endpoints assume any authenticated user has full access to workspace notifications or onboarding state without role evaluation.

---

## 4. Required Refactors

To achieve a single, unified, and compliant authorization model across the entire platform, the following structural refactors must be executed:

### Refactor 1: Standardize Context Resolution to `AuthorizationContext`
- **Problem**: 14 routers currently resolve roles using the anti-pattern:
  ```typescript
  const role = normalizeRole(workspace.roleInWorkspace || user.role);
  ```
- **Remediation**:
  Replace this across all route handlers with:
  ```typescript
  const authCtx = await getAuthorizationContext(c);
  ```
  This guarantees that all services and handlers operate on the verified `{ userId, workspaceId, roleInWorkspace }` triple.

### Refactor 2: Consolidate Route-Level Enforcement on `requirePermission`
- **Problem**: Inconsistent route guards. For example, `POST /api/tasks` uses `requirePermission('tasks:create')`, but `PATCH /api/tasks/:id` and workflow status transitions have no route-level permission middleware.
- **Remediation**:
  - Add missing permission middleware to all endpoints:
    - Tasks updates: `requirePermission('tasks:update')`
    - Projects updates & workflows: `requirePermission('projects:update')`
    - Document deletion: `requirePermission('documents:delete')`
    - CRM updates: `requirePermission('crm:update')`
    - Workspace settings & deletion: `requirePermission('workspace:manage')`
    - Member removal: `requirePermission('members:manage')`

### Refactor 3: Eliminate Inline Role String Comparisons in Services
- **Problem**: Domain services (`ProjectService`, `TaskService`, `TeamService`, `DocumentService`, `CrmService`, `WorkInboxService`, `SearchService`) have scattered `if (role === 'intern')` and `if (role === 'employee')` checks.
- **Remediation**:
  - Replace direct comparisons with centralized capability queries:
    ```typescript
    if (!can(role, action, resource, context)) { ... }
    ```
  - Where resource ownership or assignment governs permission (e.g. Interns viewing assigned tasks vs. employees viewing team tasks), encapsulate this within `can(role, action, resource, context)` in `backend/src/lib/permissions.ts`.

### Refactor 4: Fix Global Role Bleed in `SearchService` and `ProjectService`
- **Problem**:
  - `SearchService` inspects `user.role` (global) instead of `roleInWorkspace`.
  - `projects.ts:141` passes `user.role` to `ProjectService.updateProject()`.
- **Remediation**:
  - Pass verified `authCtx.roleInWorkspace` into all search methods.
  - Fix `projects.ts:141` to pass `role` (derived from workspace membership).

### Refactor 5: Expand `Action` and `PermissionKey` Typings for Uncovered Modules
- **Problem**: Chat, Work Inbox, and Presence currently have zero permissions defined in `backend/src/lib/permissions.ts`.
- **Remediation**:
  - Add actions:
    - `'chat:read'`, `'chat:send'`, `'chat:manage'`
    - `'inbox:read'`, `'inbox:action'`
    - `'presence:view'`
  - Update `ROLE_PERMISSION_MAP` and `can()` to formalize Intern, Employee, and Admin policies for these modules.

---

## Architecture Compliance Scorecard

| Module | Classification | Primary Mechanism | Compliance Score |
|---|---|---|:---:|
| **People Management** | Fully Compliant | `getAuthorizationContext`, `requireAdmin`, `requireLeadOrAdmin` | **100%** |
| **Audit Logs** | Fully Compliant | `requireWorkspaceRole(['admin'])`, DB session verification | **100%** |
| **Executive Telemetry** | Fully Compliant | `requireWorkspaceRole(['admin'])` | **100%** |
| **Data Portability** | Fully Compliant | `requireWorkspaceRole(['admin'])` | **100%** |
| **Founder Console** | Fully Compliant | `requireFounder()`, `requirePlatformAdmin()` | **100%** |
| **Projects** | Partially Compliant | `requirePermission` on crud; missing on transitions; `role ===` in service | **65%** |
| **Tasks** | Partially Compliant | `requirePermission` on create/delete only; `role ===` in service | **60%** |
| **Teams** | Partially Compliant | `requirePermission` on mutations; `role ===` in service | **70%** |
| **Documents** | Partially Compliant | `requirePermission` on upload/download; missing on delete | **75%** |
| **CRM** | Partially Compliant | `requirePermission` on create/delete/read; missing on update | **75%** |
| **Billing** | Partially Compliant | `requireWorkspaceRole` only; no `can()` checks | **60%** |
| **Work Inbox** | Legacy Authorization | Ad-hoc `role === 'admin'` / `'intern'` branching | **25%** |
| **Realtime Chat** | Legacy Authorization | Route-level ad-hoc checks; absent from permissions system | **20%** |
| **Presence** | Legacy Authorization | Ad-hoc role string inspection | **30%** |
| **Search Engine** | Legacy Authorization | Uses global `user.role`; manual branching | **20%** |
| **Workspace Core** | Legacy Authorization | Inlined `if (role === 'employee')` checks; no permissions | **40%** |
| **MSME Extensions (Wiki/Time)** | Legacy Authorization | Inlined filtering and deletion checks | **35%** |
| **Founding Partner** | Legacy Authorization | Missing workspace scoping and public/unprotected endpoints | **10%** |
| **Onboarding & Notifications** | Legacy Authorization | `authMiddleware` only; zero role checks | **30%** |

---

*Report generated in strict accordance with the RBAC Architecture Audit specifications. No source code has been edited.*
