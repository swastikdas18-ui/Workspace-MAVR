# REGRESSION TEST SUITE AUDIT — Workspace OS (Release Candidate)

**Audit Date**: September 3, 2026  
**Auditor**: Antigravity Quality Engineering & Reliability Team  
**Scope**: All 33 Automated Test Suites in `backend/tests/run-tests.ts` (Suites 1 through 33)  
**Status**: **SUITE PASSES 100% LOCALLY BUT SUFFERS FROM CRITICAL TEST BLIND SPOTS**

---

## 1. Executive Summary

Workspace OS possesses an extensive suite of 33 test suites covering multi-session authentication, B2 storage, wiki permissions, time tracking, project workflows, tasks, notifications MVP & V2, chat MVP & V2, and the work inbox. All 33 suites currently pass with zero failures (`33/33, 100%`). However, a critical methodological audit reveals that **the test harness executes entirely against an in-memory mock store, omitting real database transactions, migration tests, and negative attack vectors.**

---

## 2. Test Harness Architecture & Execution Profile

```
Total Test Suites Registered: 33
Passing Suites:               33 (100%)
Failing Suites:               0
Execution Time:               ~42 seconds
Database Target:              inMemoryDb (Map<string, any>)
PostgreSQL Engine Tested:     0% (DATABASE_URL absent in test harness)
```

---

## 3. Detailed Audit by Test Suite Cluster

### 3.1 Suite 1 to 10 (Core Foundations & Platform Hardening)
- **Strengths**: Strong session cookie verification, double-submit CSRF checks, and command palette permission scoping.
- **Weaknesses**:
  - `infrastructure-hardening.test.ts` tests rate limiter on `/api/*`, but does not test whether hitting root paths (`/tasks`, `/chat`) bypasses the limiter.
  - Assertions check HTTP status codes (`200`, `401`), but rarely validate database transaction rollback when an error occurs halfway through a multi-step operation.

### 3.2 Suite 11 to 20 (RBAC, Tenancy & Multi-Session)
- **Strengths**: Solid invite acceptance verification, multi-session concurrency, and cross-workspace isolation tests.
- **Weaknesses**:
  - `billing-rate-rbac.test.ts`: Only checks that employees cannot fetch rates. Lacks test for whether an employee can inject billing rates through task creation payloads.
  - `team-creation-persistence.test.ts`: Verifies in-memory map persistence across simulated requests, but does not verify foreign key cascades when a team with 20 members is deleted.

### 3.3 Suite 21 to 27 (Projects, Tasks, Automations, People OS)
- **Strengths**: Comprehensive state machine coverage for task transitions (`backlog` -> `todo` -> `in_progress` -> `review` -> `done`).
- **Weaknesses**:
  - `people-os.test.ts`: Tests leave requests and attendance, but omits testing whether an employee can approve another employee's leave request via direct API invocation.
  - `automation-engine-v2.test.ts`: Simulates rule evaluation, but does not stress-test execution timeouts when infinite automation loops occur (Rule A triggers Task Create -> triggers Rule B -> triggers Rule A).

### 3.4 Suite 28 to 30 (Notifications System MVP & Enhancements)
- **Strengths**: Thorough coverage of all 16 event triggers, deduplication, and notification retention limits.
- **Weaknesses**:
  - Lacks negative assertions verifying that notifications are NOT delivered to users in other workspaces when matching event names occur.
  - Lacks test verifying preference opt-outs for email/push channels when database columns are toggled to `false`.

### 3.5 Suite 31 & 32 (Chat MVP & Chat V2)
- **Strengths**:
  - Strict DM isolation testing (Admin cannot spy on Employee DMs).
  - Unread badge counters, mention inbox filters, typing indicator broadcasts, and reverse cursor pagination (`before` query parameter).
- **Weaknesses**:
  - Offset pagination parameter (`offset`) is parsed in router but omitted in service; tests only assert `before` cursor and limit, allowing the ignored `offset` parameter bug to escape undetected.
  - No concurrency test for simultaneous messages from 10 users in the same channel.

### 3.6 Suite 33 (Work Inbox & Priority Engine)
- **Strengths**:
  - Validates urgency sorting (`urgent > today > upcoming > completedRecently`).
  - Strict summary math assertion (`totalUnresolved === totalUrgent + totalToday`).
  - Cross-workspace isolation (Workspace B receives 0 items from Workspace A).
- **Weaknesses**:
  - **Critical Test Blind Spot**: Test 10 validates that an Admin can approve Bob's leave request via `/api/inbox/quick-action`. However, **there is NO negative test asserting that Bob (the employee) or Ian (the intern) is forbidden (403) from approving the leave request!** This missing negative test allowed the critical privilege escalation vulnerability to pass into the Release Candidate undetected.

---

## 4. Test Coverage Blind Spots & Gaps

| Area | Missing Coverage | Severity | Impact |
| :--- | :--- | :---: | :--- |
| **PostgreSQL Parity** | Real PostgreSQL database queries and transactions | **Critical** | In-memory tests pass while real SQL queries may fail on Drizzle schema mismatches |
| **Negative RBAC Tests** | Intern/Employee attempting to call `/quick-action` leave approve | **Critical** | Privileged actions unprotected against unauthorized roles |
| **Race Conditions** | Concurrent state transitions (e.g. 2 managers approving the same leave) | **High** | Dual notifications and inconsistent audit logs |
| **Input Boundary Tests** | Ultra-large payloads, SQL injection strings, XSS payloads in chat | **Medium** | Missing validation schema lets unescaped HTML into notifications |
| **Rate Limit Evasion** | Hitting non-`/api` paths | **Medium** | Rate limiter bypass undetected in automated test suite |

---

## 5. Test Suite Quality Scorecard

| Dimension | Rating | Evaluation |
| :--- | :---: | :--- |
| **Assertion Rigor** | **8.5 / 10** | High proportion of deep object property assertions |
| **Happy Path Coverage** | **9.5 / 10** | Excellent state machine and happy-path workflow coverage |
| **Negative Testing** | **5.5 / 10** | Insufficient negative role assertion on newly added endpoints |
| **Database Realism** | **3.0 / 10** | Completely mocked in memory; 0 integration runs with Neon DB |
| **Stress & Concurrency**| **4.0 / 10** | No load tests, memory leak tests, or race condition simulations |

---

## 6. Recommendations for Production Testing

1. **Add Real PostgreSQL CI/CD Workflow**:
   - Spin up a local ephemeral PostgreSQL container in GitHub Actions / CI and run `DATABASE_URL=postgres://... npx tsx backend/tests/run-tests.ts`.
2. **Add Negative Tests to Suite 33**:
   - Add Test 11: *"Employee cannot approve own leave request via quick action (Expect 403 Forbidden)"*.
   - Add Test 12: *"Intern cannot approve another user's leave request via quick action (Expect 403 Forbidden)"*.
   - Add Test 13: *"Employee cannot complete another user's task without permission (Expect 403 Forbidden)"*.
