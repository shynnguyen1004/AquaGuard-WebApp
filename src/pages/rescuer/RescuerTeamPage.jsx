import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getStoredToken } from "../../utils/authStorage";
import { normalizePhone } from "../../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

function formatDateTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("vi-VN");
}

export default function RescuerTeamPage() {
  const { user } = useAuth();
  const [rescuers, setRescuers] = useState([]);
  const [groupData, setGroupData] = useState({ group: null, pendingInvites: [] });
  const [loading, setLoading] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [invitePhone, setInvitePhone] = useState("+84");

  const currentRescuerId = user?.uid?.startsWith("phone_")
    ? Number(user.uid.replace("phone_", ""))
    : null;

  const activeGroup = groupData.group;
  const receivedInvites = groupData.pendingInvites || [];
  const canInvite = activeGroup && ["leader", "co_leader"].includes(activeGroup.memberRole);

  const fetchPageData = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [rescuersRes, groupRes] = await Promise.all([
        fetch(`${API_BASE}/auth/rescuers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/auth/rescue-groups/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [rescuersJson, groupJson] = await Promise.all([rescuersRes.json(), groupRes.json()]);

      if (rescuersJson.success) {
        setRescuers(rescuersJson.data || []);
      }

      if (groupJson.success) {
        setGroupData(groupJson.data || { group: null, pendingInvites: [] });
      } else {
        setError(groupJson.message || "Failed to load rescue group data.");
      }
    } catch (err) {
      console.error("Failed to fetch rescuer team page data:", err);
      setError("Failed to load rescue team data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const directory = useMemo(() => {
    const list = [...rescuers];
    list.sort((a, b) => {
      if (a.id === currentRescuerId) return -1;
      if (b.id === currentRescuerId) return 1;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
    return list;
  }, [rescuers, currentRescuerId]);

  const teamStats = {
    total: rescuers.length,
    grouped: rescuers.filter((rescuer) => activeGroup?.members?.some((member) => member.id === rescuer.id)).length,
    pendingInvites: receivedInvites.length + (activeGroup?.pendingInvites?.length || 0),
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const token = getStoredToken();
    const name = groupForm.name.trim();

    if (!token || !name) {
      setError("Please enter a group name.");
      return;
    }

    setCreatingGroup(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: groupForm.description.trim(),
        }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Failed to create rescue group.");
      }

      setGroupData(json.data);
      setGroupForm({ name: "", description: "" });
      setMessage("Rescue group created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleInviteByPhone = async (e) => {
    e.preventDefault();
    if (!activeGroup) return;

    const token = getStoredToken();
    const phone_number = normalizePhone(invitePhone);

    if (!token || !phone_number) {
      setError("Please enter a phone number.");
      return;
    }

    setInvitingMember(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/${activeGroup.id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone_number }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Failed to send invite.");
      }

      setGroupData(json.data);
      setInvitePhone("+84");
      setMessage(`Invitation sent to ${phone_number}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setInvitingMember(false);
    }
  };

  const handleInviteResponse = async (inviteId, action) => {
    const token = getStoredToken();
    if (!token) return;

    setRespondingInviteId(inviteId);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/rescue-group-invites/${inviteId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || `Failed to ${action} invite.`);
      }

      setGroupData(json.data);
      setMessage(action === "accept" ? "You joined the rescue group." : "Invitation declined.");
    } catch (err) {
      setError(err.message);
    } finally {
      setRespondingInviteId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined filled-icon text-warning text-2xl">groups</span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Rescuer Team</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create a rescue group, invite members by phone number, and coordinate SOS hand-offs as a team
          </p>
        </div>

        {(message || error) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-danger/20 bg-danger/10 text-danger"
              : "border-safe/20 bg-safe/10 text-safe"
          }`}>
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-primary/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30">
            <p className="text-2xl font-black">{teamStats.total}</p>
            <p className="text-xs text-slate-500 font-medium">Rescuers Directory</p>
          </div>
          <div className="bg-warning/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30">
            <p className="text-2xl font-black">{teamStats.grouped}</p>
            <p className="text-xs text-slate-500 font-medium">Members In Your Group</p>
          </div>
          <div className="bg-safe/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30">
            <p className="text-2xl font-black">{teamStats.pendingInvites}</p>
            <p className="text-xs text-slate-500 font-medium">Pending Invitations</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_420px] gap-6 items-start">
            <div className="space-y-6">
              {activeGroup ? (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black">{activeGroup.name}</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
                          {activeGroup.memberRole}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {activeGroup.description || "No description provided for this rescue group yet."}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 rounded-2xl bg-slate-50 dark:bg-slate-900/40 px-3 py-2">
                      Created: {formatDateTime(activeGroup.createdAt)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">Active Members</h3>
                      <span className="text-xs text-slate-500">{activeGroup.members?.length || 0} members</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(activeGroup.members || []).map((member) => (
                        <div
                          key={member.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <img
                              alt={member.displayName || "Member"}
                              className="size-11 rounded-full border-2 border-warning/20 object-cover"
                              src={
                                member.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || "R")}&background=f59e0b&color=fff`
                              }
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold truncate">{member.displayName || `Rescuer #${member.id}`}</p>
                                {member.id === currentRescuerId && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">{member.phoneNumber}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {member.memberRole} • Joined {formatDateTime(member.joinedAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">Pending Outgoing Invites</h3>
                      <span className="text-xs text-slate-500">{activeGroup.pendingInvites?.length || 0} pending</span>
                    </div>
                    {(activeGroup.pendingInvites || []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500">
                        No pending invites.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeGroup.pendingInvites.map((invite) => (
                          <div
                            key={invite.id}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/60"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold truncate">
                                  {invite.displayName || invite.phoneNumber}
                                </p>
                                <p className="text-sm text-slate-500">{invite.phoneNumber}</p>
                              </div>
                              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                {formatDateTime(invite.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-5">
                  <div>
                    <h2 className="text-xl font-black">Create Your Rescue Group</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      One rescuer can belong to one active group at a time. Create a group first, then invite teammates by phone number.
                    </p>
                  </div>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">Group Name</label>
                      <input
                        type="text"
                        value={groupForm.name}
                        onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. District 10 Flood Response Team"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1.5">Description</label>
                      <textarea
                        value={groupForm.description}
                        onChange={(e) => setGroupForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Coverage area, specialties, vehicles, or internal notes..."
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingGroup}
                      className="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">group_add</span>
                      {creatingGroup ? "Creating..." : "Create Group"}
                    </button>
                  </form>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black">Rescuer Directory</h2>
                    <p className="text-sm text-slate-500 mt-1">Browse available rescuers before inviting them into a group.</p>
                  </div>
                  <span className="text-xs text-slate-500">{directory.length} rescuers</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {directory.map((rescuer) => {
                    const isCurrentUser = rescuer.id === currentRescuerId;
                    return (
                      <div
                        key={rescuer.id}
                        className={`rounded-2xl border p-4 ${
                          isCurrentUser
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            alt={rescuer.displayName || "Rescuer"}
                            className="size-11 rounded-full border-2 border-warning/20 object-cover"
                            src={
                              rescuer.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(rescuer.displayName || "R")}&background=f59e0b&color=fff`
                            }
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold truncate">{rescuer.displayName || `Rescuer #${rescuer.id}`}</p>
                              {isCurrentUser && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{rescuer.phoneNumber || "No phone number"}</p>
                            <p className="text-xs text-slate-400 mt-1">Joined {formatDateTime(rescuer.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-black">Invite By Phone</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Leaders can invite rescuers directly by their registered phone number.
                  </p>
                </div>
                <form onSubmit={handleInviteByPhone} className="space-y-3">
                  <input
                    type="text"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    disabled={!canInvite || invitingMember}
                    placeholder="+84901234567"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!canInvite || invitingMember}
                    className="w-full inline-flex items-center justify-center gap-2 bg-warning text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-warning/90 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    {invitingMember ? "Sending Invite..." : "Send Invite"}
                  </button>
                </form>
                {!canInvite && (
                  <p className="text-xs text-slate-500">
                    {activeGroup
                      ? "Only leaders or co-leaders can invite new members."
                      : "Create a group first to start inviting rescuers."}
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-black">Incoming Group Invites</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Accept an invitation to join a rescue group before taking group-based SOS missions.
                  </p>
                </div>

                {receivedInvites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500">
                    No pending invitations.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/80 dark:bg-slate-900/40"
                      >
                        <p className="font-bold">{invite.group.name}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Invited by {invite.inviter.displayName} ({invite.inviter.phoneNumber})
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDateTime(invite.createdAt)}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleInviteResponse(invite.id, "accept")}
                            disabled={respondingInviteId === invite.id}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-base">check</span>
                            Accept
                          </button>
                          <button
                            onClick={() => handleInviteResponse(invite.id, "decline")}
                            disabled={respondingInviteId === invite.id}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
