# Workspace OS RBAC audit

Audit date: 2026-09-22. Scope: Admin, Employee, Intern, anonymous access, tenant boundaries, and resource ownership. **Security result: FAIL.** This is an audit and regression-test change; production authorization code has not been modified. The new tests deliberately assert the required secure behavior and fail where the current application violates it.

## Evidence and reproduction

- [Every mounted HTTP endpoint and alias](rbac-endpoints.md): independent role probes against the real Hono application.
- [Every JSX event binding](rbac-ui-actions.md): source inventory with file, line, handler and enclosing conditions.
- [Failing expectations](rbac-failed-cases.md): individual reproducible cases, including aliases and positive-control failures.
- [Machine-readable evidence](rbac-results.json): counts, focused assertions, HTTP observations and UI inventory.
- `npm run audit:rbac`: run tests and regenerate all evidence files; exits nonzero on failures.
- `npm run test:rbac`: same strict checks without rewriting reports.
- `npm test`: existing test suites followed by the new isolated RBAC suite.

The runner sets test mode and disables the real database **before importing the application**. It uses actual session lookup, membership resolution, middleware, services and repositories against seeded in-memory data. Every HTTP probe starts with fresh fixture maps. External `fetch` is disabled. Real payment, storage and email delivery are not verified. The existing registered suites passed before the new suite was connected to `npm test`. Repository-wide TypeScript validation reports pre-existing errors; see the validation note below.

Final local run: **647 focused checks: 517 passed, 130 failed.** The separate HTTP sweep produced 1,194 denied-boundary passes, 110 forbidden-access successes, 846 successful handler responses requiring resource-scope interpretation, and 330 inconclusive responses. Combined failure count: **240 expectations**, including aliases, repeated roles, policy mismatches and functional positive-control failures. These are grouped into 18 security findings below; the failure count is not a distinct vulnerability count. `npm run audit:rbac` exited 1, as expected for unresolved violations.

TypeScript validation found exactly three pre-existing errors: a missing `logo` on the fixture in `backend/tests/workspace-member-removal.test.ts:17`, and two uses of missing `Team.members` in `src/context/WorkspaceContext.tsx:1357` and `:1358`. None were reported in the added audit files. These unrelated application/type issues were left unchanged.

### What verification means

The HTTP inventory includes 620 method/path combinations, including root, `/api`, `/api/v2`, plural-workspace and legacy aliases. Each receives four role probes (2,480 requests). These are **boundary probes, not 2,480 successful security assertions**. `PASS` means the tested boundary rejected access; `REACHED` means a handler responded successfully but does not establish complete resource scoping; `INCONCLUSIVE` means a fixture, validation, signature, feature or infrastructure condition prevented a security conclusion. All `400`, `404` and `500` inventory results are labeled inconclusive. Focused tests use existing resources, successful controls and persisted-state checks to distinguish a real denial from an error returned after an unauthorized write.

The UI inventory contains 776 event bindings. JSX analysis includes click, submit, keyboard, selection and child callbacks; these are not 776 distinct business permissions. Render tests exercise real App routing, RoleGuard and RequireRole with injected role context and marker leaf views. This verifies direct-tab guard decisions, **not browser clicks, effects, keyboard interaction, modal state or every child component**. Handler source review supplements it. There is no claim of a complete browser end-to-end certification.

WebSocket tests exercise the real connection/message handlers with a local fake socket and real sessions. They do not open a network port or test the WebSocket upgrade/proxy layer. PostgreSQL and production session-cache behavior remain separate validation requirements. In-memory tests reproduce missing checks, but do not prove that all SQL code paths behave identically.

The strict suite also checks all 38 frontend permission flags for each of the three roles, 60 rendered view/role combinations, and fails when a new endpoint has no classified policy or a new frontend permission lacks an explicit contract. This supplements the broad sweep; it does not convert inconclusive resource probes into passes.

## Required permission matrix

Source: [documented permissions](../03-permission-matrix.md), [security contract](../07-security-and-isolation.md), and root AGENTS.md. `A` = workspace Admin; `E` = Employee; `I` = Intern; `own` = owned/assigned resource in the verified active workspace; `—` = no implemented operation or not applicable. These are **required permissions, not a claim that current enforcement matches**. Every cell is still constrained by tenant isolation. Manage Projects means project structure, membership, metadata or lifecycle administration, not assigned progress updates.

