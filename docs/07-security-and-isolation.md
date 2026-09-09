# 07 — Security, Rate Limiting & Tenant Isolation

## 1. Zero Client Trust Policy

Workspace OS enforces a strict **Zero Client Trust** architectural policy. Client applications (such as the React SPA, mobile clients, or external scripts) are untrusted execution environments.

### Core Rules:
1. **No Header Spoofing**: Inbound headers like `x-user-role`, `x-user-id`, or `x-workspace-id` sent by clients are stripped and ignored by backend middleware.
2. **Session-Derived Identity**: All user identities (`user.id`), workspace associations (`workspace.id`), and organizational roles (`admin`, `employee`, `intern`) are resolved **exclusively from the cryptographically verified session token** stored in the database.
3. **Double Verification**: Even if a user has an active session, every request verifies:
   - Does the session token exist and is it unexpired?
   - Is the user currently an active member of the requested workspace?
   - What is the user's role specifically within *this* workspace?
   - Does that role permit the requested operation on the target resource?

---

## 2. Multi-Tenant Data Isolation

Workspace OS supports multi-tenancy where multiple distinct organizations share the same PostgreSQL database instance while remaining strictly isolated.

```
Incoming Request
      │
      ▼
Session Token Verification  ──► Resolves `workspaceId` & `userId`
      │
      ▼
Workspace Boundary Check    ──► Enforces `WHERE workspace_id = :workspaceId`
      │
      ▼
Resource-Level Scope Check  ──► Enforces ownership / project membership constraints
```

### Isolation Guarantees:
- **Foreign Key Constraints**: All organizational tables (`projects`, `tasks`, `teams`, `documents`, `crm_records`, `workspace_members`, `activity_logs`) enforce cascade deletes and indexing on `workspace_id`.
- **Query Scoping**: Every database query in repositories and services must include the active `workspace_id` in its SQL predicate:
  ```typescript
  // Example pattern from WorkspaceService
  const records = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, currentWorkspaceId));
  ```
- **Cross-Tenant Attack Defense**: An authenticated user belonging to Workspace A attempting to read `/api/projects/:id` belonging to Workspace B receives a `404 Not Found` or `403 Forbidden`, preventing resource enumeration attacks.

---

## 3. Defense-in-Depth Pipeline

Each HTTP request passes through a multi-layer security pipeline before hitting business logic:

1. **Security Headers (`securityHeaders`)**:
   - `Content-Security-Policy (CSP)`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security (HSTS)`
2. **CORS Enforcement (`cors`)**:
   - Explicit origin validation against approved preview and production domains.
   - Disallows wildcard credentials.
3. **CSRF Protection (`csrfProtection`)**:
   - Double-submit cookie check on state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated via cookies.
4. **Global Rate Limiting (`applyGlobalRateLimiting`)**:
   - Protects authentication endpoints (`/api/auth/*`) from brute-force password guessing.
   - Prevents denial-of-service (DoS) on intensive endpoints (search, analytics export).
5. **Session & Auth Middleware (`authMiddleware`)**:
   - Validates the session token against `sessions` table in Neon PostgreSQL.
   - Injects fresh `user` and `workspace` into Hono context `c.get('user')`.
6. **Role Guard Middleware (`requireRole('admin')`)**:
   - Enforces static tier limits before service execution.
7. **Resource Scoping Middleware (`verifyResourceOwnership`)**:
   - Dynamically checks if the resource belongs to the user or if they have assigned access.

---

## 4. Password Security & Storage

- **Algorithm**: `bcryptjs` with salt round factor of 10.
- **Sanitization**: Password hashes are stripped at the database repository layer before any user object reaches controller responses or logging layers.
- **Reset & Revocation**: Password update immediately invalidates all active database sessions, requiring re-authentication.
