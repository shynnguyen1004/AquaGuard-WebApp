const asyncHandler = require("../../../middleware/asyncHandler");
const { ok } = require("../../../helpers/apiResponse");
const M = require("../models/analytics.model");

const overview = asyncHandler(async (_req, res) => {
  const [usersRes, newUsersRes, requestsRes, avgTimeRes] = await Promise.all([
    M.totalUsers(),
    M.newUsersLast7d(),
    M.requestsBreakdown(),
    M.avgResponseMinutes(),
  ]);

  const totalRequests = requestsRes.rows[0];
  const resolutionRate =
    totalRequests.total > 0
      ? Math.round((totalRequests.resolved / totalRequests.total) * 100)
      : 0;

  return ok(res, {
    totalUsers: usersRes.rows[0].total,
    newUsers7d: newUsersRes.rows[0].total,
    totalRequests: totalRequests.total,
    pendingRequests: totalRequests.pending,
    activeRequests: totalRequests.in_progress,
    resolvedRequests: totalRequests.resolved,
    avgResponseMinutes: avgTimeRes.rows[0].avg_minutes,
    resolutionRate,
  });
});

const users = asyncHandler(async (_req, res) => {
  const [growthRes, rolesRes] = await Promise.all([M.userGrowth30d(), M.roleDistribution()]);
  return ok(res, {
    growth: growthRes.rows.map((r) => ({ date: r.date, count: r.count })),
    roles: rolesRes.rows,
  });
});

const rescue = asyncHandler(async (_req, res) => {
  const [trendRes, urgencyRes, statusRes, perfRes] = await Promise.all([
    M.rescueTrend30d(),
    M.urgencyBreakdown(),
    M.statusBreakdown(),
    M.responsePerformance(),
  ]);

  return ok(res, {
    trend: trendRes.rows.map((r) => ({ date: r.date, count: r.count })),
    urgency: urgencyRes.rows,
    status: statusRes.rows,
    performance: perfRes.rows[0] || { fastest: 0, slowest: 0, average: 0 },
  });
});

module.exports = { overview, users, rescue };
