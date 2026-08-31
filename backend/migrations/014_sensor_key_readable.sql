-- ════════════════════════════════════════════════════════════
-- 014: CHO PHÉP XEM LẠI DEVICE KEY
-- ════════════════════════════════════════════════════════════
-- Áp dụng thủ công:
--   psql "$DATABASE_URL" -f backend/migrations/014_sensor_key_readable.sql
-- Idempotent: chạy lại nhiều lần không lỗi.
--
-- ĐÁNH ĐỔI CÓ CHỦ Ý:
--   Trước đây chỉ lưu SHA-256, nên rò database cũng không giả mạo được thiết
--   bị — nhưng mất key thì phải xoay key mới và nạp lại board. Trong thực tế
--   vận hành, người lắp thiết bị mất key thường xuyên hơn nhiều so với xác
--   suất rò database, và mỗi lần mất là một chuyến ra hiện trường cắm cáp.
--
--   Nên bổ sung cột lưu key dạng đọc được. Xác thực VẪN dùng cột hash
--   (device_key_hash) — cột này chỉ để hiện lại cho đúng người có quyền quản
--   lý thiết bị. Ai không quản lý được thiết bị thì API không trả về.
--
--   Thiết bị tạo TRƯỚC migration này có device_key = NULL: không có cách nào
--   khôi phục, giao diện sẽ mời "Cấp key mới".
-- ────────────────────────────────────────────────────────────

ALTER TABLE water_sensors
    ADD COLUMN IF NOT EXISTS device_key TEXT;

COMMENT ON COLUMN water_sensors.device_key IS
    'Key dạng đọc được, chỉ trả về cho người quản lý được thiết bị. Xác thực dùng device_key_hash.';
