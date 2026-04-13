import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

// ── Dark theme tokens ──
const T = {
  panelBg: "#171b26",
  cardBg: "#1e2333",
  border: "#252a38",
  textPrimary: "#e8eaf0",
  textSecondary: "#8891a8",
  textMuted: "#4a5068",
  accent: "#11a0b6",
  sosRed: "#dc2626",
};

const TABS = ["actions", "alerts", "family"];

const SAFETY_COLORS = {
  safe: { bg: "#10b981", label: "Safe" },
  danger: { bg: "#ef4444", label: "Danger" },
  injured: { bg: "#f97316", label: "Injured" },
  unknown: { bg: "#64748b", label: "Unknown" },
};

const SEVERITY_BADGE = {
  urgent: { bg: "#dc2626", text: "#fff", label: "Urgent" },
  monitoring: { bg: "#f59e0b", text: "#000", label: "Monitoring" },
  advisory: { bg: "#2dd4a8", text: "#000", label: "Advisory" },
};

// Hardcoded alerts (no API yet — structured for future API binding)
const STATIC_ALERTS = [
  {
    id: "a1",
    icon: "tsunami",
    title: "Heavy Rainfall Expected",
    description: "Level 3 alert in Da Nang. Expected in next 2 hours.",
    severity: "urgent",
    active: true,
  },
  {
    id: "a2",
    icon: "waves",
    title: "River Water Level Rising",
    description: "Han River levels rising at 15cm/hour.",
    severity: "monitoring",
    active: true,
  },
  {
    id: "a3",
    icon: "thunderstorm",
    title: "Power Outage Risk",
    description: "Central district grid may be suspended for safety.",
    severity: "advisory",
    active: false,
  },
];

// ── Skeleton Shimmer ──
function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ backgroundColor: T.border }}
    />
  );
}

// ── Tab Button ──
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        color: active ? T.accent : T.textMuted,
        borderBottomColor: active ? T.accent : "transparent",
        borderBottomWidth: "2px",
        borderBottomStyle: "solid",
      }}
      className="flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:opacity-80"
    >
      {label}
    </button>
  );
}

