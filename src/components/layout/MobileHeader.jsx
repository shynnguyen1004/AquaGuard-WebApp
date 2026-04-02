import { useAuth } from "../../contexts/AuthContext";

export default function MobileHeader({ onMenuToggle }) {
  const { user } = useAuth();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Menu button */}
        <button
          onClick={onMenuToggle}
          className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Logo */}
        <div className="lg:hidden flex items-center justify-center mb-8">
          <img src="/images/light_mode_logo.png" alt="AquaGuard" className="h-30 w-auto" />
        </div>

        {/* Profile */}
        <img
          alt="Profile"
          className="size-9 rounded-full border-2 border-primary/20 object-cover"
          src={
            user?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "User")}&background=11a0b6&color=fff`
          }
          referrerPolicy="no-referrer"
        />
      </div>
    </header>
  );
}
