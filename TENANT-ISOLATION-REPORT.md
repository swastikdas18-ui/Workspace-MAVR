# Cross-Tenant Data Leak Detection Security Report

**Audit Target**: Workspace OS Repositories, Services, and HTTP Endpoints  
**Audit Objective**: Prove whether Workspace A can access, mutate, or leak Workspace B data  
**Status**: VULNERABILITIES IDENTIFIED  

---

## Executive Summary

An exhaustive review of the backend services, repositories, and API routing architecture revealed multiple vulnerabilities where workspace tenant isolation is either completely absent or circumvented. These include:
1. **Cross-Tenant Billable Work Exfiltration** via unverified line item IDs in invoice generation.
2. **Platform-Wide Financial & User Telemetry Leakage** via tenant-accessible analytics and beta endpoints.
3. **Cross-Tenant Dependency Poisoning and Title Leaks** in task dependency injection.
4. **Blind Cross-Tenant Task Linkage** during manual time entry logging.
5. **Cross-Tenant Activity Logging Infiltration** via unvalidated calendar and email integration hooks.
6. **Cross-Tenant User Performance and Attendance Tampering** across People Management services.
7. **Cross-Tenant Wiki Page Deletion** in database storage layers.

---

## Vulnerability Findings

### Finding 1: Cross-Tenant Billable Work Exfiltration via Invoice Generation

1. **File**: `backend/src/services/invoice-generator-service.ts` (invoked via `backend/src/routes/phase14-routes.ts:246`)
2. **Function**: `InvoiceGeneratorService.generateInvoiceFromTimeEntries()`
3. **Missing Condition**: 
   The function accepts an array of `timeEntryIds` from the caller and retrieves each entry via `inMemoryDb.taskTimeEntries.get(entryId)`. It checks `if (entry && entry.billable)` but **never checks whether `entry.workspaceId === data.workspaceId`**.
4. **Exploit Example**:
   - **Workspace A Admin** creates an invoice by calling `POST /api/invoices/generate-from-time`:
     ```json
     {
       "clientName": "Test Client",
       "companyName": "Attacker Inc",
       "clientEmail": "attacker@corp.com",
       "timeEntryIds": ["te-wsB-secret-01"]
     }
     ```
   - `te-wsB-secret-01` is owned by **Workspace B** and contains confidential work details, logged hours, employee hourly rates, and client descriptions.
   - **Result**: `201 Created`. The generated invoice contains all line item descriptions, hours worked, and billable rates from **Workspace B**, leaking them directly into **Workspace A**'s invoice record.
5. **Severity**: **CRITICAL**

---

### Finding 2: Platform-Wide Financial & User Cohort Telemetry Leak via Tenant Analytics

1. **File**: `backend/src/routes/protected-modules.ts` (lines 61–72) & `backend/src/services/product-analytics-service.ts` (lines 138–208)
2. **Function**: `analyticsRouter.get('/founder')` and `analyticsRouter.get('/lineage')` calling `ProductAnalyticsService.getFounderAnalytics()`
3. **Missing Condition**:
   Both routes are mounted on `analyticsRouter`, protected only by `requireWorkspaceRole(['admin'])`. `getFounderAnalytics()` iterates across **all workspaces in the system** (`Array.from(inMemoryDb.workspaces.values())`), aggregating total MRR, ARR, active users, retention, churn risk, and workspace breakdown across every tenant without filtering by the caller's `workspace.id`.
4. **Exploit Example**:
   - **Workspace A Admin** requests:
     ```http
     GET /api/analytics/founder
     ```
   - **Result**: `200 OK`. The returned JSON includes global metrics:
     ```json
     {
       "mrr": 124500,
       "arr": 1494000,
       "totalWorkspaces": 48,
       "workspaces": [
         { "workspaceId": "ws-B-competitor", "name": "Competitor Corp", "healthScore": 92, "healthStatus": "healthy" }
       ]
     }
     ```
   - Workspace A learns the financial performance, total customer count, retention, and identities of every competing business on the platform.
5. **Severity**: **CRITICAL**

---

### Finding 3: Cross-Workspace Customer Success Directory & Health Leak

1. **File**: `backend/src/routes/beta.ts` (lines 60–62, 98–101) & `backend/src/services/customer-success-service.ts` (lines 139–174)
2. **Function**: `betaRouter.get('/customer-success')` & `betaRouter.get('/feedback')`
3. **Missing Condition**:
   - In `GET /api/beta/customer-success`, any workspace admin calls `CustomerSuccessService.getAllCompanyProfiles()`, which loops over `inMemoryDb.workspaces.values()` and returns all companies, their user counts, tasks completed, and health scores across the entire platform.
   - In `GET /api/beta/feedback`, passing `?crossWorkspace=true` bypasses the workspace filter: `workspaceId: c.req.query('crossWorkspace') === 'true' ? undefined : workspace?.id`.
