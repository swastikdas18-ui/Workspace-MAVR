# 02 — Database Schema (Drizzle ORM & PostgreSQL)

## Schema Overview
The database uses PostgreSQL with Drizzle ORM.

### Tables
1. **users**
   - `id`: UUID / text primary key
   - `name`: string, not null
   - `email`: string, unique, not null
   - `password`: string (bcrypt hash), not null
   - `role`: enum ('admin', 'employee', 'intern'), not null
   - `title`: string, optional
   - `avatar`: string, optional
   - `team_id`: string, optional
   - `created_at`: timestamp, default now

2. **workspaces**
   - `id`: UUID / text primary key
   - `name`: string, not null
   - `slug`: string, unique, not null
   - `owner_id`: references `users.id`, not null
   - `plan`: enum ('free', 'pro', 'enterprise'), default 'pro'
   - `created_at`: timestamp, default now

3. **workspace_members**
   - `id`: UUID / text primary key
   - `workspace_id`: references `workspaces.id`, cascade delete
   - `user_id`: references `users.id`, cascade delete
   - `role`: enum ('admin', 'employee', 'intern')
   - `joined_at`: timestamp, default now

4. **sessions** (Better Auth)
   - `id`: UUID / text primary key
   - `user_id`: references `users.id`, cascade delete
   - `token`: string, unique, not null
   - `expires_at`: timestamp, not null
   - `created_at`: timestamp, default now

5. **teams**
   - `id`: UUID / text primary key
   - `name`: string, not null
   - `description`: text
   - `workspace_id`: references `workspaces.id`, cascade delete
   - `lead_id`: references `users.id`
   - `color`: string
   - `created_at`: timestamp, default now

6. **team_members**
   - `id`: UUID / text primary key
   - `team_id`: references `teams.id`, cascade delete
   - `user_id`: references `users.id`, cascade delete
   - `role_in_team`: enum ('lead', 'member')
   - `joined_at`: timestamp, default now

7. **projects**
   - `id`: UUID / text primary key
   - `title`: string, not null
   - `description`: text
   - `created_by`: references `users.id`
   - `status`: enum ('planning', 'in_progress', 'review', 'completed', 'on_hold')
   - `progress`: integer, default 0
   - `start_date`: timestamp
   - `due_date`: timestamp
   - `budget`: text
   - `created_at`: timestamp

8. **project_members**
   - `id`: UUID / text primary key
   - `project_id`: references `projects.id`, cascade delete
   - `user_id`: references `users.id`, cascade delete
   - `role`: enum ('owner', 'contributor', 'viewer')

9. **tasks**
   - `id`: UUID / text primary key
   - `title`: string, not null
   - `description`: text
   - `status`: enum ('todo', 'in_progress', 'review', 'completed')
   - `priority`: enum ('low', 'medium', 'high', 'urgent')
   - `assigned_to`: references `users.id`
   - `project_id`: references `projects.id`, cascade delete
   - `due_date`: timestamp
   - `is_learning_task`: boolean, default false
   - `created_at`: timestamp

10. **documents**
    - `id`: UUID / text primary key
    - `title`: string, not null
    - `file_url`: text, not null
    - `file_type`: string
    - `file_size`: string
    - `owner_id`: references `users.id`
    - `visibility`: enum ('public', 'team', 'private', 'learning')
    - `category`: text
    - `download_count`: integer, default 0
    - `created_at`: timestamp

11. **crm_records**
    - `id`: UUID / text primary key
    - `customer_name`: string, not null
    - `company`: string, not null
    - `email`: string, not null
    - `phone`: string
    - `deal_value`: integer, default 0
    - `status`: enum ('new_lead', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost')
    - `owner_id`: references `users.id`
    - `notes`: text
    - `created_at`: timestamp
    - `last_contacted`: timestamp
