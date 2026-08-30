-- Workspace OS — Phase 4 Migration: People Operating System (HR + Team Management)

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS "departments" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "head_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "parent_id" text,
  "color" text DEFAULT '#7C3AED',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_departments_workspace_id" ON "departments"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_departments_name" ON "departments"("name");
CREATE INDEX IF NOT EXISTS "idx_departments_head_id" ON "departments"("head_id");

-- 2. Employee Profiles Table
CREATE TABLE IF NOT EXISTS "employee_profiles" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "department_id" text REFERENCES "departments"("id") ON DELETE SET NULL,
  "designation" text NOT NULL DEFAULT 'Team Member',
  "manager_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "joining_date" timestamp DEFAULT now() NOT NULL,
  "employment_type" text NOT NULL DEFAULT 'full_time',
  "skills" jsonb DEFAULT '[]'::jsonb,
  "bio" text,
  "location" text DEFAULT 'Remote',
  "phone" text,
  "emergency_contact" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_employee_profiles_workspace_id" ON "employee_profiles"("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_employee_profiles_user_id" ON "employee_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "idx_employee_profiles_department_id" ON "employee_profiles"("department_id");
CREATE INDEX IF NOT EXISTS "idx_employee_profiles_manager_id" ON "employee_profiles"("manager_id");
CREATE INDEX IF NOT EXISTS "idx_employee_profiles_status" ON "employee_profiles"("status");

-- 3. Leave Requests Table
CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "leave_type" text NOT NULL DEFAULT 'annual',
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "days_count" integer NOT NULL DEFAULT 1,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "reviewer_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp,
  "review_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_leave_requests_workspace_id" ON "leave_requests"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_user_id" ON "leave_requests"("user_id");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_status" ON "leave_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_dates" ON "leave_requests"("start_date", "end_date");

-- 4. Attendance Records Table
CREATE TABLE IF NOT EXISTS "attendance_records" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" text NOT NULL,
  "check_in_at" timestamp,
  "check_out_at" timestamp,
  "worked_hours" integer DEFAULT 0,
  "status" text NOT NULL DEFAULT 'present',
  "notes" text,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_attendance_records_workspace_id" ON "attendance_records"("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_attendance_user_date" ON "attendance_records"("user_id", "date");
CREATE INDEX IF NOT EXISTS "idx_attendance_records_status" ON "attendance_records"("status");

-- 5. Goals (OKRs) Table
CREATE TABLE IF NOT EXISTS "goals" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "department_id" text REFERENCES "departments"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "category" text NOT NULL DEFAULT 'individual',
  "target_value" integer DEFAULT 100,
  "current_value" integer DEFAULT 0,
  "unit" text DEFAULT '%',
  "progress" integer DEFAULT 0,
  "status" text NOT NULL DEFAULT 'on_track',
  "linked_project_ids" jsonb DEFAULT '[]'::jsonb,
  "linked_task_ids" jsonb DEFAULT '[]'::jsonb,
  "start_date" timestamp DEFAULT now() NOT NULL,
  "due_date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_goals_workspace_id" ON "goals"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_goals_user_id" ON "goals"("user_id");
CREATE INDEX IF NOT EXISTS "idx_goals_department_id" ON "goals"("department_id");
CREATE INDEX IF NOT EXISTS "idx_goals_status" ON "goals"("status");

-- 6. Goal Updates Table
CREATE TABLE IF NOT EXISTS "goal_updates" (
  "id" text PRIMARY KEY,
  "goal_id" text NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "progress_value" integer NOT NULL,
  "progress_percent" integer NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_goal_updates_goal_id" ON "goal_updates"("goal_id");
CREATE INDEX IF NOT EXISTS "idx_goal_updates_user_id" ON "goal_updates"("user_id");

-- 7. Performance Reviews Table
CREATE TABLE IF NOT EXISTS "performance_reviews" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reviewer_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cycle" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "self_ratings" jsonb DEFAULT '{}'::jsonb,
  "manager_ratings" jsonb DEFAULT '{}'::jsonb,
  "final_rating" text DEFAULT '4.0',
  "strengths" text,
  "growth_areas" text,
  "final_comments" text,
  "submitted_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_performance_reviews_workspace_id" ON "performance_reviews"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_performance_reviews_user_id" ON "performance_reviews"("user_id");
CREATE INDEX IF NOT EXISTS "idx_performance_reviews_reviewer_id" ON "performance_reviews"("reviewer_id");
CREATE INDEX IF NOT EXISTS "idx_performance_reviews_cycle" ON "performance_reviews"("cycle");
CREATE INDEX IF NOT EXISTS "idx_performance_reviews_status" ON "performance_reviews"("status");
