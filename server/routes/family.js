const express = require("express");
const pool = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────────────────
// GET /api/family/search?phone=+84...
// Tìm user bằng số điện thoại
// ──────────────────────────────────────────────
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Thiếu số điện thoại" });
    }

    const result = await pool.query(
      `SELECT id, phone_number, display_name, avatar_url, safety_status
       FROM users
       WHERE phone_number = $1 AND id != $2`,
      [phone, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: "Không tìm thấy người dùng" });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: user.id,
        phoneNumber: user.phone_number,
        displayName: user.display_name,
        avatarUrl: user.avatar_url || "",
        safetyStatus: user.safety_status || "unknown",
      },
    });
  } catch (err) {
    console.error("Search user error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// POST /api/family/request
// Gửi lời mời kết nối gia đình
// Body: { receiver_id, relation }
// ──────────────────────────────────────────────
router.post("/request", authMiddleware, async (req, res) => {
  try {
    const { receiver_id, relation } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin người nhận" });
    }

    // Check if connection already exists (either direction)
    const existing = await pool.query(
      `SELECT id, status FROM family_connections
       WHERE (requester_id = $1 AND receiver_id = $2)
          OR (requester_id = $2 AND receiver_id = $1)`,
      [req.user.id, receiver_id]
    );

    if (existing.rows.length > 0) {
      const conn = existing.rows[0];
      if (conn.status === "accepted") {
        return res.status(409).json({ success: false, message: "Đã kết nối với người này" });
      }
      if (conn.status === "pending") {
        return res.status(409).json({ success: false, message: "Đã gửi lời mời trước đó" });
      }
    }

    const result = await pool.query(
      `INSERT INTO family_connections (requester_id, receiver_id, relation, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [req.user.id, receiver_id, relation || ""]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Create family request error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// GET /api/family/requests
// Lấy danh sách lời mời đang pending (lời mời NHẬN được)
// ──────────────────────────────────────────────
router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fc.id, fc.relation, fc.created_at,
              u.id AS user_id, u.phone_number, u.display_name, u.avatar_url
       FROM family_connections fc
       JOIN users u ON u.id = fc.requester_id
       WHERE fc.receiver_id = $1 AND fc.status = 'pending'
       ORDER BY fc.created_at DESC`,
      [req.user.id]
    );

    const requests = result.rows.map((r) => ({
      id: r.id,
      relation: r.relation,
      createdAt: r.created_at,
      from: {
        id: r.user_id,
        phoneNumber: r.phone_number,
        displayName: r.display_name,
        avatarUrl: r.avatar_url || "",
      },
    }));

    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error("Get family requests error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/family/requests/:id/accept
// Chấp nhận lời mời
// ──────────────────────────────────────────────
router.put("/requests/:id/accept", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE family_connections
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lời mời không tồn tại" });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Accept family request error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/family/requests/:id/reject
// Từ chối lời mời
// ──────────────────────────────────────────────
router.put("/requests/:id/reject", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM family_connections
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lời mời không tồn tại" });
    }

    return res.json({ success: true, message: "Đã từ chối" });
  } catch (err) {
    console.error("Reject family request error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// GET /api/family/members
// Lấy danh sách family đã kết nối (accepted)
// ──────────────────────────────────────────────
router.get("/members", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fc.id AS connection_id, fc.relation,
              u.id, u.phone_number, u.display_name, u.avatar_url,
              u.safety_status, u.health_note, u.address,
              u.latitude, u.longitude, u.location_updated_at
       FROM family_connections fc
       JOIN users u ON (
         CASE
           WHEN fc.requester_id = $1 THEN u.id = fc.receiver_id
           ELSE u.id = fc.requester_id
         END
       )
       WHERE (fc.requester_id = $1 OR fc.receiver_id = $1)
         AND fc.status = 'accepted'
       ORDER BY u.display_name`,
      [req.user.id]
    );

    const members = result.rows.map((m) => ({
      connectionId: m.connection_id,
      id: m.id,
      phoneNumber: m.phone_number,
      displayName: m.display_name,
      avatarUrl: m.avatar_url || "",
      relation: m.relation || "",
      safetyStatus: m.safety_status || "unknown",
      healthNote: m.health_note || "",
      address: m.address || "",
      latitude: m.latitude,
      longitude: m.longitude,
      locationUpdatedAt: m.location_updated_at,
    }));

    return res.json({ success: true, data: members });
  } catch (err) {
    console.error("Get family members error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/family/members/:connectionId
// Xóa kết nối gia đình
// ──────────────────────────────────────────────
router.delete("/members/:connectionId", authMiddleware, async (req, res) => {
  try {
    const { connectionId } = req.params;

    const result = await pool.query(
      `DELETE FROM family_connections
       WHERE id = $1 AND (requester_id = $2 OR receiver_id = $2)
       RETURNING id`,
      [connectionId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kết nối không tồn tại" });
    }

    return res.json({ success: true, message: "Đã xóa kết nối" });
  } catch (err) {
    console.error("Delete family connection error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/family/status
// Cập nhật trạng thái an toàn + ghi chú sức khỏe
// Body: { safety_status, health_note }
// ──────────────────────────────────────────────
router.put("/status", authMiddleware, async (req, res) => {
  try {
    const { safety_status, health_note } = req.body;

    const validStatuses = ["unknown", "safe", "danger", "injured"];
    if (safety_status && !validStatuses.includes(safety_status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const result = await pool.query(
      `UPDATE users
       SET safety_status = COALESCE($1, safety_status),
           health_note = COALESCE($2, health_note),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, safety_status, health_note`,
      [safety_status, health_note, req.user.id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Update safety status error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/family/location
// Cập nhật vị trí hiện tại
// Body: { latitude, longitude, address? }
// ──────────────────────────────────────────────
router.put("/location", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "Thiếu tọa độ" });
    }

    const result = await pool.query(
      `UPDATE users
       SET latitude = $1, longitude = $2, address = COALESCE($3, address),
           location_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, latitude, longitude, address, location_updated_at`,
      [latitude, longitude, address, req.user.id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Update location error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
