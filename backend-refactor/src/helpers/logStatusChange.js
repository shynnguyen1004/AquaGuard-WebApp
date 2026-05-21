const { pool } = require("../configs/db");
const logger = require("../utils/logger");

async function logStatusChange(requestId, changedBy, oldStatus, newStatus, note = "") {
  try {
    await pool.query(
      `INSERT INTO rescue_request_logs (request_id, changed_by, old_status, new_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestId, changedBy, oldStatus, newStatus, note]
    );
  } catch (err) {
    logger.error("[SOS] Failed to log status change:", err.message);
  }
}

module.exports = logStatusChange;
