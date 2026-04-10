const express = require("express");
const pool = require("../db");
const { authMiddleware, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/analytics/overview
 * KPI summary: total users, new users (7d), total requests, avg response time
 */
router.get("/overview", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [usersRes, newUsersRes, requestsRes, avgTimeRes] = await Promise.all([
      // Total users
      pool.query("SELECT COUNT(*)::int AS total FROM users"),
      // New users in last 7 days
      pool.query(
        "SELECT COUNT(*)::int AS total FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"
      ),
      // Total rescue requests + status breakdown
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
        FROM rescue_requests
      `),
      // Average response time (created_at → updated_at for in_progress/resolved)
      pool.query(`
        SELECT COALESCE(
          ROUND(EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 60),
          0
        )::int AS avg_minutes
        FROM rescue_requests
        WHERE status IN ('in_progress', 'resolved') AND assigned_to IS NOT NULL
      `),
    ]);

    const totalRequests = requestsRes.rows[0];
    const resolutionRate =
      totalRequests.total > 0
        ? Math.round((totalRequests.resolved / totalRequests.total) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        totalUsers: usersRes.rows[0].total,
        newUsers7d: newUsersRes.rows[0].total,
        totalRequests: totalRequests.total,
        pendingRequests: totalRequests.pending,
        activeRequests: totalRequests.in_progress,
        resolvedRequests: totalRequests.resolved,
        avgResponseMinutes: avgTimeRes.rows[0].avg_minutes,
        resolutionRate,
      },
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * GET /api/analytics/users
 * User growth (daily registrations last 30 days) + role distribution
 */
router.get("/users", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [growthRes, rolesRes] = await Promise.all([
      // Daily new registrations for the last 30 days
      pool.query(`
        SELECT
          d.day::date AS date,
          COALESCE(COUNT(u.id), 0)::int AS count
        FROM generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          '1 day'
        ) AS d(day)
        LEFT JOIN users u ON DATE(u.created_at) = d.day::date
        GROUP BY d.day
        ORDER BY d.day
      `),
      // Role distribution
      pool.query(`
        SELECT role, COUNT(*)::int AS count
        FROM users
        GROUP BY role
        ORDER BY count DESC
      `),
    ]);

    return res.json({
      success: true,
      data: {
        growth: growthRes.rows.map((r) => ({
          date: r.date,
          count: r.count,
        })),
        roles: rolesRes.rows,
      },
    });
  } catch (err) {
    console.error("Analytics users error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

/**
 * GET /api/analytics/rescue
 * SOS trends (daily, 30d) + urgency breakdown + status counts + response perf
 */
router.get("/rescue", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [trendRes, urgencyRes, statusRes, perfRes] = await Promise.all([
      // Daily SOS requests for the last 30 days
      pool.query(`
        SELECT
          d.day::date AS date,
          COALESCE(COUNT(r.id), 0)::int AS count
        FROM generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          '1 day'
        ) AS d(day)
        LEFT JOIN rescue_requests r ON DATE(r.created_at) = d.day::date
        GROUP BY d.day
        ORDER BY d.day
      `),
      // Urgency breakdown
      pool.query(`
        SELECT urgency, COUNT(*)::int AS count
        FROM rescue_requests
        GROUP BY urgency
        ORDER BY count DESC
      `),
      // Status breakdown
      pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM rescue_requests
        GROUP BY status
        ORDER BY count DESC
      `),
      // Response performance: fastest, slowest, average (in minutes)
      pool.query(`
        SELECT
          COALESCE(ROUND(EXTRACT(EPOCH FROM MIN(updated_at - created_at)) / 60), 0)::int AS fastest,
          COALESCE(ROUND(EXTRACT(EPOCH FROM MAX(updated_at - created_at)) / 60), 0)::int AS slowest,
          COALESCE(ROUND(EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 60), 0)::int AS average
        FROM rescue_requests
        WHERE status IN ('in_progress', 'resolved') AND assigned_to IS NOT NULL
      `),
    ]);

    return res.json({
      success: true,
      data: {
        trend: trendRes.rows.map((r) => ({ date: r.date, count: r.count })),
        urgency: urgencyRes.rows,
        status: statusRes.rows,
        performance: perfRes.rows[0] || { fastest: 0, slowest: 0, average: 0 },
      },
    });
  } catch (err) {
    console.error("Analytics rescue error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
