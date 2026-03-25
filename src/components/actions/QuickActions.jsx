import { useLanguage } from "../../contexts/LanguageContext";

export default function QuickActions({ hideTitle = false, onNavigate }) {
  const { t } = useLanguage();

  const actions = [
    {
      icon: "sos",
      label: t("rightPanel.sos"),
      subtitle: t("rightPanel.sosSubtitle"),
      bg: "bg-danger",
      shadow: "shadow-danger/20",
    },
    {
      icon: "home_pin",
      label: t("rightPanel.findShelter"),
      subtitle: t("rightPanel.findShelterSubtitle"),
      bg: "bg-primary",
      shadow: "shadow-primary/20",
    },
    {
      icon: "family_restroom",
      label: t("rightPanel.familyCheck"),
      subtitle: t("rightPanel.familyCheckSubtitle"),
      bg: "bg-warning",
      shadow: "shadow-warning/20",
      action: "settings:family",
    },
  ];

  const handleClick = (action) => {
    if (action.action && onNavigate) {
      onNavigate(action.action);
    }
  };

  return (
    <div className={hideTitle ? "px-6 pb-4" : "p-6"}>
      {!hideTitle && <h2 className="text-lg font-bold mb-4">{t("rightPanel.quickActions")}</h2>}
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <button
            key={action.icon}
            onClick={() => handleClick(action)}
            className={`flex items-center gap-3 w-full ${action.bg} text-white p-4 rounded-xl hover:opacity-90 transition-all shadow-lg ${action.shadow} group`}
          >
            <span className="material-symbols-outlined filled-icon p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
              {action.icon}
            </span>
            <div className="text-left">
              <p className="font-bold leading-none">{action.label}</p>
              <p className="text-[10px] opacity-80 mt-1">{action.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
