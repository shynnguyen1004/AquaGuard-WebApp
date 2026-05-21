const { pool } = require("../../../configs/db");

function findUserByPhone(phone, excludeUserId) {
  return pool.query(
    `SELECT id, phone_number, display_name, avatar_url, safety_status
       FROM users
      WHERE phone_number = $1 AND id != $2`,
    [phone, excludeUserId]
  );
}

function findExistingConnection(userA, userB) {
  return pool.query(
    `SELECT id, status FROM family_connections
      WHERE (requester_id = $1 AND receiver_id = $2)
         OR (requester_id = $2 AND receiver_id = $1)`,
    [userA, userB]
  );
}

function createRequest(requesterId, receiverId, relation) {
  return pool.query(
    `INSERT INTO family_connections (requester_id, receiver_id, relation, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [requesterId, receiverId, relation || ""]
  );
}

function listPendingForReceiver(userId) {
  return pool.query(
    `SELECT fc.id, fc.relation, fc.created_at,
            u.id AS user_id, u.phone_number, u.display_name, u.avatar_url
       FROM family_connections fc
       JOIN users u ON u.id = fc.requester_id
      WHERE fc.receiver_id = $1 AND fc.status = 'pending'
      ORDER BY fc.created_at DESC`,
    [userId]
  );
}

function acceptRequest(id, receiverId) {
  return pool.query(
    `UPDATE family_connections
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING *`,
    [id, receiverId]
  );
}

function rejectRequest(id, receiverId) {
  return pool.query(
    `DELETE FROM family_connections
      WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING id`,
    [id, receiverId]
  );
}

function listMembers(userId) {
  return pool.query(
    `SELECT fc.id AS connection_id, fc.relation,
            u.id, u.phone_number, u.display_name, u.avatar_url,
            u.safety_status, u.health_note,
            COALESCE(loc.address, u.address, '') AS address,
            loc.latitude, loc.longitude, loc.updated_at AS location_updated_at
       FROM family_connections fc
       JOIN users u ON (
         CASE
           WHEN fc.requester_id = $1 THEN u.id = fc.receiver_id
           ELSE u.id = fc.requester_id
         END
       )
       LEFT JOIN user_locations loc ON loc.user_id = u.id
      WHERE (fc.requester_id = $1 OR fc.receiver_id = $1)
        AND fc.status = 'accepted'
      ORDER BY u.display_name`,
    [userId]
  );
}

function deleteConnection(connectionId, userId) {
  return pool.query(
    `DELETE FROM family_connections
      WHERE id = $1 AND (requester_id = $2 OR receiver_id = $2)
      RETURNING id`,
    [connectionId, userId]
  );
}

function updateSafetyStatus(userId, safetyStatus, healthNote) {
  return pool.query(
    `UPDATE users
        SET safety_status = COALESCE($1, safety_status),
            health_note  = COALESCE($2, health_note),
            updated_at   = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, safety_status, health_note`,
    [safetyStatus, healthNote, userId]
  );
}

module.exports = {
  findUserByPhone,
  findExistingConnection,
  createRequest,
  listPendingForReceiver,
  acceptRequest,
  rejectRequest,
  listMembers,
  deleteConnection,
  updateSafetyStatus,
};
