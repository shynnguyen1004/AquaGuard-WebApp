import AlertCard from "./AlertCard";

const alerts = [
  {
    icon: "tsunami",
    iconColor: "danger",
    title: "Heavy Rainfall Expected",
    description: "Level 3 alert in Da Nang. Expected in next 2 hours.",
    status: "Urgent",
    statusColor: "danger",
  },
  {
    icon: "waves",
    iconColor: "warning",
    title: "River Water Level Rising",
    description: "Han River levels rising at 15cm/hour.",
    status: "Monitoring",
    statusColor: "warning",
  },
  {
    icon: "thunderstorm",
    iconColor: "primary",
    title: "Power Outage Risk",
    description: "Central district grid may be suspended for safety.",
    status: "Advisory",
    statusColor: "primary",
  },
];

export default function ActiveAlerts() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Active Alerts</h2>
        <span className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold px-2 py-1 rounded">
          LIVE
        </span>
      </div>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <AlertCard key={alert.title} {...alert} />
        ))}
      </div>
    </div>
  );
}
