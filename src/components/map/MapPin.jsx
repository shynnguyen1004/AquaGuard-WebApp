const colorMap = {
  danger: {
    border: "border-danger",
    text: "text-danger",
    bg: "bg-danger",
  },
  critical: {
    border: "border-critical",
    text: "text-critical",
    bg: "bg-critical",
  },
  warning: {
    border: "border-warning",
    text: "text-warning",
    bg: "bg-warning",
  },
  safe: {
    border: "border-safe",
    text: "text-safe",
    bg: "bg-safe",
  },
};

export default function MapPin({ top, left, bottom, color, severity, waterLevel, rescueCount }) {
  const hasTooltip = severity && waterLevel;
  const colors = colorMap[color] || colorMap.safe;

  return (
    <div
      className={`absolute ${hasTooltip ? "group cursor-pointer" : ""}`}
      style={{ top, left, bottom }}
    >
      <div
        className={`bg-white dark:bg-background-dark p-1 rounded-full shadow-lg border-2 ${colors.border} ${
          hasTooltip ? "animate-pulse" : ""
        }`}
      >
        <span className={`material-symbols-outlined ${colors.text} filled-icon`}>
          location_on
        </span>
      </div>

      {hasTooltip && (
        <div className="hidden group-hover:block absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl text-xs z-20">
          <p className={`font-bold ${colors.text}`}>{severity}</p>
          <p className="text-slate-500 mt-1">Water level: {waterLevel}</p>
          <p className="text-slate-500">{rescueCount} Active Rescue Requests</p>
        </div>
      )}
    </div>
  );
}
