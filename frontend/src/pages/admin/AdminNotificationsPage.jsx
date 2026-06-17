import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../components/common/Toast";
import { api } from "../../services/api";
import { notificationService } from "../../services/notifications";
import NotificationBell from "../../components/notifications/NotificationBell";

export default function AdminNotificationsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [target, setTarget] = useState("all"); // all | user
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Tải danh sách user cho lựa chọn "gửi riêng"
  useEffect(() => {
    api
      .get("/auth/users")
      .then((res) => {
        if (res.success) setUsers(res.data || []);
      })
      .catch(() => {});
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter(
        (u) =>
          (u.displayName || "").toLowerCase().includes(q) ||
          (u.phoneNumber || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [users, search]);

  const canSend =
    title.trim() && !sending && (target === "all" || (target === "user" && selectedUser));

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = {
        target,
        title: title.trim(),
        body: body.trim(),
        ...(target === "user" ? { userId: selectedUser.id } : {}),
      };
      const res = await notificationService.adminSend(payload);
      if (res.success) {
        showToast(
          t("notifications.sentToast").replace("{count}", res.sentCount ?? 0),
          "success"
        );
        setTitle("");
        setBody("");
        setSelectedUser(null);
        setSearch("");
      } else {
        showToast(t("notifications.sendError"), "error");
      }
    } catch (e) {
      showToast(e.message || t("notifications.sendError"), "error");
    } finally {
      setSending(false);
    }
  };

  const RadioOption = ({ value, icon, label, desc }) => (
    <button
      type="button"
      onClick={() => setTarget(value)}
      className={`flex-1 flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
        target === value
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-slate-200 dark:border-slate-700 hover:border-primary/30"
      }`}
    >
      <span
        className={`material-symbols-outlined ${
          target === value ? "text-primary" : "text-slate-400"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
      </div>
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined filled-icon text-primary text-2xl">campaign</span>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                {t("notifications.sendTitle")}
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("notifications.sendSubtitle")}
            </p>
          </div>
          <div className="hidden lg:block shrink-0">
            <NotificationBell />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-700/30 space-y-5">
          {/* Target selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t("notifications.recipients")}
            </label>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <RadioOption
                value="all"
                icon="groups"
                label={t("notifications.targetAll")}
                desc={t("notifications.targetAllDesc")}
              />
              <RadioOption
                value="user"
                icon="person"
                label={t("notifications.targetUser")}
                desc={t("notifications.targetUserDesc")}
              />
            </div>
          </div>

          {/* User picker */}
          {target === "user" && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t("notifications.selectUser")}
              </label>
              {selectedUser ? (
                <div className="mt-2 flex items-center justify-between gap-3 p-3 rounded-xl border border-primary bg-primary/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-primary">account_circle</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{selectedUser.displayName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {selectedUser.phoneNumber} · {selectedUser.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-slate-400 hover:text-danger transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("notifications.searchUserPlaceholder")}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {filteredUsers.length > 0 && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
                      {filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                        >
                          <span className="material-symbols-outlined text-slate-400">account_circle</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{u.displayName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {u.phoneNumber} · {u.role}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t("notifications.msgTitle")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder={t("notifications.msgTitlePlaceholder")}
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t("notifications.msgBody")}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={t("notifications.msgBodyPlaceholder")}
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">send</span>
            {sending ? t("notifications.sending") : t("notifications.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