4. **Exploit Example**:
   - **Workspace A Admin** requests:
     ```http
     GET /api/beta/customer-success
     ```
   - **Result**: `200 OK`. Receives an array of all onboarded client companies across other workspaces with active user counts and engagement statistics.
   - **Workspace A Admin** requests:
     ```http
     GET /api/beta/feedback?crossWorkspace=true
     ```
   - **Result**: `200 OK`. Receives bug reports and feedback submitted by users in **Workspace B**.
5. **Severity**: **HIGH**

---

### Finding 4: Cross-Tenant Task Title Leak & Completion Blocking via Task Dependencies

1. **File**: `backend/src/routes/phase14-routes.ts` (lines 185–196) & `backend/src/repositories/task-extension-repository.ts` (lines 116–147)
2. **Function**: `POST /api/tasks/:id/dependency` & `TaskExtensionRepository.addDependency`
3. **Missing Condition**:
   The route extracts `taskId = c.req.param('id')` and accepts `body.dependsOnTaskId`. Neither the route nor the repository verifies that `taskId` or `dependsOnTaskId` belongs to `workspace.id`. Furthermore, when `TaskExtensionRepository.canCompleteTask(taskId)` is invoked, it queries `blockingTask = inMemoryDb.tasks.get(dep.dependsOnTaskId)` and returns `{ canComplete: false, blockingTaskId, blockingTaskTitle: blockingTask.title }`.
4. **Exploit Example**:
   - **Workspace A User** submits a dependency linking their own task `task-wsA-1` to **Workspace B**'s private task `task-wsB-secret`:
     ```http
     POST /api/tasks/task-wsA-1/dependency
     Content-Type: application/json

     {
       "dependsOnTaskId": "task-wsB-secret"
     }
     ```
   - **Result**: `201 Created`.
   - When Workspace A attempts to mark `task-wsA-1` as complete, the API responds:
     ```json
     {
       "canComplete": false,
       "blockingTaskId": "task-wsB-secret",
       "blockingTaskTitle": "Acquisition Due Diligence for Project Phoenix"
     }
     ```
   - Workspace A extracts confidential task titles from Workspace B.
5. **Severity**: **HIGH**

---

### Finding 5: Cross-Tenant Task Time Logging & Activity Infiltration

1. **File**: `backend/src/repositories/time-tracking-repository.ts` (lines 217–225, 334–342)
2. **Function**: `TimeTrackingRepository.startTimer()` & `TimeTrackingRepository.logManualEntry()`
3. **Missing Condition**:
   When `taskId` is supplied in `data`, the repository executes:
   ```typescript
   const task = (await db.select().from(schema.tasks).where(eq(schema.tasks.id, data.taskId)).limit(1))[0];
   ```
   It checks `eq(schema.tasks.id, data.taskId)` without verifying `eq(schema.tasks.workspaceId, workspaceId)`.
4. **Exploit Example**:
   - **Workspace A User** logs manual time:
     ```http
     POST /api/time/entries
     Content-Type: application/json

     {
       "taskId": "task-wsB-123",
       "hours": 8,
       "description": "Cross-tenant time log"
     }
     ```
   - The query verifies `task` exists in Postgres globally.
   - **Result**: Time entry is created. When Workspace B queries time tracking logs, time entries from Workspace A users appear attached to Workspace B tasks.
5. **Severity**: **MEDIUM**

---

### Finding 6: Cross-Tenant Calendar Event & CRM Infiltration via Integrations

1. **File**: `backend/src/routes/msme-extensions.ts` (lines 579–595, 604–619)
2. **Function**: `POST /api/integrations/calendar/events` & `POST /api/integrations/email/log`
3. **Missing Condition**:
   - `POST /calendar/events` accepts `body.projectId` and `body.crmRecordId` without verifying that either belongs to `workspace.id`.
   - `POST /email/log` accepts `body.crmRecordId` without verifying that the CRM record belongs to `workspace.id`.
4. **Exploit Example**:
   - **Workspace A User** calls:
     ```http
     POST /api/integrations/email/log
     Content-Type: application/json

     {
       "crmRecordId": "crm-wsB-lead-999",
       "from": "spammer@malicious.com",
       "subject": "Phishing proposal",
       "snippet": "Fake communication"
     }
     ```
   - `crm-wsB-lead-999` belongs to **Workspace B**.
   - When **Workspace B** queries `GET /api/integrations/email/lead/crm-wsB-lead-999`, the log item from Workspace A is returned.
5. **Severity**: **MEDIUM**

---

### Finding 7: Global Role Elevation in Project Mutation

