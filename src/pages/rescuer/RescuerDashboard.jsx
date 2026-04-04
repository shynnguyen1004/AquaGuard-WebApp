import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import RescueTrackingMap from "../../components/rescue/RescueTrackingMap";
import { getStoredToken } from "../../utils/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const TABS = [
  { key: "active", label: "Active SOS", icon: "emergency" },
  { key: "my-missions", label: "My Missions", icon: "assignment_ind" },
  { key: "completed", label: "Completed", icon: "check_circle" },
];

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-safe/10 text-safe border-safe/20",
};

const statusLabels = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const urgencyColors = {
  critical: "bg-danger/10 text-danger border-danger/20",
  high: "bg-warning/10 text-warning border-warning/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-safe/10 text-safe border-safe/20",
};

function AcceptModeModal({ request, activeGroup, processing, onClose, onConfirm }) {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Choose Assignment Mode</h3>
            <p className="text-sm text-slate-500 mt-1">
              Decide whether you want to receive this SOS as an individual rescuer or on behalf of your rescue group.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="size-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-danger transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-4">
          <p className="font-bold">{request.user_name || "Citizen"}</p>
          <p className="text-sm text-slate-500 mt-1">{request.location || "Unknown location"}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => onConfirm("individual")}
            disabled={processing}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">person</span>
              <p className="font-black">Individual</p>
            </div>
            <p className="text-sm text-slate-500">
              The mission will be assigned directly to you as a single rescuer.
            </p>
          </button>

          <button
            onClick={() => onConfirm("group")}
            disabled={processing || !activeGroup}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:border-warning hover:bg-warning/5 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-warning">groups</span>
              <p className="font-black">Group</p>
            </div>
            <p className="text-sm text-slate-500">
              {activeGroup
                ? `Receive this mission under group "${activeGroup.name}".`
                : "You need an active rescue group before you can accept a mission as a group."}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN");
}

function formatTimeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SOSListItem({ request, selected, isNew, onClick }) {
  const urgencyClass = urgencyColors[request.urgency] || urgencyColors.medium;
  const statusClass = statusColors[request.status] || statusColors.pending;

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
          <p className="font-bold text-sm truncate">{request.user_name || "Anonymous"}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatTimeAgo(request.created_at)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isNew && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-danger text-white animate-pulse">
              NEW
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyClass}`}>
            {request.urgency || "medium"}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
            {statusLabels[request.status] || request.status}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 flex items-center gap-1 truncate">
        <span className="material-symbols-outlined text-[14px]">location_on</span>
        {request.location || "Unknown location"}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
        {request.description || "No description provided"}
      </p>
      {request.assigned_group_name && (
        <p className="mt-2 text-[11px] text-primary truncate">
          Group: <span className="font-semibold">{request.assigned_group_name}</span>
        </p>
      )}
      {request.status === "pending" && request.last_cancelled_by_name && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 truncate">
          Returned by: <span className="font-semibold">{request.last_cancelled_by_name}</span>
        </p>
      )}
    </button>
  );
}

function SOSDetailPanel({ request, isOwn, onAccept, onComplete, onCancel, onViewTracking, onMarkSeen }) {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (request?.id) onMarkSeen?.(request.id);
  }, [request?.id, onMarkSeen]);

  if (!request) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-slate-500">
        Select a request to view details.
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
          <p className="font-black text-base truncate">{request.user_name || "Anonymous"}</p>
          <p className="text-xs text-slate-500 mt-1">{formatTime(request.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[request.urgency] || urgencyColors.medium}`}>
            {request.urgency || "medium"}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[request.status] || statusColors.pending}`}>
            {statusLabels[request.status] || request.status}
          </span>
        </div>
      </div>

      <div className="text-sm space-y-2">
        <p className="flex items-start gap-1.5">
          <span className="material-symbols-outlined text-base text-danger">location_on</span>
          <span>{request.location || "Unknown location"}</span>
        </p>
        <p className="text-slate-600 dark:text-slate-300">{request.description || "No description provided"}</p>
        {request.assigned_group_name && (
          <p className="text-xs text-primary flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">groups</span>
            Group assignment: {request.assigned_group_name}
          </p>
        )}
        {request.latitude && request.longitude && (
          <p className="text-xs text-safe flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">my_location</span>
            GPS: {Number(request.latitude).toFixed(5)}, {Number(request.longitude).toFixed(5)}
          </p>
        )}
        {request.status === "pending" && request.last_cancelled_by_name && (
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">info</span>
            Returned by {request.last_cancelled_by_name}
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
              className="h-20 w-28 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 cursor-pointer"
              onClick={() => window.open(img, "_blank")}
            />
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 justify-end">
        {request.status === "pending" && onAccept && (
          <button
            onClick={() => handleAction(() => onAccept(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Accept
          </button>
        )}
        {isOwn && request.status === "assigned" && onAccept && (
          <button
            onClick={() => handleAction(() => onAccept(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            Start Mission
          </button>
        )}
        {isOwn && request.status === "in_progress" && request.latitude && onViewTracking && (
          <button
            onClick={() => onViewTracking(request)}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 animate-pulse"
          >
            <span className="material-symbols-outlined text-sm">map</span>
            Tracking
          </button>
        )}
        {isOwn && request.status === "in_progress" && onComplete && (
          <button
            onClick={() => handleAction(() => onComplete(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-safe text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-safe/90 transition-all shadow-md shadow-safe/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            Complete
          </button>
        )}
        {isOwn && request.status === "in_progress" && onCancel && (
          <button
            onClick={() => handleAction(() => onCancel(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">undo</span>
            Cancel Mission
          </button>
        )}
      </div>
    </div>
  );
}

export default function RescuerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState(null);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [seenRequestIds, setSeenRequestIds] = useState([]);
  const [acceptModeRequest, setAcceptModeRequest] = useState(null);
  const [acceptingWithMode, setAcceptingWithMode] = useState(false);

  const fetchRequests = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/sos/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

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
      }
    } catch (err) {
      console.error("Failed to fetch rescue group context:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchGroupContext();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
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

  const performAccept = async (requestId, acceptMode = "individual") => {
    const token = getStoredToken();
    let latitude = null;
    let longitude = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
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
        body: JSON.stringify({ latitude, longitude, acceptMode }),
      });
      const json = await res.json();
      if (json.success) {
        fetchRequests();
        window.dispatchEvent(
          new CustomEvent("sos_changed", { detail: { type: "accepted", requestId } })
        );
        const acceptedRequest = json.data;
        if (acceptedRequest.latitude && acceptedRequest.longitude) {
          setTrackingRequest(acceptedRequest);
        }
      } else {
        alert(json.message || "Failed to accept request");
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleAccept = (requestId) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;

    if (!activeGroup) {
      performAccept(requestId, "individual");
      return;
    }

    setAcceptModeRequest(request);
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
        fetchRequests();
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
        fetchRequests();
        window.dispatchEvent(
          new CustomEvent("sos_changed", { detail: { type: "cancelled", requestId } })
        );
      }
    } catch (err) {
      console.error("Failed to cancel request:", err);
    }
  };

  const handleConfirmAcceptMode = async (mode) => {
    if (!acceptModeRequest) return;
    setAcceptingWithMode(true);
    try {
      await performAccept(acceptModeRequest.id, mode);
      setAcceptModeRequest(null);
    } finally {
      setAcceptingWithMode(false);
    }
  };

  const handleViewTracking = (request) => {
    setTrackingRequest(request);
  };

  const activeRequests = requests.filter((r) => r.status === "pending");
  const myMissions = requests.filter(
    (r) => r.assigned_to == rescuerUid && (r.status === "assigned" || r.status === "in_progress")
  );
  const completed = requests.filter((r) => r.assigned_to == rescuerUid && r.status === "resolved");

  const filteredRequests = activeTab === "active"
    ? activeRequests
    : activeTab === "my-missions"
      ? myMissions
      : completed;

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
    activeSOS: activeRequests.length,
    myMissions: myMissions.length,
    completed: completed.length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined filled-icon text-warning text-2xl">assignment_ind</span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">My Missions</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage requests assigned to you and track active rescue missions
          </p>
          {activeGroup && (
            <p className="text-xs text-primary mt-2 font-medium">
              Active group: {activeGroup.name} • You can accept SOS as an individual or as a group.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-danger/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined filled-icon text-danger">emergency</span>
            </div>
            <p className="text-2xl font-black">{stats.activeSOS}</p>
            <p className="text-xs text-slate-500 font-medium">Active SOS</p>
          </div>
          <div className="bg-primary/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined filled-icon text-primary">assignment_ind</span>
            </div>
            <p className="text-2xl font-black">{stats.myMissions}</p>
            <p className="text-xs text-slate-500 font-medium">My Missions</p>
          </div>
          <div className="bg-safe/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined filled-icon text-safe">check_circle</span>
            </div>
            <p className="text-2xl font-black">{stats.completed}</p>
            <p className="text-xs text-slate-500 font-medium">Completed</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === tab.key ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"
              }`}>
                {tab.key === "active" ? stats.activeSOS : tab.key === "my-missions" ? stats.myMissions : stats.completed}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              {activeTab === "active" ? "emergency" : activeTab === "my-missions" ? "assignment_ind" : "check_circle"}
            </span>
            <p className="text-lg font-bold text-slate-400 dark:text-slate-500">
              {activeTab === "active" ? "No active SOS requests" : activeTab === "my-missions" ? "No assigned missions" : "No completed missions"}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
              {activeTab === "active" ? "All clear — no one needs help right now" : "Accept SOS requests to start a mission"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Request Queue ({sortedRequests.length})
                </p>
                <p className="text-[11px] text-slate-400">Newest first</p>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {sortedRequests.map((req) => {
                  const isNew =
                    req.status === "pending" &&
                    !seenRequestIds.includes(req.id) &&
                    Date.now() - new Date(req.created_at || 0).getTime() < 30 * 60 * 1000;
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
              onAccept={activeTab === "active" || activeTab === "my-missions" ? handleAccept : undefined}
              onComplete={activeTab === "my-missions" ? handleComplete : undefined}
              onCancel={activeTab === "my-missions" ? handleCancel : undefined}
              onViewTracking={activeTab === "my-missions" ? handleViewTracking : undefined}
              onMarkSeen={markAsSeen}
            />
          </div>
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
            fetchRequests();
          }}
          onComplete={() => handleComplete(trackingRequest.id)}
          onCancel={() => handleCancel(trackingRequest.id)}
        />
      )}

      {acceptModeRequest && (
        <AcceptModeModal
          request={acceptModeRequest}
          activeGroup={activeGroup}
          processing={acceptingWithMode}
          onClose={() => {
            if (!acceptingWithMode) setAcceptModeRequest(null);
          }}
          onConfirm={handleConfirmAcceptMode}
        />
      )}
    </div>
  );
}
