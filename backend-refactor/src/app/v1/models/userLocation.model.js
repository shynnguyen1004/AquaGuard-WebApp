const { pool } = require("../../../configs/db");

function upsert(userId, latitude, longitude, address) {
  return pool.query(
    `INSERT INTO user_locations (user_id, latitude, longitude, address, updated_at)
     VALUES ($1, $2, $3, COALESCE($4, ''), NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           address = COALESCE(NULLIF(EXCLUDED.address, ''), user_locations.address),
           updated_at = NOW()
     RETURNING user_id AS id, latitude, longitude, address, updated_at AS location_updated_at`,
    [userId, latitude, longitude, address]
  );
}

// Dual-write: keep the map marker for active SOS requests in sync with the user's live location.
function syncActiveSosLocation(userId, latitude, longitude) {
  return pool.query(
    `UPDATE rescue_requests
        SET latitude = $1, longitude = $2
      WHERE user_id = $3
        AND status IN ('pending', 'in_progress')`,
    [latitude, longitude, userId]
  );
}

function getForUser(userId) {
  return pool.query(
    `SELECT latitude, longitude, address, updated_at AS location_updated_at
       FROM user_locations WHERE user_id = $1`,
    [userId]
  );
}

module.exports = { upsert, syncActiveSosLocation, getForUser };
