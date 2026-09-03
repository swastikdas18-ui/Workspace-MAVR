# AUTH & SECURITY AUDIT REPORT: PROJECTS, TASKS, AND TEAMS

**Audit Phase**: PHASE 38A  
**Target Scope**: Projects, Tasks, and Teams Modules  
**Audited Layers**: Route Controllers (`routes/`), Domain Services (`services/`), Data Repositories (`repositories/`), Capabilities & Permissions (`lib/permissions.ts`), and Middleware (`middleware/auth.ts`, `middleware/rbac.ts`)  
**Audit Persona**: Senior SaaS Security Engineer  
**Status**: CRITICAL VULNERABILITIES DETECTED — CODE FREEZE ENFORCED UNTIL AUDIT SIGNOFF  

---

## Executive Summary

Phase 38A audited the entire lifecycle of **Projects**, **Tasks**, and **Teams** within Workspace OS across API routes, services, repositories, and permissions. The system's stated authorization paradigm is a three-tier model (**ADMIN**, **EMPLOYEE**, **INTERN**) governed by Server-Side Verified Workspace Membership and Zero Client Trust.

The audit revealed severe security flaws across all five requested audit objectives:
1. **Direct Role Checks**: 26 instances of direct role string inspections (`role === 'intern'`, `role === 'employee'`, `role === 'admin'`, `role !== 'admin'`) that bypass capability-based authorization (`can()`) and break role extensibility.
2. **Missing `AuthorizationContext` Usage**: **100% of route handlers** across `projects.ts`, `tasks.ts`, and `teams.ts` (over 25 endpoints) fail to use `getAuthorizationContext(c)`. Instead, they rely on an unsafe fallback: `normalizeRole(workspace.roleInWorkspace || user.role)`.
3. **Missing Workspace Filters**: Critical cross-workspace leakage vectors exist in `PeopleRepository` lookups where queries pass empty strings (`workspaceId = ''`), as well as missing membership checks when adding users to teams.
4. **Privilege Escalation Paths**: In `PATCH /api/projects/:id`, `projects.ts` passes global `user.role` directly to the service layer, granting users with an admin role in a personal workspace full administrative control over projects in corporate workspaces where their membership is restricted to `intern`.
5. **Cross-Tenant Access Paths**: In `TaskService.updateTask()`, the service allows reassigning `projectId` without verifying that the target project belongs to the current workspace, enabling tasks to be linked across tenant boundaries.

---

## Findings Matrix

| Severity | Finding ID | Vulnerability Summary | Primary File & Line |
|:---:|:---:|:---|:---|
| **CRITICAL** | **CRIT-01** | Privilege Escalation via Global `user.role` Bleed in Project Updates | `backend/src/routes/projects.ts:141` |
| **CRITICAL** | **CRIT-02** | Cross-Tenant Project Attachment via Unvalidated `projectId` in Task Updates | `backend/src/services/task-service.ts:535` |
| **HIGH** | **HIGH-01** | Systemic Omission of `AuthorizationContext` Across All Project, Task, and Team Routers | `routes/projects.ts`, `routes/tasks.ts`, `routes/teams.ts` |
| **HIGH** | **HIGH-02** | Missing Route-Level RBAC Middleware on Project & Task State Machine Endpoints | `routes/projects.ts:161-287`, `routes/tasks.ts:85, 135-250` |
| **HIGH** | **HIGH-03** | Foreign Tenant User Injection into Workspace Teams | `services/team-service.ts:309, 362`, `repositories/team-repository.ts:430` |
| **HIGH** | **HIGH-04** | Cross-Tenant Scope Leak in Project Lead Verification via Empty Workspace ID | `services/project-service.ts:77, 85` |
| **MEDIUM** | **MED-01** | Inadequate Access Control on Task Approvals Allowing Non-Member Employees to Approve | `services/task-service.ts:777` |
| **MEDIUM** | **MED-02** | Missing Authorization Middleware on Team Members Query Endpoint | `routes/teams.ts:144` |
| **MEDIUM** | **MED-03** | Widespread Direct Role String Comparisons Circumventing Capability Engine | `services/project-service.ts`, `services/task-service.ts`, `services/team-service.ts` |
| **LOW** | **LOW-01** | Conflicting Error Response Status Codes for Authorization Denials | `routes/tasks.ts:74, 127`, `routes/projects.ts:112` |
| **LOW** | **LOW-02** | In-Memory Fallback State Desynchronization in Hybrid Test Modes | `repositories/project-repository.ts:252`, `repositories/task-repository.ts:241` |

