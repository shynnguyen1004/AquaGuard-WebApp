const express = require("express");
const pool = require("../db");
const { authMiddleware, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// ── CSV helpers ──
function csvCell(v) {
  if (v === null || v === undefined) return "";
  let s;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
function buildCsv(headers, rows) {
  const head = headers.map(csvCell).join(",");
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  // Leading BOM so Excel renders UTF-8 (Vietnamese) correctly.
  return "﻿" + head + (rows.length ? "\r\n" + body : "") + "\r\n";
}

// ── Anonymization (keeps numeric IDs so exported CSVs still join) ──
function anon(type, v) {
  if (v === null || v === undefined || v === "") return v;
  switch (type) {
    case "coord": {
      const n = Number(v);
      return Number.isFinite(n) ? n.toFixed(2) : ""; // ~1.1km, town level
    }
    case "dob": {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? "" : String(d.getUTCFullYear()); // year only
    }
    // names, phones, emails, free text, IP → dropped
    default:
      return "";
  }
}

// ── Dataset registry (whitelist — dataset keys are never interpolated) ──
const DATASETS = {
  users: {
    dateCol: "created_at",
    sql: (w) =>
      `SELECT id, role, display_name, phone_number, email, gender, date_of_birth, is_active, created_at
       FROM users ${w} ORDER BY id`,
    columns: [
      { key: "id" }, { key: "role" },
      { key: "display_name", pii: "name" },
      { key: "phone_number", pii: "phone" },
      { key: "email", pii: "email" },
      { key: "gender" }, { key: "date_of_birth", pii: "dob" },
      { key: "is_active" }, { key: "created_at" },
    ],
  },
  rescue_requests: {
    dateCol: "rr.created_at", // qualified — joined tables also have created_at
    sql: (w) =>
      `SELECT rr.id, rr.user_id, u.display_name AS user_name,
              rr.assigned_to, au.display_name AS assigned_to_name,
              rr.assigned_group_id, g.name AS assigned_group_name,
              rr.status, rr.urgency, rr.accepted_mode,
              rr.description, rr.location, rr.latitude, rr.longitude,
              rr.rescuer_latitude, rr.rescuer_longitude,
              rr.last_cancelled_by, rr.last_cancelled_at, rr.assigned_at, rr.resolved_at, rr.created_at
       FROM rescue_requests rr
       LEFT JOIN users u ON u.id = rr.user_id
       LEFT JOIN users au ON au.id = rr.assigned_to
       LEFT JOIN rescue_groups g ON g.id = rr.assigned_group_id
       ${w} ORDER BY rr.id`,
    columns: [
      { key: "id" },
      { key: "user_id" }, { key: "user_name", pii: "name" },
      { key: "assigned_to" }, { key: "assigned_to_name", pii: "name" },
      { key: "assigned_group_id" }, { key: "assigned_group_name" },
      { key: "status" }, { key: "urgency" }, { key: "accepted_mode" },
      { key: "description", pii: "text" }, { key: "location", pii: "text" },
      { key: "latitude", pii: "coord" }, { key: "longitude", pii: "coord" },
      { key: "rescuer_latitude", pii: "coord" }, { key: "rescuer_longitude", pii: "coord" },
      { key: "last_cancelled_by" }, { key: "last_cancelled_at" },
      { key: "assigned_at" }, { key: "resolved_at" }, { key: "created_at" },
    ],
  },
  user_locations: {
    dateCol: "ul.updated_at", // qualified — users also has an updated_at column
    sql: (w) =>
      `SELECT ul.user_id, u.display_name, u.role, ul.latitude, ul.longitude, ul.updated_at
       FROM user_locations ul
       LEFT JOIN users u ON u.id = ul.user_id
       ${w} ORDER BY ul.user_id`,
    columns: [
      { key: "user_id" },
      { key: "display_name", pii: "name" },
      { key: "role" },
      { key: "latitude", pii: "coord" }, { key: "longitude", pii: "coord" },
      { key: "updated_at" },
    ],
  },
  rescue_groups: {
    dateCol: "created_at",
    sql: (w) => `SELECT id, name, description, status, created_by, created_at FROM rescue_groups ${w} ORDER BY id`,
    columns: [
      { key: "id" }, { key: "name" }, { key: "description" },
      { key: "status" }, { key: "created_by" }, { key: "created_at" },
    ],
  },
  rescue_group_members: {
    dateCol: "m.joined_at",
    sql: (w) =>
      `SELECT m.id, m.group_id, g.name AS group_name, m.user_id, u.display_name AS user_name,
              m.member_role, m.join_status, m.joined_at
       FROM rescue_group_members m
       LEFT JOIN users u ON u.id = m.user_id
       LEFT JOIN rescue_groups g ON g.id = m.group_id
       ${w} ORDER BY m.group_id, m.id`,
    columns: [
      { key: "id" }, { key: "group_id" }, { key: "group_name" },
      { key: "user_id" }, { key: "user_name", pii: "name" },
      { key: "member_role" }, { key: "join_status" }, { key: "joined_at" },
    ],
  },
  rescue_request_logs: {
    dateCol: "l.created_at", // qualified — users also has created_at
    sql: (w) =>
      `SELECT l.id, l.request_id, l.changed_by, u.display_name AS changed_by_name,
              l.old_status, l.new_status, l.note, l.created_at
       FROM rescue_request_logs l
       LEFT JOIN users u ON u.id = l.changed_by
       ${w} ORDER BY l.id`,
    columns: [
      { key: "id" }, { key: "request_id" },
      { key: "changed_by" }, { key: "changed_by_name", pii: "name" },
      { key: "old_status" }, { key: "new_status" },
      { key: "note", pii: "text" }, { key: "created_at" },
    ],
  },
  audit_logs: {
    dateCol: "created_at",
    sql: (w) =>
      `SELECT id, user_id, action, target_type, target_id, before_data, after_data, ip_address, created_at
       FROM audit_logs ${w} ORDER BY id`,
    columns: [
      { key: "id" }, { key: "user_id" }, { key: "action" },
      { key: "target_type" }, { key: "target_id" },
      { key: "before_data" }, { key: "after_data" },
      { key: "ip_address", pii: "ip" }, { key: "created_at" },
    ],
  },
  // Aggregated snapshot (metric/value). No PII → anonymize is a no-op.
  analytics_summary: {
    custom: async ({ from, to }) => {
      const params = [];
      const wc = [];
      if (from) { params.push(from); wc.push(`created_at >= $${params.length}::date`); }
      if (to) { params.push(to); wc.push(`created_at < ($${params.length}::date + INTERVAL '1 day')`); }
      const reqWhere = wc.length ? `WHERE ${wc.join(" AND ")}` : "";
      const reqAnd = wc.length ? `AND ${wc.join(" AND ")}` : "";

      const [usersRes, activeRes, reqRes, teamRes, respRes] = await Promise.all([
        pool.query(`SELECT role, COUNT(*)::int AS c FROM users GROUP BY role`),
        pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE is_active`),
        pool.query(`SELECT status, COUNT(*)::int AS c FROM rescue_requests ${reqWhere} GROUP BY status`, params),
        pool.query(`SELECT COUNT(*)::int AS c FROM rescue_groups WHERE status = 'active'`),
        pool.query(
          `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - assigned_at)) / 60)::numeric, 1) AS m
           FROM rescue_requests
           WHERE resolved_at IS NOT NULL AND assigned_at IS NOT NULL ${reqAnd}`,
          params
        ),
      ]);

      const byRole = Object.fromEntries(usersRes.rows.map((r) => [r.role, r.c]));
      const byStatus = Object.fromEntries(reqRes.rows.map((r) => [r.status, r.c]));
      const rows = [
        ["generated_at", new Date().toISOString()],
        ["date_from", from || "(all)"],
        ["date_to", to || "(all)"],
        ["users_total", usersRes.rows.reduce((a, r) => a + r.c, 0)],
        ["users_citizen", byRole.citizen || 0],
        ["users_rescuer", byRole.rescuer || 0],
        ["users_admin", byRole.admin || 0],
        ["users_active", activeRes.rows[0].c],
        ["requests_total", reqRes.rows.reduce((a, r) => a + r.c, 0)],
        ["requests_pending", byStatus.pending || 0],
        ["requests_assigned", byStatus.assigned || 0],
        ["requests_in_progress", byStatus.in_progress || 0],
        ["requests_resolved", byStatus.resolved || 0],
        ["requests_cancelled", byStatus.cancelled || 0],
        ["rescue_teams_active", teamRes.rows[0].c],
        ["avg_response_minutes", respRes.rows[0].m ?? ""],
      ];
      return { headers: ["metric", "value"], rows };
    },
  },
};

function sendCsv(res, name, csv) {
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="aquaguard_${name}_${stamp}.csv"`);
  res.send(csv);
}

/**
 * GET /api/export/:dataset(.csv)?from=YYYY-MM-DD&to=YYYY-MM-DD&anonymize=1
 * Admin-only CSV export. `from`/`to` filter the dataset's date column (inclusive
 * day range). `anonymize=1` drops names/phones/emails/IP/free-text and rounds GPS.
 */
router.get("/:dataset", authMiddleware, requireAdmin, async (req, res) => {
  const key = String(req.params.dataset || "").replace(/\.csv$/, "");
  const ds = DATASETS[key];
  if (!ds) return res.status(404).json({ success: false, message: "Unknown dataset" });

  const anonymize = req.query.anonymize === "1" || req.query.anonymize === "true";
  const { from, to } = req.query;

  try {
    let headers, rows;

    if (ds.custom) {
      ({ headers, rows } = await ds.custom({ from, to }));
    } else {
      const params = [];
      const wc = [];
      if (ds.dateCol && from) { params.push(from); wc.push(`${ds.dateCol} >= $${params.length}::date`); }
      if (ds.dateCol && to) { params.push(to); wc.push(`${ds.dateCol} < ($${params.length}::date + INTERVAL '1 day')`); }
      const where = wc.length ? `WHERE ${wc.join(" AND ")}` : "";

      const result = await pool.query(ds.sql(where), params);
      headers = ds.columns.map((c) => c.key);
      rows = result.rows.map((row) =>
        ds.columns.map((c) => {
          let v = row[c.key];
          if (anonymize && c.pii) v = anon(c.pii, v);
          return v;
        })
      );
    }

    sendCsv(res, `${key}${anonymize ? "_anon" : ""}`, buildCsv(headers, rows));
  } catch (err) {
    console.error(`[Export] ${key} failed:`, err.message);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
});

module.exports = router;
