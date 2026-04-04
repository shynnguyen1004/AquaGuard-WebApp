-- ============================================================
-- Migration 006: Rescue groups and group-based SOS acceptance
-- ============================================================

ALTER TABLE rescue_requests
  ADD COLUMN IF NOT EXISTS assigned_group_id INTEGER;

ALTER TABLE rescue_requests
  ADD COLUMN IF NOT EXISTS assigned_group_name VARCHAR(120);

ALTER TABLE rescue_requests
  ADD COLUMN IF NOT EXISTS accepted_mode VARCHAR(20) DEFAULT 'individual';

CREATE INDEX IF NOT EXISTS idx_rescue_assigned_group ON rescue_requests (assigned_group_id);

CREATE TABLE IF NOT EXISTS rescue_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  leader_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rescue_groups_status ON rescue_groups (status);
CREATE INDEX IF NOT EXISTS idx_rescue_groups_leader ON rescue_groups (leader_id);

CREATE OR REPLACE TRIGGER trigger_rescue_groups_updated_at
  BEFORE UPDATE ON rescue_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS rescue_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES rescue_groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  member_role VARCHAR(20) DEFAULT 'member',
  join_status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rescue_group_members_group ON rescue_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_members_user ON rescue_group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_members_status ON rescue_group_members (join_status);

CREATE OR REPLACE TRIGGER trigger_rescue_group_members_updated_at
  BEFORE UPDATE ON rescue_group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS rescue_group_invites (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES rescue_groups(id) ON DELETE CASCADE,
  invited_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  invited_phone_number VARCHAR(15) NOT NULL,
  invited_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rescue_group_invites_group ON rescue_group_invites (group_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_invites_user ON rescue_group_invites (invited_user_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_invites_status ON rescue_group_invites (status);
