import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getStoredToken } from "../../utils/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

// ── Safe capitalize helper ──
const capitalize = (str) => {
  if (!str || typeof str !== "string") return "Unknown";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ── Theme colors matching Tailwind config ──
const COLORS = {
  primary: "#11a0b6",
  danger: "#ef4444",
  warning: "#f59e0b",
  safe: "#10b981",
  critical: "#a855f7",
  slate400: "#94a3b8",
  slate600: "#475569",};

const ROLE_COLORS = {
  citizen: COLORS.primary,
  rescuer: COLORS.warning,
  admin: COLORS.danger,
};

const URGENCY_COLORS = {
  low: COLORS.slate400,
  medium: COLORS.warning,
  high: "#f97316",
  critical: COLORS.danger,
};

const STATUS_COLORS = {
  pending: COLORS.warning,
  in_progress: COLORS.primary,
  resolved: COLORS.safe,
};

// ── Custom Tooltip ──
function CustomTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 shadow-xl border border-slate-200 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
          {p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

// ── Animated KPI Card ──
function KpiCard({ icon, label, value, subtitle, color, bgColor }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value !== "number" || value === 0) {
      setDisplayValue(value);
      return;
    }
    let start = 0;
    const end = value;
    const duration = 800;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className={`${bgColor} rounded-2xl p-5 border border-slate-100 dark:border-slate-700/30 group hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="size-11 rounded-xl bg-white/60 dark:bg-white/5 flex items-center justify-center shadow-sm">
          <span className={`material-symbols-outlined filled-icon text-xl ${color}`}>{icon}</span>
        </div>
        {subtitle && (
          <span className="text-[10px] font-semibold text-slate-400 bg-white/60 dark:bg-white/5 px-2 py-1 rounded-lg">
            {subtitle}
          </span>
        )}
      </div>
      <p className="text-3xl font-black tracking-tight">{displayValue}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{label}</p>
    </div>
  );
}

// ── Chart Card Wrapper ──
function ChartCard({ title, icon, iconColor, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/30 ${className}`}>
      <h3 className="text-base font-bold mb-5 flex items-center gap-2">
        <span className={`material-symbols-outlined text-lg ${iconColor}`}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Loading Skeleton ──
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

// ── Legend Item ──
function LegendItem({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="size-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Main Component ──
// ══════════════════════════════════════════════════════════════
// Safe default values to prevent null crashes in Recharts
const DEFAULT_OVERVIEW = {
  totalUsers: 0, newUsers7d: 0, totalRequests: 0,
  pendingRequests: 0, activeRequests: 0, resolvedRequests: 0,
  avgResponseMinutes: 0, resolutionRate: 0,
};
const DEFAULT_USER_DATA = { growth: [], roles: [] };
const DEFAULT_RESCUE_DATA = {
  trend: [], urgency: [], status: [],
  performance: { fastest: 0, slowest: 0, average: 0 },
};

export default function SystemAnalytics() {
  const [overview, setOverview] = useState(DEFAULT_OVERVIEW);
  const [userData, setUserData] = useState(DEFAULT_USER_DATA);
  const [rescueData, setRescueData] = useState(DEFAULT_RESCUE_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ovRes, usrRes, resRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview`, { headers }).catch(() => null),
        fetch(`${API_BASE}/analytics/users`, { headers }).catch(() => null),
        fetch(`${API_BASE}/analytics/rescue`, { headers }).catch(() => null),
      ]);

      // If all requests failed (network error), show error
      if (!ovRes && !usrRes && !resRes) {
        throw new Error("Unable to connect to analytics API");
      }

      const ovJson = ovRes ? await ovRes.json().catch(() => ({})) : {};
      const usrJson = usrRes ? await usrRes.json().catch(() => ({})) : {};
      const resJson = resRes ? await resRes.json().catch(() => ({})) : {};

      // Check for HTTP errors
      if (ovRes && !ovRes.ok) {
        throw new Error(ovJson.message || `Analytics overview failed (${ovRes.status})`);
      }
      if (usrRes && !usrRes.ok) {
        throw new Error(usrJson.message || `Analytics users failed (${usrRes.status})`);
      }
      if (resRes && !resRes.ok) {
        throw new Error(resJson.message || `Analytics rescue failed (${resRes.status})`);
      }

      // Always set data with safe defaults — never leave as null
      setOverview(ovJson.data || DEFAULT_OVERVIEW);
      setUserData({
        growth: ovJson.data?.growth || usrJson.data?.growth || [],
        roles: ovJson.data?.roles || usrJson.data?.roles || [],
        ...usrJson.data,
      });
      setRescueData({
        trend: [],
        urgency: [],
        status: [],
        performance: { fastest: 0, slowest: 0, average: 0 },
        ...resJson.data,
      });
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to load analytics data");
      // Keep safe defaults so charts don't crash
      setOverview((prev) => prev || DEFAULT_OVERVIEW);
      setUserData((prev) => prev || DEFAULT_USER_DATA);
      setRescueData((prev) => prev || DEFAULT_RESCUE_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Format date labels for charts
  const formatGrowthData = (data) => {
    if (!data) return [];
    return data.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    }));
  };

  const formatTrendData = (data) => {
    if (!data) return [];
    return data.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    }));
  };

  const roleTotal = (userData?.roles || []).reduce((sum, r) => sum + (r.count || 0), 0);
  const urgencyTotal = (rescueData?.urgency || []).reduce((sum, r) => sum + (r.count || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined filled-icon text-primary text-2xl">analytics</span>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">System Analytics</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Comprehensive overview of system performance and user activity
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${loading ? "animate-spin" : ""}`}>refresh</span>
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-sm text-danger font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon="group"
                label="Total Users"
                value={overview?.totalUsers || 0}
                color="text-primary"
                bgColor="bg-gradient-to-br from-primary/10 to-primary/5"
              />
              <KpiCard
                icon="person_add"
                label="New Users (7 days)"
                value={overview?.newUsers7d || 0}
                subtitle="Last 7d"
                color="text-safe"
                bgColor="bg-gradient-to-br from-safe/10 to-safe/5"
              />
              <KpiCard
                icon="emergency"
                label="Total SOS Requests"
                value={overview?.totalRequests || 0}
                color="text-danger"
                bgColor="bg-gradient-to-br from-danger/10 to-danger/5"
              />
              <KpiCard
                icon="speed"
                label="Avg Response Time"
                value={overview?.avgResponseMinutes || 0}
                subtitle="minutes"
                color="text-warning"
                bgColor="bg-gradient-to-br from-warning/10 to-warning/5"
              />
            </div>

            {/* ── Row 2: User Growth + Role Distribution ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartCard
                title="User Growth (30 days)"
                icon="trending_up"
                iconColor="text-primary"
                className="lg:col-span-2"
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formatGrowthData(userData?.growth)} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.slate400 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.slate400 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip suffix=" users" />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={COLORS.primary}
                        strokeWidth={2.5}
                        fill="url(#gradPrimary)"
                        dot={false}
                        activeDot={{ r: 5, fill: COLORS.primary, stroke: "#fff", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Role Distribution" icon="pie_chart" iconColor="text-critical">
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userData?.roles || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        dataKey="count"
                        nameKey="role"
                        strokeWidth={3}
                        stroke="transparent"
                      >
                        {(userData?.roles || []).filter((e) => e.role).map((entry, i) => (
                          <Cell key={i} fill={ROLE_COLORS[entry.role] || COLORS.slate400} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {(userData?.roles || []).filter((r) => r.role).map((r) => (
                    <LegendItem
                      key={r.role}
                      color={ROLE_COLORS[r.role] || COLORS.slate400}
                      label={capitalize(r.role)}
                      value={`${r.count} (${roleTotal > 0 ? Math.round((r.count / roleTotal) * 100) : 0}%)`}
                    />
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* ── Row 3: SOS Trend + Urgency Breakdown ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartCard
                title="SOS Requests Trend (30 days)"
                icon="emergency"
                iconColor="text-danger"
                className="lg:col-span-2"
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatTrendData(rescueData?.trend)} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradDanger" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.slate400 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: COLORS.slate400 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip suffix=" requests" />} />
                      <Bar dataKey="count" fill="url(#gradDanger)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Urgency Breakdown" icon="warning" iconColor="text-warning">
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rescueData?.urgency || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        dataKey="count"
                        nameKey="urgency"
                        strokeWidth={3}
                        stroke="transparent"
                      >
                        {(rescueData?.urgency || []).filter((e) => e.urgency).map((entry, i) => (
                          <Cell key={i} fill={URGENCY_COLORS[entry.urgency] || COLORS.slate400} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {(rescueData?.urgency || []).filter((r) => r.urgency).map((r) => (
                    <LegendItem
                      key={r.urgency}
                      color={URGENCY_COLORS[r.urgency] || COLORS.slate400}
                      label={capitalize(r.urgency)}
                      value={`${r.count} (${urgencyTotal > 0 ? Math.round((r.count / urgencyTotal) * 100) : 0}%)`}
                    />
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* ── Row 4: Status Overview + Response Performance ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Overview */}
              <ChartCard title="Request Status Overview" icon="assignment" iconColor="text-primary">
                <div className="space-y-4">
                  {(rescueData?.status || []).filter((s) => s.status).map((s) => {
                    const total = overview?.totalRequests || 1;
                    const pct = Math.round(((s.count || 0) / total) * 100);
                    const color = STATUS_COLORS[s.status] || COLORS.slate400;
                    const label = s.status === "in_progress" ? "In Progress" : capitalize(s.status);
                    return (
                      <div key={s.status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          <span className="text-sm font-bold">{s.count} <span className="text-xs text-slate-400 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!rescueData?.status || rescueData.status.length === 0) && (
                    <p className="text-sm text-slate-400 text-center py-6">No request data yet</p>
                  )}
                </div>
              </ChartCard>

              {/* Response Performance */}
              <ChartCard title="Response Performance" icon="speed" iconColor="text-warning">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-safe/10 to-safe/5 rounded-xl p-4 border border-safe/10">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Resolution Rate</p>
                    <p className="text-3xl font-black text-safe">{overview?.resolutionRate || 0}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/10">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Avg Response</p>
                    <p className="text-3xl font-black text-primary">{overview?.avgResponseMinutes || 0}<span className="text-sm font-medium text-slate-400 ml-1">min</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Fastest Response", value: `${rescueData?.performance?.fastest || 0} min`, icon: "bolt", color: "text-safe" },
                    { label: "Slowest Response", value: `${rescueData?.performance?.slowest || 0} min`, icon: "hourglass_bottom", color: "text-danger" },
                    { label: "Average Response", value: `${rescueData?.performance?.average || 0} min`, icon: "speed", color: "text-warning" },
                    { label: "Pending Requests", value: overview?.pendingRequests || 0, icon: "pending", color: "text-warning" },
                    { label: "Active Rescues", value: overview?.activeRequests || 0, icon: "local_shipping", color: "text-primary" },
                    { label: "Resolved Total", value: overview?.resolvedRequests || 0, icon: "check_circle", color: "text-safe" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-base ${item.color}`}>{item.icon}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
