import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import { useLanguage } from "../../contexts/LanguageContext";

/** Icon + màu sắc theo loại notification */
const TYPE_META = {
  welcome: { icon: "celebration", color: "text-primary", bg: "bg-primary/10" },
  family_request: { icon: "group_add", color: "text-primary", bg: "bg-primary/10" },
  family_accepted: { icon: "diversity_1", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  family_sos: { icon: "sos", color: "text-danger", bg: "bg-danger/10" },
  sos_accepted: { icon: "local_shipping", color: "text-warning", bg: "bg-warning/10" },
  sos_resolved: { icon: "task_alt", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  admin_announcement: { icon: "campaign", color: "text-primary", bg: "bg-primary/10" },
  default: { icon: "notifications", color: "text-slate-500", bg: "bg-slate-500/10" },
};

/** Thời gian tương đối, đa ngôn ngữ */
function relativeTime(dateStr, language) {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  const vi = language === "vi";
  if (diff < 60) return vi ? "Vừa xong" : "Just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return vi ? `${m} phút trước` : `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return vi ? `${h} giờ trước` : `${h}h ago`;
  }
  const d = Math.floor(diff / 86400);
  if (d < 7) return vi ? `${d} ngày trước` : `${d}d ago`;
  return date.toLocaleDateString(vi ? "vi-VN" : "en-US");
}

export default function NotificationBell({ className = "" }) {
  const { notifications, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    setOpen((p) => {
      if (!p) refresh(); // refresh khi mở
      return !p;
    });
  };

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    // Điều hướng nếu có requestId (dùng event app_navigate sẵn có)
    const requestId = n.metadata?.requestId;
    if (requestId) {
      window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: "sos" } }));
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Nút chuông */}
      <button
        onClick={toggle}
        aria-label={t("notifications.title")}
        className="size-9 md:size-10 rounded-xl flex items-center justify-center relative shrink-0 transition-colors hover:brightness-125 bg-slate-100 dark:bg-[#1e2333] border border-slate-200 dark:border-[#252a38] text-slate-500 dark:text-[#8891a8]"
      >
        <span className="material-symbols-outlined text-xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white dark:border-[#171b26]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel dropdown */}
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <div className="fixed inset-0 z-[998] lg:hidden" onClick={() => setOpen(false)} />

          <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] z-[999] animate-[slideDown_0.18s_ease-out]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("notifications.title")}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {t("notifications.markAllRead")}
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
                      notifications_off
                    </span>
                    <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                      {t("notifications.empty")}
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const meta = TYPE_META[n.type] || TYPE_META.default;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                          n.is_read ? "" : "bg-primary/[0.04] dark:bg-primary/[0.07]"
                        }`}
                      >
                        <div className={`size-9 shrink-0 rounded-xl flex items-center justify-center ${meta.bg}`}>
                          <span className={`material-symbols-outlined filled-icon text-lg ${meta.color}`}>
                            {meta.icon}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                            {relativeTime(n.created_at, language)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
