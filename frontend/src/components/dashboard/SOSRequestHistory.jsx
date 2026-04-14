import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

const STATUS_ICON = {
  resolved: { icon: "check_circle", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  cancelled: { icon: "cancel", color: "text-slate-400", bg: "bg-slate-100 dark:bg-slate-700/30" },
};

const URGENCY_COLORS = {
  low: "text-slate-500 bg-slate-100 dark:bg-slate-700/30",
  medium: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
  high: "text-red-500 bg-red-50 dark:bg-red-500/10",
  critical: "text-white bg-red-500",
};

export default function SOSRequestHistory({ onNavigate }) {
  const { t, language } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get("/sos/my");
      if (res.success && res.data) {
        const history = res.data.filter(
          (r) => r.status === "resolved" || r.status === "cancelled"
        );
        setRequests(history);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Listen for SOS changes
  useEffect(() => {
    const handler = () => fetchRequests();
    window.addEventListener("sos_changed", handler);
    return () => window.removeEventListener("sos_changed", handler);
  }, [fetchRequests]);

  const formatDate = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return d.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400 text-xl">history</span>
          {language === "vi" ? "Lịch sử yêu cầu" : "Request History"}
        </h3>
        {requests.length > 0 && (
          <button
            onClick={() => onNavigate?.("sos")}
            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            {language === "vi" ? "Xem tất cả" : "View all"} →
          </button>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-600 mb-3 block">
            inbox
          </span>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">
            {language === "vi" ? "Chưa có yêu cầu nào" : "No requests yet"}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600 max-w-[260px] mx-auto">
            {language === "vi"
              ? "Nếu bạn gặp nguy hiểm, hãy bấm nút SOS phía trên"
              : "If you're in danger, use the SOS button above"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.slice(0, 5).map((req) => {
            const sConfig = STATUS_ICON[req.status] || STATUS_ICON.resolved;
            const urgencyClass = URGENCY_COLORS[req.urgency] || URGENCY_COLORS.medium;
            const urgencyLabel = t(`sosPage.${req.urgency}`) || req.urgency;

            return (
              <div
                key={req.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => onNavigate?.("sos")}
              >
                {/* Status icon */}
                <div className={`size-9 rounded-lg ${sConfig.bg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`material-symbols-outlined filled-icon ${sConfig.color}`}>
                    {sConfig.icon}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {req.location || (language === "vi" ? "Vị trí không xác định" : "Unknown location")}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${urgencyClass}`}>
                      {urgencyLabel}
                    </span>
                    {req.assigned_name && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        → {req.assigned_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
                  {formatDate(req.resolved_at || req.updated_at || req.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
