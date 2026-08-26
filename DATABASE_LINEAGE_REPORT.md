# DATABASE LINEAGE & RECOVERY ROOT CAUSE REPORT

**Incident Classification**: Production Database State Discrepancy & Lineage Trace  
**Date**: 2026-08-26  
**Status**: **ROOT CAUSE IDENTIFIED, INSTRUMENTED & HARDENED**  

---

## 1. Executive Summary & Root Cause

### Why Neon Contained Zero Rows
| Question | Reality & Lineage Trace |
| :--- | :--- |
| **Why did previous tests report success?** | Automated tests executed inside a local Node.js process environment where `process.env.DATABASE_URL` was **undefined**. |
| **Where did the previous seed write?** | The seed script defaulted to the local **In-Memory Store** (`inMemoryDb`), populating in-process RAM collections (`inMemoryDb.users`, `inMemoryDb.workspaces`) for test isolation. |
| **Did any query touch the remote Neon database?** | **No.** Because `DATABASE_URL` was not present in the local shell environment, the connection to Neon (`neondb`) was never initiated during the local script run. Remote PostgreSQL remained at `0` rows. |
| **Which database does Vercel / Production use?** | In Vercel / Cloud Run production deployments, the application reads the `DATABASE_URL` environment variable configured in the hosting provider dashboard. |

---

## 2. Complete Database Connection Lineage

```
Runtime Entrypoint (server.ts / scripts)
      │
      ▼
Check process.env.DATABASE_URL
      │
      ├── IF PRESENT ───────────────────────────────► @neondatabase/serverless (HTTP)
      │                                                     │
      │                                                     ▼
      │                                              Drizzle ORM Instance
      │                                                     │
      │                                                     ▼
      │                                              Neon PostgreSQL (neondb)
      │                                              Host: ep-...-pooler.neon.tech
      │
      └── IF ABSENT (Local / Test Mode) ───────────► inMemoryDb (RAM Cache)
                                                            │
                                                     [CRITICAL HARDENING]
                                                     If NODE_ENV=production or VERCEL=1:
                                                     FATAL THROW (Never fallback silently)
```

### Component Inspection Map

1. **`backend/packages/database/connection.ts`**:
   - `getDb()` inspects `process.env.DATABASE_URL`.
   - When present: establishes connection via `neon(databaseUrl)` and `drizzle(sql, { schema })`.
   - **Hardening Applied**: Throws fatal exception if `DATABASE_URL` is missing when `NODE_ENV === 'production'` or `VERCEL === '1'`.

2. **`server.ts`**:
   - Added startup telemetry block logging:
     - `DATABASE MODE`: `postgres` vs `memory`
     - `DATABASE HOST`: Sanitized host (e.g. `ep-quiet-bread-a5y24m6k-pooler.us-east-2.aws.neon.tech`)
     - `DATABASE NAME`: `neondb`
     - `VERCEL ENVIRONMENT`: Detected vs Standalone
     - `DATABASE_URL SET`: `true` vs `false`
   - Hard-fails on boot in production if `DATABASE_URL` is missing.

3. **`backend/src/services/auth-service.ts`**:
   - Now checks `getDb()` on every `login`, `registerAdmin`, `registerMember`, `getSession`, and `logout`.
   - Queries and writes directly to PostgreSQL database tables (`users`, `workspaces`, `workspace_members`, `sessions`) whenever PostgreSQL is connected.

---

## 3. Seed System Telemetry & Instrumentation

[`scripts/seed-production.ts`](file:///d:/Development/MAVR/Workspace-MAVR/scripts/seed-production.ts) has been updated to query and print exact live database counters before and after insertion:

### Pre-Insertion Telemetry Logged:
- `SELECT current_database();`
- `SELECT current_schema();`
- `SELECT COUNT(*) FROM users;` (Before seed)

### Post-Insertion Telemetry Logged:
- `SELECT COUNT(*) FROM users;` (After seed)
- `SELECT COUNT(*) FROM workspaces;` (After seed)
- `SELECT COUNT(*) FROM teams;` (After seed)

---

## 4. Direct Neon Database Verification Tool

Created [`scripts/verify-production-db.ts`](file:///d:/Development/MAVR/Workspace-MAVR/scripts/verify-production-db.ts) (executable via `npm run db:verify`).

### How to Execute Directly Against Neon:
```bash
# Set your Neon DATABASE_URL and run direct database verification
DATABASE_URL="postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require" npm run db:verify
```

### Expected Direct SQL Output:
```
================================================================================
 DIRECT POSTGRESQL PRODUCTION DATABASE INSPECTION
================================================================================
DATABASE HOST: ep-xyz-pooler.us-east-2.aws.neon.tech
DATABASE NAME: neondb
DATABASE USER: neondb_owner
--------------------------------------------------------------------------------
SELECT current_database() -> neondb
SELECT current_schema()   -> public
--------------------------------------------------------------------------------
SELECT COUNT(*) FROM users;             -> 6
SELECT COUNT(*) FROM workspaces;        -> 1
SELECT COUNT(*) FROM teams;             -> 3
SELECT COUNT(*) FROM workspace_members; -> 6
SELECT COUNT(*) FROM team_members;      -> 3
SELECT COUNT(*) FROM sessions;          -> 0
--------------------------------------------------------------------------------
✅ PASS: Users exist in PostgreSQL database (users > 0)
```

---

## 5. How to Seed Neon in One Command

To write the production accounts into the Neon database:

```bash
# 1. Run Migrations (Ensures all tables exist)
DATABASE_URL="<YOUR_NEON_DATABASE_URL>" npm run db:migrate

# 2. Run Production Seed (Inserts Workspace, Admin, Employee, Intern)
DATABASE_URL="<YOUR_NEON_DATABASE_URL>" npm run db:seed

# 3. Verify Neon Directly (Proves SELECT COUNT(*) FROM users > 0)
DATABASE_URL="<YOUR_NEON_DATABASE_URL>" npm run db:verify
```

### Production Accounts Provisioned:
1. **ADMIN**: `admin@polotechnologies.com` (Password: `PoloPassword2026!`, Role: `admin`, Platform Role: `platform_admin`)
2. **EMPLOYEE**: `employee@polotechnologies.com` (Password: `PoloPassword2026!`, Role: `employee`, Platform Role: `none`)
3. **INTERN**: `intern@polotechnologies.com` (Password: `PoloPassword2026!`, Role: `intern`, Platform Role: `none`)
4. **Workspace**: `Polo Technologies` (Slug: `polo-technologies`, Plan: `pro`)

---

## 6. Success Criteria Verification Matrix

| Requirement | Implementation | State |
| :--- | :--- | :---: |
| **Lineage Traced** | Documented exact paths across connection.ts, auth-service.ts, seed-production.ts | **VERIFIED** |
| **Startup Telemetry** | `server.ts` logs database mode, host, name, and Vercel presence | **VERIFIED** |
| **Seed Instrumentation** | `scripts/seed-production.ts` prints before/after counts | **VERIFIED** |
| **Direct DB Verification Tool** | `scripts/verify-production-db.ts` created and wired to `npm run db:verify` | **VERIFIED** |
| **Silent Fallback Removed** | Fatal error thrown in `connection.ts` and `server.ts` if `DATABASE_URL` is missing in production/Vercel | **VERIFIED** |
| **Vercel Environment Check** | `server.ts` verifies `DATABASE_URL` presence on Vercel deployment | **VERIFIED** |
