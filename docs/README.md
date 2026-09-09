# Workspace OS — Engineering Documentation Index

Welcome to the **Workspace OS** technical documentation directory. This collection of guides provides a comprehensive overview of the system architecture, authentication model, database schema, API design, security controls, and developer onboarding workflows.

---

## 📚 Documentation Catalog

| Document | Purpose | Target Audience |
| :--- | :--- | :--- |
| [01-architecture.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/01-architecture.md) | High-level system architecture, technology stack, directory layout, and server execution model. | All Engineers / Architects |
| [02-database.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/02-database.md) | PostgreSQL database schema, Drizzle ORM models, table relationships, and index strategy. | Backend / Database Engineers |
| [03-permission-matrix.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/03-permission-matrix.md) | Detailed Three-Tier RBAC permission matrix (Admin, Employee, Intern). | Full-Stack / Security Engineers |
| [04-auth-flow.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/04-auth-flow.md) | Authentication lifecycle, session tokens, password hashing, and cookie specification. | Backend / Frontend Engineers |
| [05-feature-matrix.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/05-feature-matrix.md) | Module-level access boundaries and resource-level scoping rules (row-level security). | Full-Stack Engineers |
| [06-api-reference.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/06-api-reference.md) | Comprehensive REST API catalog, standard response envelope, headers, and error codes. | API Consumers / Frontend / Integrators |
| [07-security-and-isolation.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/07-security-and-isolation.md) | Multi-tenant data isolation, zero client trust policy, rate limiting, and CSRF protection. | Security / DevOps / Backend |
| [08-developer-guide.md](file:///d:/Development/MAVR/Workspace-MAVR/docs/08-developer-guide.md) | Local environment setup, database migrations, seeding, test execution, and deployment. | New Developers / Contributors |

---

## 🏛️ Core Principles

1. **Source of Truth**: The `docs/` directory defines the authoritative specification for Workspace OS. Code must reflect the models and constraints documented here.
2. **Three-Tier Role Model**:
   - **ADMIN**: Unrestricted management across Workspace, Projects, Tasks, Teams, Documents, CRM, Analytics, Billing, and Settings.
   - **EMPLOYEE**: Operational execution limited to assigned projects, assigned tasks, assigned CRM leads, and shared team documents.
   - **INTERN**: Strictly constrained learning sandbox limited to assigned learning tasks and learning-tagged documents.
3. **Zero Client Trust**:
   - Never trust client-supplied `role`, `userId`, `workspaceId`, or ownership claims.
   - Every authorization check resolves through: **Session Token -> Verified User -> Workspace Membership -> Static Role Check -> Dynamic Resource Scope Check**.
4. **Target Stack**:
   - **Backend**: Node.js, Hono, Drizzle ORM, Better Auth session protocol, Neon PostgreSQL.
   - **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Vite.