1. **File**: `backend/src/routes/projects.ts` (lines 138–144)
2. **Function**: `PATCH /api/projects/:id`
3. **Missing Condition**:
   In `PATCH /api/projects/:id`, the route invokes:
   ```typescript
   const result = await ProjectService.updateProject(
     workspace.id,
     user.id,
     user.role,       // <--- Global user role passed instead of workspace membership role!
     projectId,
     body
   );
   ```
   Every other project route correctly uses:
   `normalizeRole(workspace.roleInWorkspace || user.role)`.
4. **Exploit Example**:
   - A user who is an **Admin** in Workspace A is invited to **Workspace B** with the restricted role of **Employee** or **Intern**.
   - In Workspace B, their `user.role` remains `"admin"`.
   - In Workspace B, they issue `PATCH /api/projects/proj-wsB-1` to modify project status, budget, or title.
   - The handler passes `user.role` ("admin") instead of `workspace.roleInWorkspace` ("employee").
   - The user bypasses the employee restriction in Workspace B and executes admin actions.
5. **Severity**: **HIGH**

---

### Finding 8: Unscoped Wiki Page Deletion in Database Repository

1. **File**: `backend/src/repositories/wiki-repository.ts` (lines 248–250)
2. **Function**: `WikiRepository.deletePage(pageId)`
3. **Missing Condition**:
   In `WikiRepository.deletePage`:
   ```typescript
   await db.delete(schema.wikiPages).where(eq(schema.wikiPages.id, pageId));
   ```
   Missing `and(eq(schema.wikiPages.id, pageId), eq(schema.wikiPages.workspaceId, workspaceId))`.
   *(Note: The route handler in `msme-extensions.ts` performs an in-memory page check before calling `deletePage`, but any direct service/repository call or alternate route deletes across tenants in Postgres).*
4. **Exploit Example**:
   - Any service invoking `WikiRepository.deletePage(pageId)` without preceding workspace verification executes an unconditional delete across all workspaces in Postgres.
5. **Severity**: **MEDIUM**

---

### Finding 9: Cross-Tenant Attendance & Leave Quota Query via User ID

1. **File**: `backend/src/routes/people.ts` (lines 323–334, 386–404)
2. **Function**: `GET /api/people/leaves/balances` & `GET /api/people/attendance/history`
3. **Missing Condition**:
   - In `GET /leaves/balances`: `const targetUserId = c.req.query('userId') || user.id`. The service queries `getLeaveBalances(workspace.id, targetUserId)`. If an employee in Workspace A supplies `?userId=<user-from-Workspace-B>`, and that user has a record in the database, their leave quotas and balances are returned without checking if `targetUserId` is an active member of Workspace A.
   - In `GET /attendance/history`: `const requestedUserId = c.req.query('userId')`. An Admin in Workspace A can pass any arbitrary `userId` belonging exclusively to Workspace B. If attendance records exist under that `userId`, attendance tracking timestamps and IP addresses can be queried.
4. **Exploit Example**:
   - **Workspace A User** requests:
     ```http
     GET /api/people/leaves/balances?userId=usr-wsB-ceo
     ```
   - **Result**: `200 OK`. Returns personal leave quotas and balance history of a user belonging to another tenant.
5. **Severity**: **MEDIUM**

---

## Summary Matrix

| ID | Vulnerability | Impact | Severity |
|---|---|---|---|
| **FINDING-01** | Cross-Tenant Invoice Generation (`generateInvoiceFromTimeEntries`) | Leaks billable work, rates, hours, and descriptions from other tenants | **CRITICAL** |
| **FINDING-02** | Global Analytics & Lineage Exposure (`/api/analytics/founder`) | Exposes MRR, ARR, tenant counts, and business metrics to any tenant admin | **CRITICAL** |
| **FINDING-03** | Beta Customer Success & Cross-Workspace Feedback | Leaks competitor company profiles, active user counts, and internal feedback | **HIGH** |
| **FINDING-04** | Cross-Tenant Task Dependency Injection (`/tasks/:id/dependency`) | Leaks foreign task titles and allows blocking another tenant's task completion | **HIGH** |
| **FINDING-05** | Global Task Reference in Time Tracking (`startTimer` / `logManualEntry`) | Allows logging time against foreign workspace tasks | **MEDIUM** |
| **FINDING-06** | Integration Calendar & Email Record Poisoning (`/integrations/*`) | Injects calendar events and email history into foreign CRM records | **MEDIUM** |
| **FINDING-07** | Global Role Elevation on Project Update (`PATCH /projects/:id`) | Grants global admin rights in foreign workspaces where user is an employee | **HIGH** |
| **FINDING-08** | Unscoped Wiki Page Deletion (`WikiRepository.deletePage`) | Database delete query lacks workspace scoping | **MEDIUM** |
| **FINDING-09** | Cross-Tenant Attendance & Leave Quota Query (`/leaves/balances`) | Probes personal employee attendance and leave balances without membership verification | **MEDIUM** |

---

*Report generated in strict accordance with the Security Review guidelines. No code changes have been introduced.*
