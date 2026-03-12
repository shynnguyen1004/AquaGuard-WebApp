const stats = [
  {
    icon: "water_drop",
    label: "Water Level",
    value: "+2.5m",
    change: "+0.3m/hr",
    changeType: "danger",
    bg: "bg-red-50 dark:bg-red-500/10",
    iconBg: "bg-danger/15",
    iconColor: "text-danger",
  },
  {
    icon: "local_fire_department",
    label: "Rescue Teams",
    value: "8",
    change: "3 deployed",
    changeType: "warning",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    iconBg: "bg-warning/15",
    iconColor: "text-warning",
  },
  {
    icon: "night_shelter",
    label: "Shelters Open",
    value: "12",
    change: "340 capacity",
    changeType: "safe",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconBg: "bg-safe/15",
    iconColor: "text-safe",
  },
  {
    icon: "groups",
    label: "Evacuated",
    value: "1,247",
    change: "+89 today",
    changeType: "primary",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
];

const changeColors = {
  danger: "text-danger",
  warning: "text-warning",
  safe: "text-safe",
  primary: "text-primary",
};

export default function StatsOverview() {
  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Overview</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-2xl p-5 border border-slate-100 dark:border-slate-700/30 hover:shadow-md transition-all duration-200 group`}
          >
            <div
              className={`size-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
            >
              <span
                className={`material-symbols-outlined filled-icon ${stat.iconColor}`}
              >
                {stat.icon}
              </span>
            </div>
            <p className="text-2xl font-black tracking-tight">{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {stat.label}
            </p>
            <p
              className={`text-[11px] font-bold mt-2 ${changeColors[stat.changeType]}`}
            >
              {stat.change}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
