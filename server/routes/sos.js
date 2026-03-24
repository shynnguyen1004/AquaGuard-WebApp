const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "aquaguard_jwt_secret_2026";

// ── Middleware xác thực JWT ──
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, phone_number, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token không hợp lệ" });
  }
}

/**
 * POST /api/sos
 * Tạo SOS request mới (Citizen)
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { location, description, urgency, images } = req.body;

    if (!location || !description) {
      return res.status(400).json({
        success: false,
        message: "Vị trí và mô tả là bắt buộc",
      });
    }

    // Lấy tên user từ database
    const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [req.user.id]);
    const userName = userResult.rows[0]?.display_name || "User";

    const result = await pool.query(
      `INSERT INTO rescue_requests (user_id, user_name, location, description, urgency, images)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        userName,
        location,
        description,
        urgency || "medium",
        images || [],
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Create SOS error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * GET /api/sos/my
 * Lấy requests của user hiện tại (Citizen)
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM rescue_requests WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Get my requests error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * GET /api/sos/all
 * Lấy tất cả requests (Rescuer / Admin)
 */
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM rescue_requests ORDER BY created_at DESC`
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Get all requests error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * GET /api/sos/stats
 * Thống kê số lượng theo status
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM rescue_requests GROUP BY status`
    );

    const stats = { pending: 0, in_progress: 0, resolved: 0, total: 0 };
    result.rows.forEach((row) => {
      stats[row.status] = row.count;
      stats.total += row.count;
    });

    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("Get stats error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * PUT /api/sos/:id/accept
 * Rescuer chấp nhận request (pending → in_progress)
 */
router.put("/:id/accept", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy tên rescuer
    const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [req.user.id]);
    const rescuerName = userResult.rows[0]?.display_name || "Rescuer";

    const result = await pool.query(
      `UPDATE rescue_requests
       SET status = 'in_progress', assigned_to = $1, assigned_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [req.user.id, rescuerName, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request không tồn tại hoặc đã được nhận" });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Accept SOS error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * PUT /api/sos/:id/complete
 * Rescuer hoàn thành request (in_progress → resolved)
 */
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE rescue_requests
       SET status = 'resolved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND assigned_to = $2 AND status = 'in_progress'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không thể hoàn thành request này" });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Complete SOS error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
