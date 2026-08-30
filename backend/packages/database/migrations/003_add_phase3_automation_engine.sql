-- Phase 3: No-Code Automation Engine & Rule Platform Migration
-- Supports WHEN (Triggers) + IF (Multi-Conditions) + THEN (Multi-Actions) + Execution Audit Trail

-- 1. Extend automation_rules table
ALTER TABLE automation_rules
ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS condition_config JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'send_notification',
ADD COLUMN IF NOT EXISTS action_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;

-- 2. Extend automation_executions table
ALTER TABLE automation_executions
ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS triggered_by TEXT,
ADD COLUMN IF NOT EXISTS execution_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Indexes for high-throughput rule evaluations and telemetry
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_executions_workspace_id ON automation_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_created_at ON automation_executions(created_at);
