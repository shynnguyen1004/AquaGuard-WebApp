-- Family Check Feature Migration
-- Run this against your PostgreSQL database (Neon)

-- 1. Create family_connections table
CREATE TABLE IF NOT EXISTS family_connections (
  id            SERIAL PRIMARY KEY,
  requester_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation      VARCHAR(50),
  status        VARCHAR(20) DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requester_id, receiver_id)
);

-- 2. Add safety/location columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS safety_status VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE users ADD COLUMN IF NOT EXISTS health_note TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
