const { pool } = require("../../../configs/db");

function totalUsers() {
  return pool.query("SELECT COUNT(*)::int AS total FROM users");
}

function newUsersLast7d() {
  return pool.query(
    "SELECT COUNT(*)::int AS total FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"
  );
}

function requestsBreakdown() {
  return pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
    FROM rescue_requests
  `);
}

function avgResponseMinutes() {
  return pool.query(`
    SELECT COALESCE(
      ROUND(EXTRACT(EPOCH FROM AVG(COALESCE(assigned_at, updated_at) - created_at)) / 60),
      0
    )::int AS avg_minutes
    FROM rescue_requests
    WHERE status IN ('in_progress', 'resolved') AND assigned_to IS NOT NULL
  `);
}

function userGrowth30d() {
  return pool.query(`
    SELECT
      d.day::date AS date,
      COALESCE(COUNT(u.id), 0)::int AS count
    FROM generate_series(
      CURRENT_DATE - INTERVAL '29 days',
      CURRENT_DATE,
      '1 day'
    ) AS d(day)
    LEFT JOIN users u ON DATE(u.created_at) = d.day::date
    GROUP BY d.day
    ORDER BY d.day
  `);
}

function roleDistribution() {
  return pool.query(`
    SELECT role, COUNT(*)::int AS count
    FROM users
    WHERE role IS NOT NULL
    GROUP BY role
    ORDER BY count DESC
  `);
}

function rescueTrend30d() {
  return pool.query(`
    SELECT
      d.day::date AS date,
      COALESCE(COUNT(r.id), 0)::int AS count
    FROM generate_series(
      CURRENT_DATE - INTERVAL '29 days',
      CURRENT_DATE,
      '1 day'
    ) AS d(day)
    LEFT JOIN rescue_requests r ON DATE(r.created_at) = d.day::date
    GROUP BY d.day
    ORDER BY d.day
  `);
}

function urgencyBreakdown() {
  return pool.query(`
    SELECT urgency, COUNT(*)::int AS count
    FROM rescue_requests
    WHERE urgency IS NOT NULL
    GROUP BY urgency
    ORDER BY count DESC
  `);
}

function statusBreakdown() {
  return pool.query(`
    SELECT status, COUNT(*)::int AS count
    FROM rescue_requests
    WHERE status IS NOT NULL
    GROUP BY status
    ORDER BY count DESC
  `);
}

function responsePerformance() {
  return pool.query(`
    SELECT
      COALESCE(ROUND(EXTRACT(EPOCH FROM MIN(COALESCE(resolved_at, updated_at) - created_at)) / 60), 0)::int AS fastest,
      COALESCE(ROUND(EXTRACT(EPOCH FROM MAX(COALESCE(resolved_at, updated_at) - created_at)) / 60), 0)::int AS slowest,
      COALESCE(ROUND(EXTRACT(EPOCH FROM AVG(COALESCE(resolved_at, updated_at) - created_at)) / 60), 0)::int AS average
    FROM rescue_requests
    WHERE status IN ('in_progress', 'resolved') AND assigned_to IS NOT NULL
  `);
}

module.exports = {
  totalUsers,
  newUsersLast7d,
  requestsBreakdown,
  avgResponseMinutes,
  userGrowth30d,
  roleDistribution,
  rescueTrend30d,
  urgencyBreakdown,
  statusBreakdown,
  responsePerformance,
};
