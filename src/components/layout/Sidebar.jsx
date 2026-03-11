import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const navItems = [
  { icon: "dashboard", label: "Dashboard", active: false },
  { icon: "map", label: "Live Flood Map", active: true, filled: true },
  { icon: "emergency", label: "Rescue Requests", active: false, badge: 12 },
  { icon: "description", label: "Reports", active: false },
  { icon: "shield_with_heart", label: "Safety Protocols", active: false },
];

function NavItem({ icon, label, active, filled, badge }) {
  const baseClasses =
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors";
  const activeClasses = "bg-primary/10 text-primary";
  const inactiveClasses =
    "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";

  return (
    <a
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
      href="#"
    >
      <span
        className={`material-symbols-outlined ${active && filled ? "filled-icon" : ""}`}
      >
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="ml-auto bg-danger text-white text-[10px] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </a>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <img
          alt="AquaGuard"
          src="/images/dark_mode_logo.png"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-medium">Settings</span>
        </a>

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
                {user?.role === "admin"
                  ? "System Administrator"
                  : user?.role === "rescuer"
                    ? "Rescue Team"
                    : user?.email || "Citizen"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-danger py-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}
