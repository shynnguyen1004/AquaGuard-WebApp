import { useEffect, useMemo, useRef, useState } from "react";
import RescueTrackingMap from "../components/rescue/RescueTrackingMap";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getStoredToken } from "../utils/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const TAB_DEFS = [
  { key: "all", icon: "list", labelKey: "rescueQueue.tabAll" },
  { key: "pending", icon: "schedule", labelKey: "rescueQueue.tabPending" },
  { key: "in_progress", icon: "local_shipping", labelKey: "rescueQueue.tabInProgress" },
  { key: "resolved", icon: "check_circle", labelKey: "rescueQueue.tabResolved" },
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

const AGE_GROUPS = [
  { key: "0-16", label: "0-16", min: 0, max: 16 },
  { key: "16-30", label: "16-30", min: 16, max: 30 },
  { key: "30-50", label: "30-50", min: 30, max: 50 },
  { key: "50-90", label: "50-90", min: 50, max: 90 },
];

const SORT_OPTION_DEFS = [
  { key: "priority", labelKey: "rescueQueue.sortPriority" },
  { key: "newest", labelKey: "rescueQueue.sortNewest" },
  { key: "oldest", labelKey: "rescueQueue.sortOldest" },
  { key: "age_asc", labelKey: "rescueQueue.sortAgeAsc" },
  { key: "age_desc", labelKey: "rescueQueue.sortAgeDesc" },
];

const GENDER_OPTION_DEFS = [
  { key: "male", labelKey: "rescueQueue.genderMale" },
  { key: "female", labelKey: "rescueQueue.genderFemale" },
  { key: "other", labelKey: "rescueQueue.genderOther" },
];

const gpsCityCache = new Map();

function formatGender(value, t) {
  if (!value) return t("rescueQueue.unknown");
  if (value === "male") return t("rescueQueue.genderMale");
  if (value === "female") return t("rescueQueue.genderFemale");
  if (value === "other") return t("rescueQueue.genderOther");
  return t("rescueQueue.unknown");
}

function displayStatus(status, t) {
  const keys = {
    pending: "sosPage.pending",
    assigned: "sosPage.assigned",
    in_progress: "sosPage.inProgress",
    resolved: "sosPage.resolved",
  };
  return keys[status] ? t(keys[status]) : status;
}

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

function extractCityFromLocation(location) {
  if (!location || typeof location !== "string") return "";
  const normalized = location.replace(/\s+/g, " ").trim();
  const match = normalized.match(/thành phố\s+([^,]+)/i);
  if (match?.[1]) return match[1].trim();
  return "";
}

