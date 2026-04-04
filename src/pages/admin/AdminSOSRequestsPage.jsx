import { useEffect, useMemo, useState } from "react";
import RescueTrackingMap from "../../components/rescue/RescueTrackingMap";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const TABS = [
  { key: "all", label: "All Requests", icon: "list" },
  { key: "pending", label: "Pending", icon: "schedule" },
  { key: "in_progress", label: "In Progress", icon: "local_shipping" },
  { key: "resolved", label: "Resolved", icon: "check_circle" },
];

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-safe/10 text-safe border-safe/20",
};

const urgencyColors = {
  critical: "bg-danger/10 text-danger border-danger/20",
  high: "bg-warning/10 text-warning border-warning/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-safe/10 text-safe border-safe/20",
};

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

function QueueItem({ request, selected, isNew, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{request.user_name || "Anonymous"}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatTimeAgo(request.created_at)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isNew && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-danger text-white animate-pulse">
              NEW
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[request.urgency] || urgencyColors.medium}`}>
            {request.urgency || "medium"}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[request.status] || statusColors.pending}`}>
            {request.status}
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
      <p className="mt-1 text-[11px] text-slate-500 truncate">
        Assigned to:{" "}
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {request.assigned_name || "Unassigned"}
        </span>
      </p>
    </button>
  );
}

