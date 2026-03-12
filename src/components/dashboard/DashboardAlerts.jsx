const alerts = [
  {
    icon: "cloud",
    title: "Heavy Rainfall Expected",
    location: "Bui Vien Walking Street",
    time: "15 min ago",
    borderColor: "border-l-danger",
    iconBg: "bg-danger/10",
    iconColor: "text-danger",
  },
  {
    icon: "waves",
    title: "River Water Level Rising",
    location: "Phu Nhuan",
    time: "1 hour ago",
    borderColor: "border-l-warning",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    icon: "thunderstorm",
    title: "Storm Warning Issued",
    location: "District 1, HCMC",
    time: "2 hours ago",
    borderColor: "border-l-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
];

export default function DashboardAlerts() {
  const activeCount = alerts.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Active Alerts</h3>
        <span className="bg-warning/15 text-warning text-xs font-bold px-3 py-1 rounded-full">
          {activeCount} Active
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className={`flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 border-l-4 ${alert.borderColor} hover:shadow-md transition-all duration-200 cursor-pointer group`}
          >
            <div
              className={`size-11 rounded-xl ${alert.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
            >
              <span
                className={`material-symbols-outlined filled-icon ${alert.iconColor}`}
              >
                {alert.icon}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{alert.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {alert.location}
              </p>
            </div>

            <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap font-medium">
              {alert.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
