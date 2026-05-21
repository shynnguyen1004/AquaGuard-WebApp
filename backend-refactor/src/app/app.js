const express = require("express");
const cors = require("cors");
const { corsOptions } = require("../cors");
const { pool } = require("../configs/db");
const errorHandler = require("../middleware/errorHandler");

function createApp() {
  const app = express();

  // Behind nginx/docker the real client IP is in X-Forwarded-For. Trust the immediate
  // proxy so req.ip and rate-limit keying work correctly. Safe with single-hop nginx.
  app.set("trust proxy", 1);

  app.use(cors(corsOptions));
  // 1mb covers profile updates with long addresses; multipart uploads bypass this via multer.
  app.use(express.json({ limit: "1mb" }));

  // Health check pings the DB so an orchestrator sees the backend as unhealthy
  // when Postgres is down (instead of always returning 200).
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "up", timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(503).json({ status: "degraded", db: "down", error: err.message });
    }
  });

  // Mounted at /api to preserve existing frontend URLs (e.g. /api/auth/login).
  // TODO: introduce /api/v1 as an additional mount once frontend is updated.
  app.use("/api", require("./v1/routes"));

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