| Feature | View | Create | Edit | Delete | Manage Members | Manage Departments | Manage Projects |
|---|---|---|---|---|---|---|---|
| Workspace overview | A; E own workspace | — | — | — | — | — | — |
| Workspace creation/selection | A/E/I: own memberships and self-service onboarding | A/E/I: new own workspace | A settings | — | A within workspace | — | — |
| Workspace membership / invitations | A; E permitted directory only | A invites | A | A member removal/revoke | A | — | — |
| Teams | A; E own teams | A | A | A required; route missing | A | — | — |
| Departments / organization chart | A; E assigned scope | A | A | A | A | A | — |
| Projects / roadmaps | A; E assigned | A | A metadata; E assigned progress | A | A project membership | — | A |
| Project review approval / changes requested | A | — | A | — | — | — | A |
| Tasks | A; E assigned; I assigned learning | A; E in assigned project | A; E creator details / assigned status; I assigned learning status | A | — | — | — |
| Task assignment / recurrence / dependencies | A; E relevant assigned tasks | A; E permitted own recurrence/dependency only* | A assignment; scoped operational edits* | — | — | — | — |
| Task comments / activity / discussion | Same scope as parent task | A/E within task scope; I comment policy unspecified* | — | — | — | — | — |
| Organization documents | A; E shared; I public/learning | A | — | A; E owned documents | — | — | — |
| Personal documents | A; E own | A/E own vault | — | A; E own | — | — | — |
| Document download / raw file access | Same visibility as parent document | — | — | — | — | — | — |
| Wiki / knowledge pages* | A; E shared/own; I public/learning | A/E | A; E own | A; E own | — | — | — |
| Wiki comments* | Same visibility as parent page | A/E on visible pages | — | — | — | — | — |
| CRM leads | A; E assigned | A | A; E assigned notes/status | A | — | — | — |
| CRM pipelines / forecasts | A | A | — | — | — | — | — |
| Analytics / executive metrics / exports | A workspace scope | A telemetry as applicable | — | — | — | — | — |
| Billing / usage / subscription | A | A | A | — (cancel is subscription management) | — | — | — |
| Settings / admin tools / audit | A workspace scope | A applicable configuration | A | — | A applicable controls | — | — |
| People profiles* | A; E permitted directory; I own only | A / own profile initialization | A; E/I own non-administrative fields | — | A | A assignment | — |
| Leave requests* | A; E/I own | A/E/I own | A review; no self-approval | — | — | — | — |
| Attendance* | A; E/I own | A/E/I own check-in | A/E/I own check-out | — | — | — | — |
| Goals / OKRs* | A; E/I own | A; E/I own | A; E/I own | — | — | — | — |
| Performance reviews* | A; E/I own | A | A manager review; E/I own self-review | — | — | — | — |
| Time tracking* | A; E/I own | A/E/I scoped task | A/E/I own timer stop | A; E/I own | — | — | — |
| Time billing rates / utilization reports* | A | A applicable profile | A | — | — | — | — |
| Notifications / preferences* | A/E/I own recipient data | System; A/E/I own preferences | A/E/I own read/archive/preferences | A/E/I own | — | — | — |
| Notification retention sweep* | — | — | A workspace-wide sweep | — | — | — | — |
| Search / command palette* | Same role/resource visibility as results | — | — | — | — | — | — |
| Activity / presence / real-time events* | A; E/I only permitted entity payloads | A/E/I own presence | A/E/I own presence | — | — | — | — |
| Automations* | A | A | A; manual privileged triggers A | A | — | — | — |
| Calendar / CRM email integration* | A; E scoped linked resources; I none | A; E scoped operational records | — | — | — | — | — |
| Developer API keys / webhooks* | A | A | — | — | — | — | — |
| Workspace import/export / portability* | A workspace export; all own personal export | A import | — | Own account erasure, subject to ownership rules | — | — | — |
| Onboarding / feedback / NPS* | Own state; A aggregate reports | A/E/I own submissions | Own onboarding; A feedback triage | — | — | — | — |
| Guest approvals* | Explicit guest token/resource grant | A invitations | Token-bound approval | — | A guest invitations | — | — |
| Platform founder console / global partner applications* | None of A/E/I solely by workspace role | Platform operator | Platform operator | — | — | — | — |
| Public auth / invite preview / application form | Public minimal/token-bound data | Public signup/application; verified invite acceptance | Own session/account | Own logout/session revocation | — | — | — |
| Health / infrastructure diagnostics* | Public minimal liveness/readiness; A or platform operator for sensitive diagnostics | — | Restricted backup verification | — | — | — | — |

