# Database Migrations

## Overview

This directory contains SQL migration scripts for database schema changes.

## Running Migrations

### Prerequisites

1. **Backup your database** before running any migration
2. Ensure the backend application is stopped
3. Have PostgreSQL access credentials ready

### Apply Migration

Connect to your PostgreSQL database and run the migration:

```bash
# Using psql
psql -h localhost -U your_username -d your_database -f 001_rename_uuid_to_arena_uuid.sql

# Or if you have a connection string
psql "postgresql://user:password@host:port/dbname" -f 001_rename_uuid_to_arena_uuid.sql
```

### Rollback Migration (if needed)

```bash
psql "postgresql://user:password@host:port/dbname" -f 001_rename_uuid_to_arena_uuid_rollback.sql
```

## Migration 001: Rename uuid to arena_uuid

**Purpose**: Support distributed Arena architecture where multiple trainers have local Arena instances that generate different UUIDs for the same event.

**Changes**:
- Renames `uuid` column to `arena_uuid`
- Removes unique constraint from `arena_uuid`
- Adds composite unique constraint on `(name, start_date, country_iso_code)` for natural key matching
- Creates non-unique index on `arena_uuid` for performance

**Impact**:
- Prevents duplicate events when syncing from multiple Arena instances
- Events are now matched by their natural key (name, date, country) instead of Arena UUID
- Backwards compatible with existing data (column renamed, not removed)

## After Migration

1. Restart the backend application
2. Test the sync functionality with a local Arena instance
3. Verify that events are correctly matched by natural key
4. Monitor logs for any sync issues

## Troubleshooting

### Unique constraint violation

If you get a unique constraint error during migration:
```
ERROR:  duplicate key value violates unique constraint "uq_sport_event_natural_key"
```

This means you have duplicate events with the same name, start_date, and country_iso_code. You need to:
1. Identify the duplicates:
   ```sql
   SELECT name, start_date, country_iso_code, COUNT(*)
   FROM sport_events
   GROUP BY name, start_date, country_iso_code
   HAVING COUNT(*) > 1;
   ```
2. Manually merge or delete duplicate records
3. Re-run the migration
