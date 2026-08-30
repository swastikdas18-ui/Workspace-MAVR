-- Migration: 002_add_phase2_task_execution_engine.sql
-- Description: Extends tasks table with story points, actual/estimated hours, review tracking, blocked status, and adds task_updates activity log table.

-- 1. Extend tasks table with Phase 2 Execution Engine columns
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER,
ADD COLUMN IF NOT EXISTS actual_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 2. Create task_updates (Activity Log & Audit Trail) table
CREATE TABLE IF NOT EXISTS task_updates (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'status_change', 'comment', 'progress_update', 'assignment', 'blocked', 'unblocked', 'created', 'approved', 'changes_requested'
    from_status TEXT,
    to_status TEXT,
    comment TEXT,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create Indexes for High-Velocity Execution
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_user_id ON task_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_created_at ON task_updates(created_at);
