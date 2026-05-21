const { pool } = require("../../../configs/db");

function findActiveMembershipFull(userId, client = pool) {
  return client.query(
    `SELECT
        g.id,
        g.name,
        g.description,
        g.created_by,
        g.leader_id,
        g.status,
        g.created_at,
        g.updated_at,
        m.member_role,
        m.joined_at
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

function findActiveMembershipSimple(userId, client = pool) {
  return client.query(
    `SELECT 1
       FROM rescue_group_members m
       INNER JOIN rescue_groups g ON g.id = m.group_id
      WHERE m.user_id = $1
        AND m.join_status = 'active'
        AND g.status = 'active'
      LIMIT 1`,
    [userId]
  );
}

function listGroupMembers(groupId) {
  return pool.query(
    `SELECT
        m.id, m.member_role, m.join_status, m.joined_at,
        u.id AS user_id, u.phone_number, u.display_name, u.avatar_url, u.is_active
     FROM rescue_group_members m
     INNER JOIN users u ON u.id = m.user_id
     WHERE m.group_id = $1
       AND m.join_status = 'active'
     ORDER BY
       CASE m.member_role WHEN 'leader' THEN 0 WHEN 'co_leader' THEN 1 ELSE 2 END,
       u.display_name ASC`,
    [groupId]
  );
}

function listGroupPendingInvites(groupId) {
  return pool.query(
    `SELECT
        i.id, i.invited_phone_number, i.status, i.created_at,
        u.id AS user_id, u.display_name, u.avatar_url
     FROM rescue_group_invites i
     LEFT JOIN users u ON u.id = i.invited_user_id
     WHERE i.group_id = $1
       AND i.status = 'pending'
     ORDER BY i.created_at DESC`,
    [groupId]
  );
}

function listReceivedInvites(userId) {
  return pool.query(
    `SELECT
        i.id, i.status, i.created_at,
        g.id AS group_id, g.name AS group_name, g.description AS group_description,
        inviter.id AS inviter_id,
        inviter.display_name AS inviter_name,
        inviter.phone_number AS inviter_phone
     FROM rescue_group_invites i
     INNER JOIN rescue_groups g ON g.id = i.group_id
     INNER JOIN users inviter ON inviter.id = i.invited_by
     WHERE i.invited_user_id = $1
       AND i.status = 'pending'
       AND g.status = 'active'
     ORDER BY i.created_at DESC`,
    [userId]
  );
}

function listAllActiveGroups() {
  return pool.query(
    `SELECT
       g.id, g.name, g.description, g.status, g.created_at,
       COUNT(m.id) FILTER (WHERE m.join_status = 'active') AS member_count,
       leader_u.display_name AS leader_name,
       leader_m.user_id AS leader_id
     FROM rescue_groups g
     LEFT JOIN rescue_group_members m ON m.group_id = g.id
     LEFT JOIN rescue_group_members leader_m
       ON leader_m.group_id = g.id
       AND leader_m.member_role = 'leader'
       AND leader_m.join_status = 'active'
     LEFT JOIN users leader_u ON leader_u.id = leader_m.user_id
     WHERE g.status = 'active'
     GROUP BY g.id, g.name, g.description, g.status, g.created_at, leader_u.display_name, leader_m.user_id
     ORDER BY g.name`
  );
}

function insertGroup({ name, description, ownerId }, client = pool) {
  return client.query(
    `INSERT INTO rescue_groups (name, description, created_by, leader_id)
     VALUES ($1, $2, $3, $3)
     RETURNING *`,
    [name, description || "", ownerId]
  );
}

function insertLeaderMember(groupId, userId, client = pool) {
  return client.query(
    `INSERT INTO rescue_group_members (group_id, user_id, member_role, join_status)
     VALUES ($1, $2, 'leader', 'active')`,
    [groupId, userId]
  );
}

function findGroup(groupId) {
  return pool.query("SELECT id, status FROM rescue_groups WHERE id = $1 LIMIT 1", [groupId]);
}

function findInviteeByPhone(phone) {
  return pool.query(
    `SELECT id, role, phone_number, display_name FROM users WHERE phone_number = $1 LIMIT 1`,
    [phone]
  );
}

function findActiveMembershipFor(userId) {
  return pool.query(
    `SELECT group_id FROM rescue_group_members WHERE user_id = $1 AND join_status = 'active' LIMIT 1`,
    [userId]
  );
}

function findPendingInvite(groupId, invitedUserId) {
  return pool.query(
    `SELECT id FROM rescue_group_invites
      WHERE group_id = $1 AND invited_user_id = $2 AND status = 'pending'
      LIMIT 1`,
    [groupId, invitedUserId]
  );
}

function insertInvite({ groupId, invitedUserId, invitedPhone, invitedBy }) {
  return pool.query(
    `INSERT INTO rescue_group_invites (group_id, invited_user_id, invited_phone_number, invited_by, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [groupId, invitedUserId, invitedPhone, invitedBy]
  );
}

function findInviteForUser(inviteId, userId, client = pool) {
  return client.query(
    `SELECT i.*, g.status AS group_status
       FROM rescue_group_invites i
       INNER JOIN rescue_groups g ON g.id = i.group_id
      WHERE i.id = $1
        AND i.invited_user_id = $2
        AND i.status = 'pending'
      LIMIT 1`,
    [inviteId, userId]
  );
}

function markInviteAccepted(inviteId, client = pool) {
  return client.query(
    `UPDATE rescue_group_invites
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    [inviteId]
  );
}

function markInviteDeclined(inviteId, userId) {
  return pool.query(
    `UPDATE rescue_group_invites
        SET status = 'declined', responded_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND invited_user_id = $2 AND status = 'pending'
      RETURNING id`,
    [inviteId, userId]
  );
}

function upsertMemberOnAccept(groupId, userId, client = pool) {
  return client.query(
    `INSERT INTO rescue_group_members (group_id, user_id, member_role, join_status)
     VALUES ($1, $2, 'member', 'active')
     ON CONFLICT (group_id, user_id)
     DO UPDATE SET member_role = 'member', join_status = 'active', joined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
    [groupId, userId]
  );
}

function cancelOtherPendingInvites(userId, exceptInviteId, client = pool) {
  return client.query(
    `UPDATE rescue_group_invites
        SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
      WHERE invited_user_id = $1
        AND id <> $2
        AND status = 'pending'`,
    [userId, exceptInviteId]
  );
}

function updateGroup(groupId, name, description) {
  return pool.query(
    `UPDATE rescue_groups SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [name, description, groupId]
  );
}

function updateMemberRole(groupId, userId, role) {
  return pool.query(
    `UPDATE rescue_group_members
        SET member_role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $2 AND user_id = $3 AND join_status = 'active' AND member_role != 'leader'
      RETURNING id`,
    [role, groupId, userId]
  );
}

function findMemberRole(groupId, userId) {
  return pool.query(
    `SELECT member_role FROM rescue_group_members
      WHERE group_id = $1 AND user_id = $2 AND join_status = 'active' LIMIT 1`,
    [groupId, userId]
  );
}

function markMemberRemoved(groupId, userId) {
  return pool.query(
    `UPDATE rescue_group_members
        SET join_status = 'removed', updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $1 AND user_id = $2 AND join_status = 'active'`,
    [groupId, userId]
  );
}

function markMemberLeft(groupId, userId) {
  return pool.query(
    `UPDATE rescue_group_members
        SET join_status = 'left', updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $1 AND user_id = $2 AND join_status = 'active'`,
    [groupId, userId]
  );
}

function archiveGroup(groupId, client = pool) {
  return client.query(
    `UPDATE rescue_groups SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [groupId]
  );
}

function markAllMembersLeft(groupId, client = pool) {
  return client.query(
    `UPDATE rescue_group_members
        SET join_status = 'left', updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $1 AND join_status = 'active'`,
    [groupId]
  );
}

function cancelAllPendingInvitesForGroup(groupId, client = pool) {
  return client.query(
    `UPDATE rescue_group_invites
        SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
      WHERE group_id = $1 AND status = 'pending'`,
    [groupId]
  );
}

function groupMissionStats(groupId) {
  return pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'in_progress') AS active_missions,
       COUNT(*) FILTER (WHERE status = 'resolved') AS completed_missions,
       COUNT(*) FILTER (WHERE status IN ('pending', 'assigned', 'in_progress')) AS pending_missions
     FROM rescue_requests
     WHERE assigned_group_id = $1`,
    [groupId]
  );
}

function groupSize(groupId) {
  return pool.query(
    `SELECT COUNT(*)::int AS team_size
       FROM rescue_group_members
      WHERE group_id = $1 AND join_status = 'active'`,
    [groupId]
  );
}

module.exports = {
  findActiveMembershipFull,
  findActiveMembershipSimple,
  listGroupMembers,
  listGroupPendingInvites,
  listReceivedInvites,
  listAllActiveGroups,
  insertGroup,
  insertLeaderMember,
  findGroup,
  findInviteeByPhone,
  findActiveMembershipFor,
  findPendingInvite,
  insertInvite,
  findInviteForUser,
  markInviteAccepted,
  markInviteDeclined,
  upsertMemberOnAccept,
  cancelOtherPendingInvites,
  updateGroup,
  updateMemberRole,
  findMemberRole,
  markMemberRemoved,
  markMemberLeft,
  archiveGroup,
  markAllMembersLeft,
  cancelAllPendingInvitesForGroup,
  groupMissionStats,
  groupSize,
};
