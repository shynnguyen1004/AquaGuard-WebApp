import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

export default function QuickActions({ hideTitle = false, onNavigate }) {
  const { t } = useLanguage();
  const { role } = useAuth();
  const isCitizen = role === "citizen";

  const allActions = [
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
      citizenOnly: true,
    },
  ];
  const actions = allActions.filter((a) => !a.citizenOnly || isCitizen);

  const handleClick = (action) => {
    if (action.action && onNavigate) {
      onNavigate(action.action);
    }
  };

  return (
    <div className={hideTitle ? "px-4 lg:px-6 pb-4" : "p-4 lg:p-6"}>
      {!hideTitle && <h2 className="text-lg font-bold mb-4 truncate">{t("rightPanel.quickActions")}</h2>}
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <button
            key={action.icon}
            onClick={() => handleClick(action)}
            className={`flex items-center gap-3 w-full min-w-0 ${action.bg} text-white p-3 lg:p-4 rounded-xl hover:opacity-90 transition-all shadow-lg ${action.shadow} group`}
          >
            <span className="material-symbols-outlined filled-icon p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform shrink-0">
              {action.icon}
            </span>
            <div className="text-left min-w-0">
              <p className="font-bold leading-none truncate text-sm">{action.label}</p>
              <p className="text-[10px] opacity-80 mt-1 truncate">{action.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
