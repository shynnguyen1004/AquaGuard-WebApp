const severityLevels = [
  { color: "#a855f7", label: "Critical" },
  { color: "#ef4444", label: "Severe" },
  { color: "#f59e0b", label: "Moderate" },
  { color: "#10b981", label: "Safe" },
];

function Dot({ color }) {
  return (
    <span
      className="inline-block size-2 lg:size-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-2 lg:left-3 bg-white/70 backdrop-blur-sm px-2.5 py-1.5 lg:px-3 lg:py-2.5 rounded-lg lg:rounded-xl border border-black/5 shadow-md z-[500]">
      <h3 className="text-[7px] lg:text-[8px] font-bold uppercase tracking-widest mb-1 lg:mb-1.5 text-slate-400">
        Flood Severity
      </h3>
      <div className="flex lg:flex-col gap-2 lg:gap-1">
        {severityLevels.map((level) => (
          <div key={level.label} className="flex items-center gap-1 lg:gap-1.5">
            <Dot color={level.color} />
            <span className="text-[9px] lg:text-[10px] font-medium text-slate-600">{level.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