`*` Extension features are not fully specified by docs/03. The matrix applies the zero-client-trust and resource-scope rules to these features, and distinguishes proposed least-privilege boundaries from explicit core policy. Time/HR self-service is existing product behavior outside the strict wording of the intern learning sandbox; its product authorization must be documented explicitly. Extra `lead`, `manager`, `dept_head`, `founder`, `platform_admin` and `guest` roles exist in code but are outside the requested three-role model; they cannot be assumed to be authorized exceptions. Public learning documents follow AGENTS.md where docs/03 is narrower.

## Confirmed vulnerabilities and remediation

Severity is qualitative; no CVSS score is asserted. IDs group root causes, not every failing alias or role. The exact failing case list is generated separately.

| ID / severity | Evidence and impact | Required correction |
|---|---|---|
| RBAC-01 High | Task `start`, `submit-review`, `approve`, `request-changes`, `block`, `unblock` persist unauthorized changes before `getTaskById` returns 403. Employee can approve another user's task; Intern can start/block another user's task. [Task service](../../backend/src/services/task-service.ts) | Authorize role, learning flag and assignee **before any write, event or notification**. Separate review authority from execution/status authority. Assert database state remains unchanged after denied requests. |
| RBAC-02 High | `/api[/v2]/tasks/:id/{assignees,recurrence,dependency}` permit Admin/Employee to write associations to a foreign tenant's task. [Extension routes](../../backend/src/routes/phase14-routes.ts) and [repository](../../backend/src/repositories/task-extension-repository.ts) lack parent ownership checks. | Resolve both task references under the verified workspace, check assignment authority, validate every assignee's membership and enforce referential tenant constraints. |
| RBAC-03 High | `POST /wiki/pages/:id/comments` persists cross-workspace comments for Admin/Employee. Restricted page comments are readable by Employee/Intern despite page visibility restrictions. [Wiki routes](../../backend/src/routes/msme-extensions.ts) | Apply a shared parent-page visibility/scope resolver to every read/write/comment alias. Require a non-null verified workspace. |
| RBAC-04 High | `/api/documents/vault/*` and `/documents/download-stream?key=...` return actual admin-only file bytes to Employee/Intern. Workspace key-prefix isolation does not enforce document visibility. [Document routes](../../backend/src/routes/documents.ts) | Resolve the key to its document, enforce owner/department/visibility, then fetch bytes. Do not authorize raw keys independently of the document. |
| RBAC-05 High | Employee direct document reads/download links allow `admin_only` and other-department documents. Intern list exposes workspace documents; wiki detail/list allows workspace content outside public/learning. [Document service](../../backend/src/services/document-service.ts), [wiki routes](../../backend/src/routes/msme-extensions.ts) | Centralize identical list/detail/download/comment visibility decisions. Use explicit allowed visibility values and deny unknown values. |
| RBAC-06 High | Employee can read unassigned project/team details; project timeline and task comment/activity/discussion routes have weaker checks than list/detail routes. [Project service](../../backend/src/services/project-service.ts), [team service](../../backend/src/services/team-service.ts), [task routes](../../backend/src/routes/tasks.ts) | Reuse verified resource scope on every nested endpoint, not only collection queries. |
| RBAC-07 High | Assigned Employee can edit project title/membership and assigned CRM ownership/value, beyond progress and notes/status. Task PATCH can attach a foreign project. [Project service](../../backend/src/services/project-service.ts), [CRM service](../../backend/src/services/crm-service.ts), [task service](../../backend/src/services/task-service.ts) | Per-role field allowlists; reject forbidden fields and validate all replacement references before mutation. |
| RBAC-08 High | Membership resolver accepts cached workspace/global Admin after absent membership or simulated lookup failure. Revoked members can read foreign public wiki pages because a null workspace skips boundary checks. [RBAC middleware](../../backend/src/middleware/rbac.ts), [wiki routes](../../backend/src/routes/msme-extensions.ts) | Fail closed on missing/error membership; never fall back to global/stale roles for workspace access. Require verified membership and workspace before resource lookup. |
| RBAC-09 High | Any authenticated role can fetch executive workspace metrics; Intern reaches CRM pipelines through `/api/v2/crm/pipelines` and CRM integration email/calendar routes. Employee/Intern can retrieve workspace-wide activity and HR metrics. [Dashboard](../../backend/src/routes/dashboard.ts), [extensions](../../backend/src/routes/msme-extensions.ts), [activity](../../backend/src/routes/activity.ts), [people](../../backend/src/routes/people.ts) | Gate aggregate business data by role and filter entity feeds by resource scope. Route/UI hiding is insufficient. |
| RBAC-10 Medium | Employee can upload workspace/admin-only organization documents; Intern can create integration calendar/email records. [Permissions](../../backend/src/lib/permissions.ts), [extensions](../../backend/src/routes/msme-extensions.ts) | Permit employee private-vault uploads only; enforce role and linked CRM/project scope on integration writes. |
| RBAC-11 High | Employee/Intern can update a peer's goal and submit another employee's self-review. [People repository](../../backend/src/repositories/people-repository.ts) | Check goal owner and review subject before updates. Validate manager-review scope and require explicit administrative permissions. |
| RBAC-12 Medium | All three roles can start/manual-log time against a task in a foreign workspace. [Time routes](../../backend/src/routes/msme-extensions.ts) | Validate the parent task under the active workspace and caller's task scope before creating a time entry. |
| RBAC-13 High | Ordinary workspace Admin can reach global founding-partner applications/approval and global founder analytics. These stores aggregate across tenants. [Partner routes](../../backend/src/routes/founding-partner.ts), [analytics routes](../../backend/src/routes/protected-modules.ts) | Require verified platform privilege; workspace Admin must remain tenant-bound. Public application ingestion also selects the first workspace as its destination and needs a configured platform-owned destination. |
| RBAC-14 Medium | Anonymous callers reach sensitive health/storage/email/payment/observability metrics and trigger backup verification. [Health routes](../../backend/src/routes/health.ts) | Keep only minimal health signals public; gate diagnostic detail and backup actions. Avoid expensive storage drills on unauthenticated endpoints. |
| RBAC-15 Medium | Billing plan/trial/usage exposed to Employee and status exposed to Intern; notification retention sweep has no administrative gate. [Billing](../../backend/src/routes/billing.ts), [phase14](../../backend/src/routes/phase14-routes.ts), [notifications](../../backend/src/routes/notifications.ts) | Follow documented admin-only billing; restrict workspace-wide notification mutation. |

