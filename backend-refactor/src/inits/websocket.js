const { WebSocketServer } = require("ws");
const { verifyUserToken } = require("../helpers/jwt");
const { pool } = require("../configs/db");
const env = require("../configs/env");
const logger = require("../utils/logger");

// Map<requestId, Map<userId, ws>>
const trackingRooms = new Map();

async function persistTrackingLocation({ requestId, userId, role, latitude, longitude }) {
  if (
    !requestId ||
    !userId ||
    !role ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
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

    if (role === "citizen") {
      await pool.query(
        `UPDATE rescue_requests
            SET latitude = $1,
                longitude = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
            AND user_id = $4`,
        [latitude, longitude, requestId, userId]
      );
    } else if (role === "rescuer") {
      await pool.query(
        `UPDATE rescue_requests
            SET rescuer_latitude = $1,
                rescuer_longitude = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
            AND assigned_to = $4`,
        [latitude, longitude, requestId, userId]
      );
    }
  } catch (err) {
    logger.warn("[WS] Failed to persist tracking location:", err.message);
  }
}

function attachWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://localhost:${env.PORT}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    let userData;
    try {
      userData = verifyUserToken(token);
    } catch {
      ws.close(4002, "Invalid token");
      return;
    }

    ws.userId = userData.id;
    ws.userRole = userData.role;
    ws.isAlive = true;
    ws.lastPersistedLocation = null;
    ws.lastPersistedAt = 0;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case "join_tracking": {
          const { requestId } = msg;
          if (!requestId) return;

          ws.trackingRequestId = requestId;
          if (!trackingRooms.has(requestId)) trackingRooms.set(requestId, new Map());
          trackingRooms.get(requestId).set(ws.userId, ws);
          logger.info(`[WS] User ${ws.userId} joined tracking room ${requestId}`);
          break;
        }

        case "location_update": {
          const latitude = Number(msg.latitude);
          const longitude = Number(msg.longitude);
          const roomId = ws.trackingRequestId;
          if (!roomId || !trackingRooms.has(roomId)) return;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

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

          const now = Date.now();
          const prev = ws.lastPersistedLocation;
          const movedEnough =
            !prev ||
            Math.abs(prev.latitude - latitude) >= 0.00005 ||
            Math.abs(prev.longitude - longitude) >= 0.00005;
          const shouldPersist = movedEnough || now - ws.lastPersistedAt >= 5000;

          if (shouldPersist) {
            ws.lastPersistedLocation = { latitude, longitude };
            ws.lastPersistedAt = now;
            persistTrackingLocation({
              requestId: roomId,
              userId: ws.userId,
              role: ws.userRole,
              latitude,
              longitude,
            });
          }
          break;
        }

        default:
          break;
      }
    });

    ws.on("close", () => {
      const roomId = ws.trackingRequestId;
      if (roomId && trackingRooms.has(roomId)) {
        trackingRooms.get(roomId).delete(ws.userId);
        if (trackingRooms.get(roomId).size === 0) trackingRooms.delete(roomId);
      }
      logger.info(`[WS] User ${ws.userId} disconnected`);
    });
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(heartbeatInterval));

  return { wss, trackingRooms };
}

module.exports = attachWebSocket;
module.exports.trackingRooms = trackingRooms;
