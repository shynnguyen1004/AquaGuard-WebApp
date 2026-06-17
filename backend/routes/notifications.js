const express = require("express");
const pool = require("../db");
const { authMiddleware, requireAdmin } = require("../middleware/auth");
const { createNotification, createNotificationsForUsers } = require("../utils/notifications");

const router = express.Router();

// ──────────────────────────────────────────────
// GET /api/notifications
// Danh sách notification của user hiện tại (mới nhất trước) + số chưa đọc
// ──────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, title, body, metadata, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    const unread = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    return res.json({
      success: true,
      data: result.rows,
      unreadCount: unread.rows[0]?.count || 0,
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/notifications/read-all — đánh dấu tất cả đã đọc
// (đặt trước /:id/read để tránh nhầm route param)
// ──────────────────────────────────────────────
router.put("/read-all", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/notifications/:id/read — đánh dấu 1 noti đã đọc
// ──────────────────────────────────────────────
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/notifications/:id — xoá 1 noti của chính user
// ──────────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete notification error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// POST /api/notifications/admin/send — admin gửi thông báo
// Body: { target: "all" | "user" | "role", userId?, role?, title, body, type? }
// ──────────────────────────────────────────────
router.post("/admin/send", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { target, userId, role, title, body = "", type = "admin_announcement" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu tiêu đề thông báo" });
    }
    if (!["all", "user", "role"].includes(target)) {
      return res.status(400).json({ success: false, message: "Đối tượng nhận không hợp lệ" });
    }

    let sentCount = 0;
    const metadata = { senderRole: "admin" };

    if (target === "user") {
      if (!userId) {
        return res.status(400).json({ success: false, message: "Thiếu người nhận" });
      }
      // Lấy email để mirror khi gửi cho 1 người
      const u = await pool.query(
        `SELECT id, email, display_name FROM users WHERE id = $1 AND is_active = TRUE`,
        [userId]
      );
      if (u.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
      }
      const recipient = u.rows[0];
      await createNotification({
        userId: recipient.id,
        type,
        title: title.trim(),
        body,
        metadata,
        email: recipient.email
          ? { to: recipient.email, displayName: recipient.display_name, heading: title.trim(), message: body }
          : null,
      });
      sentCount = 1;
    } else {
      // target = all | role → bulk, không gửi email để tránh spam
      const usersRes = target === "role" && role
        ? await pool.query(`SELECT id FROM users WHERE is_active = TRUE AND role = $1`, [role])
        : await pool.query(`SELECT id FROM users WHERE is_active = TRUE`);
      const ids = usersRes.rows.map((r) => r.id);
      sentCount = await createNotificationsForUsers(ids, { type, title: title.trim(), body, metadata });
    }

    return res.json({ success: true, sentCount });
  } catch (err) {
    console.error("Admin send notification error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
