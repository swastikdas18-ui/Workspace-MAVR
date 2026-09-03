# API CONTRACT & ROUTE AUDIT — Workspace OS (Release Candidate)

**Audit Date**: September 3, 2026  
**Auditor**: Antigravity Core Reliability & Systems Audit Team  
**Scope**: All HTTP REST Endpoints across `backend/src/routes/`  
**Status**: **INCONSISTENCIES, STATUS CODE MASKING & AUTHORIZATION OMISSIONS DETECTED**

---

## 1. Executive Summary

Every route in the backend router fleet was audited for response standardization, error envelope structures, HTTP status code accuracy, authentication guards, workspace tenancy isolation, RBAC enforcement, and input validation. While auth middleware is consistently applied across routers via `router.use('*', authMiddleware)`, the audit identified **error swallowing returning 200 OK on failures, missing input sanitization, inconsistent payload envelopes, and critical authorization bypasses in quick-action endpoints.**

---

## 2. Route Fleet Analysis

### 2.1 CRM Router (`backend/src/routes/crm.ts`)
1. **Critical Failure: Error Swallowing Masked as 200 OK**:
   - Lines 34-37 in `getLeadsHandler`:
     ```typescript
     const status = err.status || (err.code === 'FORBIDDEN' ? 403 : 200);
     if (status === 200) {
       return c.json({ leads: [] }, 200);
     }
     ```
   - **Audit Finding**: If a database crash, network timeout, or internal exception occurs while fetching CRM leads, the API intercepts the error and returns `200 OK` with an empty `{ leads: [] }` array!
   - **Impact**: The frontend silently assumes the company has zero leads, completely hiding critical database failures from observability tooling, Sentry, and operators.
2. **Missing Input Validation on Lead Creation**:
   - `POST /api/crm`: Takes raw `body` from `c.req.json()`. No runtime schema validator (Zod or TypeBox) verifies email format, string lengths, or numeric ranges for deal values.

### 2.2 Work Inbox Router (`backend/src/routes/inbox.ts`)
1. **Critical Vulnerability: Unauthorized Quick Actions**:
   - `POST /api/inbox/quick-action`:
     ```typescript
     inboxRouter.post('/quick-action', async (c) => {
       const user = c.get('user');
       const workspace = c.get('workspace');
       const body = await c.req.json().catch(() => ({}));
       const { action, payload } = body;
       const result = await WorkInboxService.executeQuickAction(workspace.id, user.id, action, payload);
       return c.json(result, 200);
     });
     ```
   - **Audit Finding**: In `WorkInboxService.executeQuickAction`:
     - `case 'approve_leave'`: Calls `PeopleRepository.reviewLeaveRequest(...)` directly **without checking if `user.id` is an Admin or Manager** in the workspace! An intern or employee can send an HTTP POST to approve their own or colleagues' leave requests.
     - `case 'mark_task_complete'`: Does not check if `user.id` is the assigned owner of the task or an administrator. Any member can mark another member's tasks complete.
2. **Inconsistent Response Schema**:
   - `GET /api/inbox` returns `{ summary: {...}, urgent: [...], today: [...], upcoming: [...], completedRecently: [...] }`.
   - `POST /api/inbox/quick-action` returns `{ success: true, message: string }`.
   - Other endpoints in the platform return `{ error: { code, message } }` on failure, but `inboxRouter` returns `{ error: err.message }` (unstructured string without error code).

### 2.3 Chat Router (`backend/src/routes/chat.ts`)
1. **Offset Query Parameter Ignored**:
   - In `GET /api/chat/conversations/:id/messages`:
     - Line 143: `const offset = offsetQuery ? parseInt(offsetQuery, 10) : 0;`
     - Line 147: `ChatService.getMessages(workspace.id, conversationId, user.id, role, limit, before);`
     - `offset` is parsed from the HTTP query string, but never passed to `ChatService.getMessages()`. Any API consumer attempting offset-based pagination silently receives only the initial un-offset results.
