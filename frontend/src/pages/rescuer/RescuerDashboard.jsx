import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import RescueTrackingMap from "../../components/rescue/RescueTrackingMap";
import StatusPills from "../../components/rescue/StatusPills";
import NotificationBell from "../../components/notifications/NotificationBell";
import { getStoredToken } from "../../utils/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

function displayUrgency(urgency, t) {
  const u = urgency || "medium";
  const keys = {
    low: "sosPage.low",
    medium: "sosPage.medium",
    high: "sosPage.high",
    critical: "sosPage.critical",
  };
  return t(keys[u] || "sosPage.medium");
}

function formatTimeAgo(iso, t) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("rescueQueue.timeJustNow");
  if (mins < 60) return t("rescueQueue.timeMinAgo").replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("rescueQueue.timeHourAgo").replace("{n}", String(hours));
  return t("rescueQueue.timeDayAgo").replace("{n}", String(Math.floor(hours / 24)));
}

const urgencyColors = {
  critical: "bg-danger/10 text-danger border-danger/20",
  high: "bg-warning/10 text-warning border-warning/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-safe/10 text-safe border-safe/20",
};



function formatTime(iso, language) {
  if (!iso) return "";
  const locale = language === "vi" ? "vi-VN" : "en-US";
  return new Date(iso).toLocaleString(locale);
}

