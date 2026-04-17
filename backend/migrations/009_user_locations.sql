-- ============================================================
-- Migration 009: Centralized User Locations Table
-- Date: 2026-04-17
--
-- PURPOSE:
--   Move GPS coordinates from the `users` table into a dedicated
--   `user_locations` table. This creates a single source of truth
--   for all real-time user positions, removing scattered lat/lng
--   storage across multiple tables.
--
-- BEHAVIOR:
--   ✅ Creates `user_locations` table (user_id UNIQUE)
--   ✅ Migrates existing data from `users.latitude/longitude`
--   ✅ Safe to run multiple times (IF NOT EXISTS / ON CONFLICT)
--   ✅ Does NOT drop old columns (backward compatible)
--
-- SOS REQUESTS:
--   `rescue_requests.latitude/longitude` are KEPT as a snapshot.
--   - For resolved requests: shows the final frozen position
--   - For active requests: the API returns live position from
--     `user_locations` via COALESCE, and the location sync
--     endpoint dual-writes to both tables.
-- ============================================================

-- 1. Create the centralized user_locations table
CREATE TABLE IF NOT EXISTS user_locations (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    address     TEXT DEFAULT '',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations (user_id);

-- 2. Migrate existing location data from users table
INSERT INTO user_locations (user_id, latitude, longitude, address, updated_at)
SELECT id, latitude, longitude, COALESCE(address, ''), COALESCE(location_updated_at, NOW())
FROM users
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
    SET latitude   = EXCLUDED.latitude,
        longitude  = EXCLUDED.longitude,
        address    = EXCLUDED.address,
        updated_at = EXCLUDED.updated_at;

-- NOTE: The old columns (users.latitude, users.longitude, users.location_updated_at)
-- are KEPT for backward compatibility. They can be dropped later with:
--   ALTER TABLE users DROP COLUMN IF EXISTS latitude;
--   ALTER TABLE users DROP COLUMN IF EXISTS longitude;
--   ALTER TABLE users DROP COLUMN IF EXISTS location_updated_at;
