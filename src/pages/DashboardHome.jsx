import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import StatusCard from "../components/dashboard/StatusCard";
import StatsOverview from "../components/dashboard/StatsOverview";
import DashboardQuickActions from "../components/dashboard/DashboardQuickActions";
import DashboardAlerts from "../components/dashboard/DashboardAlerts";

export default function DashboardHome({ onNavigate }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {t("dashboard.welcomeBack")}
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight mt-1 truncate">
              {user?.displayName || "Responder Alpha"}
            </h1>
          </div>
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {t("dashboard.lastUpdated")}
              </p>
            </div>
            <img
              alt="Profile"
              className="size-12 rounded-full border-2 border-primary/20 object-cover shadow-md"
              src={
                user?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "User")}&background=11a0b6&color=fff`
              }
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Status Card */}
        <StatusCard status="danger" />

        {/* Stats Overview */}
        <StatsOverview />

        {/* Two-column layout for Quick Actions + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DashboardQuickActions onNavigate={onNavigate} />
          <DashboardAlerts />
        </div>
      </div>
    </div>
  );
}
