-- Workspace OS: Drop Community Module Tables (Idempotent Migration)
-- Objective: Completely purge legacy Discord/Community-style tables while preserving internal company communication / chat.

DROP TABLE IF EXISTS "community_reactions" CASCADE;
DROP TABLE IF EXISTS "community_comments" CASCADE;
DROP TABLE IF EXISTS "community_posts" CASCADE;
DROP TABLE IF EXISTS "post_reactions" CASCADE;
DROP TABLE IF EXISTS "post_comments" CASCADE;
DROP TABLE IF EXISTS "forum_replies" CASCADE;
DROP TABLE IF EXISTS "forum_threads" CASCADE;
DROP TABLE IF EXISTS "community_event_attendees" CASCADE;
DROP TABLE IF EXISTS "community_events" CASCADE;
DROP TABLE IF EXISTS "community_space_members" CASCADE;
DROP TABLE IF EXISTS "community_spaces" CASCADE;
DROP TABLE IF EXISTS "community_followers" CASCADE;
DROP TABLE IF EXISTS "community_notifications" CASCADE;
DROP TABLE IF EXISTS "community_leaderboard" CASCADE;
DROP TABLE IF EXISTS "community_invites" CASCADE;
DROP TABLE IF EXISTS "community_roles" CASCADE;
DROP TABLE IF EXISTS "community_members" CASCADE;
DROP TABLE IF EXISTS "community_profiles" CASCADE;
DROP TABLE IF EXISTS "communities" CASCADE;

-- Confirmation note:
-- The following internal company communication tables are preserved untouched:
-- 1. conversations
-- 2. conversation_members
-- 3. messages
-- 4. message_reactions
-- 5. conversation_reads
