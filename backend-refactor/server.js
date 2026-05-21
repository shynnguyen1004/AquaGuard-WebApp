const http = require("http");
const env = require("./src/configs/env");
const createApp = require("./src/app/app");
const attachWebSocket = require("./src/inits/websocket");
const logger = require("./src/utils/logger");

// Crash on uncaught exceptions — let the container restart in a clean state.
// Async rejections are logged but don't kill the process (matches Node's pre-v18 default).
process.on("uncaughtException", (err) => {
  logger.error("[FATAL] uncaughtException:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("[FATAL] unhandledRejection:", reason);
});

const app = createApp();
const server = http.createServer(app);
const { wss, trackingRooms } = attachWebSocket(server);

// Exposed to API handlers (used by SOS controller to broadcast tracking events).
app.set("wss", wss);
app.set("trackingRooms", trackingRooms);

server.listen(env.PORT, () => {
  console.log(`\n🚀 AquaGuard API Server running on port ${env.PORT}`);
  console.log(`   ├── POST /api/auth/register`);
  console.log(`   ├── POST /api/auth/login`);
  console.log(`   ├── WS   ws://localhost:${env.PORT} (live tracking)`);
  console.log(`   └── GET  /api/health\n`);
});

// Graceful shutdown — close HTTP + WS so docker stop completes quickly.
function shutdown(signal) {
  logger.info(`[${signal}] shutting down...`);
  server.close(() => process.exit(0));
  // Force-exit if close hangs (e.g. lingering keep-alive connections).
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
