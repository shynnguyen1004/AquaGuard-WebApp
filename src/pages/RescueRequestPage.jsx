import { useState, useEffect } from "react";
import RescueRequestCard from "../components/rescue/RescueRequestCard";
import RescueRequestForm from "../components/rescue/RescueRequestForm";
import RescueTrackingMap from "../components/rescue/RescueTrackingMap";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const tabs = [
  { key: "all", label: "All Requests", icon: "list" },
  { key: "pending", label: "Pending", icon: "schedule" },
  { key: "in_progress", label: "In Progress", icon: "local_shipping" },
  { key: "resolved", label: "Resolved", icon: "check_circle" },
];

export default function RescueRequestPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
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

  const handleNewRequest = async (data) => {
    const token = localStorage.getItem("aquaguard_token");
    if (!token) return;

    try {
      const formBody = new FormData();
      formBody.append("location", data.location);
      formBody.append("description", data.description);
      formBody.append("urgency", data.urgency || "medium");
      if (data.latitude) formBody.append("latitude", data.latitude);
      if (data.longitude) formBody.append("longitude", data.longitude);

      // Append actual image files
      if (data.imageFiles?.length > 0) {
        data.imageFiles.forEach((file) => {
          formBody.append("images", file);
        });
      }

      const res = await fetch(`${API_BASE}/sos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formBody,
      });
      const json = await res.json();
      if (json.success) {
        fetchRequests();
        window.dispatchEvent(new CustomEvent("sos_changed", { detail: { type: "created", requestId: json.data?.id } }));
      }
    } catch (err) {
      console.error("Failed to create request:", err);
    }
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
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-danger text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-danger/20 hover:shadow-xl hover:shadow-danger/30"
          >
            <span className="material-symbols-outlined text-lg filled-icon">
              add_circle
            </span>
            New Request
          </button>
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
        ) : filtered.length === 0 ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((request) => (
              <RescueRequestCard
                key={request.id}
                request={request}
                onAccept={handleAccept}
                onComplete={handleComplete}
                onViewTracking={handleViewTracking}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <RescueRequestForm
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            handleNewRequest(data);
            setShowForm(false);
          }}
        />
      )}

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
