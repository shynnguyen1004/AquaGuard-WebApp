const asyncHandler = require("../../../middleware/asyncHandler");
const { ok, fail } = require("../../../helpers/apiResponse");
const { ROLES } = require("../../../constants/roles");
const { NO_TEAM, NOT_AUTHORIZED_ROLE } = require("../../../constants/errorCodes");
const logger = require("../../../utils/logger");
const broadcastToRoom = require("../../../helpers/broadcastToRoom");
const logStatusChange = require("../../../helpers/logStatusChange");
const { uploadToCloudinary } = require("../../../utils/upload");
const SOS = require("../models/rescueRequest.model");

const create = asyncHandler(async (req, res) => {
  const { location, description, urgency, latitude, longitude } = req.body;
  if (!location || !description) return fail(res, 400, "Vị trí và mô tả là bắt buộc");

  let imageUrls = [];
  if (req.files && req.files.length > 0) {
    imageUrls = await Promise.all(req.files.map((f) => uploadToCloudinary(f.buffer)));
    logger.info(`[SOS] Uploaded ${imageUrls.length} images to Cloudinary`);
  }

  const result = await SOS.create({
    userId: req.user.id,
    location,
    description,
    urgency,
    imageUrls,
    latitude,
    longitude,
  });

  const newRequest = result.rows[0];
  await logStatusChange(newRequest.id, req.user.id, null, "pending");
  return ok(res, newRequest, 201);
});

const listMine = asyncHandler(async (req, res) => {
  const result = await SOS.listMine(req.user.id);
  return ok(res, result.rows);
});

const listAll = asyncHandler(async (_req, res) => {
  const result = await SOS.listAll();
  return ok(res, result.rows);
});

const listTeam = asyncHandler(async (req, res) => {
  const groupRes = await SOS.findCallerActiveGroup(req.user.id);
  if (groupRes.rows.length === 0) {
    return res.json({ success: true, data: [], group: null });
  }
  const group = { id: groupRes.rows[0].id, name: groupRes.rows[0].name };
  const result = await SOS.listForGroup(group.id);
  return res.json({ success: true, data: result.rows, group });
});

const stats = asyncHandler(async (_req, res) => {
  const result = await SOS.statsByStatus();
  // TODO[CLAUDE.md #13]: include "assigned" status in the map.
  const out = { pending: 0, in_progress: 0, resolved: 0, total: 0 };
  result.rows.forEach((row) => {
    out[row.status] = row.count;
    out.total += row.count;
  });
  return ok(res, out);
});

const assign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { groupId } = req.body;
  if (!groupId) return fail(res, 400, "Thiếu groupId (ID nhóm cứu hộ)");

  const leaderRes = await SOS.findGroupLeader(groupId);
  if (leaderRes.rows.length === 0) {
    return fail(res, 404, "Không tìm thấy nhóm cứu hộ hoặc nhóm không có leader");
  }
  const group = leaderRes.rows[0];

  const result = await SOS.assignToGroup(id, group.leader_id, group.id);
  if (result.rows.length === 0) {
    return fail(res, 404, "Request không tồn tại hoặc không còn ở trạng thái pending");
  }

  await logStatusChange(parseInt(id, 10), req.user.id, "pending", "assigned");
  return ok(res, result.rows[0]);
});

const accept = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;

  const groupRes = await SOS.findCallerActiveGroup(req.user.id);
  const teamRole = groupRes.rows[0]?.member_role;

  if (!teamRole) {
    return fail(res, 403, "Bạn cần tham gia một nhóm cứu hộ trước khi nhận nhiệm vụ.", NO_TEAM);
  }
  if (!["leader", "co_leader"].includes(teamRole)) {
    return fail(
      res,
      403,
      "Chỉ trưởng nhóm hoặc phó nhóm mới có thể nhận nhiệm vụ cứu hộ.",
      NOT_AUTHORIZED_ROLE
    );
  }

  const assignedGroupId = groupRes.rows[0].id;

  const result = await SOS.acceptByRescuer({
    requestId: id,
    rescuerId: req.user.id,
    groupId: assignedGroupId,
    latitude,
    longitude,
  });

  if (result.rows.length === 0) {
    return fail(
      res,
      403,
      "Request không tồn tại, đã được nhận, hoặc đã được assign cho rescuer/nhóm khác."
    );
  }

  const request = result.rows[0];
  await logStatusChange(parseInt(id, 10), req.user.id, "pending", "in_progress");

  const userResult = await SOS.getRescuerDisplayName(req.user.id);
  const rescuerName = userResult.rows[0]?.display_name || "Rescuer";

  broadcastToRoom(req, parseInt(id, 10), {
    type: "tracking_started",
    requestId: parseInt(id, 10),
    rescuerId: req.user.id,
    rescuerName,
    rescuerLatitude: latitude,
    rescuerLongitude: longitude,
    citizenLatitude: request.latitude,
    citizenLongitude: request.longitude,
  });

  return ok(res, request);
});

const cancel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await SOS.cancelByRescuer(id, req.user.id);
  if (result.rows.length === 0) {
    return fail(
      res,
      404,
      "Không thể huỷ request này (không phải mission của bạn hoặc request không ở trạng thái in progress)"
    );
  }
  await logStatusChange(parseInt(id, 10), req.user.id, "in_progress", "pending", "Rescuer cancelled");
  broadcastToRoom(req, parseInt(id, 10), {
    type: "tracking_cancelled",
    requestId: parseInt(id, 10),
  });
  return ok(res, result.rows[0]);
});

const complete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user?.role === ROLES.ADMIN;
  const isRescuer = req.user?.role === ROLES.RESCUER;
  if (!isAdmin && !isRescuer) return fail(res, 403, "Không có quyền hoàn thành request");

  // TODO[security/#3 IDOR]: tighten — rescuer should only complete missions assigned to their group.
  const result = isAdmin
    ? await SOS.completeAsAdmin(id)
    : await SOS.completeAsRescuer(id, req.user.id);

  if (result.rows.length === 0) {
    return fail(
      res,
      404,
      "Không thể hoàn thành request này (không phải mission của bạn hoặc đã hoàn thành)"
    );
  }
  await logStatusChange(parseInt(id, 10), req.user.id, "in_progress", "resolved");
  broadcastToRoom(req, parseInt(id, 10), {
    type: "tracking_ended",
    requestId: parseInt(id, 10),
  });
  return ok(res, result.rows[0]);
});

module.exports = { create, listMine, listAll, listTeam, stats, assign, accept, cancel, complete };
