-- ============================================================
-- AquaGuard Database Initialization Script
-- Database: aquaguard_db
-- Mục đích: Tạo bảng users cho đăng nhập bằng số điện thoại
-- ============================================================

-- ── Bảng users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    phone_number  VARCHAR(15) UNIQUE NOT NULL,       -- SĐT (VD: +84901234567)
    password_hash VARCHAR(255) NOT NULL,              -- Mật khẩu đã hash (bcrypt)
    display_name  VARCHAR(100) DEFAULT 'User',        -- Tên hiển thị
    role          VARCHAR(20) DEFAULT 'citizen',       -- citizen | authority | admin
    avatar_url    TEXT DEFAULT '',                     -- Ảnh đại diện (URL)
    is_active     BOOLEAN DEFAULT TRUE,                -- Trạng thái tài khoản
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Index để tìm kiếm nhanh theo số điện thoại ─────────────
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number);

-- ── Index để lọc theo role ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ── Trigger tự động cập nhật updated_at ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ── Dữ liệu mẫu (mật khẩu: "password123" đã hash bcrypt) ──
-- Hash bcrypt cho "password123": $2b$10$YourBcryptHashHere
-- Lưu ý: Đây chỉ là dữ liệu mẫu để test, trong thực tế
--         mật khẩu sẽ được hash từ backend bằng bcrypt

INSERT INTO users (phone_number, password_hash, display_name, role)
VALUES
    ('+84901234567', '$2b$10$examplehashonly.thisisnotarealpasswordhash1', 'Nguyễn Văn A', 'citizen'),
    ('+84912345678', '$2b$10$examplehashonly.thisisnotarealpasswordhash2', 'Trần Thị B', 'authority'),
    ('+84923456789', '$2b$10$examplehashonly.thisisnotarealpasswordhash3', 'Admin User', 'admin')
ON CONFLICT (phone_number) DO NOTHING;

-- ============================================================
-- Xong! Bảng users đã sẵn sàng.
-- Kiểm tra: SELECT * FROM users;
-- ============================================================

-- ── Bảng rescue_requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS rescue_requests (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    user_name       VARCHAR(100),
    location        TEXT NOT NULL,
    description     TEXT NOT NULL,
    urgency         VARCHAR(20) DEFAULT 'medium',      -- low | medium | high | critical
    status          VARCHAR(20) DEFAULT 'pending',     -- pending | in_progress | resolved
    assigned_to     INTEGER REFERENCES users(id),
    assigned_name   VARCHAR(100),
    assigned_group_id INTEGER,
    assigned_group_name VARCHAR(120),
    accepted_mode   VARCHAR(20) DEFAULT 'individual',  -- individual | group
    last_cancelled_by INTEGER REFERENCES users(id),
    last_cancelled_by_name VARCHAR(100),
    last_cancelled_at TIMESTAMP,
    images          TEXT[] DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes cho rescue_requests ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rescue_status ON rescue_requests (status);
CREATE INDEX IF NOT EXISTS idx_rescue_user ON rescue_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_rescue_assigned ON rescue_requests (assigned_to);
CREATE INDEX IF NOT EXISTS idx_rescue_assigned_group ON rescue_requests (assigned_group_id);

-- ── Trigger tự động cập nhật updated_at cho rescue_requests ─
CREATE OR REPLACE TRIGGER trigger_rescue_updated_at
    BEFORE UPDATE ON rescue_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Xong! Bảng rescue_requests đã sẵn sàng.
-- Kiểm tra: SELECT * FROM rescue_requests;
-- ============================================================

-- ── Bảng rescue_groups ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS rescue_groups (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    description     TEXT DEFAULT '',
    created_by      INTEGER REFERENCES users(id),
    leader_id       INTEGER REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'active',      -- active | archived
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rescue_groups_status ON rescue_groups (status);
CREATE INDEX IF NOT EXISTS idx_rescue_groups_leader ON rescue_groups (leader_id);

CREATE OR REPLACE TRIGGER trigger_rescue_groups_updated_at
    BEFORE UPDATE ON rescue_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ── Bảng rescue_group_members ───────────────────────────────
CREATE TABLE IF NOT EXISTS rescue_group_members (
    id              SERIAL PRIMARY KEY,
    group_id        INTEGER REFERENCES rescue_groups(id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    member_role     VARCHAR(20) DEFAULT 'member',      -- leader | co_leader | member
    join_status     VARCHAR(20) DEFAULT 'active',      -- pending | active | left | removed
    joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rescue_group_members_group ON rescue_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_members_user ON rescue_group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_members_status ON rescue_group_members (join_status);

CREATE OR REPLACE TRIGGER trigger_rescue_group_members_updated_at
    BEFORE UPDATE ON rescue_group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ── Bảng rescue_group_invites ───────────────────────────────
CREATE TABLE IF NOT EXISTS rescue_group_invites (
    id                  SERIAL PRIMARY KEY,
    group_id            INTEGER REFERENCES rescue_groups(id) ON DELETE CASCADE,
    invited_user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    invited_phone_number VARCHAR(15) NOT NULL,
    invited_by          INTEGER REFERENCES users(id),
    status              VARCHAR(20) DEFAULT 'pending', -- pending | accepted | declined | cancelled
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rescue_group_invites_group ON rescue_group_invites (group_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_invites_user ON rescue_group_invites (invited_user_id);
CREATE INDEX IF NOT EXISTS idx_rescue_group_invites_status ON rescue_group_invites (status);
