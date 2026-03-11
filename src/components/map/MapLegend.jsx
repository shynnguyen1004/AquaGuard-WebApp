const severityLevels = [
  { colorClass: "bg-critical", label: "Critical (Purple)" },
  { colorClass: "bg-danger", label: "Severe (Red)" },
  { colorClass: "bg-warning", label: "Moderate (Orange)" },
  { colorClass: "bg-safe", label: "Safe (Green)" },
];

export default function MapLegend() {
  return (
    <div className="absolute top-8 left-8 bg-white/90 dark:bg-background-dark/90 backdrop-blur p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-48">
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-60">
        Flood Severity
      </h3>
      <div className="space-y-2">
        {severityLevels.map((level) => (
          <div key={level.label} className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${level.colorClass}`} />
            <span className="text-xs font-medium">{level.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
