import { useLanguage } from "../../contexts/LanguageContext";

export default function EmergencySupport() {
  const { t } = useLanguage();

  return (
    <div className="mt-8 p-4 bg-primary/10 rounded-2xl border border-primary/20 relative overflow-hidden">
      <div className="relative z-10">
        <h4 className="text-sm font-bold text-primary">{t("emergency.title")}</h4>
        <p className="text-[11px] text-primary/80 mt-1 leading-relaxed">
          {t("emergency.description")}
        </p>
        <button className="mt-3 w-full bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors">
          {t("emergency.requestBtn")}
        </button>
      </div>
      <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl text-primary/5 filled-icon">
        support_agent
      </span>
    </div>
  );
}
