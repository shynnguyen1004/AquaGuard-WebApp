import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import MapLegend from "./MapLegend";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const WINDY_API_KEY = import.meta.env.VITE_WINDY_API_KEY || "";

// Windy overlay options
const WINDY_OVERLAYS = [
  { key: "rain", label: "Mưa", icon: "rainy", color: "#3b82f6" },
  { key: "wind", label: "Gió", icon: "air", color: "#38bdf8" },
  { key: "clouds", label: "Mây", icon: "cloud", color: "#94a3b8" },
  { key: "temp", label: "Nhiệt độ", icon: "thermostat", color: "#f97316" },
  { key: "pressure", label: "Áp suất", icon: "speed", color: "#a78bfa" },
  { key: "waves", label: "Sóng biển", icon: "waves", color: "#06b6d4" },
];

// Custom colored pin icon using inline SVG
function createPinIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)" />
        </filter>
      </defs>
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" 
            fill="${color}" filter="url(#shadow)" />
      <circle cx="16" cy="15" r="6" fill="white" opacity="0.9" />
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "custom-pin-icon",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

// Map severity → color & label
const severityMap = {
  critical: { color: "#a855f7", labelKey: "floodMap.severityCritical" },
  severe: { color: "#ef4444", labelKey: "floodMap.severitySevere" },
  moderate: { color: "#f59e0b", labelKey: "floodMap.severityModerate" },
  low: { color: "#10b981", labelKey: "floodMap.severityLow" },
  safe: { color: "#10b981", labelKey: "floodMap.severitySafe" },
};

const familySafetyColors = {
  safe: { bg: "#10b981", label: "An toàn" },
  danger: { bg: "#ef4444", label: "Nguy hiểm" },
  injured: { bg: "#f97316", label: "Bị thương" },
  unknown: { bg: "#94a3b8", label: "Chưa rõ" },
};

// Family member icon (person pin)
function createFamilyIcon(safetyStatus) {
  const color = familySafetyColors[safetyStatus]?.bg || "#94a3b8";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <defs>
        <filter id="fshadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)" />
        </filter>
      </defs>
      <path d="M18 0C9.16 0 2 7.16 2 16c0 12 16 28 16 28s16-16 16-28C34 7.16 26.84 0 18 0z" 
            fill="${color}" filter="url(#fshadow)" />
      <circle cx="18" cy="12" r="5" fill="white" />
      <path d="M10 22c0-4.4 3.6-6 8-6s8 1.6 8 6" fill="white" opacity="0.8" />
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "family-pin-icon",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
}

// "Me" location icon (pulsing blue dot)
function createMyLocationIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#3b82f6" opacity="0.15">
        <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="20" cy="20" r="8" fill="#3b82f6" stroke="white" stroke-width="3" />
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "my-location-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

const myLocationIcon = createMyLocationIcon();

// ── SOS icon (avatar + colored ring) ──
const SOS_STAGE_COLOR = {
  pending: "#ef4444",
  assigned: "#f59e0b",
  resolved: "#10b981",
};

function createSOSAvatarIcon({ stage, avatarUrl }) {
  const color = SOS_STAGE_COLOR[stage] || SOS_STAGE_COLOR.pending;
  const colorNoHash = color.replace("#", "");

  // A lightweight HTML icon so we can show avatar via <img>.
  const html = `
    <div class="sos-avatar-marker sos-avatar-marker--${stage}">
      <div class="sos-avatar-marker__ring" style="border-color:#${colorNoHash};"></div>
      <div class="sos-avatar-marker__avatar">
        <img src="${avatarUrl}" alt="" referrerpolicy="no-referrer" />
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "sos-avatar-marker-icon",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

function getAvatarUrlForName(name, stage) {
  const bg = (SOS_STAGE_COLOR[stage] || SOS_STAGE_COLOR.pending).replace("#", "");
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=${bg}&color=fff&size=40`;
}

/**
 * Parse Firestore location → { lat, lng }
 */
