const express = require("express");
const pool = require("../db");
const { authMiddleware } = require("../middleware/auth");
const {
  getLiveLocation,
  getOnlineLocations,
  nearbyUsers,
} = require("../redisClient");

const router = express.Router();

const VALID_ROLES = ["rescuer", "citizen"];

// ──────────────────────────────────────────────
// GET /api/locations/live?role=rescuer
// Live positions of currently-online users of a role, straight from the
// Redis hot store. Used by the flood map to render live moving markers.
// ──────────────────────────────────────────────
router.get("/live", authMiddleware, async (req, res) => {
  try {
    const role = VALID_ROLES.includes(req.query.role) ? req.query.role : "rescuer";
    const locations = await getOnlineLocations(role);
    return res.json({ success: true, data: locations });
  } catch (err) {
    console.error("[locations] /live error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// GET /api/locations/live/:userId
// One user's live position. Read-through: falls back to the durable last-known
// position in user_locations when Redis has no fresh entry.
// ──────────────────────────────────────────────
router.get("/live/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const live = await getLiveLocation(userId);
    if (live) {
      return res.json({ success: true, data: live });
    }

    // Read-through to Postgres (last known)
    const result = await pool.query(
      `SELECT user_id AS "userId", latitude AS lat, longitude AS lng,
              updated_at AS ts
       FROM user_locations WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    return res.json({
      success: true,
      data: { ...result.rows[0], online: false },
    });
  } catch (err) {
    console.error("[locations] /live/:userId error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// GET /api/locations/nearby?role=rescuer&lat=..&lng=..&radius=10
// Nearest online users of a role (km). Powers "closest rescuer" lookups.
// ──────────────────────────────────────────────
router.get("/nearby", authMiddleware, async (req, res) => {
  try {
    const role = VALID_ROLES.includes(req.query.role) ? req.query.role : "rescuer";
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius) || 10;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: "lat/lng required" });
    }

    const results = await nearbyUsers(role, lat, lng, radius);
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("[locations] /nearby error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
