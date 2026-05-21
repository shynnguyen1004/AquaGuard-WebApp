const asyncHandler = require("../../../middleware/asyncHandler");
const { ok, fail } = require("../../../helpers/apiResponse");
const User = require("../models/user.model");

const list = asyncHandler(async (_req, res) => {
  const result = await User.listAll();
  const users = result.rows.map((u) => ({
    id: u.id,
    uid: `phone_${u.id}`,
    phoneNumber: u.phone_number,
    displayName: u.display_name,
    role: u.role,
    avatarUrl: u.avatar_url || "",
    isActive: u.is_active,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));
  ok(res, users);
});

const updateRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !["citizen", "rescuer", "admin"].includes(role)) {
    return fail(res, 400, "Invalid role.");
  }
  const result = await User.updateRole(req.params.id, role);
  if (result.rows.length === 0) return fail(res, 404, "User not found.");
  ok(res, result.rows[0]);
});

module.exports = { list, updateRole };
