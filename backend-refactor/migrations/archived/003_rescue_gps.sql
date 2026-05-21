-- ============================================================
-- Migration 003: Add GPS coordinates to rescue_requests
-- Purpose: Store citizen & rescuer GPS for live tracking
-- ============================================================

-- Citizen GPS at time of request
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Rescuer's last known GPS (updated during tracking)
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS rescuer_latitude DOUBLE PRECISION;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS rescuer_longitude DOUBLE PRECISION;