async function reverseGeocodeCity(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return "";
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (gpsCityCache.has(cacheKey)) return gpsCityCache.get(cacheKey);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`
    );
    const data = await res.json();
    const addr = data?.address || {};
    const city =
      addr.city ||
      addr.municipality ||
      addr.town ||
      addr.county ||
      addr.state ||
      "";
    gpsCityCache.set(cacheKey, city || "");
    return city || "";
  } catch {
    gpsCityCache.set(cacheKey, "");
    return "";
  }
}

function formatCity(value, t) {
  if (value) return value;
  return t("rescueQueue.unknown");
}

function AcceptModeModal({ request, activeGroup, processing, onClose, onConfirm }) {
  const { t } = useLanguage();
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">{t("rescueQueue.modalChooseTitle")}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {t("rescueQueue.modalChooseSubtitle")}
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
          <p className="font-bold">{request.user_name || t("rescueQueue.citizen")}</p>
          <p className="text-sm text-slate-500 mt-1">{request.location || t("sosPage.unknownLocation")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => onConfirm("individual")}
            disabled={processing}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">person</span>
              <p className="font-black">{t("rescueQueue.modalIndividual")}</p>
            </div>
            <p className="text-sm text-slate-500">
              {t("rescueQueue.modalIndividualDesc")}
            </p>
          </button>
          <button
            onClick={() => onConfirm("group")}
            disabled={processing || !activeGroup}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-left hover:border-warning hover:bg-warning/5 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-warning">groups</span>
              <p className="font-black">{t("rescueQueue.modalGroup")}</p>
            </div>
            <p className="text-sm text-slate-500">
              {activeGroup
                ? t("rescueQueue.modalGroupDescNamed").replace("{name}", activeGroup.name)
                : t("rescueQueue.modalGroupDisabled")}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(iso, t) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("rescueQueue.timeJustNow");
  if (mins < 60) return t("rescueQueue.timeMinAgo").replace("{n}", String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("rescueQueue.timeHourAgo").replace("{n}", String(hrs));
  return t("rescueQueue.timeDayAgo").replace("{n}", String(Math.floor(hrs / 24)));
}

function QueueItem({ request, selected, isNew, onSelect, onAccept }) {
  const { t } = useLanguage();
  const ageLabel = request.user_age ?? t("rescueQueue.na");
  const genderLabel = formatGender(request.user_gender, t);
  const cityLabel = formatCity(request.cityFromLocation, t);

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
          <p className="text-sm font-bold truncate">{request.user_name || t("rescueQueue.anonymous")}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatTimeAgo(request.created_at, t)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isNew && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-danger text-white animate-pulse">
              {t("rescueQueue.newBadge")}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[request.urgency] || urgencyColors.medium}`}>
            {displayUrgency(request.urgency, t)}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[request.status] || statusColors.pending}`}>
            {displayStatus(request.status, t)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 flex items-center gap-1 truncate">
        <span className="material-symbols-outlined text-[14px]">location_on</span>
        {request.location || t("sosPage.unknownLocation")}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
        {request.description || t("rescueQueue.noDescription")}
      </p>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
        <span>
          {t("rescueQueue.age")}: {ageLabel}
        </span>
        <span>•</span>
        <span>{genderLabel}</span>
        <span>•</span>
        <span className="truncate">{cityLabel}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 truncate">
        {t("rescueQueue.assignedTo")}{" "}
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {request.assigned_name || t("rescueQueue.unassigned")}
        </span>
      </p>
      {request.assigned_group_name && (
        <p className="mt-1 text-[11px] text-primary truncate">
          {t("rescueQueue.group")}{" "}
          <span className="font-semibold">{request.assigned_group_name}</span>
        </p>
      )}
      {request.status === "pending" && request.last_cancelled_by_name && (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300 truncate">
          {t("rescueQueue.returnedBy")}{" "}
          <span className="font-semibold">{request.last_cancelled_by_name}</span>
        </p>
      )}

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
            {t("rescueQueue.accept")}
          </button>
        </div>
      )}
    </button>
  );
}

function RequestDetail({ request, canAccept, canComplete, canCancel, canTrack, onAccept, onComplete, onCancel, onViewTracking, onMarkSeen }) {
  const [processing, setProcessing] = useState(false);
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";

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

  const ageLabel = request.user_age ?? t("rescueQueue.na");
  const genderLabel = formatGender(request.user_gender, t);
  const cityLabel = formatCity(request.cityFromLocation, t);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-base truncate">{request.user_name || t("rescueQueue.anonymous")}</p>
          <p className="text-xs text-slate-500 mt-1">
            {request.created_at ? new Date(request.created_at).toLocaleString(dateLocale) : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColors[request.urgency] || urgencyColors.medium}`}>
            {displayUrgency(request.urgency, t)}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[request.status] || statusColors.pending}`}>
            {displayStatus(request.status, t)}
          </span>
        </div>
      </div>

      <div className="text-sm space-y-2">
        <p className="flex items-start gap-1.5">
          <span className="material-symbols-outlined text-base text-danger">location_on</span>
          <span>{request.location || t("sosPage.unknownLocation")}</span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className="material-symbols-outlined text-base text-primary">local_fire_department</span>
          <span>
            {t("rescueQueue.assignedTo")}{" "}
            <span className="font-semibold">{request.assigned_name || t("rescueQueue.unassigned")}</span>
          </span>
        </p>
        {request.assigned_group_name && (
          <p className="flex items-start gap-1.5">
            <span className="material-symbols-outlined text-base text-primary">groups</span>
            <span>
              {t("rescueQueue.group")}{" "}
              <span className="font-semibold">{request.assigned_group_name}</span>
            </span>
          </p>
        )}
        <p className="text-slate-600 dark:text-slate-300">{request.description || t("rescueQueue.noDescription")}</p>
        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined text-[13px]">badge</span>
          {t("rescueQueue.age")}: {ageLabel} • {t("rescueQueue.genderLabel")}: {genderLabel} • {t("rescueQueue.cityLabel")}: {cityLabel}
        </p>
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
              className="h-20 w-28 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 cursor-pointer"
              onClick={() => window.open(img, "_blank")}
            />
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 justify-end">
        {request.status === "pending" && canAccept && (
          <button
            onClick={() => handleAction(() => onAccept(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            {t("rescueQueue.accept")}
          </button>
        )}
        {request.status === "in_progress" && request.latitude && canTrack && (
          <button
            onClick={() => onViewTracking(request)}
            className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 animate-pulse"
          >
            <span className="material-symbols-outlined text-sm">map</span>
            {t("rescueQueue.tracking")}
          </button>
        )}
        {request.status === "in_progress" && canComplete && (
          <button
            onClick={() => handleAction(() => onComplete(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-safe text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-safe/90 transition-all shadow-md shadow-safe/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">done_all</span>
            {t("rescueQueue.complete")}
          </button>
        )}
        {request.status === "in_progress" && canCancel && (
          <button
            onClick={() => handleAction(() => onCancel(request.id))}
            disabled={processing}
            className="inline-flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">undo</span>
            {t("rescueQueue.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RescueRequestPage() {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [sortKey, setSortKey] = useState("priority");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState(null);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [seenRequestIds, setSeenRequestIds] = useState([]);
  const [acceptModeRequest, setAcceptModeRequest] = useState(null);
  const [acceptingWithMode, setAcceptingWithMode] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const [cityByRequestId, setCityByRequestId] = useState({});
  const sortMenuRef = useRef(null);

  const tabList = useMemo(() => TAB_DEFS.map((d) => ({ ...d, label: t(d.labelKey) })), [t]);
  const sortLabels = useMemo(
    () => Object.fromEntries(SORT_OPTION_DEFS.map((o) => [o.key, t(o.labelKey)])),
    [t]
  );

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
    if (!token || role !== "rescuer") return;

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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchRequests/fetchGroupContext use getStoredToken() internally
  useEffect(() => {
    fetchRequests();
    fetchGroupContext();
  }, [role]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleProfileUpdated = () => {
      fetchRequests();
    };
    window.addEventListener("profile_updated", handleProfileUpdated);
    return () => window.removeEventListener("profile_updated", handleProfileUpdated);
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

  useEffect(() => {
    const onDocClick = (event) => {
      if (!sortMenuRef.current) return;
      if (!sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
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

  const performAccept = async (requestId, acceptMode = "individual") => {
    const token = getStoredToken();

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
        body: JSON.stringify({ latitude, longitude, acceptMode }),
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
      } else {
        setAcceptError(json.message || t("rescueQueue.acceptFailed"));
      }
    } catch (err) {
      console.error("Failed to accept:", err);
    }
  };

  const handleAccept = (requestId) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;

    if (role !== "rescuer" || !activeGroup) {
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
        window.dispatchEvent(new CustomEvent("sos_changed", { detail: { type: "completed", requestId } }));
      }
    } catch (err) {
      console.error("Failed to complete:", err);
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
        window.dispatchEvent(new CustomEvent("sos_changed", { detail: { type: "cancelled", requestId } }));
      }
    } catch (err) {
      console.error("Failed to cancel:", err);
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

  const toggleInList = (value, setter) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const resetFilters = () => {
    setSelectedAgeGroups([]);
    setSelectedGenders([]);
    setSelectedCities([]);
  };

  const tabFiltered =
    activeTab === "all"
      ? requests
      : activeTab === "in_progress"
        ? requests.filter((r) => r.status === "assigned" || r.status === "in_progress")
        : requests.filter((r) => r.status === activeTab);

  const tabFilteredWithCity = useMemo(
    () =>
      tabFiltered.map((r) => ({
        ...r,
        cityFromLocation: cityByRequestId[r.id] || extractCityFromLocation(r.location),
      })),
    [tabFiltered, cityByRequestId]
  );

  useEffect(() => {
    let cancelled = false;

    const resolveCitiesFromGps = async () => {
      const targets = requests.filter(
        (r) =>
          r?.id &&
          Number.isFinite(Number(r.latitude)) &&
          Number.isFinite(Number(r.longitude)) &&
          !cityByRequestId[r.id]
      );
      if (targets.length === 0) return;

      const resolved = await Promise.all(
        targets.map(async (r) => {
          const city = await reverseGeocodeCity(Number(r.latitude), Number(r.longitude));
          return [r.id, city || extractCityFromLocation(r.location)];
        })
      );

      if (cancelled) return;
      setCityByRequestId((prev) => {
        const next = { ...prev };
        resolved.forEach(([id, city]) => {
          if (city) next[id] = city;
        });
        return next;
      });
    };

    resolveCitiesFromGps();
    return () => {
      cancelled = true;
    };
  }, [requests, cityByRequestId]);

  const cityOptions = useMemo(() => {
    const uniq = Array.from(new Set(tabFilteredWithCity.map((r) => r.cityFromLocation).filter(Boolean)));
    return uniq.map((city) => ({ key: city, label: city }));
  }, [tabFilteredWithCity]);

  const filtered = useMemo(() => {
    return tabFilteredWithCity.filter((r) => {
      const passAge =
        selectedAgeGroups.length === 0 ||
        (typeof r.user_age === "number" &&
          selectedAgeGroups.some((groupKey) => {
            const group = AGE_GROUPS.find((item) => item.key === groupKey);
            return group && r.user_age >= group.min && r.user_age < group.max;
          }));

      const passGender =
        selectedGenders.length === 0 ||
        (r.user_gender && selectedGenders.includes(r.user_gender));

      const passCity =
        selectedCities.length === 0 ||
        (r.cityFromLocation && selectedCities.includes(r.cityFromLocation));

      return passAge && passGender && passCity;
    });
  }, [tabFilteredWithCity, selectedAgeGroups, selectedGenders, selectedCities]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const urgencyRank = { critical: 3, high: 2, medium: 1, low: 0 };
    copy.sort((a, b) => {
      if (sortKey === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortKey === "oldest") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortKey === "age_asc") {
        return (a.user_age ?? Number.MAX_SAFE_INTEGER) - (b.user_age ?? Number.MAX_SAFE_INTEGER);
      }
      if (sortKey === "age_desc") {
        return (b.user_age ?? -1) - (a.user_age ?? -1);
      }

      const statusPriority = (s) => (s === "pending" ? 2 : s === "in_progress" ? 1 : 0);
      const sp = statusPriority(b.status) - statusPriority(a.status);
      if (sp !== 0) return sp;
      const up = (urgencyRank[b.urgency] || 0) - (urgencyRank[a.urgency] || 0);
      if (up !== 0) return up;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return copy;
  }, [filtered, sortKey]);

  const selectedRequest = sorted.find((r) => r.id === selectedRequestId) || sorted[0] || null;
  const rescuerUid = user?.uid?.startsWith("phone_")
    ? parseInt(user.uid.replace("phone_", ""), 10)
    : user?.uid || "";

  const canCurrentUserComplete = (request) => {
    if (!request || request.status !== "in_progress") return false;
    if (role === "admin") return true;
    return request.assigned_to == rescuerUid;
  };

  const canCurrentUserCancel = (request) => {
    if (!request || request.status !== "in_progress") return false;
    return role === "rescuer" && request.assigned_to == rescuerUid;
  };

  const canCurrentUserAccept = (request) => {
    if (!request) return false;
    if (request.status === "pending") return true;
    if (request.status === "assigned") return request.assigned_to == rescuerUid || role === "admin";
    return false;
  };

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
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              {t("rescueQueue.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("rescueQueue.subtitle")}
            </p>
            {role === "rescuer" && activeGroup && (
              <p className="text-xs text-primary mt-2 font-medium">
                {t("rescueQueue.activeGroup").replace("{name}", activeGroup.name)}
              </p>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              labelKey: "rescueQueue.statsTotal",
              value: counts.all,
              icon: "format_list_numbered",
              bg: "bg-slate-100 dark:bg-slate-800",
              iconColor: "text-slate-500",
            },
            {
              labelKey: "rescueQueue.statsPending",
              value: counts.pending,
              icon: "schedule",
              bg: "bg-warning/10",
              iconColor: "text-warning",
            },
            {
              labelKey: "rescueQueue.statsInProgress",
              value: counts.in_progress,
              icon: "local_shipping",
              bg: "bg-primary/10",
              iconColor: "text-primary",
            },
            {
              labelKey: "rescueQueue.statsResolved",
              value: counts.resolved,
              icon: "check_circle",
              bg: "bg-safe/10",
              iconColor: "text-safe",
            },
          ].map((stat) => (
            <div
              key={stat.labelKey}
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
                  {t(stat.labelKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabList.map((tab) => (
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

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/40"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              {t("rescueQueue.sortBy")}
              <span className="text-slate-500">{sortLabels[sortKey]}</span>
              <span className="material-symbols-outlined text-base">{showSortMenu ? "expand_less" : "expand_more"}</span>
            </button>

            {showSortMenu && (
              <div className="absolute z-20 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  {t("rescueQueue.sortHeading")}
                </p>
                <div className="space-y-1">
                  {SORT_OPTION_DEFS.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSortKey(option.key);
                        setShowSortMenu(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${sortKey === option.key ? "bg-primary/10 text-primary font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  {t("rescueQueue.ageGroup")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {AGE_GROUPS.map((group) => (
                    <button
                      key={group.key}
                      onClick={() => toggleInList(group.key, setSelectedAgeGroups)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedAgeGroups.includes(group.key) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  {t("rescueQueue.genderHeading")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTION_DEFS.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => toggleInList(option.key, setSelectedGenders)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedGenders.includes(option.key) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  {t("rescueQueue.city")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cityOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => toggleInList(option.key, setSelectedCities)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedCities.includes(option.key) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={resetFilters}
                  className="mt-4 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t("rescueQueue.clearFilters")}
                </button>
              </div>
            )}
          </div>

          {selectedAgeGroups.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {t("rescueQueue.ageChip").replace("{range}", item)}
            </span>
          ))}
          {selectedGenders.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {formatGender(item, t)}
            </span>
          ))}
          {selectedCities.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {item}
            </span>
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
              {t("rescueQueue.noRequestsTitle")}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
              {t("rescueQueue.noRequestsSubtitle")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("rescueQueue.requestQueue").replace("{count}", String(sorted.length))}
                </p>
                <p className="text-[11px] text-slate-400">{sortLabels[sortKey]}</p>
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
              canAccept={canCurrentUserAccept(selectedRequest)}
              canComplete={canCurrentUserComplete(selectedRequest)}
              canCancel={canCurrentUserCancel(selectedRequest)}
              canTrack={selectedRequest?.status === "in_progress"}
              onAccept={handleAccept}
              onComplete={handleComplete}
              onCancel={handleCancel}
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
          onComplete={role === "rescuer" && trackingRequest?.assigned_to == rescuerUid ? () => handleComplete(trackingRequest.id) : undefined}
          onCancel={role === "rescuer" && trackingRequest?.assigned_to == rescuerUid ? () => handleCancel(trackingRequest.id) : undefined}
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
