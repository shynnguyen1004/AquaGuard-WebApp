// Shared validators. NOTE: PHONE_RE currently mirrors backend's lenient {9,10} pattern.
// TODO[CLAUDE.md #9, #19]: tighten to ^\+84\d{9}$ once frontend/backend are aligned.
const PHONE_RE = /^\+84\d{9,10}$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}
function isLat(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= -90 && n <= 90;
}
function isLng(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= -180 && n <= 180;
}
function isPhoneVN(v) {
  return typeof v === "string" && PHONE_RE.test(v);
}

// Parse "YYYY-MM-DD" (also accepts ISO with T). Returns Date or null. Throws on malformed.
function parseDob(input) {
  if (input === undefined || input === null || String(input).trim() === "") return null;
  const raw = String(input).trim();
  const normalized = raw.includes("T") ? raw.split("T")[0] : raw;
  if (!DOB_RE.test(normalized)) throw new Error("Invalid date of birth format.");
  const dob = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(dob.getTime())) throw new Error("Invalid date of birth.");
  return dob;
}

module.exports = { PHONE_RE, DOB_RE, isPositiveInt, isLat, isLng, isPhoneVN, parseDob };