// ══════════════════════════════════════
//  TAB: ACTIONS
// ══════════════════════════════════════
function ActionsTab({ onNavigate, onLocateMe, onToggleFamily, showFamily }) {
  const { t } = useLanguage();

  const actions = [
    {
      icon: "group",
      label: t("quickActions.family") || "Family",
      desc: showFamily ? "Visible on map" : "Show on map",
      onClick: onToggleFamily,
      active: showFamily,
    },
    {
      icon: "home_pin",
      label: t("quickActions.shelter") || "Shelter",
      desc: t("quickActions.shelterDesc") || "Find nearest",
      onClick: () => onNavigate?.("safety"),
    },
    {
      icon: "my_location",
      label: t("floodMap.myLocation") || "My Location",
      desc: "Update GPS",
      onClick: onLocateMe,
    },
    {
      icon: "menu_book",
      label: "Protocols",
      desc: "Safety guides",
      onClick: () => onNavigate?.("safety"),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* SOS Button */}
      <button
        onClick={() => onNavigate?.("sos")}
        style={{ backgroundColor: T.sosRed }}
        className="w-full py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg hover:brightness-110 transition-all active:scale-[0.98] group"
      >
        <span className="material-symbols-outlined filled-icon text-xl group-hover:animate-pulse">
          sos
        </span>
        <span className="tracking-wide">{t("rightPanel.sos") || "SOS"} — Emergency</span>
      </button>

      {/* 2x2 Action Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a) => (
          <button
            key={a.icon}
            onClick={a.onClick}
            style={{
              backgroundColor: a.active ? `${T.accent}15` : T.cardBg,
              borderColor: a.active ? `${T.accent}40` : T.border,
            }}
            className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:brightness-110 group"
          >
            <span
              className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110"
              style={{ color: a.active ? T.accent : T.textSecondary }}
            >
              {a.icon}
            </span>
            <span
              className="text-[11px] font-bold"
              style={{ color: T.textPrimary }}
            >
              {a.label}
            </span>
            <span
              className="text-[9px] leading-tight"
              style={{ color: T.textMuted }}
            >
              {a.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  TAB: ALERTS
// ══════════════════════════════════════
function AlertsTab() {
  const [alerts, setAlerts] = useState(null);

  // Simulate loading (fake 300ms) + prepare for future API
  useEffect(() => {
    const timer = setTimeout(() => {
      // TODO: Replace with api.get("/alerts") when API is available
      setAlerts(STATIC_ALERTS);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const hasActiveAlerts = alerts?.some((a) => a.active);

  if (!alerts) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header with LIVE indicator */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: T.textSecondary }}
        >
          Active Alerts
        </span>
        {hasActiveAlerts && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: T.accent }}>
            <span
              className="size-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: T.accent }}
            />
            LIVE
          </span>
        )}
      </div>

      {/* Alert Cards */}
      {alerts.map((alert) => {
        const sev = SEVERITY_BADGE[alert.severity] || SEVERITY_BADGE.advisory;
        return (
          <div
            key={alert.id}
            style={{
              backgroundColor: T.cardBg,
              borderColor: T.border,
            }}
            className="p-3.5 rounded-xl border flex gap-3 transition-all hover:brightness-105"
          >
            {/* Icon */}
            <div
              className="size-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${sev.bg}18`,
                color: sev.bg,
              }}
            >
              <span className="material-symbols-outlined filled-icon text-lg">
                {alert.icon}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-bold leading-tight"
                style={{ color: T.textPrimary }}
              >
                {alert.title}
              </p>
              <p
                className="text-[11px] mt-1 leading-relaxed line-clamp-2"
                style={{ color: T.textSecondary }}
              >
                {alert.description}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={`size-1.5 rounded-full ${alert.active ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: sev.bg }}
                />
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: sev.bg }}
                >
                  {sev.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════
//  TAB: FAMILY
// ══════════════════════════════════════
function FamilyTab({ onFlyToMember, onNavigate }) {
  const { language } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/family/members");
      if (res.success) {
        setMembers(res.data || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load family members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    const interval = setInterval(fetchMembers, 30000);
    return () => clearInterval(interval);
  }, [fetchMembers]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const handleMemberClick = (member) => {
    if (member.latitude && member.longitude && onFlyToMember) {
      onFlyToMember({ lat: member.latitude, lng: member.longitude });
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-28" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 !rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12 text-center">
        <span
          className="material-symbols-outlined text-4xl mb-3"
          style={{ color: T.textMuted }}
        >
          cloud_off
        </span>
        <p className="text-sm font-bold" style={{ color: T.textSecondary }}>
          {language === "vi" ? "Không thể tải dữ liệu" : "Failed to load"}
        </p>
        <p className="text-xs mt-1 max-w-[200px]" style={{ color: T.textMuted }}>
          {error}
        </p>
        <button
          onClick={() => { setLoading(true); fetchMembers(); }}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-110"
          style={{ backgroundColor: T.accent, color: "#000" }}
        >
          {language === "vi" ? "Thử lại" : "Retry"}
        </button>
      </div>
    );
  }

  // Empty state
  if (members.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12 text-center">
        <span
          className="material-symbols-outlined text-5xl mb-3"
          style={{ color: T.textMuted }}
        >
          group_add
        </span>
        <p className="text-sm font-bold" style={{ color: T.textSecondary }}>
          {language === "vi" ? "Chưa có thành viên" : "No family members"}
        </p>
        <p className="text-xs mt-1 max-w-[200px]" style={{ color: T.textMuted }}>
          {language === "vi"
            ? "Kết nối với gia đình để theo dõi an toàn"
            : "Connect with family to track safety"}
        </p>
        <button
          onClick={() => onNavigate?.("settings:family")}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all hover:brightness-110"
          style={{ backgroundColor: T.accent, color: "#000" }}
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          {language === "vi" ? "Thêm người thân" : "Add Member"}
        </button>
      </div>
    );
  }

  // Members list
  return (
    <div className="p-4 space-y-2">
      <span
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: T.textSecondary }}
      >
        {members.length} {language === "vi" ? "thành viên" : "members"}
      </span>

      {members.map((member) => {
        const safety = SAFETY_COLORS[member.safetyStatus] || SAFETY_COLORS.unknown;
        const hasLocation = member.latitude && member.longitude;

        return (
          <button
            key={member.id}
            onClick={() => handleMemberClick(member)}
            disabled={!hasLocation}
            style={{ backgroundColor: T.cardBg, borderColor: T.border }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-default text-left group"
          >
            {/* Avatar initials */}
            <div
              className="size-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 relative"
              style={{ backgroundColor: safety.bg }}
            >
              {getInitials(member.displayName)}
              {/* Status dot */}
              <span
                className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2"
                style={{
                  backgroundColor: safety.bg,
                  borderColor: T.cardBg,
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-bold truncate"
                style={{ color: T.textPrimary }}
              >
                {member.displayName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {member.relation && (
                  <span className="text-[10px]" style={{ color: T.textMuted }}>
                    {member.relation}
                  </span>
                )}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${safety.bg}20`,
                    color: safety.bg,
                  }}
                >
                  {safety.label}
                </span>
              </div>
            </div>

            {/* Arrow indicator when clickable */}
            {hasLocation && (
              <span
                className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-0.5"
                style={{ color: T.textMuted }}
              >
                chevron_right
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════
//  MAIN: RIGHT PANEL
// ══════════════════════════════════════
export default function RightPanel({
  onNavigate,
  onLocateMe,
  onToggleFamily,
  onFlyToMember,
  showFamily,
}) {
  const [activeTab, setActiveTab] = useState("actions");

  return (
    <aside
      className="w-full xl:w-72 xl:min-w-[288px] shrink-0 border-t xl:border-t-0 xl:border-l flex flex-col overflow-hidden"
      style={{
        backgroundColor: T.panelBg,
        borderColor: T.border,
      }}
    >
      {/* Tab Bar */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: `1px solid ${T.border}` }}
      >
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            label={tab.charAt(0).toUpperCase() + tab.slice(1)}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {activeTab === "actions" && (
          <ActionsTab
            onNavigate={onNavigate}
            onLocateMe={onLocateMe}
            onToggleFamily={onToggleFamily}
            showFamily={showFamily}
          />
        )}
        {activeTab === "alerts" && <AlertsTab />}
        {activeTab === "family" && (
          <FamilyTab
            onFlyToMember={onFlyToMember}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </aside>
  );
}
