const statusConfig = {
  pending: {
    label: "Pending",
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    dot: "bg-warning animate-pulse",
    icon: "schedule",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    dot: "bg-primary",
    icon: "local_shipping",
  },
  resolved: {
    label: "Resolved",
    bg: "bg-safe/10",
    text: "text-safe",
    border: "border-safe/30",
    dot: "bg-safe",
    icon: "check_circle",
  },
};

const urgencyConfig = {
  critical: { label: "Critical", bg: "bg-danger", text: "text-white" },
  high: { label: "High", bg: "bg-danger/15", text: "text-danger" },
  medium: { label: "Medium", bg: "bg-warning/15", text: "text-warning" },
  low: { label: "Low", bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-500" },
};

export default function RescueRequestCard({ request }) {
  const status = statusConfig[request.status] || statusConfig.pending;
  const urgency = urgencyConfig[request.urgency] || urgencyConfig.medium;

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-lg transition-all duration-300 group flex flex-col h-full">
      {/* Top row: user info + status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            alt={request.userName}
            className="size-10 rounded-full border-2 border-slate-200 dark:border-slate-600 object-cover"
            src={
              request.userAvatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(request.userName)}&background=11a0b6&color=fff&size=40`
            }
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="text-sm font-bold">{request.userName}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {request.timeAgo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${urgency.bg} ${urgency.text}`}
          >
            {urgency.label}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${status.bg} ${status.text} ${status.border}`}
          >
            <span className={`size-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-2 leading-relaxed">
        {request.description}
      </p>

      {/* Location */}
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3">
        <span className="material-symbols-outlined text-base">location_on</span>
        <span className="text-xs font-medium">{request.location}</span>
      </div>

      {/* Images preview — fixed height so cards align */}
      <div className="h-20 mb-3">
        {request.images && request.images.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto h-full">
            {request.images.map((img, i) => (
              <img
                key={i}
                alt={`Scene ${i + 1}`}
                className="h-full w-28 rounded-lg object-cover border border-slate-200 dark:border-slate-600 flex-shrink-0"
                src={img}
              />
            ))}
          </div>
        ) : (
          <div className="h-full w-full rounded-lg border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <span className="text-xs text-slate-400 dark:text-slate-600">No images attached</span>
          </div>
        )}
      </div>

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Footer: assigned rescue team — always visible */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50 mt-auto">
        <span className="material-symbols-outlined text-primary text-base filled-icon">
          local_fire_department
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Assigned to:{" "}
          <span className="text-slate-700 dark:text-slate-300 font-bold">
            {request.assignedTeam || "Unassigned"}
          </span>
        </span>
      </div>
    </div>
  );
}
