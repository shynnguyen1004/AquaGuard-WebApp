const { pool } = require("../../../configs/db");
const { isPhoneVN } = require("../../../utils/validators");
const buildRescueGroupPayload = require("../../../helpers/buildRescueGroupPayload");
const { HttpError } = require("./auth.service");
const RescueGroup = require("../models/rescueGroup.model");

// One transaction per logical operation. Uses dedicated pg client.

async function createGroup(userId, name, description) {
  if (!name || !name.trim()) throw new HttpError(400, "Group name is required.");

  const client = await pool.connect();
  try {
    const existing = await RescueGroup.findActiveMembershipSimple(userId, client);
    if (existing.rows.length > 0) {
      throw new HttpError(409, "You are already in an active rescue group.");
    }

    await client.query("BEGIN");
    const groupRes = await RescueGroup.insertGroup(
      { name: name.trim(), description: (description || "").trim(), ownerId: userId },
      client
    );
    const group = groupRes.rows[0];
    await RescueGroup.insertLeaderMember(group.id, userId, client);
    await client.query("COMMIT");

    return await buildRescueGroupPayload(userId);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function inviteMember(callerId, groupId, phone) {
  if (!groupId) throw new HttpError(400, "Invalid group.");
  if (!phone) throw new HttpError(400, "Phone number is required.");
  if (!isPhoneVN(phone)) throw new HttpError(400, "Invalid phone number format.");

  const perm = await RescueGroup.findMemberRole(groupId, callerId);
  const memberRole = perm.rows[0]?.member_role;
  if (!memberRole || !["leader", "co_leader"].includes(memberRole)) {
    throw new HttpError(403, "Only a group leader can invite members.");
  }

  const groupRes = await RescueGroup.findGroup(groupId);
  if (groupRes.rows.length === 0 || groupRes.rows[0].status !== "active") {
    throw new HttpError(404, "Rescue group not found.");
  }

  const userRes = await RescueGroup.findInviteeByPhone(phone);
  if (userRes.rows.length === 0) {
    throw new HttpError(404, "No rescuer account found with this phone number.");
  }
  const invitedUser = userRes.rows[0];
  if (invitedUser.role !== "rescuer") {
    throw new HttpError(400, "This phone number does not belong to a rescuer account.");
  }
  if (invitedUser.id === callerId) {
    throw new HttpError(400, "You cannot invite yourself.");
  }

  const activeMembership = await RescueGroup.findActiveMembershipFor(invitedUser.id);
  if (activeMembership.rows.length > 0) {
    throw new HttpError(409, "This rescuer is already in an active group.");
  }

  const existingInvite = await RescueGroup.findPendingInvite(groupId, invitedUser.id);
  if (existingInvite.rows.length > 0) {
    throw new HttpError(409, "A pending invite already exists for this rescuer.");
  }

  await RescueGroup.insertInvite({
    groupId,
    invitedUserId: invitedUser.id,
    invitedPhone: invitedUser.phone_number,
    invitedBy: callerId,
  });

  return await buildRescueGroupPayload(callerId);
}

async function acceptInvite(userId, inviteId) {
  if (!inviteId) throw new HttpError(400, "Invalid invite.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inviteRes = await RescueGroup.findInviteForUser(inviteId, userId, client);
    const invite = inviteRes.rows[0];
    if (!invite || invite.group_status !== "active") {
      throw new HttpError(404, "Invite not found or no longer active.");
    }

    const existing = await RescueGroup.findActiveMembershipSimple(userId, client);
    if (existing.rows.length > 0) {
      throw new HttpError(409, "You are already in an active group.");
    }

    await RescueGroup.markInviteAccepted(inviteId, client);
    await RescueGroup.upsertMemberOnAccept(invite.group_id, userId, client);
    await RescueGroup.cancelOtherPendingInvites(userId, inviteId, client);

    await client.query("COMMIT");
    return await buildRescueGroupPayload(userId);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function declineInvite(userId, inviteId) {
  if (!inviteId) throw new HttpError(400, "Invalid invite.");
  const result = await RescueGroup.markInviteDeclined(inviteId, userId);
  if (result.rows.length === 0) {
    throw new HttpError(404, "Invite not found or already handled.");
  }
  return await buildRescueGroupPayload(userId);
}

async function editGroup(callerId, groupId, name, description) {
  if (!groupId) throw new HttpError(400, "Invalid group.");
  if (!name || !name.trim()) throw new HttpError(400, "Group name is required.");

  const perm = await RescueGroup.findMemberRole(groupId, callerId);
  if (!perm.rows[0] || perm.rows[0].member_role !== "leader") {
    throw new HttpError(403, "Only the group leader can edit group info.");
  }

  await RescueGroup.updateGroup(groupId, name.trim(), (description || "").trim());
  return await buildRescueGroupPayload(callerId);
}

async function changeMemberRole(callerId, groupId, targetUserId, role) {
  if (!groupId || !targetUserId) throw new HttpError(400, "Invalid parameters.");
  if (!["co_leader", "member"].includes(role)) {
    throw new HttpError(400, "Role must be 'co_leader' or 'member'.");
  }
  if (targetUserId === callerId) {
    throw new HttpError(400, "You cannot change your own role.");
  }

  const perm = await RescueGroup.findMemberRole(groupId, callerId);
  if (!perm.rows[0] || perm.rows[0].member_role !== "leader") {
    throw new HttpError(403, "Only the group leader can change member roles.");
  }

  const result = await RescueGroup.updateMemberRole(groupId, targetUserId, role);
  if (result.rows.length === 0) {
    throw new HttpError(404, "Member not found or cannot change leader role.");
  }
  return await buildRescueGroupPayload(callerId);
}

async function removeMember(callerId, groupId, targetUserId) {
  if (!groupId || !targetUserId) throw new HttpError(400, "Invalid parameters.");
  if (targetUserId === callerId) {
    throw new HttpError(400, "Use the leave endpoint to leave the group.");
  }

  const perm = await RescueGroup.findMemberRole(groupId, callerId);
  const callerRole = perm.rows[0]?.member_role;
  if (!callerRole || !["leader", "co_leader"].includes(callerRole)) {
    throw new HttpError(403, "Only leaders can remove members.");
  }

  const target = await RescueGroup.findMemberRole(groupId, targetUserId);
  if (!target.rows[0]) throw new HttpError(404, "Member not found.");
  const targetRole = target.rows[0].member_role;
  if (targetRole === "leader") {
    throw new HttpError(400, "Cannot remove the group leader.");
  }
  if (callerRole === "co_leader" && targetRole === "co_leader") {
    throw new HttpError(403, "Co-leaders cannot remove other co-leaders.");
  }

  await RescueGroup.markMemberRemoved(groupId, targetUserId);
  return await buildRescueGroupPayload(callerId);
}

async function leaveGroup(userId, groupId) {
  if (!groupId) throw new HttpError(400, "Invalid group.");

  const member = await RescueGroup.findMemberRole(groupId, userId);
  if (!member.rows[0]) throw new HttpError(404, "You are not a member of this group.");
  if (member.rows[0].member_role === "leader") {
    throw new HttpError(400, "Leader cannot leave. Transfer leadership or disband the group.");
  }

  await RescueGroup.markMemberLeft(groupId, userId);
  return await buildRescueGroupPayload(userId);
}

async function disbandGroup(callerId, groupId) {
  if (!groupId) throw new HttpError(400, "Invalid group.");

  const perm = await RescueGroup.findMemberRole(groupId, callerId);
  if (!perm.rows[0] || perm.rows[0].member_role !== "leader") {
    throw new HttpError(403, "Only the group leader can disband the group.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await RescueGroup.archiveGroup(groupId, client);
    await RescueGroup.markAllMembersLeft(groupId, client);
    await RescueGroup.cancelAllPendingInvitesForGroup(groupId, client);
    await client.query("COMMIT");
    return await buildRescueGroupPayload(callerId);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function groupStats(callerId, callerRole, groupId) {
  if (!groupId) throw new HttpError(400, "Invalid group.");

  const memberCheck = await RescueGroup.findMemberRole(groupId, callerId);
  if (memberCheck.rows.length === 0 && callerRole !== "admin") {
    throw new HttpError(403, "You are not a member of this group.");
  }

  const [statsRes, sizeRes] = await Promise.all([
    RescueGroup.groupMissionStats(groupId),
    RescueGroup.groupSize(groupId),
  ]);

  const s = statsRes.rows[0];
  return {
    activeMissions: parseInt(s.active_missions, 10) || 0,
    completedMissions: parseInt(s.completed_missions, 10) || 0,
    pendingMissions: parseInt(s.pending_missions, 10) || 0,
    teamSize: sizeRes.rows[0]?.team_size || 0,
  };
}

module.exports = {
  createGroup,
  inviteMember,
  acceptInvite,
  declineInvite,
  editGroup,
  changeMemberRole,
  removeMember,
  leaveGroup,
  disbandGroup,
  groupStats,
};