function SOSListItem({ request, selected, isNew, onClick }) {
  const { t } = useLanguage();
  const urgencyClass = urgencyColors[request.urgency] || urgencyColors.medium;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{request.user_name || t("rescueQueue.anonymous")}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatTimeAgo(request.created_at, t)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isNew && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-danger text-white animate-pulse">
              {t("rescueQueue.newBadge")}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyClass}`}>
            {displayUrgency(request.urgency, t)}
          </span>
          <StatusPills status={request.status} />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 flex items-center gap-1 truncate">
        <span className="material-symbols-outlined text-[14px]">location_on</span>
        {request.location || t("sosPage.unknownLocation")}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
        {request.description || t("rescueQueue.noDescription")}
      </p>
      {request.assigned_group_name && (
        <p className="mt-2 text-[11px] text-primary truncate">
          {t("rescueQueue.group")}{" "}
          <span className="font-semibold">{request.assigned_group_name}</span>
        </p>
      )}
      {request.status === "pending" && request.last_cancelled_by_name && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 truncate">
          {t("rescueQueue.returnedBy")}{" "}
          <span className="font-semibold">{request.last_cancelled_by_name}</span>
        </p>
      )}
    </button>
  );
}

function SOSDetailPanel({ request, isOwn, onAccept, onComplete, onCancel, onViewTracking, onMarkSeen }) {
  const [processing, setProcessing] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (request?.id) onMarkSeen?.(request.id);
  }, [request?.id, onMarkSeen]);

  if (!request) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-slate-500">
        {t("rescueQueue.selectRequest")}
      </div>
    );
  }

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      await action();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-base truncate">{request.user_name || t("rescueQueue.anonymous")}</p>
          <p className="text-xs text-slate-500 mt-1">{formatTime(request.created_at, language)}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[request.urgency] || urgencyColors.medium}`}>
            {displayUrgency(request.urgency, t)}
          </span>
          <StatusPills status={request.status} />
        </div>
      </div>

      <div className="text-sm space-y-2">
        <p className="flex items-start gap-1.5">
          <span className="material-symbols-outlined text-base text-danger">location_on</span>
          <span>{request.location || t("sosPage.unknownLocation")}</span>
        </p>
        <p className="text-slate-600 dark:text-slate-300">{request.description || t("rescueQueue.noDescription")}</p>
        {request.assigned_group_name && (
          <p className="text-xs text-primary flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">groups</span>
            {t("rescueQueue.groupAssignment")} {request.assigned_group_name}
          </p>
        )}
        {request.latitude && request.longitude && (
          <p className="text-xs text-safe flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">my_location</span>
            {t("rescueQueue.gps")}: {Number(request.latitude).toFixed(5)}, {Number(request.longitude).toFixed(5)}
          </p>
        )}
        {request.status === "pending" && request.last_cancelled_by_name && (
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">info</span>
            {t("rescueQueue.returnedByLine").replace("{name}", request.last_cancelled_by_name)}
          </p>
        )}
      </div>

      {request.images && request.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {request.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`SOS ${i + 1}`}
              className="h-40 w-56 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(img, "_blank")}
            />
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 justify-end">
        {request.status === "assigned" && onAccept && (
          <button
            onClick={() => handleAction(() => onAccept(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <span className="inline-block size-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                {t("rescueQueue.accepting")}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                {t("rescueQueue.startMission")}
              </>
            )}
          </button>
        )}
        {isOwn && request.status === "in_progress" && request.latitude && onViewTracking && (
          <button
            onClick={() => onViewTracking(request)}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 animate-pulse"
          >
            <span className="material-symbols-outlined text-sm">map</span>
            {t("rescueQueue.tracking")}
          </button>
        )}
        {isOwn && request.status === "in_progress" && onComplete && (
          <button
            onClick={() => handleAction(() => onComplete(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-safe text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-safe/90 transition-all shadow-md shadow-safe/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            {t("rescueQueue.complete")}
          </button>
        )}
        {isOwn && request.status === "in_progress" && onCancel && (
          <button
            onClick={() => handleAction(() => onCancel(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">undo</span>
            {t("rescueQueue.cancelMission")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RescuerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("to-start");
  const [teamRequests, setTeamRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState(null);
  const [canAcceptMission, setCanAcceptMission] = useState(false);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [seenRequestIds, setSeenRequestIds] = useState([]);


  const fetchGroupContext = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setActiveGroup(json.data?.group || null);
        setCanAcceptMission(json.data?.canAcceptMission ?? false);
      }
    } catch (err) {
      console.error("Failed to fetch rescue group context:", err);
    }
  };

  const fetchTeamRequests = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/sos/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setTeamRequests(json.data);
        if (json.group) setActiveGroup(json.group);
      }
    } catch (err) {
      console.error("Failed to fetch team requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupContext();
    fetchTeamRequests();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchTeamRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleProfileUpdated = () => {
      fetchTeamRequests();
    };
    window.addEventListener("profile_updated", handleProfileUpdated);
    return () => window.removeEventListener("profile_updated", handleProfileUpdated);
  }, []);

  const rescuerUid = user?.uid?.startsWith("phone_")
    ? parseInt(user.uid.replace("phone_", ""), 10)
    : user?.uid || "";
  const seenStorageKey = `rescuer_seen_requests_${rescuerUid || "anon"}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(seenStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setSeenRequestIds(parsed);
    } catch {
      // ignore invalid data
    }
  }, [seenStorageKey]);

  const markAsSeen = (requestId) => {
    if (!requestId) return;
    setSeenRequestIds((prev) => {
      if (prev.includes(requestId)) return prev;
      const next = [...prev, requestId];
      localStorage.setItem(seenStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const performAccept = async (requestId) => {
    const token = getStoredToken();
    let latitude = null;
    let longitude = null;
    // Best-effort GPS seed. Tracking hook refines accuracy via watchPosition right after accept,
    // so a fast cached/low-accuracy fix is enough — avoid the prior 10s block on getCurrentPosition.
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            maximumAge: 30000,
            timeout: 3000,
          });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        console.warn("Could not get rescuer GPS, continuing without it");
      }
    }

    try {
      const res = await fetch(`${API_BASE}/sos/${requestId}/accept`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeamRequests();
        window.dispatchEvent(
          new CustomEvent("sos_changed", { detail: { type: "accepted", requestId } })
        );
        const acceptedRequest = json.data;
        if (acceptedRequest.latitude && acceptedRequest.longitude) {
          setTrackingRequest(acceptedRequest);
        }
      } else {
        alert(json.message || t("rescueQueue.acceptFailed"));
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleAccept = (requestId) => {
    // Defensive: the Accept button is normally hidden when !canAcceptMission, but
    // surface a clear message if it ever fires (e.g. stale state after a role demotion).
    if (!activeGroup) {
      alert(t("rescueQueue.cannotAcceptNoTeam"));
      return;
    }
    if (!canAcceptMission) {
      alert(t("rescueQueue.cannotAcceptNotLeader"));
      return;
    }
    performAccept(requestId);
  };

  const handleComplete = async (requestId) => {
    const token = getStoredToken();
    try {
      const res = await fetch(`${API_BASE}/sos/${requestId}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setTrackingRequest(null);
        fetchTeamRequests();
        window.dispatchEvent(
          new CustomEvent("sos_changed", { detail: { type: "completed", requestId } })
        );
      }
    } catch (err) {
      console.error("Failed to complete request:", err);
    }
  };

  const handleCancel = async (requestId) => {
    const token = getStoredToken();
    try {
      const res = await fetch(`${API_BASE}/sos/${requestId}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setTrackingRequest(null);
        fetchTeamRequests();
        window.dispatchEvent(
          new CustomEvent("sos_changed", { detail: { type: "cancelled", requestId } })
        );
      }
    } catch (err) {
      console.error("Failed to cancel request:", err);
    }
  };



  const handleViewTracking = (request) => {
    setTrackingRequest(request);
  };

  const teamToStart = teamRequests.filter((r) => r.status === "assigned");
  const teamInProgress = teamRequests.filter((r) => r.status === "in_progress");
  const teamCompleted = teamRequests.filter((r) => r.status === "resolved");

  const filteredRequests = activeTab === "to-start"
    ? teamToStart
    : activeTab === "team-missions"
      ? teamInProgress
      : teamCompleted;

  const sortedRequests = useMemo(() => {
    const arr = [...filteredRequests];
    arr.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return arr;
  }, [filteredRequests]);

  const selectedRequest = sortedRequests.find((r) => r.id === selectedRequestId) || sortedRequests[0] || null;

  useEffect(() => {
    if (!sortedRequests.length) {
      setSelectedRequestId(null);
      return;
    }
    if (!selectedRequestId || !sortedRequests.some((r) => r.id === selectedRequestId)) {
      setSelectedRequestId(sortedRequests[0].id);
    }
  }, [sortedRequests, selectedRequestId]);

  const stats = {
    toStart: teamToStart.length,
    teamMissions: teamInProgress.length,
    completed: teamCompleted.length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined filled-icon text-warning text-2xl">assignment_ind</span>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{t("rescueQueue.rescuerTitle")}</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("rescueQueue.rescuerSubtitle")}
            </p>
            {activeGroup && (
              <p className="text-xs text-primary mt-2 font-medium">
                {t("rescueQueue.activeGroup").replace("{name}", activeGroup.name)}
              </p>
            )}
          </div>
          <div className="hidden lg:block shrink-0">
            <NotificationBell />
          </div>
        </div>

        {/* ── No team: full-page prompt ── */}
        {!loading && !activeGroup && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-3xl bg-warning/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-warning text-4xl">groups</span>
            </div>
            <h2 className="text-xl font-black mb-2">{t("rescueQueue.noTeamFullTitle")}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
              {t("rescueQueue.noTeamFullHint")}
            </p>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("app_navigate", { detail: { page: "rescuer-team" } }));
              }}
              className="inline-flex items-center gap-2 bg-warning text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-warning/90 active:scale-[0.97] transition-all shadow-lg shadow-warning/20"
            >
              <span className="material-symbols-outlined text-base">groups</span>
              {t("rescueQueue.goToTeamPage")}
            </button>
          </div>
        )}

        {/* ── Not leader/co-leader banner (has team but can't accept) ── */}
        {!loading && activeGroup && !canAcceptMission && (
          <div className="rounded-2xl border border-warning/30 bg-warning/5 dark:bg-warning/10 p-4 flex items-start gap-3">
            <div className="size-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-warning text-xl">info</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-warning">
                {t("rescueQueue.cannotAcceptNotLeader")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("rescueQueue.notLeaderBanner")}
              </p>
            </div>
          </div>
        )}

        {/* Stat cards double as tab buttons — click to filter the queue below. */}
        {activeGroup && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "to-start",      value: stats.toStart,      labelKey: "rescueQueue.rescuerStatToStart",    icon: "assignment_late", bg: "bg-warning/10", iconColor: "text-warning", ring: "ring-warning" },
            { key: "team-missions", value: stats.teamMissions, labelKey: "rescueQueue.rescuerStatMissions",   icon: "assignment_ind",  bg: "bg-primary/10", iconColor: "text-primary", ring: "ring-primary" },
            { key: "completed",     value: stats.completed,    labelKey: "rescueQueue.rescuerStatCompleted",  icon: "check_circle",    bg: "bg-safe/10",    iconColor: "text-safe",    ring: "ring-safe" },
          ].map((stat) => {
            const isActive = activeTab === stat.key;
            return (
              <button
                key={stat.key}
                type="button"
                onClick={() => setActiveTab(stat.key)}
                aria-pressed={isActive}
                className={`${stat.bg} rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30 text-left transition-all hover:brightness-95 active:scale-[0.99] ${
                  isActive ? `ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 ${stat.ring} shadow-md` : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`material-symbols-outlined filled-icon ${stat.iconColor}`}>{stat.icon}</span>
                </div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium">{t(stat.labelKey)}</p>
              </button>
            );
          })}
        </div>
        )}

        {activeGroup && (
        <>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              {activeTab === "to-start" ? "assignment_late" : activeTab === "team-missions" ? "assignment_ind" : "check_circle"}
            </span>
            <p className="text-lg font-bold text-slate-400 dark:text-slate-500">
              {activeTab === "to-start"
                ? t("rescueQueue.rescuerEmptyToStartTitle")
                : activeTab === "team-missions"
                  ? t("rescueQueue.rescuerEmptyMissionsTitle")
                  : t("rescueQueue.rescuerEmptyCompletedTitle")}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
              {activeTab === "to-start"
                ? t("rescueQueue.rescuerEmptyToStartHint")
                : activeTab === "team-missions"
                  ? t("rescueQueue.rescuerEmptyMissionsHint")
                  : t("rescueQueue.rescuerEmptyCompletedHint")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("rescueQueue.requestQueue").replace("{count}", String(sortedRequests.length))}
                </p>
                <p className="text-[11px] text-slate-400">{t("rescueQueue.newestFirst")}</p>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {sortedRequests.map((req) => {
                  const isNew =
                    req.status === "assigned" &&
                    !seenRequestIds.includes(req.id) &&
                    Date.now() - new Date(req.assigned_at || req.created_at || 0).getTime() < 30 * 60 * 1000;
                  return (
                    <SOSListItem
                      key={req.id}
                      request={req}
                      selected={selectedRequest?.id === req.id}
                      isNew={isNew}
                      onClick={() => setSelectedRequestId(req.id)}
                    />
                  );
                })}
              </div>
            </div>

            <SOSDetailPanel
              request={selectedRequest}
              isOwn={selectedRequest?.assigned_to == rescuerUid}
              onAccept={canAcceptMission && activeTab === "to-start" ? handleAccept : undefined}
              onComplete={canAcceptMission && activeTab === "team-missions" ? handleComplete : undefined}
              onCancel={canAcceptMission && activeTab === "team-missions" ? handleCancel : undefined}
              onViewTracking={activeTab === "team-missions" ? handleViewTracking : undefined}
              onMarkSeen={markAsSeen}
            />
          </div>
        )}
        </>
        )}
      </div>

      {trackingRequest && (
        <RescueTrackingMap
          requestId={trackingRequest.id}
          userRole="rescuer"
          trackingRole={trackingRequest?.assigned_to == rescuerUid ? "rescuer" : null}
          shareLocation={trackingRequest?.assigned_to == rescuerUid}
          citizenName={trackingRequest.user_name}
          citizenPhone={trackingRequest.user_phone}
          rescuerName={trackingRequest.assigned_name}
          teamName={trackingRequest.assigned_group_name}
          citizenPos={
            trackingRequest.latitude && trackingRequest.longitude
              ? { lat: Number(trackingRequest.latitude), lng: Number(trackingRequest.longitude) }
              : null
          }
          rescuerPos={
            trackingRequest.rescuer_latitude && trackingRequest.rescuer_longitude
              ? { lat: Number(trackingRequest.rescuer_latitude), lng: Number(trackingRequest.rescuer_longitude) }
              : null
          }
          onClose={() => {
            setTrackingRequest(null);
            fetchTeamRequests();
          }}
          onComplete={() => handleComplete(trackingRequest.id)}
          onCancel={() => handleCancel(trackingRequest.id)}
        />
      )}


    </div>
  );
}
