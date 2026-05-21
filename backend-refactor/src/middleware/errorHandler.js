const logger = require("../utils/logger");

// Central Express error handler. Mount LAST in app.js.
// Honors err.status / err.statusCode and err.code (string code returned in body).
module.exports = function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const body = { success: false, message: err.message || "Internal server error" };
  if (err.code && typeof err.code === "string") body.code = err.code;

  if (status >= 500) {
    logger.error(`[${req.method} ${req.originalUrl}]`, err);
  }
  res.status(status).json(body);
};
