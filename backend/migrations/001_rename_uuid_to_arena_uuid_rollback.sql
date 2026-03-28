-- Rollback Migration: Revert arena_uuid back to uuid
-- This script reverts the changes made in 001_rename_uuid_to_arena_uuid.sql
--
-- IMPORTANT: Backup your database before running this rollback!
--
-- WARNING: This rollback will fail if you have duplicate events that were
-- synced from different Arena instances (which is the problem we're solving).
-- Only use this if you need to revert before syncing from multiple Arena instances.

-- Step 1: Drop the natural key constraint
ALTER TABLE sport_events DROP CONSTRAINT IF EXISTS uq_sport_event_natural_key;

-- Step 2: Drop the index on arena_uuid
DROP INDEX IF EXISTS ix_sport_events_arena_uuid;

-- Step 3: Rename the column back
ALTER TABLE sport_events RENAME COLUMN arena_uuid TO uuid;

-- Step 4: Re-add unique constraint on uuid
ALTER TABLE sport_events ADD CONSTRAINT sport_events_uuid_key UNIQUE (uuid);

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sport_events'
ORDER BY ordinal_position;
