-- ============================================================
-- Migration 010: Drop legacy location columns from users table
-- Date: 2026-04-17
--
-- PURPOSE:
--   Remove the old latitude/longitude/location_updated_at columns
--   from the users table. All GPS data is now stored in
--   the centralized `user_locations` table (migration 009).
--
-- SAFE: Data was already migrated by 009_user_locations.sql
-- ============================================================

ALTER TABLE users DROP COLUMN IF EXISTS latitude;
ALTER TABLE users DROP COLUMN IF EXISTS longitude;
ALTER TABLE users DROP COLUMN IF EXISTS location_updated_at;
