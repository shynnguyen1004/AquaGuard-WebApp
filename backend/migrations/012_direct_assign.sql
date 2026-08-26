-- ════════════════════════════════════════════════════════════
-- 012: GIAO THẲNG — bỏ cơ chế "mời + chờ nhận"
-- ════════════════════════════════════════════════════════════
-- Áp dụng thủ công:
--   psql "$DATABASE_URL" -f backend/migrations/012_direct_assign.sql
-- Đã mirror vào infrastructure/database/init_db.sql.
--
-- Hệ thống nay CHỌN và GIAO luôn cho rescuer phù hợp nhất, không hỏi.
-- Bảng rescue_dispatch_offers đổi vai: từ "hàng đợi lời mời" thành
-- "nhật ký phân công" — vẫn cần để audit (vì sao chọn người này), để loại
-- người đã thử khi phải giao lại, và để tính tỉ lệ bỏ ca.

-- ────────────────────────────────────────────────────────────
-- Mở rộng CHECK status. Giữ nguyên các giá trị cũ để dữ liệu đã có
-- (nếu bạn từng chạy chế độ mời) không vi phạm ràng buộc.
--   auto_assigned — hệ thống đã giao cho người này
--   released      — rescuer tự bỏ ca sau khi được giao (dùng để chấm độ tin cậy)
--   reassigned    — watchdog thu hồi vì rescuer mất tích, đã giao cho người khác
--   superseded    — admin điều phối tay, đè lên phân công tự động
-- ────────────────────────────────────────────────────────────
ALTER TABLE rescue_dispatch_offers
    DROP CONSTRAINT IF EXISTS rescue_dispatch_offers_status_check;

ALTER TABLE rescue_dispatch_offers
    ADD CONSTRAINT rescue_dispatch_offers_status_check CHECK (status IN (
        'auto_assigned', 'released', 'reassigned', 'superseded', 'completed',
        -- di sản của chế độ mời (012 trở về trước)
        'offered', 'accepted', 'declined', 'expired', 'cancelled'
    ));

-- expires_at chỉ có nghĩa với chế độ mời. Giao thẳng thì không có hạn chót,
-- nên bỏ NOT NULL thay vì phải nhét một giá trị giả.
ALTER TABLE rescue_dispatch_offers
    ALTER COLUMN expires_at DROP NOT NULL;

-- Chặn giao trùng: mỗi request chỉ có đúng MỘT phân công đang hiệu lực.
DROP INDEX IF EXISTS idx_rdo_one_live_offer;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rdo_one_active_assignment
    ON rescue_dispatch_offers (request_id) WHERE status = 'auto_assigned';

-- Watchdog quét đúng index này: ai được giao mà chưa bắt đầu.
CREATE INDEX IF NOT EXISTS idx_rdo_active
    ON rescue_dispatch_offers (created_at) WHERE status = 'auto_assigned';

-- ────────────────────────────────────────────────────────────
-- dispatch_status: thêm 'assigned_direct' để phân biệt với luồng mời cũ.
--
-- Ràng buộc này có thể mang MỘT TRONG HAI tên, tuỳ DB được dựng bằng cách nào:
--   chk_rr_dispatch_status            — nếu chạy migration 011
--   rescue_requests_dispatch_status_check — nếu dựng mới từ init_db.sql
--     (Postgres tự đặt tên cho CHECK viết inline trong định nghĩa cột)
-- Phải drop cả hai, nếu không sẽ dính lỗi vi phạm ràng buộc lúc chạy.
-- ────────────────────────────────────────────────────────────
ALTER TABLE rescue_requests
    DROP CONSTRAINT IF EXISTS chk_rr_dispatch_status;

ALTER TABLE rescue_requests
    DROP CONSTRAINT IF EXISTS rescue_requests_dispatch_status_check;

ALTER TABLE rescue_requests
    ADD CONSTRAINT chk_rr_dispatch_status CHECK (dispatch_status IN (
        'none',
        'searching',
        'assigned_direct',  -- hệ thống đã giao thẳng cho một rescuer
        'no_candidate',
        'manual',
        -- di sản của chế độ mời
        'offered', 'auto_assigned'
    ));
