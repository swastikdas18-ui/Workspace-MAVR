# Failing regression expectations

Failures include security violations, policy mismatches, and functional positive-control failures. Counts include aliases and roles; they are not distinct vulnerability counts. See the main audit for triage.

| Case | Evidence |
|---|---|
| /api admin: foreign wiki comment must not persist | Cross-tenant comment persisted (HTTP 201) |
| /api employee: unassigned task/comments boundary | Expected access denial, received 200 |
| /api employee: unassigned task/activity boundary | Expected access denial, received 200 |
| /api employee: unassigned task/discussion boundary | Expected access denial, received 200 |
| /api employee: start unauthorized task must not mutate | Unauthorized start persisted a task mutation (HTTP 403) |
| /api employee: submit-review unauthorized task must not mutate | Unauthorized submit-review persisted a task mutation (HTTP 403) |
| /api employee: approve unauthorized task must not mutate | Unauthorized approve persisted a task mutation (HTTP 403) |
| /api employee: request-changes unauthorized task must not mutate | Unauthorized request-changes persisted a task mutation (HTTP 403) |
| /api employee: block unauthorized task must not mutate | Unauthorized block persisted a task mutation (HTTP 403) |
| /api employee: unblock unauthorized task must not mutate | Unauthorized unblock persisted a task mutation (HTTP 403) |
| /api employee: projects unassigned detail | Expected access denial, received 200 |
| /api employee: teams unassigned detail | Expected access denial, received 200 |
| /api employee: documents admin_only detail | Expected access denial, received 200 |
| /api employee: documents department detail | Expected access denial, received 200 |
| /api employee: foreign wiki comment must not persist | Cross-tenant comment persisted (HTTP 201) |
| /api employee: restricted wiki comments | Expected access denial, received 200 |
| /api intern: unassigned task/comments boundary | Expected access denial, received 200 |
| /api intern: unassigned task/activity boundary | Expected access denial, received 200 |
| /api intern: start unauthorized task must not mutate | Unauthorized start persisted a task mutation (HTTP 403) |
| /api intern: submit-review unauthorized task must not mutate | Unauthorized submit-review persisted a task mutation (HTTP 403) |
| /api intern: block unauthorized task must not mutate | Unauthorized block persisted a task mutation (HTTP 403) |
| /api intern: unblock unauthorized task must not mutate | Unauthorized unblock persisted a task mutation (HTTP 403) |
| /api intern: wiki workspace detail | Expected access denial, received 200 |
| /api intern: restricted wiki comments | Expected access denial, received 200 |
| root admin: foreign wiki comment must not persist | Cross-tenant comment persisted (HTTP 201) |
| root employee: unassigned task/comments boundary | Expected access denial, received 200 |
| root employee: unassigned task/activity boundary | Expected access denial, received 200 |
| root employee: unassigned task/discussion boundary | Expected access denial, received 200 |
| root employee: start unauthorized task must not mutate | Unauthorized start persisted a task mutation (HTTP 403) |
| root employee: submit-review unauthorized task must not mutate | Unauthorized submit-review persisted a task mutation (HTTP 403) |
| root employee: approve unauthorized task must not mutate | Unauthorized approve persisted a task mutation (HTTP 403) |
| root employee: request-changes unauthorized task must not mutate | Unauthorized request-changes persisted a task mutation (HTTP 403) |
| root employee: block unauthorized task must not mutate | Unauthorized block persisted a task mutation (HTTP 403) |
| root employee: unblock unauthorized task must not mutate | Unauthorized unblock persisted a task mutation (HTTP 403) |
| root employee: projects unassigned detail | Expected access denial, received 200 |
| root employee: teams unassigned detail | Expected access denial, received 200 |
| root employee: documents admin_only detail | Expected access denial, received 200 |
| root employee: documents department detail | Expected access denial, received 200 |
| root employee: foreign wiki comment must not persist | Cross-tenant comment persisted (HTTP 201) |
| root employee: restricted wiki comments | Expected access denial, received 200 |
| root intern: unassigned task/comments boundary | Expected access denial, received 200 |
| root intern: unassigned task/activity boundary | Expected access denial, received 200 |
| root intern: start unauthorized task must not mutate | Unauthorized start persisted a task mutation (HTTP 403) |
| root intern: submit-review unauthorized task must not mutate | Unauthorized submit-review persisted a task mutation (HTTP 403) |
| root intern: block unauthorized task must not mutate | Unauthorized block persisted a task mutation (HTTP 403) |
| root intern: unblock unauthorized task must not mutate | Unauthorized unblock persisted a task mutation (HTTP 403) |
| root intern: wiki workspace detail | Expected access denial, received 200 |
| root intern: restricted wiki comments | Expected access denial, received 200 |
| /api admin: foreign task assignees cannot mutate | Foreign task extension persisted (HTTP 200) |
| /api admin: foreign task recurrence cannot mutate | Foreign task extension persisted (HTTP 201) |
| /api admin: foreign task dependency cannot mutate | Foreign task extension persisted (HTTP 201) |
| /api employee: foreign task assignees cannot mutate | Foreign task extension persisted (HTTP 200) |
| /api employee: foreign task recurrence cannot mutate | Foreign task extension persisted (HTTP 201) |
| /api employee: foreign task dependency cannot mutate | Foreign task extension persisted (HTTP 201) |
| /api/v2 admin: foreign task assignees cannot mutate | Foreign task extension persisted (HTTP 200) |
| /api/v2 admin: foreign task recurrence cannot mutate | Foreign task extension persisted (HTTP 201) |
| /api/v2 admin: foreign task dependency cannot mutate | Foreign task extension persisted (HTTP 201) |
| /api/v2 employee: foreign task assignees cannot mutate | Foreign task extension persisted (HTTP 200) |
| /api/v2 employee: foreign task recurrence cannot mutate | Foreign task extension persisted (HTTP 201) |
| /api/v2 employee: foreign task dependency cannot mutate | Foreign task extension persisted (HTTP 201) |
| employee: workspace analytics denied | Expected access denial, received 200 |
| intern: document list omits restricted records | List contains restricted document |
| intern: workspace analytics denied | Expected access denial, received 200 |
| intern: assigned non-learning task hidden | Expected access denial, received 200 |
| employee: assigned project metadata and membership remain admin-only | Expected values to be strictly equal: |
| employee: assigned project task creation allowed by specification | Expected success, received 403 |
| employee: admin-only organization upload permission denied | Expected values to be strictly equal: |
| UI employee task creation matches docs | Expected values to be strictly equal: |
| UI employee personal document upload matches docs | Expected values to be strictly equal: |
| admin: management DELETE /api/teams/team | Expected success, received 404 |
| admin: /api foreign task time start | Time entry linked to foreign task (201) |
| admin: /api foreign task time manual | Time entry linked to foreign task (201) |
| admin:  raw storage vault enforces document visibility | Expected success, received 404 |
| admin:  foreign task time start | Time entry linked to foreign task (201) |
| admin:  foreign task time manual | Time entry linked to foreign task (201) |
| admin: task update cannot attach foreign project | Foreign project reference persisted (200) |
| employee: /api GET restricted download doc-admin_only | Expected access denial, received 200 |
| employee: /api POST restricted download doc-admin_only | Expected access denial, received 200 |
| employee: /api GET restricted download doc-department | Expected access denial, received 200 |
| employee: /api POST restricted download doc-department | Expected access denial, received 200 |
| employee: /api raw storage vault enforces document visibility | Expected access denial, received 200 |
| employee: /api raw storage download-stream enforces document visibility | Expected access denial, received 200 |
| employee: /api upload workspace | Unauthorized upload persisted (201) |
| employee: /api upload admin_only | Unauthorized upload persisted (201) |
| employee: /api foreign task time start | Time entry linked to foreign task (201) |
| employee: /api foreign task time manual | Time entry linked to foreign task (201) |
| employee:  GET restricted download doc-admin_only | Expected access denial, received 200 |
| employee:  POST restricted download doc-admin_only | Expected access denial, received 200 |
| employee:  GET restricted download doc-department | Expected access denial, received 200 |
| employee:  POST restricted download doc-department | Expected access denial, received 200 |
| employee:  raw storage download-stream enforces document visibility | Expected access denial, received 200 |
| employee:  upload workspace | Unauthorized upload persisted (201) |
| employee:  upload admin_only | Unauthorized upload persisted (201) |
| employee:  foreign task time start | Time entry linked to foreign task (201) |
| employee:  foreign task time manual | Time entry linked to foreign task (201) |
| employee: task update cannot attach foreign project | Foreign project reference persisted (200) |
| employee: cannot update peer goal progress | Peer goal changed (HTTP 200) |
| intern: /api raw storage vault enforces document visibility | Expected access denial, received 200 |
| intern: /api raw storage download-stream enforces document visibility | Expected access denial, received 200 |
| intern: /api foreign task time start | Time entry linked to foreign task (201) |
| intern: /api foreign task time manual | Time entry linked to foreign task (201) |
| intern:  raw storage download-stream enforces document visibility | Expected access denial, received 200 |
| intern:  foreign task time start | Time entry linked to foreign task (201) |
| intern:  foreign task time manual | Time entry linked to foreign task (201) |
| intern: cannot update peer goal progress | Peer goal changed (HTTP 200) |
| employee: revoked membership cannot read foreign public wiki | Expected access denial, received 200 |
| intern: revoked membership cannot read foreign public wiki | Expected access denial, received 200 |
| employee: assigned CRM lead permits notes but not ownership/value changes | Lead ownership changed (200) |
| employee: unassigned project timeline hidden | Expected access denial, received 200 |
| employee: project membership alone cannot edit another assignee task details | Project member changed non-owned task details (200) |
| employee: HEAD cannot bypass executive analytics gate | Expected access denial, received 200 |
| intern: HEAD cannot bypass executive analytics gate | Expected access denial, received 200 |
| resolver: missing membership fails closed despite cached admin | Unverified cached/global admin role was accepted |
| resolver: lookup-failure membership fails closed despite cached admin | Unverified cached/global admin role was accepted |
| employee: cannot submit another employee self-review | Peer self-review overwritten (200) |
| intern: cannot submit another employee self-review | Peer self-review overwritten (200) |
| UI permission employee: tasks.create | Expected values to be strictly equal: |
| UI permission employee: documents.createPersonalDoc | Expected values to be strictly equal: |
| UI render employee: workspace route guard | Unexpected employee visibility for workspace |
| UI render employee: crm route guard | Unexpected employee visibility for crm |
| UI render intern: teams route guard | Unexpected intern visibility for teams |
| UI render intern: people route guard | Unexpected intern visibility for people |
| WebSocket admin: broadcast-foreign | Foreign workspace received attacker broadcast |
| WebSocket admin: revoked-session | Revoked socket session retained access |
| WebSocket employee: broadcast-foreign | Foreign workspace received attacker broadcast |
| WebSocket employee: revoked-session | Revoked socket session retained access |
| WebSocket employee: project-event | Unassigned client received project event |
| WebSocket intern: broadcast-foreign | Foreign workspace received attacker broadcast |
| WebSocket intern: revoked-session | Revoked socket session retained access |
| WebSocket intern: project-event | Unassigned client received project event |
| employee GET /health/storage: admin boundary | Expected denial, got 200 |
| intern GET /health/storage: admin boundary | Expected denial, got 200 |
| anonymous GET /health/storage: admin boundary | Expected denial, got 200 |
| employee GET /health/email: admin boundary | Expected denial, got 200 |
| intern GET /health/email: admin boundary | Expected denial, got 200 |
| anonymous GET /health/email: admin boundary | Expected denial, got 200 |
| employee GET /health/payments: admin boundary | Expected denial, got 200 |
| intern GET /health/payments: admin boundary | Expected denial, got 200 |
| anonymous GET /health/payments: admin boundary | Expected denial, got 200 |
| employee GET /health/observability: admin boundary | Expected denial, got 200 |
| intern GET /health/observability: admin boundary | Expected denial, got 200 |
| anonymous GET /health/observability: admin boundary | Expected denial, got 200 |
| employee GET /health/metrics: admin boundary | Expected denial, got 200 |
| intern GET /health/metrics: admin boundary | Expected denial, got 200 |
| anonymous GET /health/metrics: admin boundary | Expected denial, got 200 |
| employee POST /health/backup-verify: admin boundary | Expected denial, got 200 |
| intern POST /health/backup-verify: admin boundary | Expected denial, got 200 |
| anonymous POST /health/backup-verify: admin boundary | Expected denial, got 200 |
| employee GET /api/health/storage: admin boundary | Expected denial, got 200 |
| intern GET /api/health/storage: admin boundary | Expected denial, got 200 |
| anonymous GET /api/health/storage: admin boundary | Expected denial, got 200 |
| employee GET /api/health/email: admin boundary | Expected denial, got 200 |
| intern GET /api/health/email: admin boundary | Expected denial, got 200 |
| anonymous GET /api/health/email: admin boundary | Expected denial, got 200 |
| employee GET /api/health/payments: admin boundary | Expected denial, got 200 |
| intern GET /api/health/payments: admin boundary | Expected denial, got 200 |
| anonymous GET /api/health/payments: admin boundary | Expected denial, got 200 |
| employee GET /api/health/observability: admin boundary | Expected denial, got 200 |
| intern GET /api/health/observability: admin boundary | Expected denial, got 200 |
| anonymous GET /api/health/observability: admin boundary | Expected denial, got 200 |
| employee GET /api/health/metrics: admin boundary | Expected denial, got 200 |
| intern GET /api/health/metrics: admin boundary | Expected denial, got 200 |
| anonymous GET /api/health/metrics: admin boundary | Expected denial, got 200 |
| employee POST /api/health/backup-verify: admin boundary | Expected denial, got 200 |
| intern POST /api/health/backup-verify: admin boundary | Expected denial, got 200 |
| anonymous POST /api/health/backup-verify: admin boundary | Expected denial, got 200 |
| employee GET /api/storage/health: admin boundary | Expected denial, got 200 |
| intern GET /api/storage/health: admin boundary | Expected denial, got 200 |
| anonymous GET /api/storage/health: admin boundary | Expected denial, got 200 |
| employee GET /storage/health: admin boundary | Expected denial, got 200 |
| intern GET /storage/health: admin boundary | Expected denial, got 200 |
| anonymous GET /storage/health: admin boundary | Expected denial, got 200 |
| employee GET /api/invites: admin boundary | Expected denial, got 200 |
| intern GET /api/invites: admin boundary | Expected denial, got 200 |
| employee GET /invites: admin boundary | Expected denial, got 200 |
| intern GET /invites: admin boundary | Expected denial, got 200 |
| intern GET /api/workspace: staff boundary | Expected denial, got 200 |
| intern GET /workspace: staff boundary | Expected denial, got 200 |
| intern GET /api/workspaces: staff boundary | Expected denial, got 200 |
| intern GET /workspaces: staff boundary | Expected denial, got 200 |
| employee POST /api/notifications/retention/run: admin boundary | Expected denial, got 200 |
| intern POST /api/notifications/retention/run: admin boundary | Expected denial, got 200 |
| employee POST /notifications/retention/run: admin boundary | Expected denial, got 200 |
| intern POST /notifications/retention/run: admin boundary | Expected denial, got 200 |
| employee GET /api/automations: admin boundary | Expected denial, got 200 |
| employee GET /api/automations/rules: admin boundary | Expected denial, got 200 |
| employee GET /api/automations/templates: admin boundary | Expected denial, got 200 |
| employee POST /api/automations/trigger: admin boundary | Expected denial, got 200 |
| employee GET /automations: admin boundary | Expected denial, got 200 |
| employee GET /automations/rules: admin boundary | Expected denial, got 200 |
| employee GET /automations/templates: admin boundary | Expected denial, got 200 |
| employee POST /automations/trigger: admin boundary | Expected denial, got 200 |
| intern GET /api/people/profiles: staff boundary | Expected denial, got 200 |
| intern GET /api/people/profiles/:userId: staff boundary | Expected denial, got 200 |
| intern GET /api/people/departments: staff boundary | Expected denial, got 200 |
| intern GET /api/people/departments/:id/members: staff boundary | Expected denial, got 200 |
| intern GET /api/people/org-chart: staff boundary | Expected denial, got 200 |
| employee GET /api/people/attendance/metrics: admin boundary | Expected denial, got 200 |
| intern GET /api/people/attendance/metrics: admin boundary | Expected denial, got 200 |
| intern GET /people/profiles: staff boundary | Expected denial, got 200 |
| intern GET /people/profiles/:userId: staff boundary | Expected denial, got 200 |
| intern GET /people/departments: staff boundary | Expected denial, got 200 |
| intern GET /people/departments/:id/members: staff boundary | Expected denial, got 200 |
| intern GET /people/org-chart: staff boundary | Expected denial, got 200 |
| employee GET /people/attendance/metrics: admin boundary | Expected denial, got 200 |
| intern GET /people/attendance/metrics: admin boundary | Expected denial, got 200 |
| intern GET /api/departments/:id/members: staff boundary | Expected denial, got 200 |
| intern GET /departments/:id/members: staff boundary | Expected denial, got 200 |
| admin GET /api/analytics/founder: platform boundary | Expected denial, got 200 |
| admin GET /analytics/founder: platform boundary | Expected denial, got 200 |
| employee GET /api/dashboard/executive: admin boundary | Expected denial, got 200 |
| intern GET /api/dashboard/executive: admin boundary | Expected denial, got 200 |
| employee GET /dashboard/executive: admin boundary | Expected denial, got 200 |
| intern GET /dashboard/executive: admin boundary | Expected denial, got 200 |
| employee GET /api/v2/billing/status: admin boundary | Expected denial, got 200 |
| intern GET /api/v2/billing/status: admin boundary | Expected denial, got 200 |
| employee POST /api/v2/tasks/:id/assignees: admin boundary | Expected denial, got 200 |
| employee GET /api/v2/crm/pipelines: admin boundary | Expected denial, got 200 |
| intern GET /api/v2/crm/pipelines: admin boundary | Expected denial, got 200 |
| employee GET /api/billing/status: admin boundary | Expected denial, got 200 |
| intern GET /api/billing/status: admin boundary | Expected denial, got 200 |
| employee POST /api/tasks/:id/assignees: admin boundary | Expected denial, got 200 |
| employee GET /api/billing/plan: admin boundary | Expected denial, got 200 |
| employee GET /api/billing/trial: admin boundary | Expected denial, got 200 |
| employee GET /api/billing/usage: admin boundary | Expected denial, got 200 |
| employee GET /billing/plan: admin boundary | Expected denial, got 200 |
| employee GET /billing/trial: admin boundary | Expected denial, got 200 |
| employee GET /billing/usage: admin boundary | Expected denial, got 200 |
| admin GET /api/founding-partner/applications: platform boundary | Expected denial, got 200 |
| admin POST /api/founding-partner/approve: platform boundary | Expected denial, got 201 |
| admin GET /founding-partner/applications: platform boundary | Expected denial, got 200 |
| admin POST /founding-partner/approve: platform boundary | Expected denial, got 201 |
| intern GET /api/integrations/calendar/events: staff boundary | Expected denial, got 200 |
| intern POST /api/integrations/calendar/events: staff boundary | Expected denial, got 201 |
| intern GET /api/integrations/email/lead/:crmId: staff boundary | Expected denial, got 200 |
| intern POST /api/integrations/email/log: staff boundary | Expected denial, got 201 |
| intern GET /integrations/calendar/events: staff boundary | Expected denial, got 200 |
| intern POST /integrations/calendar/events: staff boundary | Expected denial, got 201 |
| intern GET /integrations/email/lead/:crmId: staff boundary | Expected denial, got 200 |
| intern POST /integrations/email/log: staff boundary | Expected denial, got 201 |
