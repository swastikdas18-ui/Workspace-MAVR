# 06 — API Reference & Contract Specification

## Overview

Workspace OS provides a unified RESTful API powered by the **Hono** framework. Every protected route requires a verified session token passed via an `Authorization: Bearer <token>` header, `x-session-token` header, or HTTP-only session cookie.

All API routes are dual-mounted:
- Standard prefix: `/api/<resource>` (e.g. `/api/projects`)
- Root prefix alias: `/<resource>` (e.g. `/projects`)

---

## Standard Response Envelopes

### Success Envelope
```json
{
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```
*(Note: Some entity endpoints return direct resource keys like `{ "projects": [...] }` or `{ "task": { ... } }`)*

### Error Envelope
```json
{
  "error": {
    "code": "UNAUTHORIZED | FORBIDDEN | NOT_FOUND | BAD_REQUEST | VALIDATION_ERROR | INTERNAL_SERVER_ERROR",
    "message": "Detailed error description"
  }
}
```

---

## Common Headers

| Header | Description | Required |
| :--- | :--- | :---: |
| `Authorization` | Bearer session token (`Bearer <token>`) | Yes (protected routes) |
| `x-session-token` | Session token alternative | Optional |
| `X-CSRF-Token` | Double-submit CSRF token for mutating browser requests | Required when using cookies |
| `Content-Type` | Set to `application/json` for request bodies | Yes (POST/PUT/PATCH) |
| `X-Response-Time` | Injected response execution time (e.g. `12ms`) | Response only |
| `X-Powered-By` | `Workspace-OS/1.0-Hono` | Response only |

---

## Route Catalog by Module

### 1. Health & Diagnostics
- `GET /api/health` — System status, uptime, node environment, timestamp.
- `GET /api/storage/health` — Object storage (S3 / Cloudflare R2) connectivity check.

### 2. Authentication (`/api/auth`)
- `POST /api/auth/register` — Registers user, creates workspace, assigns `admin` role, provisions session token.
- `POST /api/auth/login` — Verifies email and bcrypt password hash, returns active session and workspace metadata.
- `POST /api/auth/logout` — Revokes active database session and invalidates cookies.
- `GET /api/auth/session` — Re-validates active session and loads fresh user & workspace profile.

### 3. Workspaces & Members (`/api/workspace`, `/api/workspaces`, `/api/members`)
- `GET /api/workspace` — Fetch active workspace metadata and current user role.
- `PATCH /api/workspace` — Update workspace name, logo, or settings (*Admin only*).
- `GET /api/members` — List all members of the active workspace.
- `DELETE /api/members/:id` — Remove member from the workspace (*Admin only*).
- `POST /api/invites` — Create email invite with assigned role (*Admin only*).
- `POST /api/invites/accept` — Accept invitation token to join workspace.

### 4. Projects (`/api/projects`)
- `GET /api/projects` — List projects (*Admin: all; Employee: assigned only; Intern: 403 Forbidden*).
- `POST /api/projects` — Create new project (*Admin only*).
- `GET /api/projects/:id` — Fetch project details (*Admin or assigned project member*).
- `PATCH /api/projects/:id` — Update project metadata (*Admin only*).
- `DELETE /api/projects/:id` — Delete project (*Admin only*).
- `POST /api/projects/:id/progress` — Record project milestone progress (*Admin or assigned member*).

### 5. Tasks (`/api/tasks`)
- `GET /api/tasks` — List tasks (*Admin: all; Employee/Intern: assigned to self only*).
- `POST /api/tasks` — Create task (*Admin anywhere; Employee in assigned projects; Intern forbidden*).
- `GET /api/tasks/:id` — Fetch task details (*Admin or task assignee*).
- `PATCH /api/tasks/:id/status` — Update task status (*Admin, or assignee on assigned tasks*).
- `PATCH /api/tasks/:id` — Edit task title/description/dates (*Admin or task creator*).
- `DELETE /api/tasks/:id` — Delete task (*Admin only*).

### 6. Documents (`/api/documents`)
- `GET /api/documents` — List documents scoped by role (*Admin: all; Employee: public/team/learning/own; Intern: learning only*).
- `POST /api/documents` — Upload new document (*Admin: any visibility; Employee: personal/team; Intern: forbidden*).
- `DELETE /api/documents/:id` — Delete document (*Admin: any; Employee: own only; Intern: forbidden*).

### 7. CRM Pipeline (`/api/crm`)
- `GET /api/crm` — List leads (*Admin: full pipeline; Employee: own assigned leads; Intern: forbidden*).
- `POST /api/crm` — Create lead (*Admin only*).
- `PATCH /api/crm/:id` — Update lead status and notes (*Admin or assigned lead owner*).
- `DELETE /api/crm/:id` — Delete lead (*Admin only*).

### 8. Teams (`/api/teams`)
- `GET /api/teams` — List teams (*Admin: all; Employee: member teams*).
- `POST /api/teams` — Create team (*Admin only*).
- `POST /api/teams/:id/members` — Add member to team (*Admin only*).

### 9. Extended Modules
- `GET /api/analytics` — Organization metrics, task velocity, lead conversion (*Admin only*).
- `GET /api/billing` — Subscription tier, invoice history, payment gateway configuration (*Admin only*).
- `GET /api/activity` — Workspace audit trail and recent activity log.
- `GET /api/notifications` — Real-time user notifications.
- `POST /api/notifications/:id/read` — Mark notification as acknowledged.
- `GET /api/chat` & `POST /api/chat` — Team messaging channels and direct messages.
- `GET /api/search` — Unified full-text search across tasks, projects, docs, and people.
- `GET /api/automations` — Configured webhooks and automated workflow rules.