---

## Detailed Audit Findings

### [CRITICAL] CRIT-01: Privilege Escalation via Global `user.role` Bleed in Project Updates

- **Exact File & Line**: `backend/src/routes/projects.ts` (lines 138–144)
- **Vulnerability Category**: Privilege Escalation / Zero Client Trust Violation
- **Code Reference**:
  ```typescript
  // backend/src/routes/projects.ts:138-144
  const result = await ProjectService.updateProject(
    workspace.id,
    user.id,
    user.role, // <-- VULNERABILITY: passes global user.role instead of workspace membership role
    projectId,
    body
  );
  ```
- **Vulnerability Description**:  
  When an authenticated user creates an account or provisions their own workspace, their global user table entry (`users.role`) is set to `'admin'`. When that same user is later invited to an enterprise workspace as an `'intern'`, their `workspace_members.role` is `'intern'`, but their global `users.role` remains `'admin'`.
  In `PATCH /api/projects/:id`, line 141 passes `user.role` directly into `ProjectService.updateProject()`. The service inspects `rawRole`, which evaluates to `'admin'`. As a result, the intern bypasses all employee and intern update restrictions (e.g. line 826: `else if (role === 'admin') { // Admin has superuser override }`).
- **Exploit Scenario**:
  1. Attacker registers on Workspace OS. System creates Workspace A where Attacker is `admin`. Global `user.role = 'admin'`.
  2. Enterprise Victim invites Attacker to Workspace B as an `intern` to restrict access to non-sensitive training tasks.
  3. Attacker switches session context to Workspace B (`workspaceId = ws-victim`).
  4. Attacker identifies a project: `proj-acquisition-2026`.
  5. Attacker sends:
     ```http
     PATCH /api/projects/proj-acquisition-2026 HTTP/1.1
     Host: app.workspaceos.dev
     Content-Type: application/json
     Cookie: ws_session=<attacker_token>

     {
       "title": "Compromised Project",
       "status": "completed",
       "budget": "$10,000,000"
     }
     ```
  6. `projects.ts` executes `updateProject(workspace.id, user.id, user.role, ...)`. Since `user.role === 'admin'`, the update succeeds immediately.
  7. An intern has unilaterally modified and completed an enterprise project.
- **Recommended Fix**:
  Do not pass `user.role`. Resolve the verified role from `AuthorizationContext`:
  ```typescript
  const authCtx = await getAuthorizationContext(c);
  const result = await ProjectService.updateProject(
    authCtx.workspaceId,
    authCtx.userId,
    authCtx.roleInWorkspace,
    projectId,
    body
  );
  ```

---

### [CRITICAL] CRIT-02: Cross-Tenant Project Attachment via Unvalidated `projectId` in Task Updates

- **Exact File & Line**: `backend/src/services/task-service.ts` (lines 535–541)
- **Vulnerability Category**: Cross-Tenant Access / Missing Workspace Validation
- **Code Reference**:
  ```typescript
  // backend/src/services/task-service.ts:526-541
  const updatedTask = await TaskRepository.updateTask(workspaceId, taskId, {
    title: updates.title !== undefined ? updates.title.trim() : undefined,
    description: updates.description !== undefined ? updates.description.trim() : undefined,
    status: targetStatus,
    priority: updates.priority,
    storyPoints: updates.storyPoints || updates.story_points,
    estimatedHours: updates.estimatedHours || updates.estimated_hours,
    actualHours: updates.actualHours || updates.actual_hours,
    assignedTo: updates.assignedTo || updates.assigned_to,
    projectId: updates.projectId || updates.project_id, // <-- VULNERABILITY: No check if new projectId belongs to workspaceId!
    teamId: updates.teamId || updates.team_id,
    ...
  });
  ```
