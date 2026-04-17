const express = require("express");
const pool = require("../db");
const { upload, uploadToCloudinary } = require("../utils/upload");
const { authMiddleware, requireAdmin, requireRoles } = require("../middleware/auth");

const router = express.Router();



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

// ── Helper: log a status change to rescue_request_logs ──
async function logStatusChange(requestId, changedBy, oldStatus, newStatus, note = "") {
  try {
    await pool.query(
      `INSERT INTO rescue_request_logs (request_id, changed_by, old_status, new_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestId, changedBy, oldStatus, newStatus, note]
    );
  } catch (err) {
    console.error("[SOS] Failed to log status change:", err.message);
  }
}

/**
 * POST /api/sos
 * Create a new SOS request (Citizen) — with GPS + image uploads
 * Accepts: multipart/form-data with fields + files
 */
router.post("/", authMiddleware, requireRoles(["citizen"]), upload.array("images", 5), async (req, res) => {
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

    const result = await pool.query(
      `INSERT INTO rescue_requests (user_id, location, description, urgency, images, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        location,
        description,
        urgency || "medium",
        imageUrls,
        latitude || null,
        longitude || null,
      ]
    );

    const newRequest = result.rows[0];

    // Log the creation
    await logStatusChange(newRequest.id, req.user.id, null, "pending");

    return res.status(201).json({ success: true, data: newRequest });
  } catch (err) {
    console.error("Create SOS error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * GET /api/sos/my
 * Get requests by current user (Citizen view)
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              u.display_name   AS user_name,
              u.phone_number   AS user_phone,
              a.display_name   AS assigned_name,
              g.name           AS assigned_group_name,
              c.display_name   AS last_cancelled_by_name
       FROM rescue_requests r
       LEFT JOIN users u          ON r.user_id = u.id
       LEFT JOIN users a          ON r.assigned_to = a.id
       LEFT JOIN rescue_groups g  ON r.assigned_group_id = g.id
       LEFT JOIN users c          ON r.last_cancelled_by = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
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
 * Get all requests (Rescuer / Admin)
 * Uses JOINs to resolve names instead of denormalized columns
 */
router.get("/all", authMiddleware, requireRoles(["citizen", "rescuer", "admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              -- For active requests, prefer user's live location from user_locations
              CASE WHEN r.status IN ('pending', 'in_progress')
                   THEN COALESCE(loc.latitude, r.latitude)
                   ELSE r.latitude
              END AS latitude,
              CASE WHEN r.status IN ('pending', 'in_progress')
                   THEN COALESCE(loc.longitude, r.longitude)
                   ELSE r.longitude
              END AS longitude,
              -- Citizen info (via JOIN)
              u.display_name   AS user_name,
              u.phone_number   AS user_phone,
              u.gender         AS user_gender,
              u.date_of_birth  AS user_date_of_birth,
              COALESCE(loc.address, u.address) AS user_address,
              CASE
                WHEN u.date_of_birth IS NULL THEN NULL
                ELSE DATE_PART('year', AGE(CURRENT_DATE, u.date_of_birth))::int
              END AS user_age,
              -- Assigned rescuer name (via JOIN)
              a.display_name   AS assigned_name,
              -- Assigned group name (via JOIN)
              g.name           AS assigned_group_name,
              -- Last canceller name (via JOIN)
              c.display_name   AS last_cancelled_by_name
       FROM rescue_requests r
       LEFT JOIN users u          ON r.user_id = u.id
       LEFT JOIN user_locations loc ON loc.user_id = r.user_id
       LEFT JOIN users a          ON r.assigned_to = a.id
       LEFT JOIN rescue_groups g  ON r.assigned_group_id = g.id
       LEFT JOIN users c          ON r.last_cancelled_by = c.id
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
 * Status count summary
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
 * PUT /api/sos/:id/assign
 * Admin assigns a pending request to a specific rescuer
 */
router.put("/:id/assign", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rescuerId } = req.body;

    if (!rescuerId) {
      return res.status(400).json({ success: false, message: "Thiếu rescuerId" });
    }

    const rescuerRes = await pool.query(
      "SELECT id, display_name, role FROM users WHERE id = $1 LIMIT 1",
      [rescuerId]
    );

    if (rescuerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy rescuer" });
    }
    const rescuer = rescuerRes.rows[0];
    if (rescuer.role !== "rescuer") {
      return res.status(400).json({ success: false, message: "User được chọn không phải rescuer" });
    }

    const result = await pool.query(
      `UPDATE rescue_requests
       SET status = 'assigned',
           assigned_to = $1,
           assigned_group_id = NULL,
           accepted_mode = 'individual',
           assigned_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [rescuer.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Request không tồn tại hoặc không còn ở trạng thái pending" });
    }

    await logStatusChange(parseInt(id), req.user.id, "pending", "assigned");

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Assign SOS error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * PUT /api/sos/:id/accept
 * Rescuer accepts a request:
 * - pending (unassigned) → in_progress
 * - assigned (matched) → in_progress
 */
router.put("/:id/accept", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, acceptMode } = req.body;
    const resolvedAcceptMode = acceptMode === "group" ? "group" : "individual";

    // ── Guard: Only leader / co_leader of an active team may accept ──
    const teamRoleRes = await pool.query(
      `SELECT m.member_role
       FROM rescue_group_members m
       INNER JOIN rescue_groups g ON g.id = m.group_id
       WHERE m.user_id = $1
         AND m.join_status = 'active'
         AND g.status = 'active'
       LIMIT 1`,
      [req.user.id]
    );

    const teamRole = teamRoleRes.rows[0]?.member_role;

    if (!teamRole) {
      return res.status(403).json({
        success: false,
        code: "NO_TEAM",
        message: "Bạn cần tham gia một nhóm cứu hộ trước khi nhận nhiệm vụ.",
      });
    }

    if (!["leader", "co_leader"].includes(teamRole)) {
      return res.status(403).json({
        success: false,
        code: "NOT_AUTHORIZED_ROLE",
        message: "Chỉ trưởng nhóm hoặc phó nhóm mới có thể nhận nhiệm vụ cứu hộ.",
      });
    }

    let assignedGroupId = null;

    if (resolvedAcceptMode === "group") {
      const groupRes = await pool.query(
        `SELECT g.id, g.name
         FROM rescue_group_members m
         INNER JOIN rescue_groups g ON g.id = m.group_id
         WHERE m.user_id = $1
           AND m.join_status = 'active'
           AND g.status = 'active'
         ORDER BY m.joined_at DESC
         LIMIT 1`,
        [req.user.id]
      );

      if (groupRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: "Bạn chưa thuộc nhóm cứu hộ nào để nhận mission theo nhóm." });
      }

      assignedGroupId = groupRes.rows[0].id;
    }

    const result = await pool.query(
      `UPDATE rescue_requests
       SET status = 'in_progress',
           assigned_to = $1,
           assigned_group_id = $2,
           accepted_mode = $3,
           rescuer_latitude = $4,
           rescuer_longitude = $5,
           assigned_at = COALESCE(assigned_at, NOW())
       WHERE id = $6
         AND (
           (status = 'pending' AND (assigned_to IS NULL OR assigned_to = $1))
           OR
           (status = 'assigned' AND assigned_to = $1)
         )
       RETURNING *`,
      [
        req.user.id,
        assignedGroupId,
        resolvedAcceptMode,
        latitude || null,
        longitude || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Request không tồn tại, đã được nhận, hoặc đã được assign cho rescuer khác" });
    }

    const request = result.rows[0];

    await logStatusChange(parseInt(id), req.user.id, "pending", "in_progress");

    // Fetch rescuer name for broadcast
    const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [req.user.id]);
    const rescuerName = userResult.rows[0]?.display_name || "Rescuer";

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
 * PUT /api/sos/:id/cancel
 * Rescuer releases an in_progress case back to pending
 */
router.put("/:id/cancel", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE rescue_requests
       SET status = 'pending',
           assigned_to = NULL,
           assigned_group_id = NULL,
           accepted_mode = 'individual',
           rescuer_latitude = NULL,
           rescuer_longitude = NULL,
           last_cancelled_by = $1,
           last_cancelled_at = NOW(),
           assigned_at = NULL
       WHERE id = $2
         AND assigned_to = $1
         AND status = 'in_progress'
       RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không thể huỷ request này (không phải mission của bạn hoặc request không ở trạng thái in progress)",
      });
    }

    await logStatusChange(parseInt(id), req.user.id, "in_progress", "pending", "Rescuer cancelled");

    broadcastToRoom(req, parseInt(id, 10), {
      type: "tracking_cancelled",
      requestId: parseInt(id, 10),
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Cancel SOS error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * PUT /api/sos/:id/complete
 * Rescuer or Admin completes a request (in_progress → resolved)
 */
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === "admin";
    const isRescuer = req.user?.role === "rescuer";
    if (!isAdmin && !isRescuer) {
      return res.status(403).json({ success: false, message: "Không có quyền hoàn thành request" });
    }

    const result = isAdmin
      ? await pool.query(
        `UPDATE rescue_requests
         SET status = 'resolved', resolved_at = NOW()
         WHERE id = $1 AND status = 'in_progress'
         RETURNING *`,
        [id]
      )
      : await pool.query(
        `UPDATE rescue_requests
         SET status = 'resolved', resolved_at = NOW()
         WHERE id = $1 AND assigned_to = $2 AND status = 'in_progress'
         RETURNING *`,
        [id, req.user.id]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không thể hoàn thành request này (không phải mission của bạn hoặc đã hoàn thành)" });
    }

    await logStatusChange(parseInt(id), req.user.id, "in_progress", "resolved");

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
