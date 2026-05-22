import { useEffect, useMemo, useRef, useState } from "react";
import RescueTrackingMap from "../../components/rescue/RescueTrackingMap";
import StatusPills from "../../components/rescue/StatusPills";
import { getStoredToken } from "../../utils/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const urgencyColors = {
  critical: "bg-danger/10 text-danger border-danger/20",
  high: "bg-warning/10 text-warning border-warning/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-safe/10 text-safe border-safe/20",
};

const ADMIN_SORT_OPTIONS = [
  { key: "priority", label: "Priority" },
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "age_asc", label: "Age ascending" },
  { key: "age_desc", label: "Age descending" },
];

const ADMIN_SORT_LABELS = Object.fromEntries(ADMIN_SORT_OPTIONS.map((opt) => [opt.key, opt.label]));

const ADMIN_AGE_GROUPS = [
  { key: "0-16", label: "0-16", min: 0, max: 16 },
  { key: "16-30", label: "16-30", min: 16, max: 30 },
  { key: "30-50", label: "30-50", min: 30, max: 50 },
  { key: "50-90", label: "50-90", min: 50, max: 90 },
];

const ADMIN_GENDER_OPTIONS = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
];

function formatAdminGender(value) {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  if (value === "other") return "Other";
  return "Unknown";
}
const gpsCityCache = new Map();

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
          <StatusPills status={request.status} />
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
      {request.assigned_group_name && (
        <p className="mt-1 text-[11px] text-primary truncate">
          Group: <span className="font-semibold">{request.assigned_group_name}</span>
        </p>
      )}
      {request.status === "pending" && request.last_cancelled_by_name && (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300 truncate">
          Returned by: <span className="font-semibold">{request.last_cancelled_by_name}</span>
        </p>
      )}
    </button>
  );
}

