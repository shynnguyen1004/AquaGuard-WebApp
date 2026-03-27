-- Migration 004: Add reset password columns
-- Thêm cột reset_token và reset_token_expiry cho chức năng quên mật khẩu

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
