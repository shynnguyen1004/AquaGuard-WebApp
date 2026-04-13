import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import ActiveSOSBanner from "../components/dashboard/ActiveSOSBanner";
import FamilySafetyBoard from "../components/dashboard/FamilySafetyBoard";
import DashboardQuickActions from "../components/dashboard/DashboardQuickActions";
import PendingFamilyInvites from "../components/dashboard/PendingFamilyInvites";
import SOSRequestHistory from "../components/dashboard/SOSRequestHistory";
import { api } from "../services/api";

const SAFETY_OPTIONS = [
  { value: "safe", icon: "check_circle", label: null, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", activeBg: "bg-emerald-500", activeText: "text-white" },
  { value: "danger", icon: "error", label: null, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", activeBg: "bg-red-500", activeText: "text-white" },
  { value: "injured", icon: "healing", label: null, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20", activeBg: "bg-orange-500", activeText: "text-white" },
];

export default function DashboardHome({ onNavigate }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [safetyStatus, setSafetyStatus] = useState(user?.safetyStatus || "unknown");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleSafetyStatusChange = useCallback(async (newStatus) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await api.put("/family/status", { safety_status: newStatus });
      setSafetyStatus(newStatus);
    } catch {
      // Silently fail
    } finally {
      setUpdatingStatus(false);
    }
  }, [updatingStatus]);

  const currentSafetyOption = SAFETY_OPTIONS.find((o) => o.value === safetyStatus);
  const safetyLabel =
    safetyStatus === "safe" ? (language === "vi" ? "An toàn" : "Safe")
      : safetyStatus === "danger" ? (language === "vi" ? "Nguy hiểm" : "Danger")
        : safetyStatus === "injured" ? (language === "vi" ? "Bị thương" : "Injured")
          : (language === "vi" ? "Chưa cập nhật" : "Not set");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ════════════════════════════════════════════════
            ZONE A: Personal Header + Safety Status
        ════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {t("dashboard.welcomeBack")}
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight mt-0.5 truncate">
              {user?.displayName || "User"}
            </h1>
          </div>

          {/* Safety Status Chip — broadcast your status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline font-medium">
              {language === "vi" ? "Trạng thái:" : "Status:"}
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
              {SAFETY_OPTIONS.map((opt) => {
                const isActive = opt.value === safetyStatus;
                const optLabel = opt.value === "safe" ? (language === "vi" ? "An toàn" : "Safe")
                  : opt.value === "danger" ? (language === "vi" ? "Nguy hiểm" : "Danger")
                    : (language === "vi" ? "Bị thương" : "Injured");
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSafetyStatusChange(opt.value)}
                    disabled={updatingStatus}
                    title={optLabel}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${isActive
                      ? `${opt.activeBg} ${opt.activeText} shadow-sm`
                      : `${opt.color} hover:${opt.bg} opacity-60 hover:opacity-100`
                      } disabled:opacity-40`}
                  >
                    <span className="material-symbols-outlined filled-icon text-sm">{opt.icon}</span>
                    <span className="hidden sm:inline">{optLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            ZONE B: Active SOS Banner (conditional)
        ════════════════════════════════════════════════ */}
        <ActiveSOSBanner onNavigate={onNavigate} />

        {/* ════════════════════════════════════════════════
            ZONE C + D: Two columns — Family + Quick Actions
        ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Zone C: Family Safety Board (takes 3/5 width on desktop) */}
          <div className="lg:col-span-3">
            <FamilySafetyBoard onNavigate={onNavigate} />
            <PendingFamilyInvites />
          </div>

          {/* Zone D: Quick Actions (takes 2/5 width on desktop) */}
          <div className="lg:col-span-2">
            <DashboardQuickActions onNavigate={onNavigate} />
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            ZONE E: SOS Request History
        ════════════════════════════════════════════════ */}
        <SOSRequestHistory onNavigate={onNavigate} />
      </div>
    </div>
  );
}