function parseLocation(location) {
  if (!location) return null;
  if (typeof location === "object") {
    if (typeof location.latitude === "number" && typeof location.longitude === "number") {
      return { lat: location.latitude, lng: location.longitude };
    }
    if (typeof location._lat === "number" && typeof location._long === "number") {
      return { lat: location._lat, lng: location._long };
    }
    if (typeof location.lat === "number" && typeof location.lng === "number") {
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  }
  if (typeof location === "string") {
    const cleaned = location
      .replace(/[\[\]]/g, "")
      .replace(/°/g, "")
      .replace(/\s*[NSEW]\s*/gi, "")
      .trim();
    const parts = cleaned.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }
  return null;
}

export default function FloodMap({ onReady }) {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWindy, setShowWindy] = useState(false);
  const [windyOverlay, setWindyOverlay] = useState("rain");
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const windyIframeRef = useRef(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showFamily, setShowFamily] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo] = useState(null);
  const [routeTo, setRouteTo] = useState(null); // { lat, lng, name }
  const [routeCoords, setRouteCoords] = useState([]); // [[lat,lng], ...]
  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration }
  const [showFloodZones, setShowFloodZones] = useState(true);
  const locationWatchIdRef = useRef(null);
  const lastLocationSyncRef = useRef({ lat: null, lng: null, at: 0 });
  const hasCenteredOnUserRef = useRef(false);

  const [sosPins, setSosPins] = useState([]);
  const sosIconCacheRef = useRef(new Map()); // `${stage}|${avatarUrl}` -> Leaflet icon
  const prevSosStatusByIdRef = useRef(new Map()); // requestId -> last raw status
  const resolvedUntilByIdRef = useRef(new Map()); // requestId -> expireAt (ms)

  const getSOSIcon = useCallback((stage, avatarUrl) => {
    const key = `${stage}|${avatarUrl}`;
    const cached = sosIconCacheRef.current.get(key);
    if (cached) return cached;
    const icon = createSOSAvatarIcon({ stage, avatarUrl });
    sosIconCacheRef.current.set(key, icon);
    return icon;
  }, []);

  const pollSosRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/sos/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json?.success) return;

      const now = Date.now();
      const nextPins = [];

      for (const req of json.data || []) {
        const requestId = req.id;
        const lat = Number(req.latitude);
        const lng = Number(req.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const rawStatus = req.status;

        // pending -> đỏ nhấp nháy; in_progress (accept) -> vàng; resolved (complete) -> xanh (tạm thời)
        let stage = "pending";
        if (rawStatus === "pending") stage = "pending";
        else if (rawStatus === "in_progress") stage = "assigned";
        else if (rawStatus === "resolved") stage = "resolved";

        if (stage === "resolved") {
          const prev = prevSosStatusByIdRef.current.get(requestId);

          // Important:
          // On first page load, `prev` is empty, but the DB may already contain
          // `resolved` requests. We do NOT want to show green pins on refresh.
          // Only show green when we detect a transition to `resolved` within this session.
          if (prev === undefined) {
            prevSosStatusByIdRef.current.set(requestId, rawStatus);
            continue; // skip rendering resolved pins on initial load
          }

          if (prev !== "resolved") {
            resolvedUntilByIdRef.current.set(requestId, now + 2500);
          }
          const expireAt = resolvedUntilByIdRef.current.get(requestId) || 0;
          if (now > expireAt) {
            prevSosStatusByIdRef.current.set(requestId, rawStatus);
            resolvedUntilByIdRef.current.delete(requestId);
            continue; // already expired
          }
        }

        const userName = req.user_name || req.userName || t("roles.user");
        const avatarUrl = getAvatarUrlForName(userName, stage);

        nextPins.push({
          id: requestId,
          lat,
          lng,
          stage,
          userName,
          avatarUrl,
          urgency: req.urgency,
          description: req.description,
          location: req.location,
          assignedName: req.assigned_name,
          createdAt: req.created_at,
          rawStatus,
        });

        prevSosStatusByIdRef.current.set(requestId, rawStatus);
      }

      setSosPins(nextPins);
    } catch (err) {
      // Không phá map nếu server SOS bị lỗi.
      console.warn("[FloodMap] SOS poll error:", err);
    }
  }, [token, t]);

  const syncMyLocation = useCallback((loc, force = false) => {
    if (!token || !loc) return;

    const prev = lastLocationSyncRef.current;
    const now = Date.now();
    const movedEnough = prev.lat == null
      || Math.abs(prev.lat - loc.lat) >= 0.00005
      || Math.abs(prev.lng - loc.lng) >= 0.00005;
    const shouldSync = force || movedEnough || now - prev.at >= 5000;

    if (!shouldSync) return;

    lastLocationSyncRef.current = { lat: loc.lat, lng: loc.lng, at: now };

    fetch(`${API_BASE}/family/location`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng }),
    }).catch(() => {});
  }, [token]);

  const startLiveLocationTracking = useCallback(({
    recenter = false,
    showPermissionAlert = false,
  } = {}) => {
    if (!navigator.geolocation) {
      if (showPermissionAlert) {
        alert("Trình duyệt không hỗ trợ GPS.");
      }
      return;
    }

    setLocating(true);

    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        if (recenter || !hasCenteredOnUserRef.current) {
          setFlyTo(loc);
          hasCenteredOnUserRef.current = true;
        }
        setLocating(false);
        syncMyLocation(loc, true);

        locationWatchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            const nextLoc = {
              lat: watchPos.coords.latitude,
              lng: watchPos.coords.longitude,
            };
            setMyLocation(nextLoc);
            syncMyLocation(nextLoc);
          },
          (watchErr) => {
            console.warn("[FloodMap] GPS watch error:", watchErr.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 10000,
          }
        );
      },
      (err) => {
        setLocating(false);
        if (!showPermissionAlert) return;

        if (err.code === 1) {
          alert("Bạn cần cho phép truy cập vị trí:\n\n" +
            "1. Nhấn biểu tượng ổ khóa trên thanh địa chỉ\n" +
            "2. Chọn 'Cài đặt trang web'\n" +
            "3. Bật 'Vị trí' thành 'Cho phép'\n" +
            "4. Tải lại trang");
        } else {
          alert("Không thể lấy vị trí. Vui lòng thử lại.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [syncMyLocation]);

  // Change Windy overlay via postMessage
  const changeWindyOverlay = (overlay) => {
    setWindyOverlay(overlay);
    if (windyIframeRef.current?.contentWindow) {
      windyIframeRef.current.contentWindow.postMessage(
        { type: "changeOverlay", overlay },
        "*"
      );
    }
  };

  useEffect(() => {
    async function fetchFloodZones() {
      try {
        const db = getFirebaseDb();
        const floodZonesRef = collection(db, "flood_zones");
        const snapshot = await getDocs(floodZonesRef);

        const data = [];
        snapshot.docs.forEach((doc) => {
          const d = doc.data();
          const pos = parseLocation(d.location);
          if (!pos) return;
          const sev = severityMap[d.severity?.toLowerCase()] || severityMap.safe;
          data.push({
            id: doc.id,
            lat: pos.lat,
            lng: pos.lng,
            name: d.name || "",
            label: t(sev.labelKey),
            color: sev.color,
            waterLevel: d.water_level ?? null,
          });
        });

        setMarkers(data);
        setError(null);
      } catch (err) {
        console.error("[FloodMap] Lỗi:", err.code, err.message, err);
        setError(`Lỗi: ${err.code || err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchFloodZones();
  }, [t]);

  // Fetch family members locations
  const fetchFamilyMembers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/family/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFamilyMembers(data.data.filter((m) => m.latitude && m.longitude));
      }
    } catch (err) {
      console.warn("[FloodMap] Could not fetch family:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchFamilyMembers();
    const interval = setInterval(fetchFamilyMembers, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFamilyMembers]);

  // SOS realtime (polling)
  useEffect(() => {
    if (!token) return;

    // Initial fetch + periodic updates
    pollSosRequests();
    const interval = setInterval(pollSosRequests, 5000);

    // Hint-based refresh (for multi-tab users)
    const onHint = () => pollSosRequests();
    window.addEventListener("sos_changed", onHint);

    return () => {
      window.removeEventListener("sos_changed", onHint);
      clearInterval(interval);
    };
  }, [token, pollSosRequests]);

  // Manual locate button handler — requests permission if needed and keeps tracking continuously
  const handleLocateMe = () => {
    startLiveLocationTracking({ recenter: true, showPermissionAlert: true });
  };

  // Expose controls to parent via onReady callback
  useEffect(() => {
    if (onReady) {
      onReady({
        locateMe: () => startLiveLocationTracking({ recenter: true, showPermissionAlert: true }),
        toggleFamily: () => setShowFamily(prev => !prev),
        flyTo: (pos) => setFlyTo(pos),
        showFamily,
        familyMembers,
      });
    }
  }, [onReady, showFamily, familyMembers, startLiveLocationTracking]);

  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions?.query) return;

    let permissionStatus;
    let disposed = false;

    navigator.permissions.query({ name: "geolocation" }).then((status) => {
      if (disposed) return;
      permissionStatus = status;

      if (status.state === "granted") {
        startLiveLocationTracking();
      }

      status.onchange = () => {
        if (status.state === "granted") {
          startLiveLocationTracking();
        } else if (status.state === "denied" && locationWatchIdRef.current !== null) {
          navigator.geolocation.clearWatch(locationWatchIdRef.current);
          locationWatchIdRef.current = null;
        }
      };
    }).catch(() => {
      // Ignore unsupported permission queries.
    });

    return () => {
      disposed = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [startLiveLocationTracking]);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  // Helper component to fly map to location
  function FlyToLocation({ position }) {
    const map = useMap();
    useEffect(() => {
      if (position) {
        map.flyTo([position.lat, position.lng], 15, { duration: 1.5 });
        setFlyTo(null);
      }
    }, [position, map]);
    return null;
  }

  // Fetch real driving route from OSRM (free, no API key)
  const fetchRoute = async (from, to, memberName) => {
    setRouteTo({ lat: to.lat, lng: to.lng, name: memberName });
    setRouteCoords([]);
    setRouteInfo(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRouteCoords(coords);
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
        });
      }
    } catch (err) {
      console.warn("Route fetch error:", err);
    }
  };

  const clearRoute = () => {
    setRouteTo(null);
    setRouteCoords([]);
    setRouteInfo(null);
  };

  const windyUrl = `/windy.html?key=${WINDY_API_KEY}&lat=16.054&lon=108.202&zoom=7&overlay=${windyOverlay}`;

  return (
    <div className="flex-1 relative min-h-[60vh] xl:min-h-0">
      <style>{`
        .custom-pin-icon, .family-pin-icon, .my-location-icon { background: none !important; border: none !important; }
        .sos-avatar-marker-icon { background: none !important; border: none !important; }

        .sos-avatar-marker {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sos-avatar-marker__ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 3px solid transparent;
          pointer-events: none;
        }

        .sos-avatar-marker--pending .sos-avatar-marker__ring {
          animation: sosPulse 1.2s infinite;
        }

        @keyframes sosPulse {
          0% { transform: scale(0.82); opacity: 0.95; }
          70% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }

        .sos-avatar-marker__avatar {
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.95);
          box-shadow: 0 8px 22px rgba(0,0,0,0.20);
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ef4444;
        }

        .sos-avatar-marker--assigned .sos-avatar-marker__avatar {
          background: #f59e0b;
        }

        .sos-avatar-marker--resolved .sos-avatar-marker__avatar {
          background: #10b981;
        }

        .sos-avatar-marker__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 16px !important; 
          padding: 0 !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
        }
        .leaflet-popup-content { margin: 0 !important; min-width: 220px; }
        .leaflet-popup-tip { box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t("floodMap.loading")}
            </span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg shadow-lg max-w-md text-center">
          {error}
        </div>
      )}

      {/* Weather Layer Toggle Panel */}
      <div className={`absolute top-4 z-[1000] ${showWindy ? "left-4" : "right-4"}`}>
        <button
          onClick={() => setWeatherPanelOpen(!weatherPanelOpen)}
          className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${showWindy
            ? "bg-primary text-white shadow-primary/30"
            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            } hover:scale-105`}
          title={t("floodMap.windyLayers")}
        >
          <span className="material-symbols-outlined text-xl">layers</span>
        </button>

        {weatherPanelOpen && (
          <div className="mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {t("floodMap.windyLayers")}
            </p>

            {/* Toggle Windy Map */}
            <button
              onClick={() => setShowWindy(!showWindy)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-2 ${showWindy
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
            >
              <span className="material-symbols-outlined text-base">
                {showWindy ? "visibility" : "visibility_off"}
              </span>
              <span>{showWindy ? t("floodMap.hideWeather") : t("floodMap.showWeather")}</span>
            </button>

            {/* Overlay options (only show when Windy is active) */}
            {showWindy && (
              <>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1 mt-1">
                  {t("floodMap.chooseLayer")}
                </p>
                {WINDY_OVERLAYS.map((layer) => {
                  const isActive = windyOverlay === layer.key;
                  return (
                    <button
                      key={layer.key}
                      onClick={() => changeWindyOverlay(layer.key)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        }`}
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        style={isActive ? { color: layer.color } : {}}
                      >
                        {layer.icon}
                      </span>
                      <span className="flex-1 text-left">{layer.label}</span>
                      {isActive && (
                        <span className="material-symbols-outlined text-sm text-primary">
                          check_circle
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Family Toggle Button */}
      {!showWindy && (
        <div className="absolute top-16 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => setShowFamily(!showFamily)}
            className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${showFamily
              ? "bg-emerald-500 text-white shadow-emerald-500/30"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              } hover:scale-105`}
            title={showFamily ? t("floodMap.hideFamily") : t("floodMap.showFamily")}
          >
            <span className="material-symbols-outlined text-xl">group</span>
          </button>

          {/* GPS Location Button */}
          <button
            onClick={handleLocateMe}
            disabled={locating}
            className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${myLocation
              ? "bg-blue-500 text-white shadow-blue-500/30"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              } hover:scale-105 disabled:opacity-50`}
            title={t("floodMap.myLocation")}
          >
            <span className={`material-symbols-outlined text-xl ${locating ? 'animate-spin' : ''}`}>
              {locating ? "progress_activity" : "my_location"}
            </span>
          </button>

          {/* Flood Zones Toggle */}
          <button
            onClick={() => setShowFloodZones(!showFloodZones)}
            className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${showFloodZones
              ? "bg-amber-500 text-white shadow-amber-500/30"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              } hover:scale-105`}
            title={showFloodZones ? t("floodMap.hideFloodZones") : t("floodMap.showFloodZones")}
          >
            <span className="material-symbols-outlined text-xl">flood</span>
          </button>
        </div>
      )}

      {/* Route info banner */}
      {routeTo && myLocation && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500 text-white px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold">
          <span className="material-symbols-outlined text-lg">directions</span>
          <span>{t("floodMap.routeTo").replace("{name}", routeTo.name)}</span>
          {routeInfo && (
            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">
              {routeInfo.distance} km • {t("floodMap.routeDuration").replace("{n}", String(routeInfo.duration))}
            </span>
          )}
          <button
            onClick={clearRoute}
            className="size-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Windy Weather Map (iframe overlay) */}
      {showWindy && WINDY_API_KEY && (
        <div className="absolute inset-0 z-[500]">
          <iframe
            ref={windyIframeRef}
            src={windyUrl}
            className="w-full h-full border-0"
            title={t("floodMap.windyMapTitle")}
            allow="geolocation"
          />
        </div>
      )}

      {/* Main Flood Map */}
      <div className={`absolute inset-0 ${showWindy ? "invisible" : ""}`}>
        <MapContainer
          center={[16.054, 108.202]}
          zoom={6}
          className="w-full h-full z-0"
          zoomControl={true}
          scrollWheelZoom={true}
          attributionControl={false}
        >
          {/* Fly to user location when triggered */}
          <FlyToLocation position={flyTo} />
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
          />

          {showFloodZones && markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createPinIcon(marker.color)}
            >
              <Popup>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block size-3 rounded-full"
                      style={{ backgroundColor: marker.color }}
                    />
                    <span className="font-black text-sm" style={{ color: marker.color }}>
                      {marker.label}
                    </span>
                    {marker.waterLevel != null && (
                      <span className="text-[10px] font-bold text-slate-500 ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
                        {t("floodMap.waterLevel").replace("{level}", String(marker.waterLevel))}
                      </span>
                    )}
                  </div>
                  {marker.name && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <span className="material-symbols-outlined text-sm mt-px">location_on</span>
                      <span>{marker.name}</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* SOS markers */}
          {sosPins.map((p) => (
            <Marker
              key={`sos-${p.id}`}
              position={[p.lat, p.lng]}
              icon={getSOSIcon(p.stage, p.avatarUrl)}
            >
              <Popup>
                <div className="p-3 max-w-[240px]">
                  <div className="flex items-start gap-3">
                    <img
                      src={p.avatarUrl}
                      alt={p.userName}
                      className="size-10 rounded-full border-2 border-white/90 object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">
                        {p.userName}
                      </p>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        <span className="truncate">{p.location || t("floodMap.unknownLocation")}</span>
                      </div>
                      {p.urgency && (
                        <div className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {t("floodMap.urgency")}: {p.urgency}
                        </div>
                      )}
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-[11px] text-slate-600 mt-2 line-clamp-3">
                      {p.description}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-400 mt-2">
                    {p.rawStatus}
                    {p.createdAt ? ` • ${new Date(p.createdAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}` : ""}
                    {p.assignedName ? ` • ${p.assignedName}` : ""}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route polyline (real road) */}
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: "#3b82f6",
                weight: 5,
                opacity: 0.8,
              }}
            />
          )}

          {/* My Location marker */}
          {myLocation && (
            <Marker position={[myLocation.lat, myLocation.lng]} icon={myLocationIcon}>
              <Popup>
                <div className="p-3">
                  <p className="font-black text-sm text-blue-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">my_location</span>
                    Vị trí của tôi
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {myLocation.lat.toFixed(5)}, {myLocation.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Family member markers */}
          {showFamily && familyMembers.map((member) => (
            <Marker
              key={`family-${member.id}`}
              position={[member.latitude, member.longitude]}
              icon={createFamilyIcon(member.safetyStatus)}
            >
              <Popup>
                <div className="p-4 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: familySafetyColors[member.safetyStatus]?.bg || '#94a3b8' }}>
                      {(member.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900">{member.displayName}</p>
                      <p className="text-[10px] text-slate-500">{member.relation || 'Người thân'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: familySafetyColors[member.safetyStatus]?.bg || '#94a3b8' }}>
                      {familySafetyColors[member.safetyStatus]?.label || 'Chưa rõ'}
                    </span>
                    {member.healthNote && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">medical_information</span>
                        {member.healthNote}
                      </p>
                    )}
                    {member.phoneNumber && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">call</span>
                        {member.phoneNumber}
                      </p>
                    )}
                    {/* Directions button */}
                    {myLocation && (
                      <button
                        onClick={() => fetchRoute(myLocation, { lat: member.latitude, lng: member.longitude }, member.displayName)}
                        className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-[11px] font-bold rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">directions</span>
                        Chỉ đường
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend overlay */}
      {!showWindy && <MapLegend />}
    </div>
  );
}
