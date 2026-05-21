const RescueGroup = require("../app/v1/models/rescueGroup.model");

// Aggregates: current active group (members + pending invites) + invites received by the user.
// Used by every group-mutating endpoint to return a unified response shape.
async function buildRescueGroupPayload(userId) {
  const activeRes = await RescueGroup.findActiveMembershipFull(userId);
  const activeGroup = activeRes.rows[0] || null;

  let group = null;
  if (activeGroup) {
    const [membersRes, invitesRes] = await Promise.all([
      RescueGroup.listGroupMembers(activeGroup.id),
      RescueGroup.listGroupPendingInvites(activeGroup.id),
    ]);

    group = {
      id: activeGroup.id,
      name: activeGroup.name,
      description: activeGroup.description || "",
      createdBy: activeGroup.created_by,
      leaderId: activeGroup.leader_id,
      memberRole: activeGroup.member_role,
      joinedAt: activeGroup.joined_at,
      status: activeGroup.status,
      createdAt: activeGroup.created_at,
      updatedAt: activeGroup.updated_at,
      members: membersRes.rows.map((row) => ({
        id: row.user_id,
        displayName: row.display_name,
        phoneNumber: row.phone_number,
        avatarUrl: row.avatar_url || "",
        isActive: row.is_active,
        memberRole: row.member_role,
        joinStatus: row.join_status,
        joinedAt: row.joined_at,
      })),
      pendingInvites: invitesRes.rows.map((row) => ({
        id: row.id,
        phoneNumber: row.invited_phone_number,
        status: row.status,
        createdAt: row.created_at,
        userId: row.user_id,
        displayName: row.display_name || "",
        avatarUrl: row.avatar_url || "",
      })),
    };
  }

  const receivedRes = await RescueGroup.listReceivedInvites(userId);

  return {
    group,
    canAcceptMission: activeGroup
      ? ["leader", "co_leader"].includes(activeGroup.member_role)
      : false,
    pendingInvites: receivedRes.rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      group: {
        id: row.group_id,
        name: row.group_name,
        description: row.group_description || "",
      },
      inviter: {
        id: row.inviter_id,
        displayName: row.inviter_name,
        phoneNumber: row.inviter_phone,
      },
    })),
  };
}

module.exports = buildRescueGroupPayload;
