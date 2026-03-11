const colorMap = {
  danger: {
    iconBg: "bg-danger/10 text-danger",
    dot: "bg-danger",
    statusText: "text-danger",
  },
  warning: {
    iconBg: "bg-warning/10 text-warning",
    dot: "bg-warning",
    statusText: "text-warning",
  },
  primary: {
    iconBg: "bg-primary/10 text-primary",
    dot: "bg-primary",
    statusText: "text-primary",
  },
};

export default function AlertCard({ icon, iconColor, title, description, status, statusColor }) {
  const colors = colorMap[iconColor] || colorMap.primary;

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex gap-4">
      <div
        className={`size-10 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}
      >
        <span className="material-symbols-outlined filled-icon">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
          {description}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`size-1.5 rounded-full ${colors.dot} ${
              status === "Urgent" ? "animate-pulse" : ""
            }`}
          />
          <span
            className={`text-[10px] font-bold ${colors.statusText} uppercase`}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