- **Vulnerability Description**:  
  When a task is created (`createTask`, lines 268–274), `TaskService` explicitly performs a cross-workspace check:
  ```typescript
  const project = await ProjectRepository.getProjectById(workspaceId, projectId.trim());
  if (!project) {
    throw new Error('Referenced project does not belong to the active workspace.');
  }
  ```
  However, in `updateTask()` (lines 460–545), if the client supplies a new `projectId` in the update payload, **no boundary validation is performed**. The service blindly passes `projectId` to `TaskRepository.updateTask()`. The repository executes a SQL `UPDATE tasks SET project_id = $1 WHERE id = $2 AND workspace_id = $3`.
  This allows a task belonging to Tenant A to be re-parented to a project belonging to Tenant B.
- **Exploit Scenario**:
  1. Attacker is a member of Tenant A (`ws-tenant-a`) and owns task `task-100`.
  2. Attacker discovers or enumerates project ID `proj-secret` belonging to Tenant B (`ws-tenant-b`).
  3. Attacker sends:
     ```http
     PATCH /api/tasks/task-100 HTTP/1.1
     Host: app.workspaceos.dev
     Content-Type: application/json
     Cookie: ws_session=<tenant_a_token>

     {
       "projectId": "proj-secret"
     }
     ```
  4. The server links `task-100` to `proj-secret`.
  5. Subsequent progress recalculation (`recalculateProjectProgress(workspaceId, "proj-secret")`) attempts to load foreign tenant data, and searches/queries for `proj-secret` now expose task details across tenant boundaries.
- **Recommended Fix**:
  In `TaskService.updateTask()`, validate any incoming `projectId` before updating:
  ```typescript
  const targetProjectId = updates.projectId || updates.project_id;
  if (targetProjectId && targetProjectId !== existing.projectId) {
    const project = await ProjectRepository.getProjectById(workspaceId, targetProjectId.trim());
    if (!project) {
      const error: any = new Error('Referenced project does not belong to the active workspace.');
      error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
      error.status = 403;
      throw error;
    }
  }
  ```

---

### [HIGH] HIGH-01: Systemic Omission of `AuthorizationContext` Across All Project, Task, and Team Routers

- **Exact File & Line**:
  - `backend/src/routes/projects.ts` (lines 23, 170, 195, 224, 249, 274, 301, 325)
  - `backend/src/routes/tasks.ts` (lines 64, 95, 122, 149, 173, 204, 235, 338, 389)
  - `backend/src/routes/teams.ts` (lines 22, 46, 71, 101, 152, 183, 209, 250, 288)
- **Vulnerability Category**: Missing AuthorizationContext Usage / Architectural Inconsistency
- **Code Reference**:
  ```typescript
  // Repeated across all 25 handlers in projects.ts, tasks.ts, and teams.ts:
  const role = normalizeRole(workspace.roleInWorkspace || user.role);
  ```
