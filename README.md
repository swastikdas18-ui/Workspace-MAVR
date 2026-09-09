# Workspace OS

> A lightweight, multi-tenant business operating system for modern organizations, featuring fine-grained Role-Based Access Control (RBAC), multi-tenant workspace isolation, and unified operational modules.

---

## 1. Overview

**Workspace OS** is an integrated workspace management platform designed for cross-functional organizational operations. It unifies project management, task delegation, document repository, customer relationship management (CRM), team directory, analytics, billing, and administrative governance under a single-origin full-stack architecture.

### Key Capabilities
- **Multi-Tenant Workspace Engine**: Complete workspace scoping with organization-specific data isolation.
- **Three-Tier RBAC Architecture**: Strict separation of concerns across **ADMIN**, **EMPLOYEE**, and **INTERN** roles.
- **Server-Authoritative Security**: Cryptographic session verification, bcrypt password hashing, and zero client trust.
- **Full-Stack Single Container**: React 19 SPA frontend served seamlessly by a high-throughput Hono Node.js API server.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide Icons.
- **Backend Framework**: Node.js, Hono API engine, Express router middleware.
- **Database & ORM**: PostgreSQL (Neon Database Serverless), Drizzle ORM.
- **Authentication**: Better Auth session specification with bcrypt password hashing.
- **Validation**: Zod schema validation.
- **Deployment**: Google Cloud Run / Docker containerization.

---

## 3. Repository Structure

```
workspace-os/
├── backend/
│   ├── packages/
│   │   └── database/
│   │       ├── connection.ts     # Resilient database connection store
│   │       ├── migrate.ts        # Production PostgreSQL schema migration runner
│   │       ├── schema.ts         # Drizzle ORM PostgreSQL schema definitions
│   │       └── types.ts          # InferSelectModel & InferInsertModel types
│   ├── src/
│   │   ├── app.ts                # Hono application router & middleware chain
│   │   ├── auth/                 # Authentication configuration & adapter
│   │   ├── config/               # Zod-validated environment config
│   │   ├── middleware/           # Server-authoritative auth & RBAC middleware
│   │   │   ├── auth.ts           # Session token verification
│   │   │   ├── permission.ts     # Feature matrix & resource-scoping middleware
│   │   │   └── role.ts           # Three-tier role enforcement middleware
│   │   ├── routes/               # API endpoints (/auth, /workspace)
│   │   └── services/             # Core business logic (AuthService, WorkspaceService)
│   └── tests/
│       ├── auth-rbac.test.ts     # End-to-end authentication & RBAC test suite
│       └── run-tests.ts          # Test runner script
├── docs/                         # Mandatory System Architecture Specifications
│   ├── README.md                 # Engineering documentation index & catalog
│   ├── 01-architecture.md        # Target backend architecture & security pipeline
│   ├── 02-database.md            # Drizzle ORM schema specification
│   ├── 03-permission-matrix.md   # Role-based permission matrix
│   ├── 04-auth-flow.md           # Authentication flow & session lifecycle
│   ├── 05-feature-matrix.md      # Module-level scoping rules
│   ├── 06-api-reference.md       # API endpoints, envelopes, and status codes
│   ├── 07-security-and-isolation.md # Tenant isolation, CSRF, and rate limiting
│   └── 08-developer-guide.md     # Setup, testing, migrations, and deployment
├── src/                          # React Frontend Application
│   ├── components/               # Modular UI components by domain
│   │   ├── admin/                # Admin-specific management controls
│   │   ├── auth/                 # Real authentication modals & flows
│   │   ├── crm/                  # CRM pipeline & lead tracking
│   │   ├── documents/            # Document vault & permission-scoped library
│   │   ├── projects/             # Project roadmap & progress tracker
│   │   ├── tasks/                # Kanban & sprint task management
│   │   └── workspace/            # Organization overview & team management
│   ├── context/                  # WorkspaceContext state engine & API synchronization
│   ├── lib/                      # API client, auth definitions, and utility helpers
│   ├── App.tsx                   # Main layout container
│   ├── main.tsx                  # React entry point
│   └── types.ts                  # Shared client types
├── Dockerfile                    # Multi-stage production container definition
├── .dockerignore                 # Container build exclusion rules
├── .env.example                  # Environment variable reference template
├── .gitignore                    # Git tracking ignore rules
├── package.json                  # Dependencies, build, and test scripts
├── server.ts                     # Full-stack production entry point (Vite + Hono)
├── tsconfig.json                 # TypeScript compiler configuration
└── vite.config.ts                # Vite frontend bundler configuration
```

---

## 4. Roles & Permissions Model

Workspace OS enforces a strict **Three-Tier Role Hierarchy**:

