import { useEffect, useMemo, useState } from "react";
import RescueTrackingMap from "../components/rescue/RescueTrackingMap";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const tabs = [
  { key: "all", label: "All Requests", icon: "list" },
  { key: "pending", label: "Pending", icon: "schedule" },
  { key: "in_progress", label: "In Progress", icon: "local_shipping" },
  { key: "resolved", label: "Resolved", icon: "check_circle" },
];

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
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
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function QueueItem({ request, selected, isNew, onSelect, onAccept }) {
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
        Assigned to: <span className="font-semibold text-slate-600 dark:text-slate-300">{request.assigned_name || "Unassigned"}</span>
      </p>

      {request.status === "pending" && onAccept && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept(request.id);
            }}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Accept
          </button>
        </div>
      )}
    </button>
  );
}

function RequestDetail({ request, onAccept, onComplete, onViewTracking, onMarkSeen }) {
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
          <span>Assigned to: <span className="font-semibold">{request.assigned_name || "Unassigned"}</span></span>
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
          <button
            onClick={() => handleAction(() => onAccept(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Accept
          </button>
        )}
        {request.status === "in_progress" && request.latitude && (
          <button
            onClick={() => onViewTracking(request)}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 animate-pulse"
          >
            <span className="material-symbols-outlined text-sm">map</span>
            Tracking
          </button>
        )}
        {request.status === "in_progress" && (
          <button
            onClick={() => handleAction(() => onComplete(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-safe text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-safe/90 transition-all shadow-md shadow-safe/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

export default function RescueRequestPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [seenRequestIds, setSeenRequestIds] = useState([]);

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
      if (json.success) {
        setRequests(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rescue_request_seen");
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
      localStorage.setItem("rescue_request_seen", JSON.stringify(next));
      return next;
    });
  };

  const handleAccept = async (requestId) => {
    const token = localStorage.getItem("aquaguard_token");

    // Get rescuer's current GPS
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
        console.warn("Could not get rescuer GPS");
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
        fetchRequests();
        // Auto-open tracking map
        const acceptedRequest = json.data;
        if (acceptedRequest.latitude && acceptedRequest.longitude) {
          setTrackingRequest(acceptedRequest);
        }
        window.dispatchEvent(new CustomEvent("sos_changed", { detail: { type: "accepted", requestId } }));
      }
    } catch (err) {
      console.error("Failed to accept:", err);
    }
  };

  const handleComplete = async (requestId) => {
    const token = localStorage.getItem("aquaguard_token");
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
      }
    } catch (err) {
      console.error("Failed to complete:", err);
    }
  };

  const handleViewTracking = (request) => {
    setTrackingRequest(request);
  };

  const filtered =
    activeTab === "all"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const urgencyRank = { critical: 3, high: 2, medium: 1, low: 0 };
    copy.sort((a, b) => {
      const statusPriority = (s) => (s === "pending" ? 2 : s === "in_progress" ? 1 : 0);
      const sp = statusPriority(b.status) - statusPriority(a.status);
      if (sp !== 0) return sp;
      const up = (urgencyRank[b.urgency] || 0) - (urgencyRank[a.urgency] || 0);
      if (up !== 0) return up;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return copy;
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
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    resolved: requests.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Rescue Requests
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage and track rescue requests
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total",
              value: counts.all,
              icon: "format_list_numbered",
              bg: "bg-slate-100 dark:bg-slate-800",
              iconColor: "text-slate-500",
            },
            {
              label: "Pending",
              value: counts.pending,
              icon: "schedule",
              bg: "bg-warning/10",
              iconColor: "text-warning",
            },
            {
              label: "In Progress",
              value: counts.in_progress,
              icon: "local_shipping",
              bg: "bg-primary/10",
              iconColor: "text-primary",
            },
            {
              label: "Resolved",
              value: counts.resolved,
              icon: "check_circle",
              bg: "bg-safe/10",
              iconColor: "text-safe",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-700/30`}
            >
              <div
                className={`size-10 rounded-xl bg-white/60 dark:bg-white/5 flex items-center justify-center`}
              >
                <span
                  className={`material-symbols-outlined filled-icon ${stat.iconColor}`}
                >
                  {stat.icon}
                </span>
              </div>
              <div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.key
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:text-primary"
                }`}
            >
              <span className="material-symbols-outlined text-base">
                {tab.icon}
              </span>
              {tab.label}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.key
                  ? "bg-white/20"
                  : "bg-slate-100 dark:bg-slate-700"
                  }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Request List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              inbox
            </span>
            <p className="text-lg font-bold text-slate-400 dark:text-slate-500">
              No requests found
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
              There are no rescue requests in this category
            </p>
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
                      onAccept={handleAccept}
                    />
                  );
                })}
              </div>
            </div>

            <RequestDetail
              request={selectedRequest}
              onAccept={handleAccept}
              onComplete={handleComplete}
              onViewTracking={handleViewTracking}
              onMarkSeen={markAsSeen}
            />
          </div>
        )}
      </div>

      {/* Tracking Map Overlay */}
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
