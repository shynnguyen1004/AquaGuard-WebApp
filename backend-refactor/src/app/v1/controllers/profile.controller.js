const asyncHandler = require("../../../middleware/asyncHandler");
const { ok } = require("../../../helpers/apiResponse");
const ProfileService = require("../services/profile.service");

const get = asyncHandler(async (req, res) => {
  const data = await ProfileService.getProfile(req.user.id);
  ok(res, data);
});

const update = asyncHandler(async (req, res) => {
  const data = await ProfileService.updateProfile(req.user.id, req.body);
  res.json({ success: true, message: "Profile updated successfully.", data });
});

module.exports = { get, update };