2. **Missing Input Bounds on Limit**:
   - `c.req.query('limit')` is parsed without an upper bound (e.g. `Math.min(limit, 100)`). A malicious client can pass `?limit=1000000` to trigger a massive memory allocation on the server.

### 2.4 People Router (`backend/src/routes/people.ts`)
1. **Tenancy Bug in `requireAdmin` Guard**:
   - Lines 10-17:
     ```typescript
     const requireAdmin = async (c: any, next: any) => {
       const user = c.get('user');
       const role = (user?.role || 'employee').toLowerCase();
       if (role !== 'admin') {
         return c.json({ error: { code: 'FORBIDDEN', message: 'Forbidden: Admin privilege required.' } }, 403);
       }
       return next();
     };
     ```
   - **Audit Finding**: The middleware reads `user.role` (the user's global role) rather than `workspace.roleInWorkspace || user.role`.
   - **Impact**: In a multi-tenant platform, a user who is an Admin in Workspace A but an Employee in Workspace B retains admin privileges in Workspace B for all People OS endpoints guarded by `requireAdmin`! Conversely, a user who is an Employee globally but elevated to Admin in Workspace B is denied access.

### 2.5 Notifications Router (`backend/src/routes/notifications.ts`)
1. **Dual Envelope Inconsistency**:
   - `GET /api/notifications/unread-count` returns:
     `{ count: number, unreadCount: number }` (duplicate keys for backwards compatibility).
   - `GET /api/notifications` returns:
     `{ notifications: [...], total: number, unreadCount: number }`.
2. **Status Code Accuracy**:
   - Status code handling is clean; invalid operations return 400 or 404, unauthenticated returns 401, and forbidden returns 403.

---

## 3. API Contract Scorecard

| Route Module | Response Format | Status Codes | Auth Enforced | Workspace Scoped | RBAC Strictness | Input Validation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`/api/inbox`** | ⚠️ Inconsistent | ✅ 200/400/500 | ✅ Yes | ✅ Yes | ❌ Missing on Quick Action | ⚠️ Partial |
| **`/api/chat`** | ✅ Consistent | ✅ 200/201/403 | ✅ Yes | ✅ Yes | ✅ Strict | ⚠️ Unbounded limit |
| **`/api/notifications`**| ⚠️ Dual count key | ✅ 200/400/500 | ✅ Yes | ✅ Yes | ✅ Strict | ✅ Validated |
| **`/api/projects`** | ✅ Standard | ✅ 200/201/403 | ✅ Yes | ✅ Yes | ✅ Strict | ✅ Validated |
| **`/api/tasks`** | ✅ Standard | ✅ 200/201/403 | ✅ Yes | ✅ Yes | ✅ Strict | ✅ Validated |
| **`/api/crm`** | ❌ 200 on error | ❌ Masked 200s | ✅ Yes | ✅ Yes | ✅ Strict | ❌ Missing schema |
| **`/api/people`** | ⚠️ Global role check| ✅ 200/403/404 | ✅ Yes | ✅ Yes | ❌ Tenant Role Leak | ⚠️ Partial |

---

## 4. Remediation Checklist

1. **Fix `inboxRouter.post('/quick-action')` Authorization**:
   - Check `workspace.roleInWorkspace || user.role` in `WorkInboxService.executeQuickAction` before delegating to `PeopleRepository` or `TaskRepository`.
2. **Fix `peopleRouter.ts` Role Resolution**:
   - Replace `user?.role` with `normalizeRole(c.get('workspace')?.roleInWorkspace || c.get('user')?.role)`.
3. **Eliminate Error Swallowing in `crm.ts`**:
   - Never return `200 OK` on uncaught exceptions. Return structured `{ error: { code: 'INTERNAL_SERVER_ERROR', message } }, 500`.
4. **Enforce Request DTO Validation via Zod**:
   - Attach a validation middleware to all POST/PUT routes to sanitize strings and enforce limits.
