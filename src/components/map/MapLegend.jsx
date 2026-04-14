import { useLanguage } from "../../contexts/LanguageContext";

const severityLevels = [
  { color: "#a855f7", labelKey: "floodMap.severityCritical" },
  { color: "#ef4444", labelKey: "floodMap.severitySevere" },
  { color: "#f59e0b", labelKey: "floodMap.severityModerate" },
  { color: "#10b981", labelKey: "floodMap.severitySafe" },
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
  const { t } = useLanguage();

  return (
    <div className="absolute bottom-4 left-2 lg:left-3 bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm px-2.5 py-1.5 lg:px-3 lg:py-2.5 rounded-lg lg:rounded-xl border border-black/5 dark:border-white/10 shadow-md z-[500]">
      <h3 className="text-[7px] lg:text-[8px] font-bold uppercase tracking-widest mb-1 lg:mb-1.5 text-slate-500 dark:text-slate-400">
        {t("floodMap.legendTitle")}
      </h3>
      <div className="flex lg:flex-col gap-2 lg:gap-1">
        {severityLevels.map((level) => (
          <div key={level.labelKey} className="flex items-center gap-1 lg:gap-1.5">
            <Dot color={level.color} />
            <span className="text-[9px] lg:text-[10px] font-medium text-slate-700 dark:text-slate-400">{t(level.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
