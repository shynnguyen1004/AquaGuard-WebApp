-- ════════════════════════════════════════════════════════════
-- 011: AUTO-DISPATCH — điều phối cứu hộ tự động theo khoảng cách
-- ════════════════════════════════════════════════════════════
-- Áp dụng thủ công (không có migration runner):
--   psql "$DATABASE_URL" -f backend/migrations/011_dispatch.sql
-- Nội dung này đã được mirror vào infrastructure/database/init_db.sql
-- để Docker build mới có sẵn schema.
--
-- Idempotent: chạy lại nhiều lần không lỗi.

-- ────────────────────────────────────────────────────────────
-- 1. TRẠNG THÁI TRỰC của rescuer (nút Bật/Tắt trực)
--    Chỉ rescuer đang 'on' mới lọt vào pool ứng viên.
--    Mặc định 'off' — rescuer phải chủ động bật ca.
-- ────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS duty_status VARCHAR(10) NOT NULL DEFAULT 'off';

DO $$ BEGIN
    ALTER TABLE users
        ADD CONSTRAINT chk_users_duty_status CHECK (duty_status IN ('on', 'off'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_duty
    ON users (duty_status) WHERE duty_status = 'on';


-- ────────────────────────────────────────────────────────────
-- 2. SỔ THEO DÕI ĐIỀU PHỐI trên rescue_requests
--    status vẫn giữ nguyên vòng đời cũ (pending → in_progress → resolved);
--    dispatch_status là trục SONG SONG chỉ mô tả quá trình điều phối,
--    nên admin vẫn thấy và can thiệp tay được ở mọi thời điểm.
-- ────────────────────────────────────────────────────────────
ALTER TABLE rescue_requests
    ADD COLUMN IF NOT EXISTS dispatch_status    VARCHAR(20) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS dispatch_attempts  INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dispatch_radius_km DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS auto_assigned_at   TIMESTAMPTZ;

DO $$ BEGIN
    ALTER TABLE rescue_requests
        ADD CONSTRAINT chk_rr_dispatch_status CHECK (dispatch_status IN (
            'none',          -- chưa chạy điều phối (vd: tạo trước khi có tính năng)
            'searching',     -- đang quét ứng viên
            'offered',       -- đã gửi lời mời, đang chờ phản hồi
            'auto_assigned', -- một rescuer đã nhận qua lời mời tự động
            'no_candidate',  -- hết ứng viên → cần admin điều phối tay
            'manual'         -- admin đã can thiệp tay, dừng auto-dispatch
        ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_rr_dispatch_status
    ON rescue_requests (dispatch_status)
    WHERE dispatch_status IN ('searching', 'offered', 'no_candidate');


-- ────────────────────────────────────────────────────────────
-- 3. BẢNG LỜI MỜI — trái tim của cơ chế "mời tuần tự + timeout"
--    Mỗi dòng = một lần hệ thống mời một rescuer cụ thể.
--    Dùng cho: chống mời trùng, đếm lịch sử từ chối (chấm điểm),
--    và cho admin xem lại dấu vết điều phối.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rescue_dispatch_offers (
    id                  SERIAL PRIMARY KEY,

    request_id          INTEGER NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    rescuer_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Team của rescuer tại thời điểm mời. Giữ lại để khi nhận thì set
    -- assigned_group_id, nhờ đó GET /api/sos/team của đồng đội vẫn hoạt động.
    group_id            INTEGER REFERENCES rescue_groups(id) ON DELETE SET NULL,

    -- Ảnh chụp lúc mời (audit + hiển thị "cách bạn 1.2km")
    distance_km         DOUBLE PRECISION,
    score               DOUBLE PRECISION,
    rescuer_latitude    DOUBLE PRECISION,
    rescuer_longitude   DOUBLE PRECISION,
    attempt             INTEGER NOT NULL DEFAULT 1,

    status              VARCHAR(20) NOT NULL DEFAULT 'offered'
                        CHECK (status IN ('offered', 'accepted', 'declined', 'expired', 'cancelled')),

    expires_at          TIMESTAMPTZ NOT NULL,
    responded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rdo_request ON rescue_dispatch_offers (request_id, status);
CREATE INDEX IF NOT EXISTS idx_rdo_rescuer ON rescue_dispatch_offers (rescuer_id, status);
-- Sweeper quét đúng index này mỗi 10s → phải hẹp và có điều kiện.
CREATE INDEX IF NOT EXISTS idx_rdo_expiry
    ON rescue_dispatch_offers (expires_at) WHERE status = 'offered';
-- Lịch sử từ chối 7 ngày gần nhất (dùng khi chấm điểm độ tin cậy)
CREATE INDEX IF NOT EXISTS idx_rdo_history
    ON rescue_dispatch_offers (rescuer_id, created_at DESC);
-- Chặn double-offer: mỗi (request, rescuer) chỉ có tối đa 1 lời mời đang treo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rdo_one_live_offer
    ON rescue_dispatch_offers (request_id, rescuer_id) WHERE status = 'offered';
