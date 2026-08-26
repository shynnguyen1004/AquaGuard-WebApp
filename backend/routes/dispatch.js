const express = require("express");
const pool = require("../db");
const { authMiddleware, requireAdmin, requireRoles } = require("../middleware/auth");
const dispatch = require("../services/dispatch");
const cfg = require("../config/dispatch");

const router = express.Router();

/**
 * Điều phối cứu hộ tự động — API cho rescuer và admin.
 * Toàn bộ thuật toán nằm ở services/dispatch.js; đây chỉ là lớp HTTP mỏng.
 */

// ──────────────────────────────────────────────
// GET /api/dispatch/duty
// Trạng thái trực hiện tại của rescuer đang đăng nhập.
// ──────────────────────────────────────────────
router.get("/duty", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT duty_status FROM users WHERE id = $1`,
      [req.user.id]
    );
    return res.json({
      success: true,
      data: { dutyStatus: rows[0]?.duty_status || "off" },
    });
  } catch (err) {
    console.error("[Dispatch] GET /duty error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// PUT /api/dispatch/duty   { status: "on" | "off" }
// Bật/tắt ca trực. Chỉ rescuer đang 'on' mới lọt vào pool điều phối.
// ──────────────────────────────────────────────
router.put("/duty", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const status = req.body?.status;
    if (!["on", "off"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status phải là 'on' hoặc 'off'",
      });
    }

    // Bật trực mà chưa có đội thì vô nghĩa — thuật toán sẽ luôn lọc bỏ họ
    // (ràng buộc NO_TEAM). Báo sớm để rescuer biết đường tham gia đội.
    if (status === "on") {
      const { rows } = await pool.query(
        `SELECT 1
         FROM rescue_group_members m
         JOIN rescue_groups g ON g.id = m.group_id
         WHERE m.user_id = $1 AND m.join_status = 'active' AND g.status = 'active'
         LIMIT 1`,
        [req.user.id]
      );
      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          code: "NO_TEAM",
          message: "Bạn cần tham gia một đội cứu hộ trước khi bật ca trực.",
        });
      }
    }

    await pool.query(`UPDATE users SET duty_status = $1 WHERE id = $2`, [
      status,
      req.user.id,
    ]);

    // Tắt trực giữa chừng KHÔNG tự động bỏ ca đang làm dở. Nhiệm vụ đã giao
    // vẫn là trách nhiệm của rescuer — muốn bỏ thì phải bấm huỷ ca một cách
    // có ý thức (PUT /api/sos/:id/cancel), và lần đó mới bị tính vào tỉ lệ
    // bỏ ca. Tắt trực chỉ có nghĩa "đừng giao ca MỚI cho tôi nữa".
    return res.json({ success: true, data: { dutyStatus: status } });
  } catch (err) {
    console.error("[Dispatch] PUT /duty error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// GET /api/dispatch/assignments/mine
// Nhiệm vụ hệ thống đã giao cho rescuer này và còn đang chạy. Dùng để khôi
// phục UI sau khi F5 / mất mạng — WebSocket push có thể đã trôi qua trong lúc
// trang chưa sẵn sàng.
//
// Không có endpoint "nhận / từ chối": chế độ giao thẳng không hỏi ý kiến.
// Rescuer bắt đầu ca bằng PUT /api/sos/:id/accept, bỏ ca bằng .../cancel.
// ──────────────────────────────────────────────
router.get("/assignments/mine", authMiddleware, requireRoles(["rescuer"]), async (req, res) => {
  try {
    const assignments = await dispatch.getActiveAssignmentsForRescuer(req.user.id);
    return res.json({ success: true, data: assignments });
  } catch (err) {
    console.error("[Dispatch] GET /assignments/mine error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// GET /api/dispatch/requests/:id/trail   (Admin)
// Dấu vết điều phối: đã mời ai, khoảng cách bao nhiêu, ai từ chối, vì sao
// cuối cùng lại rơi về điều phối tay.
// ──────────────────────────────────────────────
router.get("/requests/:id/trail", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!Number.isInteger(requestId)) {
      return res.status(400).json({ success: false, message: "ID yêu cầu không hợp lệ" });
    }

    const [trail, reqRow] = await Promise.all([
      dispatch.getTrail(requestId),
      pool.query(
        `SELECT dispatch_status, dispatch_attempts, dispatch_radius_km, auto_assigned_at
         FROM rescue_requests WHERE id = $1`,
        [requestId]
      ),
    ]);

    return res.json({
      success: true,
      data: {
        request: reqRow.rows[0] || null,
        offers: trail,
        config: {
          assignedStatus: cfg.ASSIGNED_STATUS,
          maxAttempts: cfg.MAX_ATTEMPTS,
          radiusLadderKm: cfg.RADIUS_LADDER_KM,
          staleAssignmentSeconds: cfg.STALE_ASSIGNMENT_SECONDS,
        },
      },
    });
  } catch (err) {
    console.error("[Dispatch] GET /requests/:id/trail error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ──────────────────────────────────────────────
// POST /api/dispatch/requests/:id/retry   (Admin)
// Chạy lại điều phối cho một request đã rơi về 'no_candidate' — ví dụ sau khi
// admin gọi điện huy động thêm đội lên trực.
// ──────────────────────────────────────────────
router.post("/requests/:id/retry", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!Number.isInteger(requestId)) {
      return res.status(400).json({ success: false, message: "ID yêu cầu không hợp lệ" });
    }

    // Reset bộ đếm để bậc thang bán kính chạy lại từ đầu.
    const { rows } = await pool.query(
      `UPDATE rescue_requests
       SET dispatch_status = 'none', dispatch_attempts = 0
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [requestId]
    );
    if (rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Chỉ chạy lại được cho yêu cầu đang ở trạng thái chờ.",
      });
    }

    dispatch.start(requestId).catch(() => {});
    return res.json({ success: true, message: "Đã khởi động lại điều phối tự động." });
  } catch (err) {
    console.error("[Dispatch] POST /requests/:id/retry error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
