const asyncHandler = require("../../../middleware/asyncHandler");
const { ok, fail } = require("../../../helpers/apiResponse");
const Family = require("../models/family.model");
const UserLocation = require("../models/userLocation.model");

const VALID_SAFETY_STATUSES = ["unknown", "safe", "danger", "injured"];

const search = asyncHandler(async (req, res) => {
  const { phone } = req.query;
  if (!phone) return fail(res, 400, "Thiếu số điện thoại");

  const result = await Family.findUserByPhone(phone, req.user.id);
  if (result.rows.length === 0) {
    return res.json({ success: true, data: null, message: "Không tìm thấy người dùng" });
  }
  const u = result.rows[0];
  return ok(res, {
    id: u.id,
    phoneNumber: u.phone_number,
    displayName: u.display_name,
    avatarUrl: u.avatar_url || "",
    safetyStatus: u.safety_status || "unknown",
  });
});

const createRequest = asyncHandler(async (req, res) => {
  const { receiver_id, relation } = req.body;
  if (!receiver_id) return fail(res, 400, "Thiếu thông tin người nhận");

  const existing = await Family.findExistingConnection(req.user.id, receiver_id);
  if (existing.rows.length > 0) {
    const conn = existing.rows[0];
    if (conn.status === "accepted") return fail(res, 409, "Đã kết nối với người này");
    if (conn.status === "pending") return fail(res, 409, "Đã gửi lời mời trước đó");
  }

  const result = await Family.createRequest(req.user.id, receiver_id, relation);
  return ok(res, result.rows[0], 201);
});

const listRequests = asyncHandler(async (req, res) => {
  const result = await Family.listPendingForReceiver(req.user.id);
  const requests = result.rows.map((r) => ({
    id: r.id,
    relation: r.relation,
    createdAt: r.created_at,
    from: {
      id: r.user_id,
      phoneNumber: r.phone_number,
      displayName: r.display_name,
      avatarUrl: r.avatar_url || "",
    },
  }));
  return ok(res, requests);
});

const acceptRequest = asyncHandler(async (req, res) => {
  const result = await Family.acceptRequest(req.params.id, req.user.id);
  if (result.rows.length === 0) return fail(res, 404, "Lời mời không tồn tại");
  return ok(res, result.rows[0]);
});

const rejectRequest = asyncHandler(async (req, res) => {
  const result = await Family.rejectRequest(req.params.id, req.user.id);
  if (result.rows.length === 0) return fail(res, 404, "Lời mời không tồn tại");
  return res.json({ success: true, message: "Đã từ chối" });
});

const listMembers = asyncHandler(async (req, res) => {
  const result = await Family.listMembers(req.user.id);
  const members = result.rows.map((m) => ({
    connectionId: m.connection_id,
    id: m.id,
    phoneNumber: m.phone_number,
    displayName: m.display_name,
    avatarUrl: m.avatar_url || "",
    relation: m.relation || "",
    safetyStatus: m.safety_status || "unknown",
    healthNote: m.health_note || "",
    address: m.address || "",
    latitude: m.latitude,
    longitude: m.longitude,
    locationUpdatedAt: m.location_updated_at,
  }));
  return ok(res, members);
});

const deleteMember = asyncHandler(async (req, res) => {
  const result = await Family.deleteConnection(req.params.connectionId, req.user.id);
  if (result.rows.length === 0) return fail(res, 404, "Kết nối không tồn tại");
  return res.json({ success: true, message: "Đã xóa kết nối" });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { safety_status, health_note } = req.body;
  if (safety_status && !VALID_SAFETY_STATUSES.includes(safety_status)) {
    return fail(res, 400, "Trạng thái không hợp lệ");
  }
  const result = await Family.updateSafetyStatus(req.user.id, safety_status, health_note);
  return ok(res, result.rows[0]);
});

const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, address } = req.body;
  if (latitude == null || longitude == null) return fail(res, 400, "Thiếu tọa độ");

  const result = await UserLocation.upsert(req.user.id, latitude, longitude, address);
  await UserLocation.syncActiveSosLocation(req.user.id, latitude, longitude);
  return ok(res, result.rows[0]);
});

module.exports = {
  search,
  createRequest,
  listRequests,
  acceptRequest,
  rejectRequest,
  listMembers,
  deleteMember,
  updateStatus,
  updateLocation,
};
