import { useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

function safeClick(selector) {
  if (!selector || typeof selector !== "string") return;
  const el = document.querySelector(selector);
  if (el && typeof el.click === "function") {
    try { el.click(); } catch { /* ignore */ }
  }
}

export default function TourTooltip({
  index,
  size,
  isLastStep,
  step,
  backProps,
  primaryProps,
  skipProps,
  closeProps,
  tooltipProps,
}) {
  const { t } = useLanguage();
  const kind = step?.data?.kind || "step";
  const icon = step?.data?.icon || "info";
  const isCenter = kind === "welcome" || kind === "finish";

  const width = isCenter ? "w-[440px] max-w-[92vw]" : "w-[380px] max-w-[90vw]";

  const data = step?.data || {};

  // Auto-click target when entering step (for opening panels/modals)
  useEffect(() => {
    if (data.autoOpen && typeof step?.target === "string") {
      const t = setTimeout(() => safeClick(step.target), 120);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.target]);

  const handlePrimary = (e) => {
    if (kind === "step" && !data.autoOpen && !data.skipAutoClick && typeof step?.target === "string") {
      safeClick(step.target);
    }
    if (data.closeOnNext) {
      safeClick(data.closeOnNext);
    }
    primaryProps.onClick?.(e);
  };

  return (
    <div
      {...tooltipProps}
      className={`relative ${width} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 dark:border-slate-700 overflow-hidden`}
    >
      {/* Close button (top-right) */}
      <button
        {...closeProps}
        aria-label={t("tour.close")}
        className="absolute top-3 right-3 z-10 size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>

      {/* Header */}
      {isCenter ? (
        <div className="bg-gradient-to-br from-primary to-primary/70 px-6 pt-7 pb-6 text-white text-center">
          <div className="mx-auto size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-lg">
            <span className="material-symbols-outlined text-3xl filled-icon">{icon}</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">{step?.title}</h2>
        </div>
      ) : (
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 pr-12">
          <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary text-xl filled-icon">{icon}</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">
              {t("tour.step")} {index + 1} / {size}
            </p>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              {step?.title}
            </h3>
          </div>
        </div>
      )}

      {/* Body */}
      <div className={`px-6 ${isCenter ? "py-5 text-center" : "pb-4 pt-1"}`}>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {step?.content}
        </p>
      </div>

      {/* Progress dots */}
      <div className="px-6 pb-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: size }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index
                ? "w-6 bg-primary"
                : i < index
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
        {/* Skip / Step count */}
        {!isLastStep ? (
          <button
            {...skipProps}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1.5 transition-colors"
          >
            {t("tour.skip")}
          </button>
        ) : (
          <span className="text-xs font-medium text-slate-400">
            {index + 1} / {size}
          </span>
        )}

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              {t("tour.back")}
            </button>
          )}
          <button
            {...primaryProps}
            onClick={handlePrimary}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/30 transition-all"
          >
            {isLastStep ? t("tour.finish") : t("tour.next")}
            {!isLastStep && (
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            )}
            {isLastStep && (
              <span className="material-symbols-outlined text-sm">check</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
