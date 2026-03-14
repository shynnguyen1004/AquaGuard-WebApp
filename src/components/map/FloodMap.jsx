import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "../../config/firebase";
import MapLegend from "./MapLegend";

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
 * Handles: GeoPoint objects, plain objects {latitude, longitude}, and strings
 */
function parseLocation(location) {
  if (!location) return null;

  // Handle Firestore GeoPoint or plain object with lat/lng
  if (typeof location === "object") {
    // GeoPoint has .latitude and .longitude
    if (typeof location.latitude === "number" && typeof location.longitude === "number") {
      return { lat: location.latitude, lng: location.longitude };
    }
    // Some GeoPoint implementations use _lat / _long
    if (typeof location._lat === "number" && typeof location._long === "number") {
      return { lat: location._lat, lng: location._long };
    }
    // Plain object with lat/lng
    if (typeof location.lat === "number" && typeof location.lng === "number") {
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  }

  // Handle string format: "[16.0146° N, 108.2091° E]"
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

  useEffect(() => {
    async function fetchFloodZones() {
      try {
        console.log("[FloodMap] Bắt đầu kết nối Firestore...");
        const db = getFirebaseDb();
        console.log("[FloodMap] Firestore instance OK. Đang fetch flood_zones...");

        const floodZonesRef = collection(db, "flood_zones");
        const snapshot = await getDocs(floodZonesRef);

        console.log("[FloodMap] Số documents nhận được:", snapshot.size);

        const data = [];
        snapshot.docs.forEach((doc) => {
          const d = doc.data();
          console.log("[FloodMap] Document:", doc.id, d);

          const pos = parseLocation(d.location);
          if (!pos) {
            console.warn("[FloodMap] Không parse được location:", d.location);
            return;
          }

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

        console.log("[FloodMap] Tổng markers hiển thị:", data.length);
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

      <MapContainer
        center={[16.054, 108.202]}
        zoom={12}
        className="w-full h-full z-0"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* CartoDB Voyager — clean, modern map style */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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

      {/* Legend overlay */}
      <MapLegend />
    </div>
  );
}
