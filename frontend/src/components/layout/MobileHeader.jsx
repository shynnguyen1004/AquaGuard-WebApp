import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getRoleBadgeClasses } from "../../config/rbac";

export default function MobileHeader({ onChatToggle, onNavigate }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showProfile) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfile]);

  const avatarUrl =
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "User")}&background=11a0b6&color=fff&size=128`;

  const displayName = user?.displayName || "User";
  const phoneOrEmail = user?.phoneNumber || user?.email || "";
  const roleLabel = t(`roles.${user?.role || "citizen"}`);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Chatbot button */}
          <button
            onClick={onChatToggle}
            className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative"
          >
            <span className="material-symbols-outlined filled-icon text-primary">chat</span>
            <span className="absolute -top-0.5 -right-0.5 size-3.5 bg-danger rounded-full border-2 border-white dark:border-background-dark flex items-center justify-center">
              <span className="text-[7px] text-white font-bold">1</span>
            </span>
          </button>

          {/* Logo */}
          <div className="flex items-center justify-center">
            <img src="/images/Logo/Transparent_Light/TL_App_Logo.png" alt="AquaGuard" className="h-12 w-auto dark:hidden" />
            <img src="/images/Logo/Tranparent_Dark/TD_App_Logo.png" alt="AquaGuard" className="h-12 w-auto hidden dark:block" />
          </div>

          {/* Avatar — opens dropdown */}
          <button
            onClick={() => setShowProfile((p) => !p)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <img
              alt="Profile"
              className="size-9 rounded-full border-2 border-primary/20 object-cover"
              src={avatarUrl}
              referrerPolicy="no-referrer"
            />
          </button>
        </div>
      </header>

      {/* Profile Dropdown — Google-style */}
      {showProfile && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[998] bg-black/30 backdrop-blur-[2px] lg:hidden" onClick={() => setShowProfile(false)} />

          {/* Card */}
          <div
            ref={dropdownRef}
            className="fixed top-0 left-4 right-4 z-[999] mt-2 lg:hidden animate-[slideDown_0.2s_ease-out]"
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Top bar — phone/email + close */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {phoneOrEmail}
                </p>
                <button
                  onClick={() => setShowProfile(false)}
                  className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Avatar + Name */}
              <div className="flex flex-col items-center py-4 px-5">
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="size-20 rounded-full border-[3px] border-primary/30 object-cover shadow-lg shadow-primary/10"
                  referrerPolicy="no-referrer"
                />
                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                  {displayName}
                </h3>
                <span className={`mt-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${getRoleBadgeClasses(user?.role)}`}>
                  {roleLabel}
                </span>
              </div>

              {/* Manage Account button */}
              <div className="px-5 pb-4">
                <button
                  onClick={() => {
                    setShowProfile(false);
                    onNavigate?.("settings");
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">manage_accounts</span>
                  {t("settings.title") || "Settings"}
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-slate-700" />

              {/* Logout */}
              <div className="px-5 py-3">
                <button
                  onClick={() => {
                    setShowProfile(false);
                    logout?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-danger hover:bg-danger/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  {t("nav.logout") || "Logout"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Animation keyframe */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

