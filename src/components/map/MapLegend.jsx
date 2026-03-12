const severityLevels = [
  { color: "#a855f7", label: "Critical" },
  { color: "#ef4444", label: "Severe" },
  { color: "#f59e0b", label: "Moderate" },
  { color: "#10b981", label: "Safe" },
];

function PinIcon({ color }) {
  return (
    <svg width="10" height="14" viewBox="0 0 32 42" className="flex-shrink-0">
      <path
        d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z"
        fill={color}
      />
      <circle cx="16" cy="15" r="6" fill="white" opacity="0.9" />
    </svg>
  );
}

export default function MapLegend() {
  return (
    <div className="absolute bottom-6 left-3 bg-slate-900/75 backdrop-blur-md px-3.5 py-3 rounded-xl border border-white/10 shadow-xl z-[500]">
      <h3 className="text-[9px] font-bold uppercase tracking-widest mb-2 text-white/50">
        Flood Severity
      </h3>
      <div className="space-y-1.5">
        {severityLevels.map((level) => (
          <div key={level.label} className="flex items-center gap-2">
            <PinIcon color={level.color} />
            <span className="text-[11px] font-medium text-white/90">{level.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
