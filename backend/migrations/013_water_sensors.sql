-- ════════════════════════════════════════════════════════════
-- 013: CẢM BIẾN MỰC NƯỚC — thiết bị ESP32 của người dân
-- ════════════════════════════════════════════════════════════
-- Áp dụng thủ công (không có migration runner):
--   psql "$DATABASE_URL" -f backend/migrations/013_water_sensors.sql
-- Nội dung này đã được mirror vào infrastructure/database/init_db.sql
-- để Docker build mới có sẵn schema.
--
-- Idempotent: chạy lại nhiều lần không lỗi.

-- ────────────────────────────────────────────────────────────
-- 1. THIẾT BỊ — mỗi board ESP32 gắn cảm biến mực nước là một dòng
--
--    Thiết bị KHÔNG đăng nhập bằng JWT (nó không có người ngồi bấm), mà gửi
--    dữ liệu kèm header X-Device-Key. Chỉ lưu SHA-256 của key: rò database
--    cũng không giả mạo được thiết bị. `device_key_prefix` (8 ký tự đầu) chỉ
--    để người dùng nhận ra "đây đúng là key mình đã nạp vào board".
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_sensors (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name                VARCHAR(80)  NOT NULL DEFAULT 'Cảm biến mực nước',
    device_key_hash     CHAR(64)     NOT NULL UNIQUE,   -- sha256 hex
    device_key_prefix   VARCHAR(12)  NOT NULL DEFAULT '',

    -- Vị trí đặt cảm biến (không phải vị trí người dùng — cảm biến đứng yên)
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    address             TEXT NOT NULL DEFAULT '',

    -- Bảng hiệu chuẩn nhiều điểm [[phần_trăm, raw], ...] — bản sao của
    -- calib.json trên board. Có nó, server tự quy đổi raw → % được, nên
    -- board hỏng/mất file vẫn không sai số liệu lịch sử.
    calibration         JSONB,

    -- Cảnh báo khi mức nước chạm ngưỡng (%). alert_level lưu mức đã báo gần
    -- nhất để không spam lại cùng một mức.
    alert_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    alert_threshold     SMALLINT NOT NULL DEFAULT 58,   -- = mức "NGẬP CAO"
    last_alert_level    SMALLINT NOT NULL DEFAULT 0,
    last_alert_at       TIMESTAMPTZ,

    -- Ảnh chụp lần đọc gần nhất — để danh sách thiết bị chỉ cần 1 query
    last_raw            INTEGER,
    last_percent        SMALLINT,
    last_level          SMALLINT,
    last_seen_at        TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
    ALTER TABLE water_sensors
        ADD CONSTRAINT chk_ws_threshold CHECK (alert_threshold BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_water_sensors_user ON water_sensors (user_id);
-- Bản đồ ngập: chỉ quan tâm thiết bị còn sống và có toạ độ.
CREATE INDEX IF NOT EXISTS idx_water_sensors_live
    ON water_sensors (last_seen_at DESC)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 2. CHUỖI SỐ ĐO — dữ liệu vẽ biểu đồ
--
--    Board gửi mỗi vài giây, nhưng ingest chỉ GHI khi mức nước đổi đáng kể
--    hoặc đã quá SAMPLE_MIN_GAP (xem routes/sensors.js) — không thì một
--    thiết bị cũng đủ nhấn chìm Neon free tier.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_sensor_readings (
    id              BIGSERIAL PRIMARY KEY,
    sensor_id       INTEGER NOT NULL REFERENCES water_sensors(id) ON DELETE CASCADE,

    raw             INTEGER,            -- giá trị ADC 0-65535
    percent         SMALLINT NOT NULL,  -- 0-100 sau khi nội suy hiệu chuẩn
    level           SMALLINT NOT NULL DEFAULT 0,  -- 0..5, xem config/waterLevels.js
    voltage_mv      INTEGER,

    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wsr_sensor_time
    ON water_sensor_readings (sensor_id, recorded_at DESC);

COMMENT ON TABLE water_sensors IS 'Cảm biến mực nước ESP32 do người dân tự lắp';
COMMENT ON TABLE water_sensor_readings IS 'Chuỗi số đo mực nước (đã lấy mẫu thưa)';