### Additional transport findings

[WebSocket server](../../backend/src/realtime/websocket-server.ts) checks workspace subscription boundaries, but its client `broadcast` branch passes an arbitrary supplied channel to `broadcastToChannel` without checking channel ownership/subscription. **RBAC-16 High:** all three authenticated roles can inject events into another workspace even though subscribing to that workspace is denied. **RBAC-17 High:** all three retain socket access after session revocation. **RBAC-18 High:** Employee/Intern receive an unassigned project's server event. These are reproduced by handler-level tests. Server forwarding also lacks equivalent task/document scope filters; their payload variants require further tests. Validate channel authority on every broadcast, revalidate/revoke long-lived connections, and filter every entity event with the same resource permission used by the API.

## UI findings

The approved split-layout theme was left untouched. Review used the required UI/UX skill's navigation, predictable feedback and accessibility priorities. Its search script could not run because neither the `python` command nor the registered `py -3` interpreter was usable; recommendations use the skill's built-in guidance, not a database search result.

| UI area / source | Admin | Employee | Intern | Finding |
|---|---|---|---|---|
| App projects guard | Allowed | Allowed | Denied | Correct module gate; server must enforce assigned projects. |
| Project create/delete buttons | Shown | Hidden | Hidden | Correct administrative affordances. Backend generic edit is broader than the UI/documentation. |
| App Tasks view | Allowed | Allowed | Allowed | Intern client filtering checks assignment but not learning-task status. Server has the same learning-sandbox gap. |
| Task create control | Shown | Hidden | Hidden | Employee task creation in assigned projects is documented but denied in both UI policy and API. |
| Task review controls | Shown | Shown | Hidden | Employee approval authority is broader than the three-tier contract; `currentRole !== 'intern'` is not resource review authority. |
| Document uploads | Shown | Embedded upload shown; standalone hidden | Hidden | Conflicting affordances. Employee private upload is documented, while API also permits organization/admin-only uploads. |
| Document deletion | All | Owned only | Hidden | Component ownership fallback correctly enables Employee-owned deletion even though the broad permission flag is false. Do not treat that flag alone as a defect. |
| App CRM guard | Allowed | Denied | Denied | Employee assigned-lead access is documented and API-supported, but direct view is Admin-only. |
| App Teams/People guard | Allowed | Allowed | Allowed | Intern direct tab is allowed although sidebar hides it and the contract denies team access. |
| Department member controls | Shown | Hidden | Hidden | Administrative buttons guarded by `isAdmin`; API management tests include positive and negative roles. |
| Billing / analytics / settings / automations guards | Allowed | Denied | Denied | Correct module gates; several APIs remain broader. |
| Employee sidebar Settings | Shown | Shown | Hidden | Employee navigation leads to an Admin-only forbidden screen. Hide the unavailable destination or provide an explicitly scoped self-service page. |
| Workspace overview | Allowed | Denied | Denied | UI combines administration with overview and blocks documented employee overview access. |
| Knowledge/wiki page edits | All | Author-scoped edits; creation allowed | Hidden | Nested comments and downloaded content need the same backend visibility as page controls. |
| Time entries | Workspace + rates | Own entries | Own entries | Own-delete affordance exists; parent task and tenant checks are missing on creation. |
| Integrations | Allowed | Allowed | Denied | Intern API requests bypass the UI-only module exclusion. |
| Command palette / deep links / notifications | Role-dependent shortcuts | Role-dependent shortcuts | Learning shortcuts | Hidden shortcuts never establish authorization. All linked entities require server-side checks. |

