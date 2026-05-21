const asyncHandler = require("../../../middleware/asyncHandler");
const { ok } = require("../../../helpers/apiResponse");
const buildRescueGroupPayload = require("../../../helpers/buildRescueGroupPayload");
const RescueGroup = require("../models/rescueGroup.model");
const RGService = require("../services/rescueGroup.service");

const listAll = asyncHandler(async (_req, res) => {
  const result = await RescueGroup.listAllActiveGroups();
  ok(res, result.rows);
});

const getMine = asyncHandler(async (req, res) => {
  const data = await buildRescueGroupPayload(req.user.id);
  ok(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await RGService.createGroup(req.user.id, req.body.name, req.body.description);
  res.status(201).json({ success: true, data });
});

const invite = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const data = await RGService.inviteMember(req.user.id, groupId, req.body.phone_number);
  res.status(201).json({ success: true, data });
});

const acceptInvite = asyncHandler(async (req, res) => {
  const inviteId = Number(req.params.id);
  const data = await RGService.acceptInvite(req.user.id, inviteId);
  ok(res, data);
});

const declineInvite = asyncHandler(async (req, res) => {
  const inviteId = Number(req.params.id);
  const data = await RGService.declineInvite(req.user.id, inviteId);
  ok(res, data);
});

const stats = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const data = await RGService.groupStats(req.user.id, req.user.role, groupId);
  ok(res, data);
});

const edit = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const data = await RGService.editGroup(req.user.id, groupId, req.body.name, req.body.description);
  ok(res, data);
});

const changeMemberRole = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const data = await RGService.changeMemberRole(req.user.id, groupId, targetUserId, req.body.role);
  ok(res, data);
});

const removeMember = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const data = await RGService.removeMember(req.user.id, groupId, targetUserId);
  ok(res, data);
});

const leave = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const data = await RGService.leaveGroup(req.user.id, groupId);
  res.json({ success: true, data, message: "You have left the group." });
});

const disband = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const data = await RGService.disbandGroup(req.user.id, groupId);
  res.json({ success: true, data, message: "Group has been disbanded." });
});

module.exports = {
  listAll,
  getMine,
  create,
  invite,
  acceptInvite,
  declineInvite,
  stats,
  edit,
  changeMemberRole,
  removeMember,
  leave,
  disband,
};
