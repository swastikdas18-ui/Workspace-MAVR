# 03 — Role Permission Matrix

| Module | Action | Admin | Employee | Intern | Condition / Scope |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Workspace** | View Overview | ✅ | ✅ | ❌ | Employee/Intern within own workspace only |
| **Workspace** | Manage Settings | ✅ | ❌ | ❌ | Admin only |
| **Projects** | View All Projects | ✅ | ❌ | ❌ | Admin only |
| **Projects** | View Assigned | ✅ | ✅ | ❌ | Assigned members only |
| **Projects** | Create Project | ✅ | ❌ | ❌ | Admin only |
| **Projects** | Edit Project | ✅ | ❌ | ❌ | Admin only |
| **Projects** | Delete Project | ✅ | ❌ | ❌ | Admin only |
| **Projects** | Update Progress | ✅ | ✅ | ❌ | Project assignees/owner only |
| **Tasks** | View All Tasks | ✅ | ❌ | ❌ | Admin only |
| **Tasks** | View Assigned Tasks | ✅ | ✅ | ✅ | Assigned user only |
| **Tasks** | Create Task | ✅ | ✅ | ❌ | Employee can create in assigned projects |
| **Tasks** | Update Task Status | ✅ | ✅ | ✅ | Assigned tasks only |
| **Tasks** | Edit Details | ✅ | ✅ | ❌ | Admin or creator |
| **Tasks** | Delete Task | ✅ | ❌ | ❌ | Admin only |
| **Documents** | View All Documents | ✅ | ❌ | ❌ | Admin only |
| **Documents** | View Shared Org Docs | ✅ | ✅ | ❌ | Visibility = public or team |
| **Documents** | View Learning Docs | ✅ | ✅ | ✅ | Visibility = learning |
| **Documents** | Upload Org Doc | ✅ | ❌ | ❌ | Admin only |
| **Documents** | Upload Personal Doc | ✅ | ✅ | ❌ | Employee personal vault |
| **Documents** | Delete Document | ✅ | *(Own)* | ❌ | Admin or document owner |
| **CRM** | View All Pipeline | ✅ | ❌ | ❌ | Admin only |
| **CRM** | View Assigned Leads | ✅ | ✅ | ❌ | Assigned account owner only |
| **CRM** | Create Lead | ✅ | ❌ | ❌ | Admin only |
| **CRM** | Edit Notes/Status | ✅ | ✅ | ❌ | Assigned owner or admin |
| **CRM** | Delete Lead | ✅ | ❌ | ❌ | Admin only |
| **Teams** | Manage / Invite | ✅ | ❌ | ❌ | Admin only |
| **Teams** | View Own Team | ✅ | ✅ | ❌ | Member of team |
| **Analytics** | View & Export | ✅ | ❌ | ❌ | Admin only |
| **Billing** | View & Manage | ✅ | ❌ | ❌ | Admin only |
| **Settings** | Admin Tools & Config | ✅ | ❌ | ❌ | Admin only |
