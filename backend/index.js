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
const rtcRoutes = require("./routes/rtc");
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
app.use("/api/rtc", rtcRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Create HTTP server & WebSocket server ──
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// Track connected clients: Map<requestId, Map<userId, ws>>
const trackingRooms = new Map();

// ── Call signaling (WebRTC) state ──
// Every authenticated socket is registered here so a call can reach a user on
// whichever socket they currently have open (presence / tracking / call),
// regardless of whether their tracking modal is open. One user may hold several
// sockets (multiple tabs), hence a Set.
const userSockets = new Map(); // userId -> Set<ws>
// Active 1-1 call per rescue request. Lets us relay signaling (offer/answer/ICE)
// to the counterpart without hitting Postgres on every message. The parties are
// resolved once, on call_invite. Cleared on hangup/reject/cancel/disconnect.
const callSessions = new Map(); // requestId -> { citizenId, rescuerId }

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

/**
 * Send a message to every live socket of a user (they may have several tabs).
 * Returns true if it reached at least one open socket.
 */
function sendToUser(userId, message) {
  const set = userSockets.get(userId);
  if (!set || set.size === 0) return false;
  const payload = JSON.stringify(message);
  let delivered = false;
  set.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
      delivered = true;
    }
  });
  return delivered;
}

/**
 * Relay a call/WebRTC signaling message to the OTHER party of an active call.
 * Silently drops if there is no session for the request, or if the sender is
 * not one of the two parties (authorization is anchored on the session created
 * at call_invite time).
 */
function relayToCounterpart(ws, requestId, message) {
  const session = callSessions.get(requestId);
  if (!session) return;
  const peerId =
    ws.userId === session.citizenId ? session.rescuerId :
    ws.userId === session.rescuerId ? session.citizenId :
    null;
  if (!peerId) return;
  sendToUser(peerId, message);
}

/**
 * call_invite: verify the caller is one of the two parties of an *active*
 * request (assigned/in_progress), then ring the other party. Stores the call
 * session so subsequent signaling can be relayed cheaply.
 */
