# AGENTS.md — Workspace OS System Guidelines

## Core Principles
1. **Source of Truth**: The `docs/` directory defines the authoritative specification for Workspace OS.
2. **Three-Tier Role Model**:
   - **ADMIN**: Full management across Workspace, Teams, Projects, Tasks, CRM, Documents, Analytics, Billing, and Settings.
   - **EMPLOYEE**: Operational execution limited to assigned projects, assigned tasks, and shared organization documents.
   - **INTERN**: Restricted learning sandbox limited to assigned learning tasks and public/learning documents. No project roadmap or CRM access.
3. **Zero Client Trust**:
   - Never trust client-supplied `role`, `userId`, `workspaceId`, or ownership claims.
   - All authorization must resolve through Server-Side Session -> Verified User -> Workspace Membership -> Role Check -> Resource Scope Check.
4. **Target Stack**:
   - Backend: Node.js with Hono & Better Auth
   - Database: PostgreSQL (Neon Serverless) with Drizzle ORM
   - Frontend: React 19, TypeScript, Tailwind CSS v4, Vite
5. **UI Integrity**:
   - Do not redesign or alter the approved SaaS Split-Layout theme.
   - Preserve typography, container math, borders, backdrop blurs, and responsive behavior.
