-- ============================================================
-- Migration 008: Schema V2 — Production upgrade for Neon
-- Date: 2026-04-13
--
-- SAFE TO RUN ON EXISTING DATA:
--   ✅ Uses IF NOT EXISTS / IF EXISTS everywhere
--   ✅ Does NOT drop data columns (denormalized columns kept but unused)
--   ✅ Adds new tables, columns, constraints, indexes
--   ✅ Idempotent — can be run multiple times safely
--
-- HOW TO RUN:
--   psql $DATABASE_URL -f server/migrations/008_schema_v2.sql
--
-- OR via Neon SQL Editor: copy-paste this entire file
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 0. UTILITY FUNCTION (ensure exists)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════════════════════
-- 1. USERS — Add missing columns (from migrations 002, 004, 007)
-- ════════════════════════════════════════════════════════════

-- Profile fields (migration 007)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(15) DEFAULT '';

-- Location & safety (migration 002)
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS safety_status VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE users ADD COLUMN IF NOT EXISTS health_note TEXT DEFAULT '';

-- Password reset (migration 004)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

-- CHECK constraints (safe: will fail silently if data violates, see DO blocks)
DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('citizen', 'rescuer', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN check_violation THEN
            RAISE NOTICE 'WARNING: Existing data violates role check. Fixing...';
            UPDATE users SET role = 'citizen' WHERE role NOT IN ('citizen', 'rescuer', 'admin');
            ALTER TABLE users ADD CONSTRAINT users_role_check
              CHECK (role IN ('citizen', 'rescuer', 'admin'));
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_safety_status_check
    CHECK (safety_status IN ('unknown', 'safe', 'danger', 'injured'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_gender_check
    CHECK (gender IN ('', 'male', 'female', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fix legacy role: 'authority' → 'rescuer'
UPDATE users SET role = 'rescuer' WHERE role = 'authority';

-- Index for active users
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active) WHERE is_active = TRUE;


-- ════════════════════════════════════════════════════════════
-- 2. RESCUE REQUESTS — Add new columns, keep old denormalized ones
-- ════════════════════════════════════════════════════════════

-- GPS (migration 003)
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS rescuer_latitude DOUBLE PRECISION;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS rescuer_longitude DOUBLE PRECISION;

-- Cancellation tracking (migration 005)
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS last_cancelled_by INTEGER REFERENCES users(id);
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS last_cancelled_at TIMESTAMPTZ;

-- Group assignment (migration 006)
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS assigned_group_id INTEGER;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS accepted_mode VARCHAR(20) DEFAULT 'individual';

-- NEW: Timeline milestones
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Backfill resolved_at from updated_at for existing resolved requests
UPDATE rescue_requests
SET resolved_at = updated_at
WHERE status = 'resolved' AND resolved_at IS NULL;

-- Backfill assigned_at from updated_at for existing assigned/in_progress requests
UPDATE rescue_requests
SET assigned_at = updated_at
WHERE status IN ('assigned', 'in_progress') AND assigned_at IS NULL AND assigned_to IS NOT NULL;

-- CHECK constraints
DO $$
BEGIN
  ALTER TABLE rescue_requests ADD CONSTRAINT rr_status_check
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE rescue_requests ADD CONSTRAINT rr_urgency_check
    CHECK (urgency IN ('low', 'medium', 'high', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE rescue_requests ADD CONSTRAINT rr_accepted_mode_check
    CHECK (accepted_mode IN ('individual', 'group'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Better indexes
CREATE INDEX IF NOT EXISTS idx_rr_pending ON rescue_requests (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_rr_created ON rescue_requests (created_at DESC);

-- NOTE: Old denormalized columns (user_name, assigned_name, assigned_group_name,
-- last_cancelled_by_name) are KEPT for safety. The new code uses JOINs instead
-- and does not write to them. They can be dropped later with:
--   ALTER TABLE rescue_requests DROP COLUMN IF EXISTS user_name;
--   ALTER TABLE rescue_requests DROP COLUMN IF EXISTS assigned_name;
--   ALTER TABLE rescue_requests DROP COLUMN IF EXISTS assigned_group_name;
--   ALTER TABLE rescue_requests DROP COLUMN IF EXISTS last_cancelled_by_name;


-- ════════════════════════════════════════════════════════════
-- 3. RESCUE REQUEST LOGS — NEW TABLE
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rescue_request_logs (
    id              SERIAL PRIMARY KEY,
    request_id      INTEGER NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    changed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    old_status      VARCHAR(20),
    new_status      VARCHAR(20) NOT NULL,
    note            TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rrl_request    ON rescue_request_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_rrl_changed_by ON rescue_request_logs (changed_by);
CREATE INDEX IF NOT EXISTS idx_rrl_created    ON rescue_request_logs (created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 4. FAMILY CONNECTIONS — Ensure exists (from migration 002)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS family_connections (
    id              SERIAL PRIMARY KEY,
    requester_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation        VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (requester_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_fc_requester ON family_connections (requester_id);
CREATE INDEX IF NOT EXISTS idx_fc_receiver  ON family_connections (receiver_id);
CREATE INDEX IF NOT EXISTS idx_fc_status    ON family_connections (status);

DO $$
BEGIN
  ALTER TABLE family_connections ADD CONSTRAINT fc_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE family_connections ADD CONSTRAINT fc_no_self_connect
    CHECK (requester_id != receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER trigger_fc_updated_at
    BEFORE UPDATE ON family_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- 5. RESCUE GROUPS — Ensure constraints (from migration 006)
-- ════════════════════════════════════════════════════════════

-- Tables already exist from migration 006 or init_db.sql
-- Just add missing CHECK constraints

DO $$
BEGIN
  ALTER TABLE rescue_groups ADD CONSTRAINT rg_status_check
    CHECK (status IN ('active', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE rescue_group_members ADD CONSTRAINT rgm_role_check
    CHECK (member_role IN ('leader', 'co_leader', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE rescue_group_members ADD CONSTRAINT rgm_status_check
    CHECK (join_status IN ('active', 'left', 'removed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE rescue_group_invites ADD CONSTRAINT rgi_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add FK from rescue_requests → rescue_groups if missing
DO $$
BEGIN
  ALTER TABLE rescue_requests
    ADD CONSTRAINT fk_rr_group
    FOREIGN KEY (assigned_group_id) REFERENCES rescue_groups(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════
-- 6. NOTIFICATIONS — NEW TABLE
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT DEFAULT '',
    metadata        JSONB DEFAULT '{}',
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread  ON notifications (user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications (created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 7. NEWS ARTICLES — NEW TABLE
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS news_articles (
    id              SERIAL PRIMARY KEY,
    author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(500) NOT NULL,
    content         TEXT NOT NULL,
    cover_image_url TEXT DEFAULT '',
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    category        VARCHAR(50) DEFAULT 'general',
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_status    ON news_articles (status);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_news_category  ON news_articles (category);

CREATE OR REPLACE TRIGGER trigger_news_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- 8. AUDIT LOGS — NEW TABLE
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(50),
    target_id       INTEGER,
    before_data     JSONB,
    after_data      JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_target  ON audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 9. CONVERT TIMESTAMP → TIMESTAMPTZ (if needed)
-- ════════════════════════════════════════════════════════════
-- PostgreSQL handles this conversion automatically — no data loss

ALTER TABLE users
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE rescue_requests
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';


-- ════════════════════════════════════════════════════════════
-- DONE!
-- Verify with: \dt (should show 10 tables)
-- ════════════════════════════════════════════════════════════

-- Summary of changes:
--   ✅ users: added safety_status, health_note, profile fields, CHECK constraints
--   ✅ rescue_requests: added assigned_at, resolved_at, CHECK constraints, backfilled data
--   ✅ rescue_request_logs: NEW table (status change audit)
--   ✅ family_connections: ensured exists with constraints
--   ✅ rescue_groups/members/invites: added CHECK constraints
--   ✅ notifications: NEW table
--   ✅ news_articles: NEW table
--   ✅ audit_logs: NEW table
--   ✅ TIMESTAMP → TIMESTAMPTZ conversion
--   ⚠️  Old denormalized columns KEPT (can drop later)