| Module | Action | Admin | Employee | Intern | Condition / Resource Scope |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Workspace** | View Overview | ✅ | ✅ | ❌ | Associated workspace members only |
| **Workspace** | Manage Settings | ✅ | ❌ | ❌ | Workspace Owner / Admin only |
| **Projects** | View All Projects | ✅ | ❌ | ❌ | Admin only |
| **Projects** | View Assigned | ✅ | ✅ | ❌ | Explicit project membership required |
| **Projects** | Create / Delete | ✅ | ❌ | ❌ | Admin only |
| **Tasks** | View All Tasks | ✅ | ❌ | ❌ | Admin only |
| **Tasks** | View Assigned Tasks| ✅ | ✅ | ✅ | Assigned user ID matching only |
| **Tasks** | Create Task | ✅ | ✅ | ❌ | Employee within assigned projects |
| **Tasks** | Update Status | ✅ | ✅ | ✅ | Assigned task scope only |
| **Documents**| View All Docs | ✅ | ❌ | ❌ | Admin only |
| **Documents**| View Org / Team | ✅ | ✅ | ❌ | Visibility: `public` or `team` |
| **Documents**| View Learning | ✅ | ✅ | ✅ | Visibility: `learning` |
| **CRM** | Full Pipeline | ✅ | ❌ | ❌ | Admin only |
| **CRM** | View / Edit Own Lead| ✅ | ✅ | ❌ | Lead owner only (`owner_id === user.id`) |
| **Billing** | View / Manage | ✅ | ❌ | ❌ | Admin only |
| **Settings** | System Config | ✅ | ❌ | ❌ | Admin only |

---

## 5. Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

| Variable | Scope | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | `production` or `development` | Runtime environment flag |
| `PORT` | Server | `3000` (dynamic on Cloud Run) | Port the HTTP server binds to |
| `DATABASE_URL` | Server | `postgresql://...` | Neon PostgreSQL pooled connection string |
| `BETTER_AUTH_SECRET` | Server | `32+ char random string` | Secret used for cryptographic session signing |
| `BETTER_AUTH_URL` | Server | `https://your-service.run.app` | Canonical base URL of the service |
| `DEMO_MODE` | Server | `false` (in production) | Set `false` to disable development demo bypasses |

---

## 6. Quick Start & Development

### Prerequisites
- Node.js 20+ or Node.js 22+
- npm (or bun / pnpm / yarn)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations (Optional for remote PostgreSQL)
```bash
npm run db:migrate
```

### 3. Start Local Development Server
```bash
npm run dev
```
The unified dev server will start at `http://localhost:3000`.

---

## 7. Testing & Verification

Workspace OS includes a comprehensive automated test suite testing:
1. Organization Admin Registration & Workspace Auto-Provisioning
2. Authentication & Bcrypt Password Verification
3. Session Generation & Invalidation on Logout
4. Role Self-Promotion Prevention
5. Server-Authoritative Identity Derivation
6. Cross-Workspace Tenant Isolation
7. Header Tampering Defense (`x-user-role`, `x-user-id`)

Run the test suite:
```bash
npm test
```

Run TypeScript compilation check:
```bash
npm run lint
```

---

## 8. Production Build

Build the unified frontend and backend bundle:
```bash
npm run build
```

Start the compiled production server:
```bash
npm start
```

---

## 9. Docker Containerization

The repository includes a multi-stage `Dockerfile` optimized for minimal size and fast startup:

### Build Container Image
```bash
docker build -t workspace-os:latest .
```

### Run Container Locally
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="your-postgresql-url" \
  -e BETTER_AUTH_SECRET="your-32-character-secret" \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  -e DEMO_MODE="false" \
  workspace-os:latest
```

---

## 10. Google Cloud Run Deployment

Deploy directly to Google Cloud Run:

```bash
gcloud run deploy workspace-os \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production,DEMO_MODE=false \
  --set-secrets DATABASE_URL=WORKSPACE_DATABASE_URL:latest,BETTER_AUTH_SECRET=WORKSPACE_AUTH_SECRET:latest
```

---

## 11. Security & Compliance Notes

1. **Zero Client Trust**: The frontend client never dictates permissions. All operations verify session tokens on the server against the database.
2. **Password Protection**: Passwords are encrypted with `bcrypt` (10 rounds) and sanitized from all outgoing API responses.
3. **Same-Origin API Architecture**: API requests use relative paths (`/api/auth/*`, `/api/workspace/*`), eliminating cross-origin exposure and CORS complexity.
4. **Resilient Health Probes**: `GET /health` and `GET /api/health` provide lightweight uptime checks without exposing database credentials or stack traces.