function RequestDetail({
  request,
  rescueGroups,
  selectedGroupByRequest,
  assigningRequestId,
  completingRequestId,
  onSelectGroup,
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
          <StatusPills status={request.status} />
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
        {request.assigned_group_name && (
          <p className="flex items-start gap-1.5">
            <span className="material-symbols-outlined text-base text-primary">groups</span>
            <span>
              Group: <span className="font-semibold">{request.assigned_group_name}</span>
            </span>
          </p>
        )}
        <p className="text-slate-600 dark:text-slate-300">{request.description || "No description provided"}</p>
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
              className="h-40 w-56 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(img, "_blank")}
            />
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 justify-end">
        {request.status === "pending" && (
          <>
            <select
              value={selectedGroupByRequest[request.id] || ""}
              onChange={(e) => onSelectGroup(request.id, Number(e.target.value))}
              className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 min-w-[220px]"
            >
              <option value="">Assign to rescue group...</option>
              {rescueGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.member_count} members) — Leader: {g.leader_name || "N/A"}
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(request.id)}
              disabled={!selectedGroupByRequest[request.id] || assigningRequestId === request.id}
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
  const [sortKey, setSortKey] = useState("priority");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rescueGroups, setRescueGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [seenRequestIds, setSeenRequestIds] = useState([]);
  const [selectedGroupByRequest, setSelectedGroupByRequest] = useState({});
  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [completingRequestId, setCompletingRequestId] = useState(null);
  const [cityByRequestId, setCityByRequestId] = useState({});
  const sortMenuRef = useRef(null);

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
      if (json.success) setRequests(json.data);
    } catch (err) {
      console.error("Failed to fetch SOS requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRescueGroups = async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/rescue-groups/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setRescueGroups(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch rescue groups:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchRescueGroups();
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
    const token = getStoredToken();
    const groupId = selectedGroupByRequest[requestId];
    if (!token || !groupId) return;

    setAssigningRequestId(requestId);
    try {
      const res = await fetch(`${API_BASE}/sos/${requestId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupId }),
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
    const token = getStoredToken();
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

  const toggleInList = (value, setter) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };
  const toggleCity = (city) => toggleInList(city, setSelectedCities);

  const resetFilters = () => {
    setSelectedCities([]);
    setSelectedAgeGroups([]);
    setSelectedGenders([]);
  };

  const filtered =
    activeTab === "all"
      ? requests
      : activeTab === "pending"
        // Admin-assigned rows (status='assigned') are still in the "pending"
        // phase from the user's perspective — rescuer hasn't started yet.
        ? requests.filter((r) => r.status === "pending" || r.status === "assigned")
        : requests.filter((r) => r.status === activeTab);

  const filteredWithCity = useMemo(
    () =>
      filtered.map((r) => ({
        ...r,
        cityFromLocation: cityByRequestId[r.id] || extractCityFromLocation(r.location),
      })),
    [filtered, cityByRequestId]
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
    const uniq = Array.from(new Set(filteredWithCity.map((r) => r.cityFromLocation).filter(Boolean)));
    return uniq;
  }, [filteredWithCity]);

  const cityFiltered = useMemo(() => {
    return filteredWithCity.filter((r) => {
      const passCity =
        selectedCities.length === 0 ||
        (r.cityFromLocation && selectedCities.includes(r.cityFromLocation));
      const passAge =
        selectedAgeGroups.length === 0 ||
        (typeof r.user_age === "number" &&
          selectedAgeGroups.some((groupKey) => {
            const group = ADMIN_AGE_GROUPS.find((item) => item.key === groupKey);
            return group && r.user_age >= group.min && r.user_age < group.max;
          }));
      const passGender =
        selectedGenders.length === 0 ||
        (r.user_gender && selectedGenders.includes(r.user_gender));
      return passCity && passAge && passGender;
    });
  }, [filteredWithCity, selectedCities, selectedAgeGroups, selectedGenders]);

  const sorted = useMemo(() => {
    const arr = [...cityFiltered];
    const urgencyRank = { critical: 3, high: 2, medium: 1, low: 0 };
    arr.sort((a, b) => {
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
      const statusPriority = (s) => (s === "pending" || s === "assigned" ? 2 : s === "in_progress" ? 1 : 0);
      const sp = statusPriority(b.status) - statusPriority(a.status);
      if (sp !== 0) return sp;
      const up = (urgencyRank[b.urgency] || 0) - (urgencyRank[a.urgency] || 0);
      if (up !== 0) return up;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return arr;
  }, [cityFiltered, sortKey]);

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
    pending: requests.filter((r) => r.status === "pending" || r.status === "assigned").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
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

        {/* Stat cards double as tab buttons — click to filter the queue below. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: "all", label: "Total", icon: "format_list_numbered", bg: "bg-slate-100 dark:bg-slate-800", iconColor: "text-slate-500", ring: "ring-slate-400 dark:ring-slate-500" },
            { key: "pending", label: "Pending", icon: "schedule", bg: "bg-warning/10", iconColor: "text-warning", ring: "ring-warning" },
            { key: "in_progress", label: "In Progress", icon: "local_shipping", bg: "bg-primary/10", iconColor: "text-primary", ring: "ring-primary" },
            { key: "resolved", label: "Resolved", icon: "check_circle", bg: "bg-safe/10", iconColor: "text-safe", ring: "ring-safe" },
          ].map((stat) => {
            const isActive = activeTab === stat.key;
            return (
              <button
                key={stat.key}
                type="button"
                onClick={() => setActiveTab(stat.key)}
                aria-pressed={isActive}
                className={`${stat.bg} rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-700/30 text-left transition-all hover:brightness-95 active:scale-[0.99] ${
                  isActive ? `ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 ${stat.ring} shadow-md` : ""
                }`}
              >
                <div className="size-10 rounded-xl bg-white/60 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <span className={`material-symbols-outlined filled-icon ${stat.iconColor}`}>{stat.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-black">{counts[stat.key]}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {(selectedAgeGroups.length > 0 || selectedGenders.length > 0 || selectedCities.length > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selectedAgeGroups.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Age {item}
              </span>
            ))}
            {selectedGenders.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {formatAdminGender(item)}
              </span>
            ))}
            {selectedCities.map((city) => (
              <span key={city} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {city}
              </span>
            ))}
          </div>
        )}

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
              <div className="flex items-center justify-between gap-2 px-1 pb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                  Request Queue ({sorted.length})
                </p>
                <div className="relative shrink-0" ref={sortMenuRef}>
                  <button
                    onClick={() => setShowSortMenu((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/40"
                  >
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    {ADMIN_SORT_LABELS[sortKey]}
                    <span className="material-symbols-outlined text-[14px]">{showSortMenu ? "expand_less" : "expand_more"}</span>
                  </button>

                  {showSortMenu && (
                    <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl">
                      <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Sort</p>
                      <div className="space-y-1">
                        {ADMIN_SORT_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => {
                              setSortKey(option.key);
                              setShowSortMenu(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              sortKey === option.key
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wider text-slate-500">Age group</p>
                      <div className="flex flex-wrap gap-2">
                        {ADMIN_AGE_GROUPS.map((group) => (
                          <button
                            key={group.key}
                            onClick={() => toggleInList(group.key, setSelectedAgeGroups)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              selectedAgeGroups.includes(group.key)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {group.label}
                          </button>
                        ))}
                      </div>

                      <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wider text-slate-500">Gender</p>
                      <div className="flex flex-wrap gap-2">
                        {ADMIN_GENDER_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => toggleInList(option.key, setSelectedGenders)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              selectedGenders.includes(option.key)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wider text-slate-500">City</p>
                      <div className="flex flex-wrap gap-2">
                        {cityOptions.map((city) => (
                          <button
                            key={city}
                            onClick={() => toggleCity(city)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              selectedCities.includes(city)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={resetFilters}
                        className="mt-4 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
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
              rescueGroups={rescueGroups}
              selectedGroupByRequest={selectedGroupByRequest}
              assigningRequestId={assigningRequestId}
              completingRequestId={completingRequestId}
              onSelectGroup={(requestId, groupId) =>
                setSelectedGroupByRequest((prev) => ({ ...prev, [requestId]: groupId }))
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
          trackingRole={null}
          shareLocation={false}
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
        />
      )}
    </div>
  );
}
