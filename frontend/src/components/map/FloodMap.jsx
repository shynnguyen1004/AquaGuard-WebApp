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

// Windy overlay options (labels are translation keys)
const WINDY_OVERLAYS = [
  { key: "rain", labelKey: "floodMap.overlayRain", icon: "rainy", color: "#3b82f6" },
  { key: "wind", labelKey: "floodMap.overlayWind", icon: "air", color: "#38bdf8" },
  { key: "clouds", labelKey: "floodMap.overlayClouds", icon: "cloud", color: "#94a3b8" },
  { key: "temp", labelKey: "floodMap.overlayTemp", icon: "thermostat", color: "#f97316" },
  { key: "pressure", labelKey: "floodMap.overlayPressure", icon: "speed", color: "#a78bfa" },
  { key: "waves", labelKey: "floodMap.overlayWaves", icon: "waves", color: "#06b6d4" },
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
  safe: { bg: "#10b981", label: "An toàn", icon: "verified_user" },
  danger: { bg: "#ef4444", label: "Nguy hiểm", icon: "warning" },
  injured: { bg: "#f97316", label: "Bị thương", icon: "healing" },
  unknown: { bg: "#94a3b8", label: "Chưa rõ", icon: "help" },
};

// Avatar URL for a family member — use their real avatar, else a generated one
// tinted with their safety-status colour so the marker stays readable.
function getFamilyAvatarUrl(member) {
  if (member.avatarUrl) return member.avatarUrl;
  const color = (familySafetyColors[member.safetyStatus]?.bg || "#94a3b8").replace("#", "");
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || "User")}&background=${color}&color=fff&size=64&bold=true`;
}

// Family member icon — avatar inside a colour-coded ring with a status dot and a
// pointer tail, mirroring the polished SOS avatar markers.
function createFamilyAvatarIcon({ avatarUrl, safetyStatus }) {
  const status = familySafetyColors[safetyStatus] ? safetyStatus : "unknown";
  const color = familySafetyColors[status].bg;
  // "group" people glyph so the marker reads as a family member at a glance,
  // clearly distinct from the SOS victim avatars.
  const peopleSvg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`;
  const html = `
    <div class="family-avatar-marker family-avatar-marker--${status}" style="--ring:${color}">
      <div class="family-avatar-marker__pin">
        <div class="family-avatar-marker__avatar">
          <img src="${avatarUrl}" alt="" referrerpolicy="no-referrer" />
        </div>
        <span class="family-avatar-marker__badge">${peopleSvg}</span>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "family-avatar-marker-icon",
    iconSize: [48, 56],
    iconAnchor: [24, 52],
    popupAnchor: [0, -50],
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

function createSOSAvatarIcon({ stage, avatarUrl, savedLabel }) {
  const color = SOS_STAGE_COLOR[stage] || SOS_STAGE_COLOR.pending;
  const colorNoHash = color.replace("#", "");

  // Show a "saved" badge below the avatar for resolved pins
  const savedBadge = stage === "resolved" && savedLabel
    ? `<div class="sos-avatar-marker__saved">${savedLabel}</div>`
    : "";

  // A lightweight HTML icon so we can show avatar via <img>.
  const html = `
    <div class="sos-avatar-marker sos-avatar-marker--${stage}">
      <div class="sos-avatar-marker__ring" style="border-color:#${colorNoHash};"></div>
      <div class="sos-avatar-marker__avatar">
        <img src="${avatarUrl}" alt="" referrerpolicy="no-referrer" />
      </div>
      ${savedBadge}
    </div>
  `;

  return L.divIcon({
    html,
    className: "sos-avatar-marker-icon",
    iconSize: [38, 50],
    iconAnchor: [19, 25],
    popupAnchor: [0, -25],
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
  const { token, role } = useAuth();
  const isCitizen = role === "citizen";
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
  const familyIconCacheRef = useRef(new Map()); // safetyStatus -> Leaflet icon

  const savedLabel = t("floodMap.saved") || "Đã cứu";

  const getSOSIcon = useCallback((stage, avatarUrl) => {
    const key = `${stage}|${avatarUrl}`;
    const cached = sosIconCacheRef.current.get(key);
    if (cached) return cached;
    const icon = createSOSAvatarIcon({ stage, avatarUrl, savedLabel });
    sosIconCacheRef.current.set(key, icon);
    return icon;
  }, [savedLabel]);

  const getFamilyIcon = useCallback((member) => {
    const safetyStatus = member.safetyStatus || "unknown";
    const avatarUrl = getFamilyAvatarUrl(member);
    const key = `${safetyStatus}|${avatarUrl}`;
    const cached = familyIconCacheRef.current.get(key);
    if (cached) return cached;
    const icon = createFamilyAvatarIcon({ avatarUrl, safetyStatus });
    familyIconCacheRef.current.set(key, icon);
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

      const nextPins = [];

      for (const req of json.data || []) {
        const requestId = req.id;
        const lat = Number(req.latitude);
        const lng = Number(req.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const rawStatus = req.status;

        // pending -> đỏ nhấp nháy; in_progress (accept) -> vàng; resolved (complete) -> xanh (vĩnh viễn)
        let stage = "pending";
        if (rawStatus === "pending") stage = "pending";
        else if (rawStatus === "in_progress") stage = "assigned";
        else if (rawStatus === "resolved") stage = "resolved";

        // Skip cancelled requests
        if (rawStatus === "cancelled") continue;

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
    }).catch(() => { });
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

  // Fetch family members locations (citizen only)
  const fetchFamilyMembers = useCallback(async () => {
    if (!token || !isCitizen) return;
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
  }, [token, isCitizen]);

  useEffect(() => {
    if (!isCitizen) return;
    fetchFamilyMembers();
    const interval = setInterval(fetchFamilyMembers, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFamilyMembers, isCitizen]);

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
        .custom-pin-icon, .family-avatar-marker-icon, .my-location-icon { background: none !important; border: none !important; }
        .family-avatar-marker-icon { cursor: pointer !important; pointer-events: auto !important; }
        .sos-avatar-marker-icon { background: none !important; border: none !important; }

        /* ── Family member avatar marker ── */
        .family-avatar-marker { position: relative; width: 48px; height: 56px; }
        .family-avatar-marker__pin {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          background: var(--ring);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 16px rgba(0,0,0,0.28);
        }
        .family-avatar-marker__pin::after {
          content: "";
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 14px;
          height: 14px;
          background: var(--ring);
          border-radius: 3px;
          z-index: -1;
        }
        .family-avatar-marker__avatar {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          overflow: hidden;
          border: 2px solid #fff;
          background: #e2e8f0;
        }
        .family-avatar-marker__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .family-avatar-marker__badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #fff;
          color: var(--ring);
          border: 1.5px solid var(--ring);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .family-avatar-marker__badge svg {
          width: 12px;
          height: 12px;
          display: block;
        }
        .family-avatar-marker--danger .family-avatar-marker__pin {
          animation: familyPulse 1.4s ease-in-out infinite;
        }
        @keyframes familyPulse {
          0%, 100% { box-shadow: 0 6px 16px rgba(0,0,0,0.28), 0 0 0 0 rgba(239,68,68,0.55); }
          50% { box-shadow: 0 6px 16px rgba(0,0,0,0.28), 0 0 0 8px rgba(239,68,68,0); }
        }

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

        .sos-avatar-marker__saved {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          font-size: 8px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 6px;
          white-space: nowrap;
          line-height: 1.3;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          border: 1.5px solid white;
          letter-spacing: 0.3px;
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
          overflow: hidden !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
          background: white !important;
        }
        .dark .leaflet-popup-content-wrapper {
          background: #1e293b !important;
        }
        .leaflet-popup-content { margin: 0 !important; min-width: 220px; }
        /* Neutral, readable close button on the family popup (light & dark) */
        .family-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
          font-size: 20px !important;
          top: 8px !important;
          right: 8px !important;
          font-weight: 700 !important;
          transition: color 0.15s, transform 0.15s !important;
        }
        .family-popup .leaflet-popup-close-button:hover {
          color: #475569 !important;
          transform: scale(1.15) !important;
        }
        .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          background: white !important;
        }
        .dark .leaflet-popup-tip {
          background: #1e293b !important;
        }
        .leaflet-control-attribution { display: none !important; }

        /* ── Modern rounded zoom controls ── */
        .leaflet-control-zoom {
          border: none !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06) !important;
          backdrop-filter: blur(12px) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.95) !important;
          color: #334155 !important;
          border: none !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(255,255,255,1) !important;
          color: #11a0b6 !important;
          transform: scale(1.05);
        }
        .leaflet-control-zoom a:active {
          transform: scale(0.95);
        }
        .leaflet-control-zoom-in {
          border-radius: 16px 16px 0 0 !important;
          border-bottom: 1px solid rgba(0,0,0,0.06) !important;
        }
        .leaflet-control-zoom-out {
          border-radius: 0 0 16px 16px !important;
        }
        .dark .leaflet-control-zoom {
          box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.15) !important;
        }
        .dark .leaflet-control-zoom a {
          background: rgba(30,41,59,0.95) !important;
          color: #cbd5e1 !important;
        }
        .dark .leaflet-control-zoom a:hover {
          background: rgba(30,41,59,1) !important;
          color: #11a0b6 !important;
        }
        .dark .leaflet-control-zoom-in {
          border-bottom-color: rgba(255,255,255,0.08) !important;
        }
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
      <div className="absolute top-4 right-4 z-[1000] flex items-start gap-2">
        {/* Dropdown panel - appears to the left of the button */}
        {weatherPanelOpen && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px]">
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
                      <span className="flex-1 text-left">{t(layer.labelKey)}</span>
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

        {/* Layer toggle button - always stays at top-right */}
        <button
          onClick={() => setWeatherPanelOpen(!weatherPanelOpen)}
          data-tour="map-weather"
          className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all flex-shrink-0 ${showWindy
            ? "bg-primary text-white shadow-primary/30"
            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            } hover:scale-105`}
          title={t("floodMap.windyLayers")}
        >
          <span className="material-symbols-outlined text-xl">layers</span>
        </button>
      </div>

      {/* Family Toggle Button (citizen only) */}
      <div className="absolute top-16 right-4 z-[1000] flex flex-col gap-2">
        {isCitizen && (
          <button
            onClick={() => setShowFamily(!showFamily)}
            data-tour="map-family"
            className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${showFamily
              ? "bg-emerald-500 text-white shadow-emerald-500/30"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              } hover:scale-105`}
            title={showFamily ? t("floodMap.hideFamily") : t("floodMap.showFamily")}
          >
            <span className="material-symbols-outlined text-xl">group</span>
          </button>
        )}

        {/* GPS Location Button */}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          data-tour="map-locate"
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
          data-tour="map-floodzones"
          className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${showFloodZones
            ? "bg-amber-500 text-white shadow-amber-500/30"
            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            } hover:scale-105`}
          title={showFloodZones ? t("floodMap.hideFloodZones") : t("floodMap.showFloodZones")}
        >
          <span className="material-symbols-outlined text-xl">flood</span>
        </button>
      </div>

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
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl">
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
                <div className="p-3 max-w-[240px] bg-white dark:bg-slate-800 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <img
                      src={p.avatarUrl}
                      alt={p.userName}
                      className="size-10 rounded-full border-2 border-white/90 object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate text-slate-900 dark:text-white">
                        {p.userName}
                      </p>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        <span className="truncate">{p.location || t("floodMap.unknownLocation")}</span>
                      </div>
                      {p.urgency && (
                        <div className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {t("floodMap.urgency")}: {p.urgency}
                        </div>
                      )}
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-3">
                      {p.description}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 flex-wrap">
                    {p.stage === "resolved" ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                        <span className="material-symbols-outlined text-[11px]">check_circle</span>
                        {t("floodMap.saved")}
                      </span>
                    ) : (() => {
                      const sosStatusMeta = {
                        pending: { label: t("floodMap.statusPending"), cls: "bg-red-100 text-red-700", icon: "schedule" },
                        in_progress: { label: t("floodMap.statusInProgress"), cls: "bg-amber-100 text-amber-700", icon: "sync" },
                        cancelled: { label: t("floodMap.statusCancelled"), cls: "bg-slate-100 text-slate-600", icon: "cancel" },
                      };
                      const meta = sosStatusMeta[p.rawStatus] || { label: p.rawStatus, cls: "bg-slate-100 text-slate-600", icon: "info" };
                      return (
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${meta.cls}`}>
                          <span className="material-symbols-outlined text-[11px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      );
                    })()}
                    {p.createdAt ? <span>• {new Date(p.createdAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}</span> : ""}
                    {p.assignedName ? <span>• {p.assignedName}</span> : ""}
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
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl">
                  <p className="font-black text-sm text-blue-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">my_location</span>
                    {t("floodMap.myLocationLabel")}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {myLocation.lat.toFixed(5)}, {myLocation.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Family member markers (citizen only) */}
          {isCitizen && showFamily && familyMembers.map((member) => (
            <Marker
              key={`family-${member.id}`}
              position={[member.latitude, member.longitude]}
              icon={getFamilyIcon(member)}
              eventHandlers={{ click: () => {} }}
            >
              <Popup className="family-popup">
                {(() => {
                  const status = familySafetyColors[member.safetyStatus] ? member.safetyStatus : "unknown";
                  const c = familySafetyColors[status];
                  return (
                    <div className="w-[240px] font-sans bg-white dark:bg-slate-900">
                      {/* Header — avatar with a colour-coded ring */}
                      <div className="flex items-center gap-3 pl-4 pr-9 pt-4 pb-3">
                        <div className="size-12 rounded-full p-[2.5px] shrink-0 shadow-sm" style={{ background: c.bg }}>
                          <img
                            src={getFamilyAvatarUrl(member)}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="size-full rounded-full object-cover border-2 border-white dark:border-slate-900"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-[15px] text-slate-900 dark:text-white leading-tight truncate">{member.displayName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[13px]">family_restroom</span>
                            {member.relation || t("floodMap.relative")}
                          </p>
                        </div>
                      </div>

                      {/* Status banner — soft tint of the status colour */}
                      <div
                        className="mx-4 rounded-xl px-3 py-2 flex items-center gap-2"
                        style={{ background: `${c.bg}1f` }}
                      >
                        <span className="material-symbols-outlined text-[16px] filled-icon" style={{ color: c.bg }}>{c.icon}</span>
                        <span className="text-[12px] font-bold" style={{ color: c.bg }}>{c.label}</span>
                      </div>

                      {/* Body */}
                      <div className="px-4 pt-2.5 pb-4 space-y-2">
                        {member.healthNote && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-slate-400 mt-px">medical_information</span>
                            <span className="break-words">{member.healthNote}</span>
                          </p>
                        )}
                        {member.phoneNumber && (
                          <a
                            href={`tel:${member.phoneNumber}`}
                            className="text-[12px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px] text-slate-400">call</span>
                            {member.phoneNumber}
                          </a>
                        )}
                        {myLocation && (
                          <button
                            onClick={() => fetchRoute(myLocation, { lat: member.latitude, lng: member.longitude }, member.displayName)}
                            className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 shadow-md shadow-primary/25 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">directions</span>
                            {t("floodMap.directions")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
