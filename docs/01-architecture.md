# 01 — Target Backend Architecture

## Overview
Workspace OS is built as a lightweight business operating system.

## Stack
- **Runtime**: Node.js
- **API Framework**: Hono
- **Database**: PostgreSQL (Neon Database)
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth with Drizzle Adapter & bcrypt-hashed credentials
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite

## Directory Layout
```
backend/
├── packages/
│   └── database/
│       ├── schema.ts
│       ├── connection.ts
│       └── types.ts
└── src/
    ├── server.ts
    ├── app.ts
    ├── auth/
    │   ├── auth.ts
    │   └── auth-routes.ts
    ├── routes/
    │   ├── auth.ts
    │   └── workspace.ts
    ├── middleware/
    │   ├── auth.ts
    │   ├── role.ts
    │   └── permission.ts
    ├── services/
    │   ├── auth-service.ts
    │   └── workspace-service.ts
    ├── types/
    └── config/
```

## Security Pipeline
Every protected endpoint must enforce:
1. **Authentication**: Validated session token (bearer or cookie).
2. **Workspace Membership**: Verified membership in the requested workspace.
3. **Role Validation**: Static role-based gatekeeping (Admin, Employee, Intern).
4. **Permission & Resource Scope**: Dynamic ownership / assignment check (e.g. employee can only edit tasks assigned to their user ID).
