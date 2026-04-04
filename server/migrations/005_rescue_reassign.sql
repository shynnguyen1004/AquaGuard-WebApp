-- ============================================================
-- Migration 005: Track rescuer who cancelled an in-progress SOS
-- Purpose: Allow a rescuer to release a mission back to pending
-- ============================================================

ALTER TABLE rescue_requests
  ADD COLUMN IF NOT EXISTS last_cancelled_by INTEGER REFERENCES users(id);

ALTER TABLE rescue_requests
  ADD COLUMN IF NOT EXISTS last_cancelled_by_name VARCHAR(100);

ALTER TABLE rescue_requests
  ADD COLUMN IF NOT EXISTS last_cancelled_at TIMESTAMP;
