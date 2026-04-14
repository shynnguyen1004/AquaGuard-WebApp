import { useLanguage } from "../../contexts/LanguageContext";

export default function DashboardQuickActions({ onNavigate }) {
  const { t, language } = useLanguage();

  const actions = [
    {
      icon: "sos",
      label: t("quickActions.sos"),
      description: language === "vi" ? "Gửi yêu cầu cứu hộ" : "Send rescue request",
      bg: "bg-danger",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
      hoverBg: "hover:bg-red-600",
      ring: "hover:ring-danger/30",
      featured: true,
      action: "sos",
    },
    {
      icon: "family_restroom",
      label: t("quickActions.family"),
      description: language === "vi" ? "Kiểm tra gia đình" : "Check on family",
      bg: "bg-slate-100 dark:bg-slate-800",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      hoverBg: "hover:bg-primary/5 dark:hover:bg-primary/10",
      ring: "hover:ring-primary/30",
      action: "settings:family",
    },
    {
      icon: "map",
      label: language === "vi" ? "Bản đồ" : "Flood Map",
      description: language === "vi" ? "Xem tình hình lũ" : "View flood status",
      bg: "bg-slate-100 dark:bg-slate-800",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      hoverBg: "hover:bg-primary/5 dark:hover:bg-primary/10",
      ring: "hover:ring-primary/30",
      action: "map",
    },
  ];

  const handleClick = (action) => {
    if (action.action && onNavigate) {
      onNavigate(action.action);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-xl">bolt</span>
        {t("quickActions.title")}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.icon}
            onClick={() => handleClick(action)}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200 ${action.bg} ${action.hoverBg} hover:ring-2 ${action.ring} hover:shadow-lg group`}
          >
            <div
              className={`size-12 rounded-full ${action.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}
            >
              <span
                className={`material-symbols-outlined filled-icon text-xl ${action.iconColor}`}
              >
                {action.icon}
              </span>
            </div>
            <div className="text-center">
              <span
                className={`text-sm font-bold block ${action.featured ? action.textColor : ""}`}
              >
                {action.label}
              </span>
              <span
                className={`text-[10px] mt-0.5 block ${action.featured ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}
              >
                {action.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
