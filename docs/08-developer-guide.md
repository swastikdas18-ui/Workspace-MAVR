# 08 — Developer Onboarding & Operational Guide

This guide assists new and contributing engineers in bootstrapping the local development environment, executing database operations, running tests, and preparing builds for production.

---

## 1. Prerequisites

Before getting started, ensure you have installed:
- **Node.js**: v20.x or v22.x LTS (`node -v`)
- **npm** / **pnpm** / **bun**: Node package manager
- **PostgreSQL**: Local instance or remote Neon Database serverless connection string

---

## 2. Environment Configuration

1. Copy the template configuration file:
   ```bash
   cp .env.example .env
   ```
2. Fill in the required environment variables:
   ```ini
   NODE_ENV=development
   PORT=3000
   DATABASE_URL="postgresql://user:password@ep-cool-pool.region.neon.tech/workspace_os?sslmode=require"
   BETTER_AUTH_SECRET="a-very-secure-random-32-character-secret-key"
   BETTER_AUTH_URL="http://localhost:3000"
   DEMO_MODE=false
   ```

---

## 3. Dependency Installation

Install workspace dependencies:
```bash
npm install
```

---

## 4. Database Operations

### Run Schema Migrations
Applies Drizzle ORM schema changes to PostgreSQL:
```bash
npm run db:migrate
```

### Seed Development Data
Seeds sample organizations, users with distinct roles (`admin`, `employee`, `intern`), tasks, and projects:
```bash
npm run db:seed
```

### Verify Database Connection & Tables
```bash
npm run db:verify
```

---

## 5. Running the Application

### Start Full-Stack Development Server
Starts the unified server (`server.ts`) which launches the Vite dev server with Hot Module Replacement (HMR) alongside the Hono API engine:
```bash
npm run dev
```
Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 6. Testing & Quality Assurance

### Run Automated Test Suite
Workspace OS includes automated integration tests covering authentication, session lifecycle, role self-promotion defense, and tenant isolation:
```bash
npm test
```

### Type Checking & Linting
Validates TypeScript compilation across frontend and backend:
```bash
npm run lint
```

### API Endpoint Audit
Inspects route registration and verifies RBAC guard middleware:
```bash
npm run audit:api
```

---

## 7. Production Build & Containerization

### Compile Production Assets
Builds Vite frontend bundle into `dist/` and compiles server code with `esbuild`:
```bash
npm run build
```

### Run Production Server
```bash
npm start
```

### Docker Container Build
Build and run using the optimized multi-stage `Dockerfile`:
```bash
docker build -t workspace-os:latest .
docker run -p 3000:3000 --env-file .env workspace-os:latest
```

---

## 8. Coding Standards & Architectural Conventions

- **Database Schemas**: Always define schemas in `backend/packages/database/schema.ts` using Drizzle ORM helpers. Export inferred types in `types.ts`.
- **API Endpoints**: Add new routes under `backend/src/routes/` and mount them in `backend/src/app.ts` under both `/api/<name>` and `/<name>`.
- **RBAC Guards**: Always apply `authMiddleware` and `requireRole(...)` or `verifyResourceOwnership` middleware on mutating routes.
- **Frontend Components**: Place UI modules in `src/components/<domain>/`. Use the `WorkspaceContext` hook to access current user, active workspace, and session tokens.
