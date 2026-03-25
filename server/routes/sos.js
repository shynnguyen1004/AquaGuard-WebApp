const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { upload, uploadToCloudinary } = require("../utils/upload");

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

// ── Helper: broadcast to a tracking room ──
function broadcastToRoom(req, requestId, message) {
  const trackingRooms = req.app.get("trackingRooms");
  if (!trackingRooms || !trackingRooms.has(requestId)) return;

  const payload = JSON.stringify(message);
  const room = trackingRooms.get(requestId);
  room.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

/**
 * POST /api/sos
 * Tạo SOS request mới (Citizen) — with GPS + image uploads
 * Accepts: multipart/form-data with fields + files
 */
router.post("/", authMiddleware, upload.array("images", 5), async (req, res) => {
  try {
    const { location, description, urgency, latitude, longitude } = req.body;

    if (!location || !description) {
      return res.status(400).json({
        success: false,
        message: "Vị trí và mô tả là bắt buộc",
      });
    }

    // Upload images to Cloudinary (if any)
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer)
      );
      imageUrls = await Promise.all(uploadPromises);
      console.log(`[SOS] Uploaded ${imageUrls.length} images to Cloudinary`);
    }

    // Lấy tên user từ database
    const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [req.user.id]);
    const userName = userResult.rows[0]?.display_name || "User";

    const result = await pool.query(
      `INSERT INTO rescue_requests (user_id, user_name, location, description, urgency, images, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        userName,
        location,
        description,
        urgency || "medium",
        imageUrls,
        latitude || null,
        longitude || null,
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
      `SELECT r.*, u.phone_number as user_phone
       FROM rescue_requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
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
      `SELECT r.*, u.phone_number as user_phone
       FROM rescue_requests r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
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
 * Rescuer chấp nhận request (pending → in_progress) — now with rescuer GPS
 */
router.put("/:id/accept", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    // Lấy tên rescuer
    const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [req.user.id]);
    const rescuerName = userResult.rows[0]?.display_name || "Rescuer";

    const result = await pool.query(
      `UPDATE rescue_requests
       SET status = 'in_progress', assigned_to = $1, assigned_name = $2,
           rescuer_latitude = $3, rescuer_longitude = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND status = 'pending'
       RETURNING *`,
      [req.user.id, rescuerName, latitude || null, longitude || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request không tồn tại hoặc đã được nhận" });
    }

    const request = result.rows[0];

    // Broadcast tracking_started to the tracking room
    broadcastToRoom(req, parseInt(id), {
      type: "tracking_started",
      requestId: parseInt(id),
      rescuerId: req.user.id,
      rescuerName: rescuerName,
      rescuerLatitude: latitude,
      rescuerLongitude: longitude,
      citizenLatitude: request.latitude,
      citizenLongitude: request.longitude,
    });

    return res.json({ success: true, data: request });
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

    // Broadcast tracking_ended to the tracking room
    broadcastToRoom(req, parseInt(id), {
      type: "tracking_ended",
      requestId: parseInt(id),
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Complete SOS error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