Primary UI sources: [App](../../src/App.tsx), [permissions](../../src/lib/auth.ts), [context actions](../../src/context/WorkspaceContext.tsx), [sidebar](../../src/components/layout/Sidebar.tsx), [Tasks](../../src/components/tasks/TasksView.tsx), [Documents](../../src/components/documents/DocumentsView.tsx), [People](../../src/components/people/PeopleView.tsx), [Department controls](../../src/components/people/DepartmentDetailsModal.tsx). The full event inventory provides line-level references for the remaining controls, including modal callbacks.

## Passing controls and limitations

Successful focused controls include Admin management operations, ordinary employee/intern denials for project/team creation and member/department administration, actual-session identity rather than forged body/header fields, cross-tenant project read/edit/delete rejection, recipient-specific notification mutations, and assigned-task reads. Missing memberships block core project endpoints; the separate wiki and resolver failures demonstrate why that is not sufficient across the application. Existing tests alone did not detect these new cases.

Two functional positive controls fail independently of privilege escalation: the root `/documents/vault/*` alias decodes its key using an `/api/documents/vault/`-only prefix and returns 404 to Admin, and `DELETE /api/teams/:id` is not mounted despite a deletion permission and service method. Denials on absent routes are not evidence that resource authorization is correct. Employee assigned-project task creation and some UI views also fail because implementation is more restrictive than the documented policy.

UI route render tests use mocked leaf views and do not certify all 776 event bindings. The broad endpoint sweep does not cover every valid request-body variant, state transition, file upload content type, invitation lifecycle or external integration. Inconclusive probes remain explicitly recorded, rather than being counted as passes. Completing production certification requires browser interaction tests with all roles, a disposable PostgreSQL database with real constraints, cache revocation tests across processes, and valid resource fixtures for each inconclusive route. These are **remaining coverage gaps**, not evidence of security.

Prioritize RBAC-01 through RBAC-08, cross-workspace WebSocket injection and platform/tenant separation first. Then align extension policies with the written three-role model and resolve the remaining data-exposure and UI drift cases. Re-run the strict audit after each change; the test command must remain red until all expectations are resolved or a reviewed specification change updates an expectation.