- **Vulnerability Description**:  
  Phase 36 established `getAuthorizationContext(c)` in `middleware/rbac.ts` as the single authoritative mechanism for resolving `{ userId, workspaceId, roleInWorkspace }` directly from the verified database session and `workspace_members` record.
  However, `projects.ts`, `tasks.ts`, and `teams.ts` completely ignore `getAuthorizationContext()`. Instead, they rely on:
  `workspace.roleInWorkspace || user.role`
  If `workspace.roleInWorkspace` is undefined (e.g. session deserialization glitch, partial payload, or legacy token), the code silently falls back to `user.role` (the user's global role). This completely violates tenant isolation by allowing a user's global status to override their role in the current workspace.
- **Exploit Scenario**:
  1. User is `admin` globally, but was downgraded or invited as `employee` in a specific workspace.
  2. If an API request is made where `workspace.roleInWorkspace` is missing from the session context (such as when switching workspaces or when a session cache expires), the system falls back to `user.role`.
  3. The downgraded user is treated as `admin` instead of `employee`.
- **Recommended Fix**:
  Standardize all handlers to resolve authorization context using the established middleware helper:
  ```typescript
  const authCtx = await getAuthorizationContext(c);
  // Use authCtx.userId, authCtx.workspaceId, authCtx.roleInWorkspace exclusively
  ```

---

### [HIGH] HIGH-02: Missing Route-Level RBAC Middleware on Project & Task State Machine Endpoints

- **Exact File & Line**:
  - `backend/src/routes/projects.ts` (lines 161, 186, 215, 240, 265)
  - `backend/src/routes/tasks.ts` (lines 85, 111, 141, 165, 196, 227, 355, 378)
- **Vulnerability Category**: Missing Middleware / Incomplete RBAC Coverage
- **Code Reference**:
  ```typescript
  // projects.ts:161
  projectRouter.post('/:id/start', async (c) => { ... }); // Missing requirePermission('projects:update')

  // projects.ts:240
  projectRouter.post('/:id/approve', async (c) => { ... }); // Missing requirePermission('projects:update')

  // tasks.ts:111
  taskRouter.patch('/:id', updateTaskHandler); // Missing requirePermission('tasks:update')

  // tasks.ts:196
  taskRouter.post('/:id/approve', async (c) => { ... }); // Missing requirePermission('tasks:update')
  ```
- **Vulnerability Description**:  
  While CRUD creation and deletion routes enforce `requirePermission('projects:create')`, `requirePermission('tasks:create')`, and `requirePermission('tasks:delete')`, the state transition and update routes omit `requirePermission` completely.
  These routes rely entirely on service-layer logic to check permissions. If service checks fail to account for an edge case (such as intern access to comments or task approval by non-lead employees), the route allows the request through without verifying permissions at the HTTP boundary.
- **Exploit Scenario**:
  1. An attacker sends a `PATCH /api/tasks/:id` or `POST /api/tasks/:id/approve` request.
  2. Because there is no route-level permission middleware, the request enters the handler without initial validation, increasing the attack surface if service-level checks have edge-case flaws.
- **Recommended Fix**:
  Attach explicit route permission guards to all mutating endpoints:
  - `projectRouter.post('/:id/start', requirePermission('projects:update'), ...)`
  - `projectRouter.post('/:id/approve', requirePermission('projects:update'), ...)`
  - `taskRouter.patch('/:id', requirePermission('tasks:update'), ...)`
  - `taskRouter.post('/:id/approve', requirePermission('tasks:update'), ...)`
  - `taskRouter.post('/:id/comments', requirePermission('tasks:update'), ...)`

---

### [HIGH] HIGH-03: Foreign Tenant User Injection into Workspace Teams

- **Exact File & Line**:
  - `backend/src/services/team-service.ts` (lines 290–338, 343–375)
  - `backend/src/repositories/team-repository.ts` (lines 430–460)
- **Vulnerability Category**: Missing Workspace Filter / Cross-Tenant Pollution
- **Code Reference**:
  ```typescript
  // backend/src/services/team-service.ts:309
  const member = await TeamRepository.addMember(teamId, targetUserId, roleInTeam, workspaceId);
  ```
- **Vulnerability Description**:  
  `TeamService.addMember()` and `TeamService.addMembers()` verify that the requesting caller is an `admin` (`if (role !== 'admin') throw FORBIDDEN`) and verify that `teamId` belongs to `workspaceId`.
  However, **neither the service nor the repository checks whether `targetUserId` is an active member of `workspaceId`**.
  An admin can supply any arbitrary `targetUserId` from another corporate tenant. The repository will insert a record into `team_members` and execute:
  ```sql
  UPDATE users SET team_id = $1 WHERE id = $2;
  ```
  This modifies the foreign user's record in the shared `users` table and adds them to a team in a workspace they never joined.
- **Exploit Scenario**:
  1. Admin of Tenant A (`ws-tenant-a`) wants to tamper with a user in Tenant B (`usr-victim-b`).
  2. Admin sends:
     ```http
     POST /api/teams/team-123/members HTTP/1.1
     Host: app.workspaceos.dev
     Content-Type: application/json
     Cookie: ws_session=<tenant_a_admin_token>

     {
       "userId": "usr-victim-b",
       "role": "member"
     }
     ```
  3. `team-123` belongs to Tenant A, and the caller is an admin in Tenant A.
  4. The server links `usr-victim-b` to `team-123` without checking if `usr-victim-b` is a member of `ws-tenant-a`.
  5. `usr-victim-b.teamId` is overwritten in the database, disrupting their team association in Tenant B and granting them visibility into Tenant A's team dashboard.
- **Recommended Fix**:
  Verify workspace membership in `TeamService.addMember` and `addMembers` before adding users to a team:
  ```typescript
  const [membership] = await db
    .select()
    .from(schema.workspaceMembers)
    .where(
      and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, targetUserId)
      )
    )
    .limit(1);

  if (!membership) {
    const error: any = new Error('User is not a member of this workspace.');
    error.code = 'WORKSPACE_BOUNDARY_VIOLATION';
    error.status = 400;
    throw error;
  }
  ```

---

### [HIGH] HIGH-04: Cross-Tenant Scope Leak in Project Lead Verification via Empty Workspace ID

- **Exact File & Line**: `backend/src/services/project-service.ts` (lines 73–90)
- **Vulnerability Category**: Missing Workspace Filter / Tenant Isolation Failure
- **Code Reference**:
  ```typescript
  // backend/src/services/project-service.ts:73-90
  private static async isProjectTeamLead(userId: string, projectTeamIds?: string[], departmentId?: string): Promise<boolean> {
    if (departmentId) {
      try {
        const { PeopleRepository } = await import('../repositories/people-repository.js');
        // VULNERABILITY: passes empty string '' instead of workspaceId
        const dept = await PeopleRepository.getDepartmentById('', departmentId);
        if (dept?.headId === userId) return true;
      } catch {}
    }

    if (projectTeamIds && projectTeamIds.length > 0) {
      try {
        const { PeopleRepository } = await import('../repositories/people-repository.js');
        // VULNERABILITY: passes empty string '' instead of workspaceId
        const departments = await PeopleRepository.listDepartments('');
        const userHeadDepts = departments.filter((d: any) => d.headId === userId).map((d: any) => d.id);
        if (projectTeamIds.some((tId) => userHeadDepts.includes(tId))) {
          return true;
        }
      } catch {}
    ...
  ```
- **Vulnerability Description**:  
  The helper `isProjectTeamLead` is used to determine whether a user has Team Lead / Department Head authority to approve reviews, complete projects, or start work.
  When querying departments via `PeopleRepository.getDepartmentById('', departmentId)` and `PeopleRepository.listDepartments('')`, it passes an empty string `''` instead of the active `workspaceId`.
  In `PeopleRepository`, passing an empty string causes the database query to omit the workspace filter (`where(eq(departments.workspaceId, workspaceId))`) or match globally across all departments. If `userId` is the head of a department with the same ID in any workspace, they are recognized as a lead in the current workspace.
- **Exploit Scenario**:
  1. User is Department Head of "Engineering" in Workspace A (`dept-eng`).
  2. User is also an ordinary Employee in Workspace B, which also has a department `dept-eng`.
  3. In Workspace B, a project is associated with `dept-eng`.
  4. The employee attempts to approve the project review (`POST /api/projects/:id/approve`).
  5. `isProjectTeamLead` queries `PeopleRepository.listDepartments('')` without filtering by Workspace B.
  6. The check finds that the user is head of `dept-eng` in Workspace A, returns `true`, and allows the employee to approve the project in Workspace B.
- **Recommended Fix**:
  Update `isProjectTeamLead` to accept and enforce `workspaceId`:
  ```typescript
  private static async isProjectTeamLead(
    workspaceId: string,
    userId: string,
    projectTeamIds?: string[],
    departmentId?: string
  ): Promise<boolean> {
    if (!workspaceId) throw new Error('Workspace ID is required for lead verification.');
    // Pass workspaceId into PeopleRepository methods
    const dept = await PeopleRepository.getDepartmentById(workspaceId, departmentId);
    ...
  ```

---

### [MEDIUM] MED-01: Inadequate Access Control on Task Approvals Allowing Non-Member Employees to Approve

- **Exact File & Line**: `backend/src/services/task-service.ts` (lines 776–782)
- **Vulnerability Category**: Insufficient Authorization Check
- **Code Reference**:
  ```typescript
  // backend/src/services/task-service.ts:776-782
  static async approveTask(workspaceId: string, userId: string, rawRole: UserRole | string, taskId: string, feedback?: string): Promise<any> {
    const role = normalizeRole(rawRole);
    if (role === 'intern') {
      const error: any = new Error('Interns are not authorized to approve tasks.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }
    // No check for whether an employee is assigned, a project member, or team lead!
  ```
- **Vulnerability Description**:  
  While `approveProject` in `ProjectService` strictly requires the caller to be an Admin or Team Lead (`if (role === 'employee' && !isLead) throw FORBIDDEN`), `TaskService.approveTask()` only checks `if (role === 'intern')`.
  Any user with the `'employee'` role in the workspace can approve any task, even if they are not assigned to the task, not a member of the task's project, and not a team lead.
- **Exploit Scenario**:
  1. Employee X creates task `task-99` and assigns it to themselves.
  2. Employee X moves task to `review`.
  3. Employee X immediately calls `POST /api/tasks/task-99/approve`.
  4. The task is approved and marked completed without review from an admin, lead, or peer.
- **Recommended Fix**:
  Enforce that task approval requires Admin role, Team Lead status, or project ownership:
  ```typescript
  if (role === 'employee') {
    const project = await ProjectRepository.getProjectById(workspaceId, existing.projectId);
    const isLead = await ProjectService.isProjectTeamLead(workspaceId, userId, project?.teamIds, project?.departmentId);
    const isProjectOwner = project?.createdBy === userId;
    if (!isLead && !isProjectOwner) {
      const error: any = new Error('Only Admins, Team Leads, or Project Owners can approve tasks.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }
  }
  ```

---

### [MEDIUM] MED-02: Missing Authorization Middleware on Team Members Query Endpoint

- **Exact File & Line**: `backend/src/routes/teams.ts` (lines 144–170)
- **Vulnerability Category**: Missing Route Permission Guard
- **Code Reference**:
  ```typescript
  // backend/src/routes/teams.ts:144
  teamRouter.get('/:id/members', async (c) => { // Missing requirePermission('teams:read')
  ```
- **Vulnerability Description**:  
  Every other team query endpoint (`GET /api/teams` and `GET /api/teams/:id`) explicitly enforces `requirePermission('teams:read')`. However, `GET /api/teams/:id/members` omits the middleware.
  Interns are blocked from viewing team lists by `requirePermission('teams:read')`, but can directly query `GET /api/teams/:id/members` to inspect the full names, emails, roles, and user details of team members if they obtain a team ID.
- **Exploit Scenario**:
  1. An Intern cannot list teams via `GET /api/teams` (returns 403 Forbidden).
  2. The Intern discovers a team ID (e.g. from task metadata).
  3. The Intern queries `GET /api/teams/team-leadership/members`.
  4. The request succeeds and returns member details.
- **Recommended Fix**:
  Add `requirePermission('teams:read')` to `GET /:id/members`:
  ```typescript
  teamRouter.get('/:id/members', requirePermission('teams:read'), async (c) => { ... });
  ```

---

### [MEDIUM] MED-03: Widespread Direct Role String Comparisons Circumventing Capability Engine

- **Exact File & Line**:
  - `backend/src/services/project-service.ts` (lines 331, 362, 555, 578, 804, 813, 820, 826, 930, 955)
  - `backend/src/services/task-service.ts` (lines 245, 390, 397, 491, 498, 777, 1058, 1115)
  - `backend/src/services/team-service.ts` (lines 46, 75, 191, 257, 294, 350, 412, 475)
- **Vulnerability Category**: Direct Role Check / Fragile Authorization
- **Vulnerability Description**:  
  Throughout `ProjectService`, `TaskService`, and `TeamService`, role checks are hardcoded as string comparisons (`if (role === 'intern')`, `if (role === 'employee')`, `if (role !== 'admin')`).
  This hardcoding undermines the capability engine in `lib/permissions.ts`. If custom roles (e.g. `'manager'`, `'contractor'`, `'external_auditor'`) are added, these checks will fail open or fail closed unpredictably because they do not query permissions through `can(role, action, resource, context)`.
- **Recommended Fix**:
  Replace hardcoded comparisons with capability queries:
  ```typescript
  // Instead of:
  if (role === 'intern') throw FORBIDDEN;

  // Use:
  if (!can(role, 'projects:approve', undefined, { userId, workspaceId })) {
    throw FORBIDDEN;
  }
  ```

---

### [LOW] LOW-01: Conflicting Error Response Status Codes for Authorization Denials

- **Exact File & Line**: `backend/src/routes/tasks.ts` (lines 74, 127), `backend/src/routes/projects.ts` (line 112)
- **Vulnerability Category**: Inconsistent API Error Handling
- **Description**:  
  When an authorization check fails, some handlers return HTTP 403 Forbidden, while others catch `err.status || 400` and return HTTP 400 Bad Request with a message of `VALIDATION_ERROR`. This discrepancy complicates client-side error handling and automated security monitoring.
- **Recommended Fix**:
  Ensure all permission and boundary errors return HTTP 403 Forbidden with standard error codes (`FORBIDDEN` or `WORKSPACE_BOUNDARY_VIOLATION`).

---

### [LOW] LOW-02: In-Memory Fallback State Desynchronization in Hybrid Test Modes

- **Exact File & Line**:
  - `backend/src/repositories/project-repository.ts` (lines 248–265)
  - `backend/src/repositories/task-repository.ts` (lines 236–255)
- **Vulnerability Category**: State Drift / Fault Tolerance
- **Description**:  
  If a PostgreSQL query throws a transient connection exception, the repositories silently catch the error and fall back to `inMemoryDb`. If the in-memory database does not contain recent mutations, stale data is returned, potentially bypassing security checks that rely on current database state.
- **Recommended Fix**:
  In non-test environments (`NODE_ENV === 'production'`), do not silently fall back to in-memory stores. Re-throw the database error so the request fails closed.

---

## Actionable Remediation Plan

```mermaid
flowchart TD
    subgraph Step 1: Critical Fixes
        A1[Fix CRIT-01: Pass workspace role in projects.ts:141]
        A2[Fix CRIT-02: Validate target projectId in TaskService.updateTask]
    end

    subgraph Step 2: Route & Middleware Hardening
        B1[Fix HIGH-01: Adopt getAuthorizationContext across all handlers]
        B2[Fix HIGH-02: Mount requirePermission on workflow endpoints]
        B3[Fix MED-02: Add requirePermission on GET /teams/:id/members]
    end

    subgraph Step 3: Domain Service Verification
        C1[Fix HIGH-03: Validate workspace membership in TeamService.addMember]
        C2[Fix HIGH-04: Pass workspaceId to isProjectTeamLead]
        C3[Fix MED-01: Restrict task approvals to Leads and Admins]
        C4[Fix MED-03: Replace direct role checks with can calls]
    end

    Step 1 --> Step 2
    Step 2 --> Step 3
```

---

*Report prepared in compliance with the Phase 38A Security Audit. No code has been modified.*
