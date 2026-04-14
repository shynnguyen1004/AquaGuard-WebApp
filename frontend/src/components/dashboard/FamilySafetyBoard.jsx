import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

const SAFETY_CONFIG = {
  safe: {
    icon: "check_circle",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    ring: "ring-emerald-200 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  danger: {
    icon: "error",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
    ring: "ring-red-200 dark:ring-red-500/30",
    dot: "bg-red-500",
  },
  injured: {
    icon: "healing",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    ring: "ring-orange-200 dark:ring-orange-500/30",
    dot: "bg-orange-500",
  },
  unknown: {
    icon: "help",
    color: "text-slate-400 dark:text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-700/30",
    ring: "ring-slate-200 dark:ring-slate-600/30",
    dot: "bg-slate-400",
  },
};

export default function FamilySafetyBoard({ onNavigate }) {
  const { t, language } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.get("/family/members");
      if (res.success) {
        setMembers(res.data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    const interval = setInterval(fetchMembers, 30000);
    return () => clearInterval(interval);
  }, [fetchMembers]);

  const formatLastSeen = (isoStr) => {
    if (!isoStr) return language === "vi" ? "Chưa cập nhật" : "No update";
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return language === "vi" ? "Vừa xong" : "Just now";
    if (mins < 60) return `${mins} ${language === "vi" ? "phút trước" : "min ago"}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${language === "vi" ? "giờ trước" : "h ago"}`;
    const days = Math.floor(hours / 24);
    return `${days} ${language === "vi" ? "ngày trước" : "d ago"}`;
  };

  // Sort: danger/injured first, then safe, then unknown
  const sortedMembers = [...members].sort((a, b) => {
    const priority = { danger: 0, injured: 1, safe: 2, unknown: 3 };
    return (priority[a.safetyStatus] ?? 3) - (priority[b.safetyStatus] ?? 3);
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary filled-icon text-xl">
            family_restroom
          </span>
          {language === "vi" ? "An toàn gia đình" : "Family Safety"}
        </h3>
        {members.length > 0 && (
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {members.length} {language === "vi" ? "thành viên" : "members"}
          </span>
        )}
      </div>

      {members.length === 0 ? (
        /* ── Empty State ── */
        <div className="text-center py-10 bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-600 mb-3 block">
            group_add
          </span>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">
            {language === "vi" ? "Chưa có thành viên gia đình" : "No family members connected"}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600 mb-4 max-w-[240px] mx-auto">
            {language === "vi"
              ? "Kết nối với gia đình để theo dõi tình trạng an toàn"
              : "Connect with your family to track their safety status"}
          </p>
          <button
            onClick={() => onNavigate?.("settings:family")}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            {language === "vi" ? "Thêm người thân" : "Add Family Member"}
          </button>
        </div>
      ) : (
        /* ── Members List ── */
        <div className="space-y-2.5">
          {sortedMembers.map((member) => {
            const sConfig = SAFETY_CONFIG[member.safetyStatus] || SAFETY_CONFIG.unknown;
            const statusLabel = t(`settings.family.${member.safetyStatus}`) || member.safetyStatus;

            return (
              <div
                key={member.id}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30 hover:shadow-md transition-all group`}
              >
                {/* Avatar + Status dot */}
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      member.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || "U")}&background=11a0b6&color=fff&size=80`
                    }
                    alt={member.displayName}
                    className={`size-11 rounded-full object-cover ring-2 ${sConfig.ring}`}
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3.5 ${sConfig.dot} rounded-full border-2 border-white dark:border-slate-800`}
                    title={statusLabel}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{member.displayName}</p>
                    {member.relation && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        ({member.relation})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${sConfig.color}`}>
                      <span className="material-symbols-outlined text-xs filled-icon">{sConfig.icon}</span>
                      {statusLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      • {formatLastSeen(member.locationUpdatedAt)}
                    </span>
                  </div>
                  {member.healthNote && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate italic">
                      "{member.healthNote}"
                    </p>
                  )}
                </div>

                {/* Status icon */}
                <div className={`size-9 rounded-lg ${sConfig.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <span className={`material-symbols-outlined filled-icon text-lg ${sConfig.color}`}>
                    {sConfig.icon}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
