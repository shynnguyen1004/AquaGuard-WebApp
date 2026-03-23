import { useLanguage } from "../../contexts/LanguageContext";

export default function DashboardQuickActions() {
  const { t } = useLanguage();

  const actions = [
    {
      icon: "home_pin",
      label: t("quickActions.shelter"),
      description: t("quickActions.shelterDesc"),
      bg: "bg-slate-100 dark:bg-slate-800",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      hoverBg: "hover:bg-primary/5 dark:hover:bg-primary/10",
      ring: "hover:ring-primary/30",
    },
    {
      icon: "sos",
      label: t("quickActions.sos"),
      description: t("quickActions.sosDesc"),
      bg: "bg-danger",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
      hoverBg: "hover:bg-red-600",
      ring: "hover:ring-danger/30",
      featured: true,
    },
    {
      icon: "family_restroom",
      label: t("quickActions.family"),
      description: t("quickActions.familyDesc"),
      bg: "bg-slate-100 dark:bg-slate-800",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      hoverBg: "hover:bg-primary/5 dark:hover:bg-primary/10",
      ring: "hover:ring-primary/30",
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">{t("quickActions.title")}</h3>
      <div className="grid grid-cols-3 gap-4">
        {actions.map((action) => (
          <button
            key={action.icon}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-200 ${action.bg} ${action.hoverBg} hover:ring-2 ${action.ring} hover:shadow-lg group`}
          >
            <div
              className={`size-14 rounded-full ${action.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}
            >
              <span
                className={`material-symbols-outlined filled-icon text-2xl ${action.iconColor}`}
              >
                {action.icon}
              </span>
            </div>
            <span
              className={`text-sm font-bold ${action.featured ? action.textColor : ""}`}
            >
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
