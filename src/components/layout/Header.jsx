import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function Header() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-8 flex items-center justify-between z-10">
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-lg font-bold">
            {t("header.welcomeBack")} {user?.displayName?.split(" ")[0] || "User"}
          </h2>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>
            <span className="text-xs font-medium">
              {t("header.location")}
            </span>
          </div>
        </div>

        <div className="h-10 w-px bg-slate-200 dark:border-slate-800" />

        {/* Risk Level Badge */}
        <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-danger filled-icon">
            error
          </span>
          <div>
            <p className="text-[10px] font-bold text-danger uppercase leading-none">
              {t("header.riskLabel")}
            </p>
            <p className="text-sm font-black text-danger tracking-tight">
              {t("header.riskValue")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative group">
          <input
            className="w-64 pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary text-sm transition-all"
            placeholder={t("header.searchPlaceholder")}
            type="text"
          />
          <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-xl">
            search
          </span>
        </div>

        {/* Notifications */}
        <button className="size-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-danger rounded-full border-2 border-white dark:border-slate-800" />
        </button>
      </div>
    </header>
  );
}
