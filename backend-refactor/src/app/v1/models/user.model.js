const { pool } = require("../../../configs/db");

function findByPhone(phone) {
  return pool.query("SELECT * FROM users WHERE phone_number = $1", [phone]);
}

function existsByPhone(phone) {
  return pool.query("SELECT id FROM users WHERE phone_number = $1", [phone]);
}

function insert({ phone, passwordHash, displayName, role, gender, dob }) {
  return pool.query(
    `INSERT INTO users (phone_number, password_hash, display_name, role, gender, date_of_birth)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, phone_number, display_name, role, avatar_url, is_active, created_at, gender, date_of_birth`,
    [phone, passwordHash, displayName, role, gender, dob]
  );
}

function touchUpdatedAt(userId) {
  return pool.query("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [userId]);
}

function listAll() {
  return pool.query(
    `SELECT id, phone_number, display_name, role, avatar_url, is_active, created_at, updated_at
       FROM users
      ORDER BY created_at DESC`
  );
}

function updateRole(userId, role) {
  return pool.query(
    "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, role",
    [role, userId]
  );
}

function setResetToken(phone, token, expiry) {
  return pool.query(
    "UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE phone_number = $3",
    [token, expiry, phone]
  );
}

function getResetToken(phone) {
  return pool.query(
    "SELECT reset_token, reset_token_expiry FROM users WHERE phone_number = $1",
    [phone]
  );
}

function setPasswordAndClearReset(phone, passwordHash) {
  return pool.query(
    `UPDATE users
        SET password_hash = $1,
            reset_token = NULL,
            reset_token_expiry = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE phone_number = $2`,
    [passwordHash, phone]
  );
}

function profileWithLocation(userId) {
  return pool.query(
    `SELECT u.id, u.phone_number, u.display_name, u.email, u.role, u.avatar_url,
            u.gender, u.date_of_birth, u.emergency_contact,
            COALESCE(loc.address, u.address, '') AS address,
            loc.latitude, loc.longitude, loc.updated_at AS location_updated_at,
            u.is_active, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN user_locations loc ON loc.user_id = u.id
      WHERE u.id = $1`,
    [userId]
  );
}

function updateProfileDynamic(userId, fields, values) {
  const setClause = fields.join(", ") + ", updated_at = CURRENT_TIMESTAMP";
  return pool.query(
    `UPDATE users SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
    [...values, userId]
  );
}

function listRescuersWithGroupInfo(callerId) {
  return pool.query(
    `SELECT
       u.id, u.phone_number, u.display_name, u.role, u.avatar_url, u.is_active, u.created_at, u.updated_at,
       CASE WHEN EXISTS (
         SELECT 1 FROM rescue_group_members m
         INNER JOIN rescue_groups g ON g.id = m.group_id
         WHERE m.user_id = u.id AND m.join_status = 'active' AND g.status = 'active'
       ) THEN true ELSE false END AS has_active_group,
       CASE WHEN EXISTS (
         SELECT 1 FROM rescue_group_invites i
         WHERE i.invited_user_id = u.id AND i.invited_by = $1 AND i.status = 'pending'
       ) THEN true ELSE false END AS has_pending_invite_from_me
     FROM users u
     WHERE u.role = 'rescuer'
     ORDER BY u.is_active DESC, u.display_name ASC, u.created_at DESC`,
    [callerId]
  );
}

module.exports = {
  findByPhone,
  existsByPhone,
  insert,
  touchUpdatedAt,
  listAll,
  updateRole,
  setResetToken,
  getResetToken,
  setPasswordAndClearReset,
  profileWithLocation,
  updateProfileDynamic,
  listRescuersWithGroupInfo,
};
