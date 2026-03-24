import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "../../config/firebase";
import MapLegend from "./MapLegend";

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
  critical: { color: "#a855f7", label: "Critical" },
  severe:   { color: "#ef4444", label: "Severe" },
  moderate: { color: "#f59e0b", label: "Moderate" },
  low:      { color: "#10b981", label: "Low" },
  safe:     { color: "#10b981", label: "Safe" },
};

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

export default function FloodMap() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWindy, setShowWindy] = useState(false);
  const [windyOverlay, setWindyOverlay] = useState("rain");
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const windyIframeRef = useRef(null);

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
            label: sev.label,
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
  }, []);

  const windyUrl = `/windy.html?key=${WINDY_API_KEY}&lat=16.054&lon=108.202&zoom=7&overlay=${windyOverlay}`;

  return (
    <div className="flex-1 relative">
      <style>{`
        .custom-pin-icon { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important; 
          padding: 0 !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
        }
        .leaflet-popup-content { margin: 0 !important; min-width: 220px; }
        .leaflet-popup-tip { box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Đang tải dữ liệu bản đồ...
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
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => setWeatherPanelOpen(!weatherPanelOpen)}
          className={`size-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${
            showWindy
              ? "bg-primary text-white shadow-primary/30"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          } hover:scale-105`}
          title="Lớp thời tiết Windy"
        >
          <span className="material-symbols-outlined text-xl">layers</span>
        </button>

        {weatherPanelOpen && (
          <div className="mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              🌦️ Windy Weather
            </p>

            {/* Toggle Windy Map */}
            <button
              onClick={() => setShowWindy(!showWindy)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-2 ${
                showWindy
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {showWindy ? "visibility" : "visibility_off"}
              </span>
              <span>{showWindy ? "Ẩn bản đồ thời tiết" : "Hiện bản đồ thời tiết"}</span>
            </button>

            {/* Overlay options (only show when Windy is active) */}
            {showWindy && (
              <>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1 mt-1">
                  Chọn lớp hiển thị
                </p>
                {WINDY_OVERLAYS.map((layer) => {
                  const isActive = windyOverlay === layer.key;
                  return (
                    <button
                      key={layer.key}
                      onClick={() => changeWindyOverlay(layer.key)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
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

      {/* Windy Weather Map (iframe overlay) */}
      {showWindy && WINDY_API_KEY && (
        <div className="absolute inset-0 z-[500]">
          <iframe
            ref={windyIframeRef}
            src={windyUrl}
            className="w-full h-full border-0"
            title="Windy Weather Map"
            allow="geolocation"
          />
          {/* Semi-transparent badge */}
          <div className="absolute bottom-4 left-4 z-[501] bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">cloud</span>
            Powered by Windy.com
          </div>
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
        >
          {/* Google Maps roadmap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
          />

          {markers.map((marker) => (
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
                        Water +{marker.waterLevel}m
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
        </MapContainer>
      </div>

      {/* Legend overlay */}
      {!showWindy && <MapLegend />}
    </div>
  );
}
