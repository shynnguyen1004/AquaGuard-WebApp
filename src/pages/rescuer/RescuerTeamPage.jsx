import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getStoredToken } from "../../utils/authStorage";
import { normalizePhone } from "../../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

function formatDateTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("vi-VN");
}

/* ── Tabs ── */
const TABS = [
  { id: "team",      label: "My Team",   icon: "shield"  },
  { id: "directory",  label: "Directory", icon: "groups"  },
  { id: "invites",    label: "Invites",   icon: "mail"    },
];

/* ── Confirm Modal ── */
function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel, processing }) {
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
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all ${danger ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary/90"}`}
          >{processing ? "Processing..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Group Modal ── */
function EditGroupModal({ group, onSave, onCancel, processing }) {
  const [name, setName] = useState(group?.name || "");
  const [desc, setDesc] = useState(group?.description || "");

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold">Edit Group</h3>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={2}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={processing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-all"
          >Cancel</button>
          <button onClick={() => onSave(name.trim(), desc.trim())} disabled={processing || !name.trim()}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
          >{processing ? "Saving..." : "Save"}</button>
        </div>
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
function MemberCard({ member, isCurrentUser, isLeader, onPromote, onDemote, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const roleColors = {
    leader: "bg-warning/15 text-warning border-warning/25",
    co_leader: "bg-primary/15 text-primary border-primary/25",
    member: "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  };

  const menuItems = [];
  if (isLeader && !isCurrentUser && member.memberRole !== "leader") {
    if (member.memberRole === "member") {
      menuItems.push({ label: "Promote to Co-Leader", icon: "arrow_upward", action: () => onPromote?.(member.id) });
    }
    if (member.memberRole === "co_leader") {
      menuItems.push({ label: "Demote to Member", icon: "arrow_downward", action: () => onDemote?.(member.id) });
    }
    menuItems.push({ divider: true });
    menuItems.push({ label: "Remove from Group", icon: "person_remove", action: () => onRemove?.(member.id), danger: true });
  }

  return (
    <div className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 ${
      isCurrentUser
        ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
        : "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
    }`}>
      <div className="relative shrink-0">
        <img
          alt={member.displayName || "Member"}
          className="size-10 rounded-full border-2 border-slate-100 dark:border-slate-700 object-cover"
          src={member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || "R")}&background=11a0b6&color=fff&bold=true`}
          referrerPolicy="no-referrer"
        />
        {isCurrentUser && <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-safe border-2 border-white dark:border-slate-800" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{member.displayName || `Rescuer #${member.id}`}</p>
          {isCurrentUser && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-safe/15 text-safe border border-safe/20">You</span>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.phoneNumber || member.phone_number || "No phone"}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {member.memberRole && (
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${roleColors[member.memberRole] || roleColors.member}`}>
            {member.memberRole.replace("_", " ")}
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

/* ── Stats Card ── */
function StatCard({ icon, label, value, color }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    safe: "bg-safe/10 text-safe",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <div className={`rounded-xl p-3.5 border border-slate-100 dark:border-slate-700/30 ${colorMap[color] || colorMap.primary}`}>
      <span className={`material-symbols-outlined text-lg mb-1 block`}>{icon}</span>
      <p className="text-xl font-black">{value}</p>
      <p className="text-[11px] font-medium opacity-70">{label}</p>
    </div>
  );
}

/* ── Create Group Card ── */
function CreateGroupCard({ groupForm, setGroupForm, creatingGroup, onSubmit }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 dark:bg-primary/5 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">add_circle</span>
        </div>
        <div>
          <h3 className="font-bold text-base">Create Your Rescue Group</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create a team to coordinate SOS missions together</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="text" value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Team name (e.g. District 10 Flood Response)"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        <textarea value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Description (optional)" rows={2}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all" />
        <button type="submit" disabled={creatingGroup}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all">
          <span className="material-symbols-outlined text-base">rocket_launch</span>
          {creatingGroup ? "Creating..." : "Create Group"}
        </button>
      </form>
    </div>
  );
}

/* ── Main Page ── */
export default function RescuerTeamPage() {
  const { user } = useAuth();
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
  const [invitePhone, setInvitePhone] = useState("+84");
  const [activeTab, setActiveTab] = useState("team");
  const [confirmModal, setConfirmModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  const currentRescuerId = user?.uid?.startsWith("phone_") ? Number(user.uid.replace("phone_", "")) : null;
  const activeGroup = groupData.group;
  const receivedInvites = groupData.pendingInvites || [];
  const canInvite = activeGroup && ["leader", "co_leader"].includes(activeGroup.memberRole);
  const isLeader = activeGroup?.memberRole === "leader";

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
        showError(groupJson.message || "Failed to load rescue group data.");
      }
    } catch { showError("Failed to load rescue team data."); }
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
    if (!headers || !name) { showError("Please enter a group name."); return; }
    setCreatingGroup(true); setMessage(""); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups`, { method: "POST", headers, body: JSON.stringify({ name, description: groupForm.description.trim() }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGroupData(json.data); setGroupForm({ name: "", description: "" }); showMessage("Rescue group created!");
    } catch (err) { showError(err.message); } finally { setCreatingGroup(false); }
  };

  const handleInviteByPhone = async (e) => {
    e.preventDefault();
    if (!activeGroup) return;
    const headers = authHeaders();
    const phone_number = normalizePhone(invitePhone);
    if (!headers || !phone_number) { showError("Please enter a phone number."); return; }
    setInvitingMember(true); setMessage(""); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/invite`, { method: "POST", headers, body: JSON.stringify({ phone_number }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setGroupData(json.data); setInvitePhone("+84"); showMessage(`Invitation sent to ${phone_number}`);
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
      setGroupData(json.data); showMessage(`Invited ${rescuer.displayName || rescuer.phoneNumber}`);
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
      setGroupData(json.data); showMessage(action === "accept" ? "You joined the rescue group!" : "Invitation declined.");
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
      setGroupData(json.data); setEditModal(false); showMessage("Group info updated.");
    } catch (err) { showError(err.message); } finally { setProcessing(false); }
  };

  const handlePromote = (userId) => {
    setConfirmModal({ title: "Promote Member", message: "Promote this member to Co-Leader?", confirmLabel: "Promote", danger: false,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/members/${userId}/role`, { method: "PUT", headers, body: JSON.stringify({ role: "co_leader" }) });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); showMessage("Member promoted to Co-Leader.");
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleDemote = (userId) => {
    setConfirmModal({ title: "Demote Member", message: "Demote this Co-Leader to regular member?", confirmLabel: "Demote", danger: false,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/members/${userId}/role`, { method: "PUT", headers, body: JSON.stringify({ role: "member" }) });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); showMessage("Member demoted.");
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleRemoveMember = (userId) => {
    setConfirmModal({ title: "Remove Member", message: "Are you sure you want to remove this member from the group?", confirmLabel: "Remove", danger: true,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/members/${userId}`, { method: "DELETE", headers });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); showMessage("Member removed."); fetchStats(activeGroup.id);
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleLeaveGroup = () => {
    setConfirmModal({ title: "Leave Group", message: "Are you sure you want to leave this rescue group? You can rejoin later if invited.", confirmLabel: "Leave", danger: true,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/leave`, { method: "POST", headers });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); setTeamStats(null); showMessage("You have left the group.");
        } catch (err) { showError(err.message); }
      }
    });
  };

  const handleDisbandGroup = () => {
    setConfirmModal({ title: "Disband Group", message: "This will permanently archive the group and remove all members. This action cannot be undone.", confirmLabel: "Disband", danger: true,
      action: async () => {
        const headers = authHeaders();
        try {
          const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}`, { method: "DELETE", headers });
          const json = await res.json();
          if (!json.success) throw new Error(json.message);
          setGroupData(json.data); setTeamStats(null); showMessage("Group has been disbanded.");
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
      return <CreateGroupCard groupForm={groupForm} setGroupForm={setGroupForm} creatingGroup={creatingGroup} onSubmit={handleCreateGroup} />;
    }
    const members = activeGroup.members || [];
    const pendingOuts = activeGroup.pendingInvites || [];

    return (
      <div className="space-y-5">
        {/* 2-column layout on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 items-start">
          {/* Left column: group info, stats, invite */}
          <div className="space-y-4">
            {/* Group Hero */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 dark:from-primary/10 dark:to-primary/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-xl bg-primary/15 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined filled-icon text-primary text-xl">shield</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold truncate">{activeGroup.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{activeGroup.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-warning/15 text-warning border border-warning/25">
                    {activeGroup.memberRole?.replace("_", " ")}
                  </span>
                  <div className="relative">
                    <button onClick={() => setGroupMenuOpen(!groupMenuOpen)}
                      className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors">
                      <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                    {groupMenuOpen && (
                      <DropdownMenu
                        onClose={() => setGroupMenuOpen(false)}
                        items={[
                          ...(isLeader ? [
                            { label: "Edit Group", icon: "edit", action: () => setEditModal(true) },
                            { divider: true },
                            { label: "Disband Group", icon: "delete_forever", action: handleDisbandGroup, danger: true },
                          ] : [
                            { label: "Leave Group", icon: "logout", action: handleLeaveGroup, danger: true },
                          ]),
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            {teamStats && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon="emergency" label="Active Missions" value={teamStats.activeMissions} color="danger" />
                <StatCard icon="check_circle" label="Completed" value={teamStats.completedMissions} color="safe" />
                <StatCard icon="groups" label="Team Size" value={teamStats.teamSize} color="primary" />
              </div>
            )}

            {/* Invite form */}
            {canInvite && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5 font-medium">Invite by phone number</p>
                <form onSubmit={handleInviteByPhone} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">call</span>
                    <input type="text" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} disabled={invitingMember}
                      placeholder="+84901234567"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 transition-all" />
                  </div>
                  <button type="submit" disabled={invitingMember}
                    className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 transition-all whitespace-nowrap">
                    <span className="material-symbols-outlined text-base">person_add</span>
                    {invitingMember ? "Sending..." : "Invite"}
                  </button>
                </form>
              </div>
            )}

            {/* Pending outgoing */}
            {pendingOuts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Pending Invites</h3>
                <div className="space-y-2">
                  {pendingOuts.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-warning text-lg">hourglass_top</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{inv.displayName || inv.phoneNumber}</p>
                          {inv.displayName && <p className="text-xs text-slate-500">{inv.phoneNumber}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-warning/10 text-warning border border-warning/20 shrink-0">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: members */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Team Members</h3>
            <div className="space-y-2">
              {members.map((m) => (
                <MemberCard key={m.id} member={m} isCurrentUser={m.id === currentRescuerId} isLeader={isLeader}
                  onPromote={handlePromote} onDemote={handleDemote} onRemove={handleRemoveMember} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDirectory = () => (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{directory.length} registered rescuers</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {directory.map((rescuer) => {
          const isMe = rescuer.id === currentRescuerId;
          const canQuickInvite = canInvite && !isMe && !rescuer.hasActiveGroup && !rescuer.hasPendingInviteFromMe;
          const statusBadge = isMe ? null
            : rescuer.hasPendingInviteFromMe ? { text: "Invited", color: "bg-warning/10 text-warning border-warning/20" }
            : rescuer.hasActiveGroup ? { text: "In a team", color: "bg-slate-100 dark:bg-slate-700/50 text-slate-500 border-slate-200 dark:border-slate-600" }
            : null;

          return (
            <div key={rescuer.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${
              isMe ? "border-primary/30 bg-primary/5" : "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"}`}>
              <div className="relative shrink-0">
                <img alt={rescuer.displayName || "Rescuer"} className="size-10 rounded-full border-2 border-slate-100 dark:border-slate-700 object-cover"
                  src={rescuer.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rescuer.displayName || "R")}&background=11a0b6&color=fff&bold=true`}
                  referrerPolicy="no-referrer" />
                {isMe && <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-safe border-2 border-white dark:border-slate-800" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{rescuer.displayName || `Rescuer #${rescuer.id}`}</p>
                  {isMe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-safe/15 text-safe border border-safe/20">You</span>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{rescuer.phoneNumber || "No phone"}</p>
              </div>
              <div className="shrink-0">
                {statusBadge && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${statusBadge.color}`}>{statusBadge.text}</span>
                )}
                {canQuickInvite && (
                  <button onClick={() => handleQuickInvite(rescuer.id)} disabled={processing}
                    className="inline-flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 transition-all">
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Invite
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {directory.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2 block">person_search</span>
          <p className="text-sm text-slate-500 dark:text-slate-400">No rescuers found</p>
        </div>
      )}
    </div>
  );

  const renderInvites = () => (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">Accept an invitation to join a rescue group.</p>
      {receivedInvites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2 block">inbox</span>
          <p className="text-sm text-slate-500 dark:text-slate-400">No pending invitations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {receivedInvites.map((invite) => (
            <div key={invite.id} className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined filled-icon text-primary">groups</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-base">{invite.group.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Invited by <span className="font-medium text-slate-700 dark:text-slate-300">{invite.inviter.displayName}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(invite.createdAt)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleInviteResponse(invite.id, "accept")} disabled={respondingInviteId === invite.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 transition-all">
                  <span className="material-symbols-outlined text-base">check_circle</span> Accept
                </button>
                <button onClick={() => handleInviteResponse(invite.id, "decline")} disabled={respondingInviteId === invite.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-[0.97] disabled:opacity-50 transition-all">
                  <span className="material-symbols-outlined text-base">close</span> Decline
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
            <h1 className="text-2xl font-black tracking-tight">Rescue Team</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Coordinate rescue operations with your team</p>
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
                <span className="hidden sm:inline">{tab.label}</span>
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
          onConfirm={executeConfirm} onCancel={() => !processing && setConfirmModal(null)}
        />
      )}
      {editModal && activeGroup && (
        <EditGroupModal group={activeGroup} processing={processing} onSave={handleEditGroup} onCancel={() => !processing && setEditModal(false)} />
      )}
    </div>
  );
}
