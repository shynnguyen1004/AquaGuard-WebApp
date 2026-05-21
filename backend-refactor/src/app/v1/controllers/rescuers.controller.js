const asyncHandler = require("../../../middleware/asyncHandler");
const { ok } = require("../../../helpers/apiResponse");
const User = require("../models/user.model");

const list = asyncHandler(async (req, res) => {
  const result = await User.listRescuersWithGroupInfo(req.user.id);
  const rescuers = result.rows.map((u) => ({
    id: u.id,
    uid: `phone_${u.id}`,
    phoneNumber: u.phone_number,
    displayName: u.display_name,
    role: u.role,
    avatarUrl: u.avatar_url || "",
    isActive: u.is_active,
    hasActiveGroup: u.has_active_group,
    hasPendingInviteFromMe: u.has_pending_invite_from_me,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));
  ok(res, rescuers);
});

module.exports = { list };