async function handleCallInvite(ws, msg) {
  const requestId = Number(msg.requestId);
  const media = msg.media === "video" ? "video" : "audio";
  if (!requestId) return;

  let row;
  try {
    const result = await pool.query(
      `SELECT user_id, assigned_to, status FROM rescue_requests WHERE id = $1`,
      [requestId]
    );
    row = result.rows[0];
  } catch (err) {
    console.warn("[WS] call_invite query failed:", err.message);
    return;
  }

  // Only the citizen + assigned rescuer of an active mission may call each other.
  if (!row || !["assigned", "in_progress"].includes(row.status)) {
    console.log(`[Call] invite req=${requestId} from=${ws.userId} rejected: status=${row?.status || "not_found"}`);
    sendToUser(ws.userId, { type: "call_unavailable", requestId, reason: "inactive" });
    return;
  }
  const citizenId = row.user_id;
  const rescuerId = row.assigned_to;
  if (ws.userId !== citizenId && ws.userId !== rescuerId) {
    console.log(`[Call] invite req=${requestId} from=${ws.userId} rejected: not a party (citizen=${citizenId}, rescuer=${rescuerId})`);
    return; // not a party to this request — silently drop
  }
  const calleeId = ws.userId === citizenId ? rescuerId : citizenId;
  if (!calleeId) {
    sendToUser(ws.userId, { type: "call_unavailable", requestId, reason: "no_peer" });
    return;
  }

  callSessions.set(requestId, { citizenId, rescuerId });

  // Real display names for both ringing UIs (authoritative — the frontend props
  // may be empty). One query for both parties.
  let callerName = "";
  let calleeName = "";
  try {
    const u = await pool.query(`SELECT id, display_name FROM users WHERE id = ANY($1::int[])`, [[ws.userId, calleeId]]);
    for (const r of u.rows) {
      if (r.id === ws.userId) callerName = r.display_name || "";
      if (r.id === calleeId) calleeName = r.display_name || "";
    }
  } catch { /* best-effort */ }

  const delivered = sendToUser(calleeId, {
    type: "call_incoming",
    requestId,
    media,
    fromUserId: ws.userId,
    fromName: callerName,
    fromRole: ws.userRole,
  });

  console.log(`[Call] invite req=${requestId} from=${ws.userId} → callee=${calleeId} delivered=${delivered} (callee sockets: ${userSockets.get(calleeId)?.size || 0})`);

  if (delivered) {
    sendToUser(ws.userId, { type: "call_ringing", requestId, media, toName: calleeName });
  } else {
    // Callee has no live socket → nobody to ring.
    callSessions.delete(requestId);
    sendToUser(ws.userId, { type: "call_unavailable", requestId, reason: "offline" });
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

  // Register in the per-user socket registry so calls can reach this user.
  if (!userSockets.has(ws.userId)) userSockets.set(ws.userId, new Set());
  userSockets.get(ws.userId).add(ws);
  console.log(`[WS] User ${ws.userId} (${ws.userRole}) connected — sockets now: ${userSockets.get(ws.userId).size}`);

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

      // ── WebRTC call signaling (relayed between the two parties of a request) ──
      case "call_invite": {
        // Async DB check inside; fire-and-forget, it handles its own errors.
        handleCallInvite(ws, msg);
        break;
      }
      case "call_accept": {
        relayToCounterpart(ws, Number(msg.requestId), {
          type: "call_accepted",
          requestId: Number(msg.requestId),
        });
        break;
      }
      case "call_reject": {
        const requestId = Number(msg.requestId);
        relayToCounterpart(ws, requestId, { type: "call_rejected", requestId });
        callSessions.delete(requestId);
        break;
      }
      case "call_cancel": {
        const requestId = Number(msg.requestId);
        relayToCounterpart(ws, requestId, { type: "call_cancelled", requestId });
        callSessions.delete(requestId);
        break;
      }
      case "call_hangup": {
        const requestId = Number(msg.requestId);
        relayToCounterpart(ws, requestId, { type: "call_hangup", requestId });
        callSessions.delete(requestId);
        break;
      }
      case "webrtc_offer": {
        const requestId = Number(msg.requestId);
        relayToCounterpart(ws, requestId, { type: "webrtc_offer", requestId, sdp: msg.sdp });
        break;
      }
      case "webrtc_answer": {
        const requestId = Number(msg.requestId);
        relayToCounterpart(ws, requestId, { type: "webrtc_answer", requestId, sdp: msg.sdp });
        break;
      }
      case "webrtc_ice": {
        const requestId = Number(msg.requestId);
        relayToCounterpart(ws, requestId, { type: "webrtc_ice", requestId, candidate: msg.candidate });
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

    // Drop this socket from the per-user registry. Only when the user has NO
    // sockets left (fully offline — e.g. closed the tab or lost network) do we
    // tear down any call they were in, notifying the peer. Closing just the
    // tracking modal keeps the always-on call socket alive, so calls survive it.
    const uset = userSockets.get(ws.userId);
    if (uset) {
      uset.delete(ws);
      if (uset.size === 0) userSockets.delete(ws.userId);
    }
    if (!userSockets.has(ws.userId)) {
      for (const [reqId, session] of callSessions) {
        if (session.citizenId === ws.userId || session.rescuerId === ws.userId) {
          const peerId =
            session.citizenId === ws.userId ? session.rescuerId : session.citizenId;
          sendToUser(peerId, { type: "call_hangup", requestId: reqId });
          callSessions.delete(reqId);
        }
      }
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
app.set("userSockets", userSockets);

// ── Start server ──
server.listen(PORT, () => {
  console.log(`\n🚀 AquaGuard API Server running on port ${PORT}`);
  console.log(`   ├── POST /api/auth/register`);
  console.log(`   ├── POST /api/auth/login`);
  console.log(`   ├── WS   ws://localhost:${PORT} (live tracking)`);
  console.log(`   └── GET  /api/health\n`);
});
