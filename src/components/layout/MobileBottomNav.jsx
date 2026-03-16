import { useAuth } from "../../contexts/AuthContext";
import { getMobileNavItemsForRole } from "../../config/rbac";

export default function MobileBottomNav({ activePage, onNavigate }) {
  const { role } = useAuth();
  const navItems = getMobileNavItemsForRole(role);

  if (navItems.length === 0) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all ${isActive
                  ? "text-primary"
                  : "text-slate-400 dark:text-slate-500"
                }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? "filled-icon" : ""}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-bold">{item.label}</span>
              {item.badge && (
                <span className="absolute top-1 right-1 bg-danger text-white text-[7px] size-3.5 rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
