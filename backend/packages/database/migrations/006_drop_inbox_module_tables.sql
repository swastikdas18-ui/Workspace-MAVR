-- Workspace OS: Drop Work Inbox Tables (Idempotent Migration)
-- Objective: Completely purge legacy Work Inbox tables.
-- Notification delivery remains through Notification Service, Chat V2, Tasks, and Projects.

DROP TABLE IF EXISTS "inbox_notifications" CASCADE;
DROP TABLE IF EXISTS "inbox_reads" CASCADE;
DROP TABLE IF EXISTS "inbox_items" CASCADE;
