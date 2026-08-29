-- ============================================================================
-- Workspace OS Database Migration: 001_add_project_workflow_columns.sql
-- 
-- Adds Phase 1 Project Workflow lifecycle columns to `projects` table
-- and creates the `project_updates` audit history table.
--
-- Safety Guarantees:
-- 1. Preserves all existing project records and historical data.
-- 2. Non-destructive: Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- 3. Idempotent: Can be safely re-run multiple times without error.
-- ============================================================================

-- 1. Add Workflow Columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_by TEXT REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS review_feedback TEXT;

-- 2. Create project_updates Audit Trail Table
CREATE TABLE IF NOT EXISTS project_updates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Create Supporting Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_user_id ON project_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON project_updates(created_at);

-- 4. Ensure project_teams Relation Table and Indexes Exist
CREATE TABLE IF NOT EXISTS project_teams (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_teams_project_id ON project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_team_id ON project_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_proj_team ON project_teams(project_id, team_id);
