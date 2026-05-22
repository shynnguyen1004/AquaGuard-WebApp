import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getStoredToken } from "../../utils/authStorage";
import { normalizePhone } from "../../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

function formatDateTime(iso, locale) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString(locale);
}

function formatRelativeTime(iso, t) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("teamPage.timeJustNow");
  if (mins < 60) return t("teamPage.timeMinAgo").replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("teamPage.timeHourAgo").replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  return t("teamPage.timeDayAgo").replace("{n}", String(days));
}

/* ── Tabs ── */
const TABS = [
  { id: "team", labelKey: "teamPage.tabsTeam", icon: "shield" },
  { id: "directory", labelKey: "teamPage.tabsDirectory", icon: "groups" },
  { id: "invites", labelKey: "teamPage.tabsInvites", icon: "mail" },
];

/* ── Confirm Modal ── */
function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel, processing, t }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-all"
          >{t("teamPage.cancel")}</button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all ${danger ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary/90"}`}
          >{processing ? t("teamPage.processing") : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Group Modal ── */
function EditGroupModal({ group, onSave, onCancel, processing, t }) {
  const [name, setName] = useState(group?.name || "");
  const [desc, setDesc] = useState(group?.description || "");

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold">{t("teamPage.editGroup")}</h3>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("teamPage.groupName")}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("teamPage.descriptionPlaceholder")} rows={2}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={processing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-all"
          >{t("teamPage.cancel")}</button>
          <button onClick={() => onSave(name.trim(), desc.trim())} disabled={processing || !name.trim()}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
          >{processing ? t("teamPage.saving") : t("teamPage.save")}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Invite by Phone Modal ── */
function InviteModal({ onSend, onCancel, processing, t }) {
  const [phone, setPhone] = useState("+84");
  const submit = (e) => {
    e.preventDefault();
    onSend(phone);
  };
  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined filled-icon text-primary text-xl">person_add</span>
          </div>
          <h3 className="text-lg font-bold">{t("teamPage.inviteByPhone")}</h3>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">call</span>
            <input
              type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+84901234567" autoFocus disabled={processing}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-all"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onCancel} disabled={processing}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-all"
            >{t("teamPage.cancel")}</button>
            <button type="submit" disabled={processing || !phone.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-outlined text-base">send</span>
              {processing ? t("teamPage.sending") : t("teamPage.invite")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Dropdown Menu ── */
function DropdownMenu({ items, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-1 overflow-hidden">
        {items.map((item, i) =>
          item.divider ? (
            <div key={i} className="border-t border-slate-100 dark:border-slate-700 my-1" />
          ) : (
            <button
              key={i}
              onClick={() => { item.action(); onClose(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${item.danger ? "text-danger" : ""}`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}

/* ── Member Card ── */
function MemberCard({ member, isCurrentUser, isLeader, onPromote, onDemote, onRemove, t }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const roleColors = {
    leader: "bg-warning/15 text-warning border-warning/25",
    co_leader: "bg-primary/15 text-primary border-primary/25",
    member: "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  };

  const menuItems = [];
  if (isLeader && !isCurrentUser && member.memberRole !== "leader") {
    if (member.memberRole === "member") {
      menuItems.push({ label: t("teamPage.promoteToCoLeader"), icon: "arrow_upward", action: () => onPromote?.(member.id) });
    }
    if (member.memberRole === "co_leader") {
      menuItems.push({ label: t("teamPage.demoteToMember"), icon: "arrow_downward", action: () => onDemote?.(member.id) });
    }
    menuItems.push({ divider: true });
    menuItems.push({ label: t("teamPage.removeFromGroup"), icon: "person_remove", action: () => onRemove?.(member.id), danger: true });
  }

  const roleLabels = {
    leader: t("teamPage.leader"),
    co_leader: t("teamPage.coLeader"),
    member: t("teamPage.member"),
  };

  return (
    <div className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 ${
      isCurrentUser
        ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
        : "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
    }`}>
      <div className="relative shrink-0">
        <img
          alt={member.displayName || t("teamPage.memberFallback")}
          className="size-10 rounded-full border-2 border-slate-100 dark:border-slate-700 object-cover"
          src={member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || "R")}&background=11a0b6&color=fff&bold=true`}
          referrerPolicy="no-referrer"
        />
        {isCurrentUser && <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-safe border-2 border-white dark:border-slate-800" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{member.displayName || t("teamPage.rescuerFallback").replace("{id}", member.id)}</p>
          {isCurrentUser && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-safe/15 text-safe border border-safe/20">{t("teamPage.you")}</span>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.phoneNumber || member.phone_number || t("teamPage.noPhone")}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {member.memberRole && (
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${roleColors[member.memberRole] || roleColors.member}`}>
            {roleLabels[member.memberRole] || member.memberRole.replace("_", " ")}
          </span>
        )}
        {menuItems.length > 0 && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
              <span className="material-symbols-outlined text-lg">more_vert</span>
            </button>
            {menuOpen && <DropdownMenu items={menuItems} onClose={() => setMenuOpen(false)} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Create Group Card ── */
function CreateGroupCard({ groupForm, setGroupForm, creatingGroup, onSubmit, onCheckInvites, t }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent dark:from-primary/15 dark:to-slate-800/30 p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-3">
          <div className="size-16 rounded-2xl bg-primary/15 dark:bg-primary/25 flex items-center justify-center mx-auto shadow-md shadow-primary/10">
            <span className="material-symbols-outlined filled-icon text-primary text-3xl">diversity_3</span>
          </div>
          <h3 className="font-black text-xl tracking-tight">{t("teamPage.createTitle")}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t("teamPage.createSubtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input type="text" value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
            placeholder={t("teamPage.teamNamePlaceholder")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
          <textarea value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
            placeholder={t("teamPage.descriptionPlaceholder")} rows={3}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all" />
          <button type="submit" disabled={creatingGroup || !groupForm.name.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-base">rocket_launch</span>
            {creatingGroup ? t("teamPage.creating") : t("teamPage.createGroup")}
          </button>
        </form>
      </div>

      {onCheckInvites && (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          {t("teamPage.orWaitForInvite")?.split(" — ")[0]} —{" "}
          <button onClick={onCheckInvites}
            className="text-primary font-semibold hover:underline underline-offset-2">
            {t("teamPage.tabsInvites")}
          </button>
        </p>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function RescuerTeamPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [rescuers, setRescuers] = useState([]);
  const [groupData, setGroupData] = useState({ group: null, pendingInvites: [] });
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [activeTab, setActiveTab] = useState("team");
  const [confirmModal, setConfirmModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState("all"); // all | available | invited | in_team
  const [pendingExpanded, setPendingExpanded] = useState(true);

  const currentRescuerId = user?.uid?.startsWith("phone_") ? Number(user.uid.replace("phone_", "")) : null;
  const activeGroup = groupData.group;
  const receivedInvites = groupData.pendingInvites || [];
  const canInvite = activeGroup && ["leader", "co_leader"].includes(activeGroup.memberRole);
  const isLeader = activeGroup?.memberRole === "leader";
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";

  const authHeaders = useCallback(() => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : null;
  }, []);

  const showMessage = (msg) => { setMessage(msg); setError(""); };
  const showError = (msg) => { setError(msg); setMessage(""); };

  const fetchPageData = async () => {
    const token = getStoredToken();
    if (!token) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [rescuersRes, groupRes] = await Promise.all([
        fetch(`${API_BASE}/auth/rescuers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/auth/rescue-groups/my`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [rescuersJson, groupJson] = await Promise.all([rescuersRes.json(), groupRes.json()]);
      if (rescuersJson.success) setRescuers(rescuersJson.data || []);
      if (groupJson.success) {
        setGroupData(groupJson.data || { group: null, pendingInvites: [] });
      } else {
        showError(groupJson.message || t("teamPage.loadGroupError"));
      }
    } catch { showError(t("teamPage.loadTeamError")); }
    finally { setLoading(false); }
  };

  const fetchStats = async (groupId) => {
    const token = getStoredToken();
    if (!token || !groupId) return;
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/${groupId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setTeamStats(json.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchPageData(); }, []);
  useEffect(() => { if (activeGroup?.id) fetchStats(activeGroup.id); }, [activeGroup?.id]);
  useEffect(() => {
    if (message || error) { const t = setTimeout(() => { setMessage(""); setError(""); }, 4000); return () => clearTimeout(t); }
  }, [message, error]);

  const directory = useMemo(() => {
    const list = [...rescuers];
    list.sort((a, b) => {
      if (a.id === currentRescuerId) return -1;
      if (b.id === currentRescuerId) return 1;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
    return list;
  }, [rescuers, currentRescuerId]);

  /* ── API Handlers ── */
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const headers = authHeaders();
    const name = groupForm.name.trim();
    if (!headers || !name) { showError(t("teamPage.enterGroupName")); return; }
    setCreatingGroup(true); setMessage(""); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups`, { method: "POST", headers, body: JSON.stringify({ name, description: groupForm.description.trim() }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGroupData(json.data); setGroupForm({ name: "", description: "" }); showMessage(t("teamPage.groupCreated"));
    } catch (err) { showError(err.message); } finally { setCreatingGroup(false); }
  };

  const handleInviteByPhone = async (rawPhone) => {
    if (!activeGroup) return;
    const headers = authHeaders();
    const phone_number = normalizePhone(rawPhone);
    if (!headers || !phone_number) { showError(t("teamPage.enterPhone")); return; }
    setInvitingMember(true); setMessage(""); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/invite`, { method: "POST", headers, body: JSON.stringify({ phone_number }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGroupData(json.data);
      setInviteModalOpen(false);
      showMessage(t("teamPage.invitationSent").replace("{phone}", phone_number));
      // Refresh rescuers to update invite status badges
      fetchPageData();
    } catch (err) { showError(err.message); } finally { setInvitingMember(false); }
  };

  const handleQuickInvite = async (rescuerId) => {
    if (!activeGroup || !canInvite) return;
    const rescuer = rescuers.find(r => r.id === rescuerId);
    if (!rescuer) return;
    const headers = authHeaders();
    setProcessing(true); setMessage(""); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/invite`, { method: "POST", headers, body: JSON.stringify({ phone_number: rescuer.phoneNumber }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGroupData(json.data); showMessage(t("teamPage.invitedName").replace("{name}", rescuer.displayName || rescuer.phoneNumber));
      fetchPageData();
    } catch (err) { showError(err.message); } finally { setProcessing(false); }
  };

  const handleInviteResponse = async (inviteId, action) => {
    const headers = authHeaders();
    if (!headers) return;
    setRespondingInviteId(inviteId); setMessage(""); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-group-invites/${inviteId}/${action}`, { method: "POST", headers });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGroupData(json.data); showMessage(action === "accept" ? t("teamPage.joinedGroup") : t("teamPage.invitationDeclined"));
    } catch (err) { showError(err.message); } finally { setRespondingInviteId(null); }
  };

  const handleEditGroup = async (name, description) => {
    if (!activeGroup) return;
    const headers = authHeaders();
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}`, { method: "PUT", headers, body: JSON.stringify({ name, description }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGroupData(json.data); setEditModal(false); showMessage(t("teamPage.groupUpdated"));
    } catch (err) { showError(err.message); } finally { setProcessing(false); }
  };

  const handlePromote = (userId) => {
    setConfirmModal({ title: t("teamPage.promoteTitle"), message: t("teamPage.promoteMessage"), confirmLabel: t("teamPage.promoteConfirm"), danger: false,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/members/${userId}/role`, { method: "PUT", headers, body: JSON.stringify({ role: "co_leader" }) });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); showMessage(t("teamPage.memberPromoted"));
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleDemote = (userId) => {
    setConfirmModal({ title: t("teamPage.demoteTitle"), message: t("teamPage.demoteMessage"), confirmLabel: t("teamPage.demoteConfirm"), danger: false,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/members/${userId}/role`, { method: "PUT", headers, body: JSON.stringify({ role: "member" }) });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); showMessage(t("teamPage.memberDemoted"));
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleRemoveMember = (userId) => {
    setConfirmModal({ title: t("teamPage.removeTitle"), message: t("teamPage.removeMessage"), confirmLabel: t("teamPage.removeConfirm"), danger: true,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/members/${userId}`, { method: "DELETE", headers });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); showMessage(t("teamPage.memberRemoved")); fetchStats(activeGroup.id);
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleLeaveGroup = () => {
    setConfirmModal({ title: t("teamPage.leaveTitle"), message: t("teamPage.leaveMessage"), confirmLabel: t("teamPage.leaveConfirm"), danger: true,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/leave`, { method: "POST", headers });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); setTeamStats(null); showMessage(t("teamPage.leftGroup"));
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleDisbandGroup = () => {
    setConfirmModal({ title: t("teamPage.disbandTitle"), message: t("teamPage.disbandMessage"), confirmLabel: t("teamPage.disbandConfirm"), danger: true,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}`, { method: "DELETE", headers });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); setTeamStats(null); showMessage(t("teamPage.groupDisbanded"));
        } catch (err) { showError(err.message); }
      }
    });
  };

  const executeConfirm = async () => {
    if (!confirmModal?.action) return;
    setProcessing(true);
    try { await confirmModal.action(); } finally { setProcessing(false); setConfirmModal(null); }
  };

  /* ── Tab Renderers ── */
  const renderMyTeam = () => {
    if (!activeGroup) {
      return <CreateGroupCard groupForm={groupForm} setGroupForm={setGroupForm}
        creatingGroup={creatingGroup} onSubmit={handleCreateGroup}
        onCheckInvites={() => setActiveTab("invites")} t={t} />;
    }
    const members = activeGroup.members || [];
    const pendingOuts = activeGroup.pendingInvites || [];

    const search = memberSearch.trim().toLowerCase();
    const filteredMembers = !search
      ? members
      : members.filter((m) =>
          (m.displayName || "").toLowerCase().includes(search) ||
          (m.phoneNumber || m.phone_number || "").toLowerCase().includes(search)
        );

    const roleLabel =
      activeGroup.memberRole === "co_leader" ? t("teamPage.coLeader") :
      activeGroup.memberRole === "leader" ? t("teamPage.leader") :
      t("teamPage.member");
    const roleColor =
      activeGroup.memberRole === "leader" ? "bg-warning/15 text-warning border-warning/25" :
      activeGroup.memberRole === "co_leader" ? "bg-primary/15 text-primary border-primary/25" :
      "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600";

    return (
      <div className="space-y-5">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/15 dark:via-primary/8 dark:to-slate-800/30 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            {/* Icon tile */}
            <div className="size-14 rounded-2xl bg-primary/15 dark:bg-primary/25 flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined filled-icon text-primary text-3xl">shield</span>
            </div>

            {/* Name, description, stats */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight truncate">{activeGroup.name}</h2>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${roleColor}`}>{roleLabel}</span>
              </div>
              {activeGroup.description ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">{activeGroup.description}</p>
              ) : isLeader ? (
                <button onClick={() => setEditModal(true)}
                  className="text-sm text-primary/80 hover:text-primary underline-offset-2 hover:underline transition-colors">
                  + {t("teamPage.addDescription")}
                </button>
              ) : (
                <p className="text-sm text-slate-400 italic">{t("teamPage.noDescription")}</p>
              )}
              {teamStats && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-bold border border-indigo-500/15">
                    <span className="material-symbols-outlined text-[14px] filled-icon">directions_run</span>
                    {teamStats.activeMissions} {t("teamPage.statActiveShort")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-safe/10 text-safe text-xs font-bold border border-safe/15">
                    <span className="material-symbols-outlined text-[14px] filled-icon">check_circle</span>
                    {teamStats.completedMissions} {t("teamPage.statDoneShort")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/15">
                    <span className="material-symbols-outlined text-[14px] filled-icon">groups</span>
                    {teamStats.teamSize} {t("teamPage.statMembersShort")}
                  </span>
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              {canInvite && (
                <button onClick={() => setInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all shadow-md shadow-primary/20">
                  <span className="material-symbols-outlined text-base">person_add</span>
                  {t("teamPage.invite")}
                </button>
              )}
              <div className="relative">
                <button onClick={() => setGroupMenuOpen(!groupMenuOpen)}
                  className="size-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                  <span className="material-symbols-outlined text-lg">more_vert</span>
                </button>
                {groupMenuOpen && (
                  <DropdownMenu
                    onClose={() => setGroupMenuOpen(false)}
                    items={[
                      ...(isLeader ? [
                        { label: t("teamPage.editGroupAction"), icon: "edit", action: () => setEditModal(true) },
                        { divider: true },
                        { label: t("teamPage.disbandGroupAction"), icon: "delete_forever", action: handleDisbandGroup, danger: true },
                      ] : [
                        { label: t("teamPage.leaveGroupAction"), icon: "logout", action: handleLeaveGroup, danger: true },
                      ]),
                    ]}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Members section (full width) ── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("teamPage.teamMembers")} ({members.length})
            </h3>
            {members.length > 1 && (
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={t("teamPage.searchMembers")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            )}
          </div>

          {filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-400">
              {t("teamPage.noMatches")}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredMembers.map((m) => (
                <MemberCard key={m.id} member={m} isCurrentUser={m.id === currentRescuerId} isLeader={isLeader}
                  onPromote={handlePromote} onDemote={handleDemote} onRemove={handleRemoveMember} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* ── Pending outgoing invites (collapsible) ── */}
        {pendingOuts.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40">
            <button onClick={() => setPendingExpanded((p) => !p)}
              className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-2xl transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-warning text-lg">hourglass_top</span>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("teamPage.pendingInvites")} ({pendingOuts.length})
                </h3>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-lg">
                {pendingExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
            {pendingExpanded && (
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pendingOuts.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-warning text-lg">hourglass_top</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{inv.displayName || inv.phoneNumber}</p>
                        {inv.displayName && <p className="text-xs text-slate-500 truncate">{inv.phoneNumber}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-warning/10 text-warning border border-warning/20 shrink-0">{t("teamPage.pending")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDirectory = () => {
    const search = directorySearch.trim().toLowerCase();
    const filtered = directory.filter((r) => {
      if (search) {
        const matches =
          (r.displayName || "").toLowerCase().includes(search) ||
          (r.phoneNumber || "").toLowerCase().includes(search);
        if (!matches) return false;
      }
      if (directoryFilter === "all") return true;
      const isMe = r.id === currentRescuerId;
      if (directoryFilter === "available") return !isMe && !r.hasActiveGroup && !r.hasPendingInviteFromMe;
      if (directoryFilter === "invited") return r.hasPendingInviteFromMe;
      if (directoryFilter === "in_team") return r.hasActiveGroup;
      return true;
    });

    const filterChips = [
      { key: "all", label: t("teamPage.filterAll") },
      { key: "available", label: t("teamPage.filterAvailable") },
      { key: "invited", label: t("teamPage.filterInvited") },
      { key: "in_team", label: t("teamPage.filterInTeam") },
    ];

    return (
      <div className="space-y-4">
        {/* Search + filter chips */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t("teamPage.registeredRescuers").replace("{count}", String(directory.length))}
            </p>
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text" value={directorySearch} onChange={(e) => setDirectorySearch(e.target.value)}
                placeholder={t("teamPage.searchDirectory")}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterChips.map((chip) => {
              const isActive = directoryFilter === chip.key;
              return (
                <button key={chip.key} onClick={() => setDirectoryFilter(chip.key)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:text-primary"
                  }`}>
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">person_search</span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {directory.length === 0 ? t("teamPage.noRescuers") : t("teamPage.noMatches")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((rescuer) => {
              const isMe = rescuer.id === currentRescuerId;
              const canQuickInvite = canInvite && !isMe && !rescuer.hasActiveGroup && !rescuer.hasPendingInviteFromMe;
              const statusBadge = isMe ? null
                : rescuer.hasPendingInviteFromMe ? { text: t("teamPage.invited"), color: "bg-warning/10 text-warning border-warning/20" }
                : rescuer.hasActiveGroup ? { text: t("teamPage.inTeam"), color: "bg-slate-100 dark:bg-slate-700/50 text-slate-500 border-slate-200 dark:border-slate-600" }
                : null;

              return (
                <div key={rescuer.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${
                  isMe ? "border-primary/30 bg-primary/5" : "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"}`}>
                  <div className="relative shrink-0">
                    <img alt={rescuer.displayName || t("teamPage.memberFallback")} className="size-10 rounded-full border-2 border-slate-100 dark:border-slate-700 object-cover"
                      src={rescuer.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rescuer.displayName || "R")}&background=11a0b6&color=fff&bold=true`}
                      referrerPolicy="no-referrer" />
                    {isMe && <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-safe border-2 border-white dark:border-slate-800" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{rescuer.displayName || t("teamPage.rescuerFallback").replace("{id}", rescuer.id)}</p>
                      {isMe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-safe/15 text-safe border border-safe/20">{t("teamPage.you")}</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{rescuer.phoneNumber || t("teamPage.noPhone")}</p>
                  </div>
                  <div className="shrink-0">
                    {statusBadge && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${statusBadge.color}`}>{statusBadge.text}</span>
                    )}
                    {canQuickInvite && (
                      <button onClick={() => handleQuickInvite(rescuer.id)} disabled={processing}
                        className="inline-flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 transition-all">
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        {t("teamPage.invite")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderInvites = () => (
    <div className="space-y-4">
      {/* Header hint */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 p-4 flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined filled-icon text-primary">mail</span>
        </div>
        <div className="min-w-0">
          {receivedInvites.length > 0 ? (
            <p className="text-sm font-bold">
              {t("teamPage.invitationsCount").replace("{n}", String(receivedInvites.length))}
            </p>
          ) : (
            <p className="text-sm font-bold">{t("teamPage.noPendingInvitations")}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("teamPage.invitesHint")}</p>
        </div>
      </div>

      {receivedInvites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">inbox</span>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("teamPage.noPendingInvitations")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {receivedInvites.map((invite) => (
            <div key={invite.id} className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-5 space-y-3 hover:shadow-md hover:shadow-primary/5 transition-shadow">
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined filled-icon text-primary text-xl">groups</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-base truncate">{invite.group.name}</p>
                  {invite.group.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{invite.group.description}</p>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                    {t("teamPage.invitedBy")} <span className="font-semibold text-slate-700 dark:text-slate-300">{invite.inviter.displayName}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatRelativeTime(invite.createdAt, t)} <span className="text-slate-300 dark:text-slate-600">• {formatDateTime(invite.createdAt, dateLocale)}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleInviteResponse(invite.id, "accept")} disabled={respondingInviteId === invite.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 transition-all">
                  <span className="material-symbols-outlined text-base">check_circle</span> {t("teamPage.accept")}
                </button>
                <button onClick={() => handleInviteResponse(invite.id, "decline")} disabled={respondingInviteId === invite.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-[0.97] disabled:opacity-50 transition-all">
                  <span className="material-symbols-outlined text-base">close</span> {t("teamPage.decline")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Render ── */
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="material-symbols-outlined filled-icon text-primary text-2xl">diversity_3</span>
            <h1 className="text-2xl font-black tracking-tight">{t("teamPage.title")}</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("teamPage.subtitle")}</p>
        </div>

        {/* Toast */}
        {(message || error) && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            error ? "bg-danger/10 text-danger border border-danger/20" : "bg-safe/10 text-safe border border-safe/20"
          }`}>
            <span className="material-symbols-outlined text-base">{error ? "error" : "check_circle"}</span>
            {error || message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-700/60">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge = tab.id === "invites" ? receivedInvites.length : tab.id === "team" ? (activeGroup?.members?.length || 0) : tab.id === "directory" ? directory.length : 0;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive ? "text-primary" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                <span className={`material-symbols-outlined text-lg ${isActive ? "filled-icon" : ""}`}>{tab.icon}</span>
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                {badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive ? "bg-primary/15 text-primary" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>{badge}</span>
                )}
                {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-9 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="pb-8">
            {activeTab === "team" && renderMyTeam()}
            {activeTab === "directory" && renderDirectory()}
            {activeTab === "invites" && renderInvites()}
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title} message={confirmModal.message} confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger} processing={processing}
          onConfirm={executeConfirm} onCancel={() => !processing && setConfirmModal(null)} t={t}
        />
      )}
      {editModal && activeGroup && (
        <EditGroupModal group={activeGroup} processing={processing} onSave={handleEditGroup} onCancel={() => !processing && setEditModal(false)} t={t} />
      )}
      {inviteModalOpen && activeGroup && (
        <InviteModal
          processing={invitingMember}
          onSend={handleInviteByPhone}
          onCancel={() => !invitingMember && setInviteModalOpen(false)}
          t={t}
        />
      )}
    </div>
  );
}
