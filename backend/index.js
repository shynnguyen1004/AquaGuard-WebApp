const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const pool = require("./db");
const { setLiveLocation, removeLivePresence } = require("./redisClient");

const authRoutes = require("./routes/auth");
const sosRoutes = require("./routes/sos");
const familyRoutes = require("./routes/family");
const analyticsRoutes = require("./routes/analytics");
const locationRoutes = require("./routes/locations");
const notificationRoutes = require("./routes/notifications");
const { rateLimit } = require("./middleware/rateLimit");

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "aquaguard_jwt_secret_2026";

// ── Middleware ──
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://frontend:5173",  // Docker container
  "https://aquaguard.vn",
  "https://www.aquaguard.vn",
];

// Thêm domain Vercel từ biến môi trường
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow listed origins (web dev, production frontend)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any LAN IP in development (for Flutter on physical devices)
    if (process.env.NODE_ENV !== "production" &&
        /^http:\/\/(192\.168|172\.20|10\.)\.\d+\.\d+(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// ── Rate limiting for auth endpoints ──
const authLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Please try again later." });
const authRegisterLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Too many registration attempts. Please try again later." });

// ── Routes ──
app.use("/api/auth/login", authLoginLimiter);
app.use("/api/auth/register", authRegisterLimiter);
app.use("/api/auth/forgot-password", rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }));
// Limit admin broadcasts (in-memory, per-IP)
app.use("/api/notifications/admin/send", rateLimit({ windowMs: 60 * 1000, max: 20, message: "Too many notifications sent. Please slow down." }));
app.use("/api/auth", authRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/notifications", notificationRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Create HTTP server & WebSocket server ──
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// Track connected clients: Map<requestId, Map<userId, ws>>
const trackingRooms = new Map();

/**
 * Durable START/END flush: PostgreSQL user_locations keeps only the FIRST and
 * LAST position of a tracking session (not every update — that's Redis's job).
 * This preserves a "last known location" for the family map across Redis/server
 * restarts.
 */
async function persistDurableLocation(userId, latitude, longitude) {
  if (!userId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return;
  }
  try {
    await pool.query(
      `INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             updated_at = NOW()`,
      [userId, latitude, longitude]
    );
  } catch (err) {
    console.warn("[WS] Failed to persist durable location:", err.message);
  }
}

/**
 * Handle one live location fix from a client. Used by both `presence_location`
 * (continuous, always-on) and the legacy `location_update` (room) message.
 *   1. Broadcast to the active tracking room (if joined) — every update, smooth.
 *   2. First fix of the session → durable START in Postgres.
 *   3. Hot store: write to Redis (lightly throttled to respect Upstash quota).
 */
function handleLocation(ws, latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const roomId = ws.trackingRequestId;
  const inTrackingSession = Boolean(roomId && trackingRooms.has(roomId));

  // 1. Broadcast to other members of the active tracking room
  if (inTrackingSession) {
    const payload = JSON.stringify({
      type: "location_update",
      userId: ws.userId,
      role: ws.userRole,
      latitude,
      longitude,
      timestamp: Date.now(),
    });
    trackingRooms.get(roomId).forEach((client, clientId) => {
      if (clientId !== ws.userId && client.readyState === 1) {
        client.send(payload);
      }
    });
  }

  // Remember the latest fix for the durable END flush on disconnect
  ws.lastLocation = { latitude, longitude };

  // 2. Postgres holds only the FIRST/LAST fix of a *tracking session* (a
  //    citizen + rescuer joined to a room). Pure presence updates never touch
  //    Postgres — they live in Redis only.
  if (inTrackingSession && !ws.firstFixPersisted) {
    ws.firstFixPersisted = true;
    persistDurableLocation(ws.userId, latitude, longitude);
  }

  // 3. Hot store in Redis, throttled (moved >= ~5.5m OR >= 2s elapsed)
  const now = Date.now();
  const prev = ws.lastRedisLocation;
  const movedEnough =
    !prev ||
    Math.abs(prev.latitude - latitude) >= 0.00005 ||
    Math.abs(prev.longitude - longitude) >= 0.00005;
  if (movedEnough || now - (ws.lastRedisAt || 0) >= 2000) {
    ws.lastRedisLocation = { latitude, longitude };
    ws.lastRedisAt = now;
    setLiveLocation(ws.userId, ws.userRole, latitude, longitude);
  }
}

wss.on("connection", (ws, req) => {
  // Parse token from query string: ws://host?token=xxx
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(4001, "Missing token");
    return;
  }

  let userData;
  try {
    userData = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    ws.close(4002, "Invalid token");
    return;
  }

  ws.userId = userData.id;
  ws.userRole = userData.role;
  ws.isAlive = true;
  ws.firstFixPersisted = false;
  ws.lastLocation = null;
  ws.lastRedisLocation = null;
  ws.lastRedisAt = 0;

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "join_tracking": {
        // Join a tracking room for a specific rescue request
        const { requestId } = msg;
        if (!requestId) return;

        ws.trackingRequestId = requestId;

        if (!trackingRooms.has(requestId)) {
          trackingRooms.set(requestId, new Map());
        }
        trackingRooms.get(requestId).set(ws.userId, ws);
        console.log(`[WS] User ${ws.userId} joined tracking room ${requestId}`);
        break;
      }

      // Continuous always-on presence (sent whenever logged in) and the legacy
      // room message share the same path. Both update Redis + (first/last) Postgres,
      // and broadcast to the active tracking room if one was joined.
      case "presence_location":
      case "location_update": {
        handleLocation(ws, Number(msg.latitude), Number(msg.longitude));
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", () => {
    // Remove from tracking room
    const roomId = ws.trackingRequestId;
    if (roomId && trackingRooms.has(roomId)) {
      trackingRooms.get(roomId).delete(ws.userId);
      if (trackingRooms.get(roomId).size === 0) {
        trackingRooms.delete(roomId);
      }
    }
    // Durable END: flush the last fix to Postgres only if this was a tracking
    // session. Pure presence sockets leave nothing in Postgres (Redis only).
    if (roomId && ws.lastLocation) {
      persistDurableLocation(ws.userId, ws.lastLocation.latitude, ws.lastLocation.longitude);
    }
    removeLivePresence(ws.userId, ws.userRole);
    console.log(`[WS] User ${ws.userId} disconnected`);
  });
});

// Heartbeat to clean up dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => clearInterval(heartbeatInterval));

// Export for use in routes (to broadcast events from API handlers)
app.set("wss", wss);
app.set("trackingRooms", trackingRooms);

// ── Start server ──
server.listen(PORT, () => {
  console.log(`\n🚀 AquaGuard API Server running on port ${PORT}`);
  console.log(`   ├── POST /api/auth/register`);
  console.log(`   ├── POST /api/auth/login`);
  console.log(`   ├── WS   ws://localhost:${PORT} (live tracking)`);
  console.log(`   └── GET  /api/health\n`);
});
