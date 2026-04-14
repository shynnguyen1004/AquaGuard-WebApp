import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

const STATUS_CONFIG = {
  pending: {
    icon: "schedule",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
    pulse: "bg-amber-500",
  },
  assigned: {
    icon: "person_search",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
    pulse: "bg-blue-500",
  },
  in_progress: {
    icon: "local_shipping",
    color: "text-primary",
    bg: "bg-primary/5 dark:bg-primary/10",
    border: "border-primary/20",
    pulse: "bg-primary",
  },
};

export default function ActiveSOSBanner({ onNavigate }) {
  const { t, language } = useLanguage();
  const [activeRequest, setActiveRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMyRequests = useCallback(async () => {
    try {
      const res = await api.get("/sos/my");
      if (res.success && res.data) {
        // Find the most recent non-resolved/non-cancelled request
        const active = res.data.find(
          (r) => r.status === "pending" || r.status === "assigned" || r.status === "in_progress"
        );
        setActiveRequest(active || null);
      }
    } catch {
      // Silently fail — this is a non-critical widget
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
    const interval = setInterval(fetchMyRequests, 15000);
    return () => clearInterval(interval);
  }, [fetchMyRequests]);

  // Listen for SOS changes from the CitizenSOSPage
  useEffect(() => {
    const handler = () => fetchMyRequests();
    window.addEventListener("sos_changed", handler);
    return () => window.removeEventListener("sos_changed", handler);
  }, [fetchMyRequests]);

  if (loading || !activeRequest) return null;

  const config = STATUS_CONFIG[activeRequest.status] || STATUS_CONFIG.pending;

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t("sosPage.justNow");
    if (mins < 60) return `${mins} ${t("sosPage.minAgo")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t("sosPage.hAgo")}`;
    return d.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
  };

  const statusLabel =
    activeRequest.status === "pending"
      ? t("sosPage.pending")
      : activeRequest.status === "assigned"
        ? t("sosPage.assigned")
        : t("sosPage.inProgress");

  return (
    <button
      onClick={() => onNavigate?.("sos")}
      className={`w-full ${config.bg} ${config.border} border-2 rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:shadow-lg transition-all duration-300 group text-left`}
    >
      {/* Pulse indicator */}
      <div className="relative flex-shrink-0">
        <div className={`size-12 rounded-xl ${config.bg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined filled-icon text-2xl ${config.color}`}>
            {config.icon}
          </span>
        </div>
        <span className={`absolute -top-1 -right-1 size-3.5 ${config.pulse} rounded-full animate-pulse border-2 border-white dark:border-slate-800`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-danger text-sm filled-icon">sos</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {language === "vi" ? "Yêu cầu SOS đang hoạt động" : "Active SOS Request"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
            {statusLabel}
          </span>
          {activeRequest.assigned_name && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">person</span>
              {activeRequest.assigned_name}
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500">
            • {formatTime(activeRequest.created_at)}
          </span>
        </div>
        <p className="text-sm font-semibold mt-1.5 truncate">
          <span className="material-symbols-outlined text-danger text-xs align-middle mr-1">location_on</span>
          {activeRequest.location || (language === "vi" ? "Vị trí không xác định" : "Unknown location")}
        </p>
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0">
        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all">
          chevron_right
        </span>
      </div>
    </button>
  );
}
