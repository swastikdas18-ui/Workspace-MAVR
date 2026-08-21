# 05 — Feature Matrix & Resource-Level Scoping

## Scope-Enforced Access Controls

### 1. Workspace
- **Admin**: Read and update workspace settings, change plans, rename workspace.
- **Employee**: Read-only basic workspace info for their associated workspace.
- **Intern**: Restricted workspace visibility (no settings or org metrics).

### 2. Projects & Scoping
- **Admin**: Access all organization projects.
- **Employee**: Access only projects where `project_members.user_id === user.id`.
- **Intern**: Access prohibited.

### 3. Tasks & Scoping
- **Admin**: Full task management across any project.
- **Employee**: Can update status on `tasks.assigned_to === user.id` and create tasks in assigned projects.
- **Intern**: Can update status on `tasks.assigned_to === user.id` where `tasks.is_learning_task === true`. Cannot create or delete tasks.

### 4. Documents & Scoping
- **Admin**: Read and delete all documents; upload organization documents.
- **Employee**: Read shared documents (`public` | `team` | `learning`) and personal documents (`owner_id === user.id`). Can only delete own documents.
- **Intern**: Read-only access to `visibility === 'learning'` documents. Cannot upload or delete documents.

### 5. CRM Leads & Scoping
- **Admin**: Full CRM pipeline and lead management.
- **Employee**: Read and update leads where `crm_records.owner_id === user.id`. Cannot delete leads.
- **Intern**: No CRM access.
