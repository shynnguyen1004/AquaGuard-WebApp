import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { getNavItemsForRole } from "../../config/rbac";

function NavItem({ icon, label, active, filled, badge, onClick, collapsed }) {
  const baseClasses =
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer relative group";
  const activeClasses = "bg-primary/10 text-primary shadow-sm";
  const inactiveClasses =
    "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";

  return (
    <a
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses} ${collapsed ? "justify-center px-3" : ""}`}
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      title={collapsed ? label : undefined}
    >
      <span
        className={`material-symbols-outlined ${active && filled ? "filled-icon" : ""}`}
      >
        {icon}
      </span>
      {!collapsed && <span className="font-medium">{label}</span>}
      {badge && !collapsed && (
        <span className="ml-auto bg-danger text-white text-[10px] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      {badge && collapsed && (
        <span className="absolute -top-1 -right-1 bg-danger text-white text-[8px] size-4 rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
      {/* Tooltip on hover when collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
          {label}
        </div>
      )}
    </a>
  );
}

export default function Sidebar({ activePage = "dashboard", onNavigate, collapsed = false, onToggle, mobileOpen = false, onMobileClose }) {
  const { user, role, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const navItems = getNavItemsForRole(role);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleNavigate = (page) => {
    onNavigate?.(page);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          ${/* Desktop sidebar */""} 
          hidden lg:flex relative flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex-col transition-all duration-300
          ${collapsed ? "lg:w-20" : "lg:w-72"}

          ${/* Mobile drawer — override hidden when mobileOpen */""} 
          ${mobileOpen ? "!flex fixed inset-y-0 left-0 z-50 w-72 shadow-2xl" : ""}
        `}
      >
        {/* Desktop toggle button */}
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-3.5 z-30 size-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all shadow-md"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className={`material-symbols-outlined text-base transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>
            chevron_left
          </span>
        </button>

        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="lg:hidden absolute top-4 right-4 z-50 size-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-danger transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}

        {/* Logo */}
        <div className={`p-4 flex items-center ${collapsed && !mobileOpen ? "justify-center" : ""}`}>
          {(!collapsed || mobileOpen) ? (
            <div className="px-2">
              <img
                alt="AquaGuard"
                src="/images/Logo/Tranparent_Dark/TD_App_Logo.png"
                className="hidden dark:block"
              />
              <img
                alt="AquaGuard"
                src="/images/light_mode_logo.png"
                className="block dark:hidden"
              />
            </div>
          ) : (
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined filled-icon text-xl">water_drop</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${collapsed && !mobileOpen ? "px-2" : "px-4"}`}>
          {navItems.map((item) => (
            <NavItem
              key={item.page}
              icon={item.icon}
              label={t(item.labelKey) || item.label}
              active={activePage === item.page}
              filled={item.filled}
              badge={item.badge}
              onClick={() => handleNavigate(item.page)}
              collapsed={collapsed && !mobileOpen}
            />
          ))}
        </nav>

        {/* Footer — always at bottom */}
        <div className={`mt-auto border-t border-slate-200 dark:border-slate-800 ${collapsed && !mobileOpen ? "p-2" : "p-4"}`}>
          {(!collapsed || mobileOpen) ? (
            <>
              <button
                onClick={() => { onNavigate("settings"); if (mobileOpen) onMobileClose(); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full text-left ${activePage === "settings"
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="font-medium">{t("nav.settings")}</span>
              </button>

              <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <img
                    alt="Profile"
                    className="size-10 rounded-full border-2 border-primary/20 object-cover"
                    src={
                      user?.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "User")}&background=11a0b6&color=fff`
                    }
                    referrerPolicy="no-referrer"
                  />
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-semibold truncate">
                      {user?.displayName || "User"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {t(`roles.${role}`) || role}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-danger py-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  {t("nav.logout")}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <button
                onClick={() => onNavigate("settings")}
                className={`size-10 rounded-xl flex items-center justify-center transition-colors relative group ${activePage === "settings"
                    ? "bg-primary/10 text-primary"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                title="Settings"
              >
                <span className="material-symbols-outlined">settings</span>
                <div className="absolute left-full ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  Settings
                </div>
              </button>
              <div className="relative group">
                <img
                  alt="Profile"
                  className="size-10 rounded-full border-2 border-primary/20 object-cover cursor-pointer"
                  src={
                    user?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "User")}&background=11a0b6&color=fff`
                  }
                  referrerPolicy="no-referrer"
                />
                <div className="absolute left-full ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  {user?.displayName || "User"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="size-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors relative group"
                title="Logout"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <div className="absolute left-full ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  Logout
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
