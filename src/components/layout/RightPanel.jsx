import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import QuickActions from "../actions/QuickActions";
import ActiveAlerts from "../alerts/ActiveAlerts";
import EmergencySupport from "../actions/EmergencySupport";

export default function RightPanel() {
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);
  const { t } = useLanguage();

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col overflow-y-auto">
      {/* Collapsible Quick Actions */}
      <div>
        <button
          onClick={() => setQuickActionsOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <h2 className="text-lg font-bold">{t("rightPanel.quickActions")}</h2>
          <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${quickActionsOpen ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${quickActionsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <QuickActions hideTitle />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <ActiveAlerts />
        <EmergencySupport />
      </div>
    </aside>
  );
}
