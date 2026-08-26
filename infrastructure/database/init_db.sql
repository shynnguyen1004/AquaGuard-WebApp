-- ============================================================
-- AquaGuard Database — Consolidated Schema
-- Version: 2.0
-- Date: 2026-04-13
--
-- This file is the SINGLE SOURCE OF TRUTH for the database.
-- Run via: make db-reset  (drops and recreates everything)
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 0. UTILITY FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════════════════════
-- 1. USERS — Central identity table
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,

    -- Auth
    phone_number        VARCHAR(15) UNIQUE NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    reset_token         VARCHAR(255),
    reset_token_expiry  TIMESTAMPTZ,

    -- Profile
    display_name        VARCHAR(100) DEFAULT 'User',
    email               VARCHAR(255) DEFAULT '',
    avatar_url          TEXT DEFAULT '',
    gender              VARCHAR(10) DEFAULT ''
                        CHECK (gender IN ('', 'male', 'female', 'other')),
    date_of_birth       DATE,
    emergency_contact   VARCHAR(15) DEFAULT '',

    -- Role & status
    role                VARCHAR(20) DEFAULT 'citizen'
                        CHECK (role IN ('citizen', 'rescuer', 'admin')),
    is_active           BOOLEAN DEFAULT TRUE,

    -- Trực ca (rescuer only) — chỉ 'on' mới nhận được lời mời auto-dispatch
    duty_status         VARCHAR(10) NOT NULL DEFAULT 'off'
                        CHECK (duty_status IN ('on', 'off')),

    -- Location (address only — live GPS is in user_locations table)
    address             TEXT DEFAULT '',

    -- Safety (family check feature)
    safety_status       VARCHAR(20) DEFAULT 'unknown'
                        CHECK (safety_status IN ('unknown', 'safe', 'danger', 'injured')),
    health_note         TEXT DEFAULT '',

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone    ON users (phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active   ON users (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_duty     ON users (duty_status) WHERE duty_status = 'on';

-- Auto-update trigger
CREATE OR REPLACE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- 2. RESCUE REQUESTS — SOS lifecycle tracking
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rescue_requests (
    id                  SERIAL PRIMARY KEY,

    -- Who created the SOS
    user_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Location & description
    location            TEXT NOT NULL,
    description         TEXT NOT NULL,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    images              TEXT[] DEFAULT '{}',

    -- Severity & status
    urgency             VARCHAR(20) DEFAULT 'medium'
                        CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'cancelled')),

    -- Assignment
    assigned_to         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_group_id   INTEGER,  -- FK added after rescue_groups table is created
    accepted_mode       VARCHAR(20) DEFAULT 'individual'
                        CHECK (accepted_mode IN ('individual', 'group')),

    -- Rescuer live GPS (updated during tracking via WebSocket)
    rescuer_latitude    DOUBLE PRECISION,
    rescuer_longitude   DOUBLE PRECISION,

    -- Cancellation tracking
    last_cancelled_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_cancelled_at   TIMESTAMPTZ,

    -- Auto-dispatch bookkeeping (trục SONG SONG với `status` — mô tả quá trình
    -- điều phối, không thay thế vòng đời pending → in_progress → resolved)
    dispatch_status     VARCHAR(20) NOT NULL DEFAULT 'none'
                        CHECK (dispatch_status IN (
                            'none',            -- chưa chạy điều phối
                            'searching',       -- đang quét ứng viên
                            'assigned_direct', -- đã giao thẳng cho một rescuer
                            'no_candidate',    -- hết ứng viên → admin điều phối tay
                            'manual',          -- admin đã can thiệp tay
                            -- di sản của chế độ "mời + chờ nhận" (trước 012)
                            'offered', 'auto_assigned'
                        )),
    dispatch_attempts   INTEGER NOT NULL DEFAULT 0,
    dispatch_radius_km  DOUBLE PRECISION,
    auto_assigned_at    TIMESTAMPTZ,

    -- Timeline milestones
    assigned_at         TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rr_dispatch_status ON rescue_requests (dispatch_status)
    WHERE dispatch_status IN ('searching', 'offered', 'no_candidate');
CREATE INDEX IF NOT EXISTS idx_rr_status      ON rescue_requests (status);
CREATE INDEX IF NOT EXISTS idx_rr_user_id     ON rescue_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_rr_assigned    ON rescue_requests (assigned_to);
CREATE INDEX IF NOT EXISTS idx_rr_group       ON rescue_requests (assigned_group_id);
CREATE INDEX IF NOT EXISTS idx_rr_pending     ON rescue_requests (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_rr_created     ON rescue_requests (created_at DESC);

-- Auto-update trigger
CREATE OR REPLACE TRIGGER trigger_rr_updated_at
    BEFORE UPDATE ON rescue_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- 3. RESCUE REQUEST LOGS — Status change audit trail
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rescue_request_logs (
    id                  SERIAL PRIMARY KEY,
    request_id          INTEGER NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    changed_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    old_status          VARCHAR(20),
    new_status          VARCHAR(20) NOT NULL,
    note                TEXT DEFAULT '',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rrl_request    ON rescue_request_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_rrl_changed_by ON rescue_request_logs (changed_by);
CREATE INDEX IF NOT EXISTS idx_rrl_created    ON rescue_request_logs (created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 4. RESCUE GROUPS — Team management
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rescue_groups (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(120) NOT NULL,
    description         TEXT DEFAULT '',
    created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    leader_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status              VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active', 'archived')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rg_status      ON rescue_groups (status);
CREATE INDEX IF NOT EXISTS idx_rg_leader      ON rescue_groups (leader_id);

CREATE OR REPLACE TRIGGER trigger_rg_updated_at
    BEFORE UPDATE ON rescue_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Now add the FK from rescue_requests → rescue_groups
ALTER TABLE rescue_requests
    ADD CONSTRAINT fk_rr_group
    FOREIGN KEY (assigned_group_id) REFERENCES rescue_groups(id) ON DELETE SET NULL;


-- ════════════════════════════════════════════════════════════
-- 5. RESCUE GROUP MEMBERS — N:N junction
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rescue_group_members (
    id                  SERIAL PRIMARY KEY,
    group_id            INTEGER NOT NULL REFERENCES rescue_groups(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_role         VARCHAR(20) DEFAULT 'member'
                        CHECK (member_role IN ('leader', 'co_leader', 'member')),
    join_status         VARCHAR(20) DEFAULT 'active'
                        CHECK (join_status IN ('active', 'left', 'removed')),
    joined_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rgm_group      ON rescue_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_rgm_user       ON rescue_group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_rgm_status     ON rescue_group_members (join_status);

CREATE OR REPLACE TRIGGER trigger_rgm_updated_at
    BEFORE UPDATE ON rescue_group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- 6. RESCUE GROUP INVITES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rescue_group_invites (
    id                      SERIAL PRIMARY KEY,
    group_id                INTEGER NOT NULL REFERENCES rescue_groups(id) ON DELETE CASCADE,
    invited_user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_phone_number    VARCHAR(15) NOT NULL,
    invited_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status                  VARCHAR(20) DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    responded_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rgi_group      ON rescue_group_invites (group_id);
CREATE INDEX IF NOT EXISTS idx_rgi_user       ON rescue_group_invites (invited_user_id);
CREATE INDEX IF NOT EXISTS idx_rgi_status     ON rescue_group_invites (status);


-- ════════════════════════════════════════════════════════════
-- 7. FAMILY CONNECTIONS — Bidirectional family links
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS family_connections (
    id                  SERIAL PRIMARY KEY,
    requester_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation            VARCHAR(50),
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (requester_id, receiver_id),
    CHECK  (requester_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_fc_requester   ON family_connections (requester_id);
CREATE INDEX IF NOT EXISTS idx_fc_receiver    ON family_connections (receiver_id);
CREATE INDEX IF NOT EXISTS idx_fc_status      ON family_connections (status);

CREATE OR REPLACE TRIGGER trigger_fc_updated_at
    BEFORE UPDATE ON family_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- 8. NOTIFICATIONS — In-app notification system
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(50) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    body                TEXT DEFAULT '',
    metadata            JSONB DEFAULT '{}',
    is_read             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user     ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread   ON notifications (user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_created  ON notifications (created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 9. NEWS ARTICLES — Admin-published content
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS news_articles (
    id                  SERIAL PRIMARY KEY,
    author_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title               VARCHAR(500) NOT NULL,
    content             TEXT NOT NULL,
    cover_image_url     TEXT DEFAULT '',
    status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    category            VARCHAR(50) DEFAULT 'general',
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_status    ON news_articles (status);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_news_category  ON news_articles (category);

CREATE OR REPLACE TRIGGER trigger_news_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- 10. AUDIT LOGS — Append-only action history
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action              VARCHAR(100) NOT NULL,
    target_type         VARCHAR(50),
    target_id           INTEGER,
    before_data         JSONB,
    after_data          JSONB,
    ip_address          VARCHAR(45),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs (created_at DESC);


-- ════════════════════════════════════════════════════════════
-- 11. USER LOCATIONS — Centralized GPS coordinates
-- Single source of truth for user positions (family map, SOS tracking)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_locations (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    address     TEXT DEFAULT '',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations (user_id);


-- ════════════════════════════════════════════════════════════
-- 12. RESCUE DISPATCH OFFERS — Nhật ký phân công tự động
-- Mỗi dòng = một lần hệ thống giao một SOS cho một rescuer.
-- Dùng cho: audit (vì sao chọn người này — điểm, khoảng cách), loại người
-- đã thử khi phải giao lại, và tính tỉ lệ bỏ ca để chấm độ tin cậy.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rescue_dispatch_offers (
    id                  SERIAL PRIMARY KEY,

    request_id          INTEGER NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    rescuer_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Team của rescuer lúc được giao → đi vào rescue_requests.assigned_group_id
    -- để GET /api/sos/team của đồng đội vẫn hoạt động.
    group_id            INTEGER REFERENCES rescue_groups(id) ON DELETE SET NULL,

    -- Ảnh chụp lúc giao (audit + hiển thị "cách bạn 1.2 km")
    distance_km         DOUBLE PRECISION,
    score               DOUBLE PRECISION,
    rescuer_latitude    DOUBLE PRECISION,
    rescuer_longitude   DOUBLE PRECISION,
    attempt             INTEGER NOT NULL DEFAULT 1,

    status              VARCHAR(20) NOT NULL DEFAULT 'auto_assigned'
                        CHECK (status IN (
                            'auto_assigned', -- hệ thống đã giao cho người này
                            'released',      -- rescuer tự bỏ ca sau khi được giao
                            'reassigned',    -- watchdog thu hồi vì rescuer mất tích
                            'superseded',    -- admin điều phối tay đè lên
                            'completed',
                            -- di sản của chế độ "mời + chờ nhận" (trước 012)
                            'offered', 'accepted', 'declined', 'expired', 'cancelled'
                        )),

    -- Chỉ có nghĩa với chế độ mời cũ; giao thẳng không có hạn chót.
    expires_at          TIMESTAMPTZ,
    responded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rdo_request ON rescue_dispatch_offers (request_id, status);
CREATE INDEX IF NOT EXISTS idx_rdo_rescuer ON rescue_dispatch_offers (rescuer_id, status);
CREATE INDEX IF NOT EXISTS idx_rdo_history
    ON rescue_dispatch_offers (rescuer_id, created_at DESC);
-- Watchdog quét đúng index này: ai được giao mà chưa bắt đầu.
CREATE INDEX IF NOT EXISTS idx_rdo_active
    ON rescue_dispatch_offers (created_at) WHERE status = 'auto_assigned';
-- Mỗi request chỉ có đúng MỘT phân công đang hiệu lực.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rdo_one_active_assignment
    ON rescue_dispatch_offers (request_id) WHERE status = 'auto_assigned';


-- ════════════════════════════════════════════════════════════
-- 13. WATER SENSORS — cảm biến mực nước ESP32 do người dân lắp
-- Thiết bị xác thực bằng device key (SHA-256), không dùng JWT.
-- Xem backend/migrations/013_water_sensors.sql
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS water_sensors (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name                VARCHAR(80)  NOT NULL DEFAULT 'Cảm biến mực nước',
    device_key_hash     CHAR(64)     NOT NULL UNIQUE,
    device_key_prefix   VARCHAR(12)  NOT NULL DEFAULT '',

    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    address             TEXT NOT NULL DEFAULT '',

    -- Bảng hiệu chuẩn nhiều điểm [[phần_trăm, raw], ...] (bản sao calib.json)
    calibration         JSONB,

    alert_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    alert_threshold     SMALLINT NOT NULL DEFAULT 58
                        CHECK (alert_threshold BETWEEN 1 AND 100),
    last_alert_level    SMALLINT NOT NULL DEFAULT 0,
    last_alert_at       TIMESTAMPTZ,

    -- Ảnh chụp lần đọc gần nhất (danh sách thiết bị chỉ cần 1 query)
    last_raw            INTEGER,
    last_percent        SMALLINT,
    last_level          SMALLINT,
    last_seen_at        TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_sensors_user ON water_sensors (user_id);
CREATE INDEX IF NOT EXISTS idx_water_sensors_live
    ON water_sensors (last_seen_at DESC)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- 14. WATER SENSOR READINGS — chuỗi số đo (đã lấy mẫu thưa)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS water_sensor_readings (
    id              BIGSERIAL PRIMARY KEY,
    sensor_id       INTEGER NOT NULL REFERENCES water_sensors(id) ON DELETE CASCADE,

    raw             INTEGER,
    percent         SMALLINT NOT NULL,
    level           SMALLINT NOT NULL DEFAULT 0,
    voltage_mv      INTEGER,

    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wsr_sensor_time
    ON water_sensor_readings (sensor_id, recorded_at DESC);


-- ════════════════════════════════════════════════════════════
-- SEED DATA (development only)
-- ════════════════════════════════════════════════════════════
-- Password: "password123" → bcrypt hash placeholder
-- In production, users are created via the /api/auth/register endpoint

INSERT INTO users (phone_number, password_hash, display_name, role)
VALUES
    ('+84901234567', '$2b$10$examplehashonly.thisisnotarealpasswordhash1', 'Nguyễn Văn A', 'citizen'),
    ('+84912345678', '$2b$10$examplehashonly.thisisnotarealpasswordhash2', 'Trần Thị B', 'rescuer'),
    ('+84923456789', '$2b$10$examplehashonly.thisisnotarealpasswordhash3', 'Admin User', 'admin')
ON CONFLICT (phone_number) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- DONE — 14 tables ready
-- Verify: \dt (list tables)
-- ════════════════════════════════════════════════════════════
