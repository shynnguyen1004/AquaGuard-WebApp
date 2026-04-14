import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function Header() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <header
      className="shrink-0 h-16 lg:h-20 hidden lg:flex items-center justify-between z-10 overflow-hidden px-6 lg:px-8 bg-white dark:bg-[#171b26] border-b border-slate-200 dark:border-[#252a38]"
    >
      <div className="flex items-center gap-2 md:gap-4 lg:gap-6 min-w-0 flex-1">
        <div className="min-w-0">
          <h2 className="text-sm md:text-base lg:text-lg font-bold truncate text-slate-900 dark:text-[#e8eaf0]">
            {t("header.welcomeBack")} {user?.displayName?.split(" ")[0] || "User"}
          </h2>
          <div className="hidden md:flex items-center gap-1.5 text-slate-500 dark:text-[#8891a8]">
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>
            <span className="text-xs font-medium truncate">
              {t("header.location")}
            </span>
          </div>
        </div>

        <div className="hidden lg:block h-10 w-px shrink-0 bg-slate-200 dark:bg-[#252a38]" />

        {/* Risk Level Badge */}
        <div
          className="rounded-lg px-2 md:px-3 lg:px-4 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-3 shrink-0 bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-500/25"
        >
          <span className="material-symbols-outlined filled-icon text-base md:text-xl text-red-500">
            error
          </span>
          <div>
            <p className="text-[9px] md:text-[10px] font-bold uppercase leading-none whitespace-nowrap text-red-500">
              {t("header.riskLabel")}
            </p>
            <p className="text-xs md:text-sm font-black tracking-tight whitespace-nowrap text-red-500">
              {t("header.riskValue")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
        {/* Search */}
        <div className="relative group hidden md:block">
          <input
            className="w-40 lg:w-64 pl-10 pr-4 py-2 rounded-xl border-none focus:ring-2 focus:ring-primary/30 text-sm transition-all bg-slate-100 dark:bg-[#1e2333] text-slate-900 dark:text-[#e8eaf0] placeholder-slate-400 dark:placeholder-[#4a5068] outline-none"
            placeholder={t("header.searchPlaceholder")}
            type="text"
          />
          <span className="material-symbols-outlined absolute left-3 top-2 text-xl text-slate-400 dark:text-[#4a5068]">
            search
          </span>
        </div>

        {/* Notifications */}
        <button
          className="size-9 md:size-10 rounded-xl flex items-center justify-center relative shrink-0 transition-colors hover:brightness-125 bg-slate-100 dark:bg-[#1e2333] border border-slate-200 dark:border-[#252a38] text-slate-500 dark:text-[#8891a8]"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span
            className="absolute top-1.5 right-1.5 md:top-2 md:right-2 size-2 rounded-full bg-red-500 border-2 border-white dark:border-[#171b26]"
          />
        </button>
      </div>
    </header>
  );
}
