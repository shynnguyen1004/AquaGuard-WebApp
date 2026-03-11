import QuickActions from "../actions/QuickActions";
import ActiveAlerts from "../alerts/ActiveAlerts";
import EmergencySupport from "../actions/EmergencySupport";

export default function RightPanel() {
  return (
    <aside className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col">
      <QuickActions />

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <ActiveAlerts />
        <EmergencySupport />
      </div>
    </aside>
  );
}
