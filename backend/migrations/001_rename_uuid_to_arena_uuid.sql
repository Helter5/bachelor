-- Migration: Rename uuid to arena_uuid and add natural key constraint
-- This migration supports the distributed Arena architecture where
-- different Arena instances generate different UUIDs for the same event.
--
-- IMPORTANT: Backup your database before running this migration!
--
-- Steps:
-- 1. Rename uuid column to arena_uuid
-- 2. Remove unique constraint from arena_uuid (multiple Arena instances can have different UUIDs)
-- 3. Add composite unique constraint on (name, start_date, country_iso_code)

-- Step 1: Rename the column
ALTER TABLE sport_events RENAME COLUMN uuid TO arena_uuid;

-- Step 2: Drop the unique constraint on arena_uuid (if exists)
-- PostgreSQL syntax:
ALTER TABLE sport_events DROP CONSTRAINT IF EXISTS sport_events_uuid_key;

-- Step 3: Add composite unique constraint for natural key matching
ALTER TABLE sport_events
ADD CONSTRAINT uq_sport_event_natural_key
UNIQUE (name, start_date, country_iso_code);

-- Step 4: Create index on arena_uuid for performance (non-unique)
CREATE INDEX IF NOT EXISTS ix_sport_events_arena_uuid ON sport_events(arena_uuid);

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sport_events'
ORDER BY ordinal_position;
