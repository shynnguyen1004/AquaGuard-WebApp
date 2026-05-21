const env = require("../configs/env");

// TODO[security/#5]: tighten — drop `!origin` + LAN regex when not strictly needed; consider per-env whitelist file.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://frontend:5173",
  "https://aquaguard.vn",
  "https://www.aquaguard.vn",
];

if (env.FRONTEND_URL) allowedOrigins.push(env.FRONTEND_URL);

const LAN_RE = /^http:\/\/(192\.168|172\.20|10\.)\.\d+\.\d+(:\d+)?$/;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (env.NODE_ENV !== "production" && LAN_RE.test(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

module.exports = { corsOptions, allowedOrigins };
