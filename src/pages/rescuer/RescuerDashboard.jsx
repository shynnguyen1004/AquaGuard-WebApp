import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import RescueTrackingMap from "../../components/rescue/RescueTrackingMap";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const TABS = [
  { key: "active", label: "Active SOS", icon: "emergency" },
  { key: "my-missions", label: "My Missions", icon: "assignment_ind" },
  { key: "completed", label: "Completed", icon: "check_circle" },
];

function SOSCard({ request, onAccept, onComplete, onViewTracking, isOwn }) {
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      await action();
    } finally {
      setProcessing(false);
    }
  };

  const urgencyColors = {
    critical: "bg-danger/10 text-danger border-danger/20",
    high: "bg-warning/10 text-warning border-warning/20",
    medium: "bg-primary/10 text-primary border-primary/20",
    low: "bg-safe/10 text-safe border-safe/20",
  };

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    assigned: "bg-primary/10 text-primary border-primary/20",
    in_progress: "bg-primary/10 text-primary border-primary/20",
    resolved: "bg-safe/10 text-safe border-safe/20",
  };

  const statusLabels = {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/30 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{request.user_name || "Anonymous"}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {request.location || "Unknown location"}
          </p>
          {/* Show GPS indicator if request has GPS */}
          {request.latitude && request.longitude && (
            <p className="text-[10px] text-safe flex items-center gap-1 mt-0.5 font-medium">
              <span className="material-symbols-outlined text-[12px]">my_location</span>
              GPS: {Number(request.latitude).toFixed(4)}, {Number(request.longitude).toFixed(4)}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {request.urgency && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[request.urgency] || urgencyColors.medium}`}>
              {request.urgency}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[request.status] || statusColors.pending}`}>
            {statusLabels[request.status] || request.status}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
        {request.description || "No description provided"}
      </p>

      {request.images && request.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {request.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt="SOS"
              className="size-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          {request.created_at ? new Date(request.created_at).toLocaleString("vi-VN") : ""}
        </span>

        <div className="flex gap-2">
          {/* Accept button — shown for pending requests */}
          {(request.status === "pending") && onAccept && (
            <button
              onClick={() => handleAction(() => onAccept(request.id))}
              disabled={processing}
              className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">check</span>
              Accept
            </button>
          )}

          {/* View Tracking button — for own in_progress missions with GPS */}
          {isOwn && request.status === "in_progress" && request.latitude && onViewTracking && (
            <button
              onClick={() => onViewTracking(request)}
              className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 animate-pulse"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              Tracking
            </button>
          )}

          {/* Complete button — shown for own in_progress missions */}
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
        </div>
      </div>
    </div>
  );
}

export default function RescuerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingRequest, setTrackingRequest] = useState(null);

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

  const rescuerUid = user?.id || "";

  // Accept a rescue request — capture rescuer's GPS first
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
        fetchRequests();
        // Auto-open tracking map if GPS was available
        const acceptedRequest = json.data;
        if (acceptedRequest.latitude && acceptedRequest.longitude) {
          setTrackingRequest(acceptedRequest);
        }
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  // Complete a rescue mission
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
      }
    } catch (err) {
      console.error("Failed to complete request:", err);
    }
  };

  // View tracking map for an in-progress request
  const handleViewTracking = (request) => {
    setTrackingRequest(request);
  };

  // Filter requests by tab
  const activeRequests = requests.filter((r) => r.status === "pending");
  const myMissions = requests.filter((r) => r.assigned_to === rescuerUid && r.status === "in_progress");
  const completed = requests.filter((r) => r.assigned_to === rescuerUid && r.status === "resolved");

  const filteredRequests = activeTab === "active"
    ? activeRequests
    : activeTab === "my-missions"
      ? myMissions
      : completed;

  const stats = {
    activeSOS: activeRequests.length,
    myMissions: myMissions.length,
    completed: completed.length,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined filled-icon text-warning text-2xl">local_fire_department</span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Rescuer Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View active SOS requests and manage your rescue missions
          </p>
        </div>

        {/* Stats */}
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

        {/* Tabs */}
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

        {/* Request List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRequests.map((req) => (
              <SOSCard
                key={req.id}
                request={req}
                onAccept={activeTab === "active" ? handleAccept : undefined}
                onComplete={activeTab === "my-missions" ? handleComplete : undefined}
                onViewTracking={activeTab === "my-missions" ? handleViewTracking : undefined}
                isOwn={req.assigned_to === rescuerUid}
              />
            ))}
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
