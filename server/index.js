const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const sosRoutes = require("./routes/sos");
const familyRoutes = require("./routes/family");

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "aquaguard_jwt_secret_2026";

// ── Middleware ──
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

// Thêm domain Vercel từ biến môi trường
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/family", familyRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Create HTTP server & WebSocket server ──
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// Track connected clients: Map<requestId, Map<userId, ws>>
const trackingRooms = new Map();

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

      case "location_update": {
        // Broadcast location to other members of the same tracking room
        const { latitude, longitude } = msg;
        const roomId = ws.trackingRequestId;
        if (!roomId || !trackingRooms.has(roomId)) return;

        const room = trackingRooms.get(roomId);
        const payload = JSON.stringify({
          type: "location_update",
          userId: ws.userId,
          role: ws.userRole,
          latitude,
          longitude,
          timestamp: Date.now(),
        });

        room.forEach((client, clientId) => {
          if (clientId !== ws.userId && client.readyState === 1) {
            client.send(payload);
          }
        });
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
