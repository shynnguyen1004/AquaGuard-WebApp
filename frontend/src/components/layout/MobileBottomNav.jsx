import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getMobileNavItemsForRole } from "../../config/rbac";

export default function MobileBottomNav({ activePage, onNavigate }) {
  const { role } = useAuth();
  const { t } = useLanguage();
  const navItems = getMobileNavItemsForRole(role);

  if (navItems.length === 0) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
      <div className="flex items-stretch justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              data-tour={`nav-${item.page}`}
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-start gap-0.5 py-1.5 px-0.5 rounded-xl transition-all ${isActive
                  ? "text-primary"
                  : "text-slate-400 dark:text-slate-500"
                }`}
            >
              <span className={`material-symbols-outlined text-xl leading-none ${isActive ? "filled-icon" : ""}`}>
                {item.icon}
              </span>
              <span className="w-full text-[10px] font-bold leading-tight text-center line-clamp-2">
                {t(item.labelKey) || item.label}
              </span>
              {item.badge && (
                <span className="absolute top-0.5 right-1.5 bg-danger text-white text-[7px] size-3.5 rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
