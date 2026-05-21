const { pool } = require("../../../configs/db");

// Shared SELECT/JOIN fragment used by /my, /all, /team (CLAUDE.md #21).
// `withLiveLocation`: overlay user_locations on top of the stored request lat/lng for active requests.
const SELECT_REQUEST_BASE = `
  r.*,
  u.display_name   AS user_name,
  u.phone_number   AS user_phone,
  u.gender         AS user_gender,
  u.date_of_birth  AS user_date_of_birth,
  CASE
    WHEN u.date_of_birth IS NULL THEN NULL
    ELSE DATE_PART('year', AGE(CURRENT_DATE, u.date_of_birth))::int
  END AS user_age,
  a.display_name   AS assigned_name,
  g.name           AS assigned_group_name,
  c.display_name   AS last_cancelled_by_name
`;

const SELECT_REQUEST_WITH_LIVE_LOC = `
  r.*,
  CASE WHEN r.status IN ('pending', 'in_progress')
       THEN COALESCE(loc.latitude, r.latitude)
       ELSE r.latitude
  END AS latitude,
  CASE WHEN r.status IN ('pending', 'in_progress')
       THEN COALESCE(loc.longitude, r.longitude)
       ELSE r.longitude
  END AS longitude,
  u.display_name   AS user_name,
  u.phone_number   AS user_phone,
  u.gender         AS user_gender,
  u.date_of_birth  AS user_date_of_birth,
  COALESCE(loc.address, u.address) AS user_address,
  CASE
    WHEN u.date_of_birth IS NULL THEN NULL
    ELSE DATE_PART('year', AGE(CURRENT_DATE, u.date_of_birth))::int
  END AS user_age,
  a.display_name   AS assigned_name,
  g.name           AS assigned_group_name,
  c.display_name   AS last_cancelled_by_name
`;

const JOIN_REQUEST = `
  FROM rescue_requests r
  LEFT JOIN users u          ON r.user_id = u.id
  LEFT JOIN users a          ON r.assigned_to = a.id
  LEFT JOIN rescue_groups g  ON r.assigned_group_id = g.id
  LEFT JOIN users c          ON r.last_cancelled_by = c.id
`;

const JOIN_REQUEST_WITH_LOC = `
  FROM rescue_requests r
  LEFT JOIN users u          ON r.user_id = u.id
  LEFT JOIN user_locations loc ON loc.user_id = r.user_id
  LEFT JOIN users a          ON r.assigned_to = a.id
  LEFT JOIN rescue_groups g  ON r.assigned_group_id = g.id
  LEFT JOIN users c          ON r.last_cancelled_by = c.id
`;

function create({ userId, location, description, urgency, imageUrls, latitude, longitude }) {
  return pool.query(
    `INSERT INTO rescue_requests (user_id, location, description, urgency, images, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, location, description, urgency || "medium", imageUrls, latitude || null, longitude || null]
  );
}

function listMine(userId) {
  return pool.query(
    `SELECT ${SELECT_REQUEST_BASE} ${JOIN_REQUEST}
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC`,
    [userId]
  );
}

function listAll() {
  return pool.query(
    `SELECT ${SELECT_REQUEST_WITH_LIVE_LOC} ${JOIN_REQUEST_WITH_LOC}
      ORDER BY r.created_at DESC`
  );
}

function listForGroup(groupId) {
  return pool.query(
    `SELECT ${SELECT_REQUEST_WITH_LIVE_LOC} ${JOIN_REQUEST_WITH_LOC}
      WHERE r.assigned_group_id = $1
      ORDER BY r.created_at DESC`,
    [groupId]
  );
}

function statsByStatus() {
  return pool.query(`SELECT status, COUNT(*)::int as count FROM rescue_requests GROUP BY status`);
}

function findGroupLeader(groupId) {
  return pool.query(
    `SELECT g.id, g.name, m.user_id AS leader_id, u.display_name AS leader_name
       FROM rescue_groups g
       INNER JOIN rescue_group_members m ON m.group_id = g.id
       INNER JOIN users u ON u.id = m.user_id
      WHERE g.id = $1
        AND g.status = 'active'
        AND m.member_role = 'leader'
        AND m.join_status = 'active'
      LIMIT 1`,
    [groupId]
  );
}

function assignToGroup(requestId, leaderId, groupId) {
  return pool.query(
    `UPDATE rescue_requests
        SET status = 'assigned',
            assigned_to = $1,
            assigned_group_id = $2,
            accepted_mode = 'group',
            assigned_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING *`,
    [leaderId, groupId, requestId]
  );
}

function findCallerActiveGroup(userId) {
  return pool.query(
    `SELECT g.id, g.name, m.member_role
       FROM rescue_group_members m
       INNER JOIN rescue_groups g ON g.id = m.group_id
      WHERE m.user_id = $1
        AND m.join_status = 'active'
        AND g.status = 'active'
      ORDER BY m.joined_at DESC
      LIMIT 1`,
    [userId]
  );
}

function acceptByRescuer({ requestId, rescuerId, groupId, latitude, longitude }) {
  return pool.query(
    `UPDATE rescue_requests
        SET status = 'in_progress',
            assigned_to = $1,
            assigned_group_id = $2,
            accepted_mode = 'group',
            rescuer_latitude = $3,
            rescuer_longitude = $4,
            assigned_at = COALESCE(assigned_at, NOW())
      WHERE id = $5
        AND (
          (status = 'pending' AND (assigned_to IS NULL OR assigned_to = $1))
          OR
          (status = 'assigned' AND (assigned_to = $1 OR assigned_group_id = $2))
        )
      RETURNING *`,
    [rescuerId, groupId, latitude || null, longitude || null, requestId]
  );
}

function cancelByRescuer(requestId, rescuerId) {
  return pool.query(
    `UPDATE rescue_requests
        SET status = 'pending',
            assigned_to = NULL,
            assigned_group_id = NULL,
            accepted_mode = 'individual',
            rescuer_latitude = NULL,
            rescuer_longitude = NULL,
            last_cancelled_by = $1,
            last_cancelled_at = NOW(),
            assigned_at = NULL
      WHERE id = $2
        AND assigned_to = $1
        AND status = 'in_progress'
      RETURNING *`,
    [rescuerId, requestId]
  );
}

function completeAsAdmin(requestId) {
  return pool.query(
    `UPDATE rescue_requests
        SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1 AND status = 'in_progress'
      RETURNING *`,
    [requestId]
  );
}

function completeAsRescuer(requestId, rescuerId) {
  return pool.query(
    `UPDATE rescue_requests
        SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1 AND assigned_to = $2 AND status = 'in_progress'
      RETURNING *`,
    [requestId, rescuerId]
  );
}

function getRescuerDisplayName(rescuerId) {
  return pool.query("SELECT display_name FROM users WHERE id = $1", [rescuerId]);
}

module.exports = {
  create,
  listMine,
  listAll,
  listForGroup,
  statsByStatus,
  findGroupLeader,
  assignToGroup,
  findCallerActiveGroup,
  acceptByRescuer,
  cancelByRescuer,
  completeAsAdmin,
  completeAsRescuer,
  getRescuerDisplayName,
};