function RequestDetail({
  request,
  rescuers,
  selectedRescuerByRequest,
  assigningRequestId,
  completingRequestId,
  onSelectRescuer,
  onAssign,
  onComplete,
  onViewTracking,
  onMarkSeen,
}) {
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

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-base truncate">{request.user_name || "Anonymous"}</p>
          <p className="text-xs text-slate-500 mt-1">
            {request.created_at ? new Date(request.created_at).toLocaleString("vi-VN") : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[request.urgency] || urgencyColors.medium}`}>
            {request.urgency || "medium"}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[request.status] || statusColors.pending}`}>
            {request.status}
          </span>
        </div>
      </div>

      <div className="text-sm space-y-2">
        <p className="flex items-start gap-1.5">
          <span className="material-symbols-outlined text-base text-danger">location_on</span>
          <span>{request.location || "Unknown location"}</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className="material-symbols-outlined text-base text-primary">local_fire_department</span>
          <span>
            Assigned to: <span className="font-semibold">{request.assigned_name || "Unassigned"}</span>
          </span>
        </p>
        <p className="text-slate-600 dark:text-slate-300">{request.description || "No description provided"}</p>
        {request.latitude && request.longitude && (
          <p className="text-xs text-safe flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">my_location</span>
            GPS: {Number(request.latitude).toFixed(5)}, {Number(request.longitude).toFixed(5)}
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
        {request.status === "pending" && (
          <>
            <select
              value={selectedRescuerByRequest[request.id] || ""}
              onChange={(e) => onSelectRescuer(request.id, Number(e.target.value))}
              className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 min-w-[190px]"
            >
              <option value="">Assign to rescuer...</option>
              {rescuers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName || `Rescuer #${r.id}`}
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(request.id)}
              disabled={!selectedRescuerByRequest[request.id] || assigningRequestId === request.id}
              className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${assigningRequestId === request.id ? "animate-spin" : ""}`}>
                {assigningRequestId === request.id ? "progress_activity" : "assignment_ind"}
              </span>
              Assign
            </button>
          </>
        )}

        {(request.status === "assigned" || request.status === "in_progress") && (
          <button
            onClick={() => onViewTracking(request)}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-sm">map</span>
            Tracking
          </button>
        )}

        {request.status === "in_progress" && (
          <button
            onClick={() => onComplete(request.id)}
            disabled={completingRequestId === request.id}
            className="inline-flex items-center gap-1.5 bg-safe text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-safe/90 transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${completingRequestId === request.id ? "animate-spin" : ""}`}>
              {completingRequestId === request.id ? "progress_activity" : "done_all"}
            </span>
            Complete (Admin)
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminSOSRequestsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [requests, setRequests] = useState([]);
  const [rescuers, setRescuers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [seenRequestIds, setSeenRequestIds] = useState([]);
  const [selectedRescuerByRequest, setSelectedRescuerByRequest] = useState({});
  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [completingRequestId, setCompletingRequestId] = useState(null);

  const fetchRequests = async () => {
    const token = localStorage.getItem("aquaguard_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/sos/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setRequests(json.data);
    } catch (err) {
      console.error("Failed to fetch SOS requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRescuers = async () => {
    const token = localStorage.getItem("aquaguard_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setRescuers((json.data || []).filter((u) => u.role === "rescuer"));
      }
    } catch (err) {
      console.error("Failed to fetch rescuers:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchRescuers();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sos_seen");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setSeenRequestIds(parsed);
    } catch {
      // ignore invalid data
    }
  }, []);

  const markAsSeen = (requestId) => {
    if (!requestId) return;
    setSeenRequestIds((prev) => {
      if (prev.includes(requestId)) return prev;
      const next = [...prev, requestId];
      localStorage.setItem("admin_sos_seen", JSON.stringify(next));
      return next;
    });
  };

  const handleAssign = async (requestId) => {
    const token = localStorage.getItem("aquaguard_token");
    const rescuerId = selectedRescuerByRequest[requestId];
    if (!token || !rescuerId) return;

    setAssigningRequestId(requestId);
    try {
      const res = await fetch(`${API_BASE}/sos/${requestId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rescuerId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchRequests();
        window.dispatchEvent(new CustomEvent("sos_changed", { detail: { type: "assigned", requestId } }));
      } else {
        alert(json.message || "Assign failed");
      }
    } catch (err) {
      console.error("Failed to assign request:", err);
    } finally {
      setAssigningRequestId(null);
    }
  };

  const handleComplete = async (requestId) => {
    const token = localStorage.getItem("aquaguard_token");
    if (!token) return;

    setCompletingRequestId(requestId);
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
        window.dispatchEvent(new CustomEvent("sos_changed", { detail: { type: "completed", requestId } }));
      } else {
        alert(json.message || "Complete failed");
      }
    } catch (err) {
      console.error("Failed to complete request:", err);
    } finally {
      setCompletingRequestId(null);
    }
  };

  const filtered =
    activeTab === "all"
      ? requests
      : activeTab === "in_progress"
        ? requests.filter((r) => r.status === "assigned" || r.status === "in_progress")
        : requests.filter((r) => r.status === activeTab);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const urgencyRank = { critical: 3, high: 2, medium: 1, low: 0 };
    arr.sort((a, b) => {
      const statusPriority = (s) => (s === "pending" ? 2 : s === "assigned" || s === "in_progress" ? 1 : 0);
      const sp = statusPriority(b.status) - statusPriority(a.status);
      if (sp !== 0) return sp;
      const up = (urgencyRank[b.urgency] || 0) - (urgencyRank[a.urgency] || 0);
      if (up !== 0) return up;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return arr;
  }, [filtered]);

  const selectedRequest = sorted.find((r) => r.id === selectedRequestId) || sorted[0] || null;

  useEffect(() => {
    if (!sorted.length) {
      setSelectedRequestId(null);
      return;
    }
    if (!selectedRequestId || !sorted.some((r) => r.id === selectedRequestId)) {
      setSelectedRequestId(sorted[0].id);
    }
  }, [sorted, selectedRequestId]);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    in_progress: requests.filter((r) => r.status === "assigned" || r.status === "in_progress").length,
    resolved: requests.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-danger filled-icon">emergency</span>
              SOS Requests
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Admin queue for assign and completion control
            </p>
          </div>
          <button
            onClick={fetchRequests}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: "all", label: "Total", icon: "format_list_numbered", bg: "bg-slate-100 dark:bg-slate-800", iconColor: "text-slate-500" },
            { key: "pending", label: "Pending", icon: "schedule", bg: "bg-warning/10", iconColor: "text-warning" },
            { key: "in_progress", label: "In Progress", icon: "local_shipping", bg: "bg-primary/10", iconColor: "text-primary" },
            { key: "resolved", label: "Resolved", icon: "check_circle", bg: "bg-safe/10", iconColor: "text-safe" },
          ].map((stat) => (
            <div key={stat.key} className={`${stat.bg} rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-700/30`}>
              <div className="size-10 rounded-xl bg-white/60 dark:bg-white/5 flex items-center justify-center">
                <span className={`material-symbols-outlined filled-icon ${stat.iconColor}`}>{stat.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-black">{counts[stat.key]}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
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
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.key ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">inbox</span>
            <p className="text-lg font-bold text-slate-400 dark:text-slate-500">No requests found</p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">There are no SOS requests in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Request Queue ({sorted.length})
                </p>
                <p className="text-[11px] text-slate-400">Priority sorted</p>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {sorted.map((request) => {
                  const isNew =
                    request.status === "pending" &&
                    !seenRequestIds.includes(request.id) &&
                    Date.now() - new Date(request.created_at || 0).getTime() < 30 * 60 * 1000;

                  return (
                    <QueueItem
                      key={request.id}
                      request={request}
                      selected={selectedRequest?.id === request.id}
                      isNew={isNew}
                      onSelect={() => setSelectedRequestId(request.id)}
                    />
                  );
                })}
              </div>
            </div>

            <RequestDetail
              request={selectedRequest}
              rescuers={rescuers}
              selectedRescuerByRequest={selectedRescuerByRequest}
              assigningRequestId={assigningRequestId}
              completingRequestId={completingRequestId}
              onSelectRescuer={(requestId, rescuerId) =>
                setSelectedRescuerByRequest((prev) => ({ ...prev, [requestId]: rescuerId }))
              }
              onAssign={handleAssign}
              onComplete={handleComplete}
              onViewTracking={(request) => setTrackingRequest(request)}
              onMarkSeen={markAsSeen}
            />
          </div>
        )}
      </div>

      {trackingRequest && (
        <RescueTrackingMap
          requestId={trackingRequest.id}
          userRole="rescuer"
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
        />
      )}
    </div>
  );
}
