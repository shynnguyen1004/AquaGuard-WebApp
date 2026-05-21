// Unified response shape: { success: true, data } / { success: false, message, code? }.
function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}
function fail(res, status, message, code) {
  const body = { success: false, message };
  if (code) body.code = code;
  return res.status(status).json(body);
}
module.exports = { ok, fail };
