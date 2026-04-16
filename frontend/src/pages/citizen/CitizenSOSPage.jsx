import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import RescueRequestForm from "../../components/rescue/RescueRequestForm";
import RescueTrackingMap from "../../components/rescue/RescueTrackingMap";
import { getStoredToken } from "../../utils/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export default function CitizenSOSPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingRequest, setTrackingRequest] = useState(null); // request being tracked

  const STATUS_CONFIG = {
    pending:     { label: t("sosPage.pending"),     icon: "schedule",        color: "text-warning",  bg: "bg-warning/10", border: "border-warning/20" },
    assigned:    { label: t("sosPage.assigned"),    icon: "person_search",   color: "text-primary",  bg: "bg-primary/10", border: "border-primary/20" },
    in_progress: { label: t("sosPage.inProgress"), icon: "local_shipping",  color: "text-blue-500", bg: "bg-blue-50",    border: "border-blue-200" },
    resolved:    { label: t("sosPage.resolved"),    icon: "check_circle",    color: "text-safe",     bg: "bg-safe/10",    border: "border-safe/20" },
  };

  const URGENCY_CONFIG = {
    low:      { label: t("sosPage.low"),      color: "text-slate-500", bg: "bg-slate-100" },
    medium:   { label: t("sosPage.medium"),   color: "text-warning",   bg: "bg-warning/10" },
    high:     { label: t("sosPage.high"),     color: "text-danger",    bg: "bg-danger/10" },
    critical: { label: t("sosPage.critical"), color: "text-white",     bg: "bg-danger" },
  };

  // Fetch current user's requests from API
  const fetchMyRequests = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/sos/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setMyRequests(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  // Auto-refresh to catch status changes (e.g. rescuer accepted)
  useEffect(() => {
    const interval = setInterval(fetchMyRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  // Submit new SOS request to API (now with GPS)
  const handleNewRequest = async (formData) => {
    const token = getStoredToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const formBody = new FormData();
      formBody.append("location", formData.location);
      formBody.append("description", formData.description);
      formBody.append("urgency", formData.urgency || "medium");
      if (formData.latitude) formBody.append("latitude", formData.latitude);
      if (formData.longitude) formBody.append("longitude", formData.longitude);

      // Append actual image files
      if (formData.imageFiles?.length > 0) {
        formData.imageFiles.forEach((file) => {
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
        fetchMyRequests();
        window.dispatchEvent(new CustomEvent("sos_changed", { detail: { type: "created", requestId: json.data?.id } }));
      }
    } catch (err) {
      console.error("Failed to submit SOS request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t("sosPage.justNow");
    if (mins < 60) return `${mins} ${t("sosPage.minAgo")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t("sosPage.hAgo")}`;
    return d.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-danger filled-icon text-3xl">sos</span>
              {t("sosPage.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("sosPage.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-danger text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-danger/20 hover:shadow-xl hover:shadow-danger/30"
          >
            <span className="material-symbols-outlined text-lg filled-icon">add_circle</span>
            {t("sosPage.sendSOS")}
          </button>
        </div>

        {/* My Requests */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-base">history</span>
            {t("sosPage.myRequests")} ({myRequests.length})
          </h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center gap-3 text-slate-400">
                <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("sosPage.loading")}
              </div>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/30">
              <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-600 mb-4">inbox</span>
              <p className="text-lg font-bold text-slate-400 dark:text-slate-500">{t("sosPage.noRequests")}</p>
              <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
                {t("sosPage.noRequestsHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => {
                const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const urgency = URGENCY_CONFIG[req.urgency] || URGENCY_CONFIG.medium;

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-5 hover:shadow-lg transition-shadow"
                  >
                    {/* Top row: status + time */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}>
                        <span className="material-symbols-outlined text-sm filled-icon">{status.icon}</span>
                        {status.label}
                      </span>
                      <span className="text-xs text-slate-400">{formatTime(req.created_at)}</span>
                    </div>

                    {/* User name */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-base filled-icon">person</span>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {t("sosPage.you")} <span className="text-slate-400 font-normal">({req.user_name || t("sosPage.user")})</span>
                      </p>
                    </div>                    {/* Location */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="material-symbols-outlined text-danger text-base mt-0.5 filled-icon">location_on</span>
                      <p className="text-sm font-semibold">{req.location || t("sosPage.unknownLocation")}</p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 ml-6 mb-3 line-clamp-3">
                      {req.description}
                    </p>

                    {req.status === "pending" && req.last_cancelled_by_name && (
                      <div className="ml-6 mb-3 inline-flex max-w-full items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>
                          {t("sosPage.releasedBy")} <span className="font-bold">{req.last_cancelled_by_name}</span>
                        </span>
                      </div>
                    )}

                    {/* Images */}
                    {req.images && req.images.length > 0 && (
                      <div className="flex gap-2 ml-6 mb-3 overflow-x-auto">
                        {req.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`SOS ${i + 1}`}
                            className="h-20 w-28 rounded-xl object-cover border border-slate-200 dark:border-slate-600 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(img, "_blank")}
                          />
                        ))}
                      </div>
                    )}                    {/* Bottom: urgency + assigned + tracking button */}
                    <div className="flex items-center justify-between ml-6">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgency.bg} ${urgency.color}`}>
                          {urgency.label} {t("sosPage.urgency")}
                        </span>
                        {req.assigned_name && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">person</span>
                            {t("sosPage.assignedTo")} {req.assigned_name}
                          </span>
                        )}
                        {req.assigned_group_name && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">groups</span>
                            {t("sosPage.groupAssigned")} {req.assigned_group_name}
                          </span>
                        )}
                      </div>

                      {/* View Tracking button — only for in_progress requests with GPS */}
                      {req.status === "in_progress" && req.latitude && req.longitude && (
                        <button
                          onClick={() => setTrackingRequest(req)}
                          className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 animate-pulse"
                        >
                          <span className="material-symbols-outlined text-sm">map</span>
                          {t("sosPage.viewTracking")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
          userRole="citizen"
          trackingRole="citizen"
          shareLocation={true}
          citizenName={trackingRequest.user_name}
          citizenPhone={trackingRequest.user_phone}
          rescuerName={trackingRequest.assigned_name}
          teamName={trackingRequest.assigned_group_name}
          citizenPos={
            trackingRequest.latitude && trackingRequest.longitude
              ? { lat: trackingRequest.latitude, lng: trackingRequest.longitude }
              : null
          }
          rescuerPos={
            trackingRequest.rescuer_latitude && trackingRequest.rescuer_longitude
              ? { lat: trackingRequest.rescuer_latitude, lng: trackingRequest.rescuer_longitude }
              : null
          }
          onClose={() => {
            setTrackingRequest(null);
            fetchMyRequests();
          }}
        />
      )}
    </div>
  );
}
