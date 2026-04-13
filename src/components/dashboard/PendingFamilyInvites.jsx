import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

export default function PendingFamilyInvites() {
  const { language } = useLanguage();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await api.get("/family/requests");
      if (res.success) {
        setInvites(res.data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 30000);
    return () => clearInterval(interval);
  }, [fetchInvites]);

  const handleAccept = async (id) => {
    setProcessingId(id);
    try {
      await api.put(`/family/requests/${id}/accept`);
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      // Silently fail
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await api.put(`/family/requests/${id}/reject`);
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      // Silently fail
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-base">mail</span>
        <h4 className="text-sm font-bold">
          {language === "vi" ? "Lời mời kết nối" : "Connection Invites"}
        </h4>
        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
          {invites.length}
        </span>
      </div>

      <div className="space-y-2">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30"
          >
            <img
              src={
                invite.from.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(invite.from.displayName || "U")}&background=11a0b6&color=fff&size=64`
              }
              alt={invite.from.displayName}
              className="size-9 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{invite.from.displayName}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {invite.from.phoneNumber}
                {invite.relation && ` • ${invite.relation}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleAccept(invite.id)}
                disabled={processingId === invite.id}
                className="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">check</span>
              </button>
              <button
                onClick={() => handleReject(invite.id)}
                disabled={processingId === invite.id}
                className="size-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
