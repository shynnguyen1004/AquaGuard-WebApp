import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useRescueTracking from "../../hooks/useRescueTracking";

// ── Icon creators ──

function createCitizenIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
      <defs>
        <filter id="cs" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)" />
        </filter>
      </defs>
      <path d="M20 0C10 0 2 8 2 18c0 14 18 32 18 32s18-18 18-32C38 8 30 0 20 0z"
            fill="#ef4444" filter="url(#cs)" />
      <circle cx="20" cy="14" r="5" fill="white" />
      <path d="M12 24c0-4.4 3.6-6 8-6s8 1.6 8 6" fill="white" opacity="0.8" />
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "citizen-tracking-icon",
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  });
}

function createRescuerIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
      <defs>
        <filter id="rs" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)" />
        </filter>
      </defs>
      <path d="M22 0C11 0 2 9 2 20c0 15 20 32 20 32s20-17 20-32C42 9 33 0 22 0z"
            fill="#3b82f6" filter="url(#rs)" />
      <circle cx="22" cy="16" r="8" fill="white" opacity="0.9" />
      <path d="M22 12v8M18 16h8" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "rescuer-tracking-icon",
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
  });
}

const citizenIcon = createCitizenIcon();
const rescuerIcon = createRescuerIcon();

// ── Auto-fit map to show both markers ──
function FitBounds({ positions }) {
  const map = useMap();
  const prevPositionsRef = useRef(null);

  useEffect(() => {
    if (positions.length < 2) return;
    const key = positions.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join("|");
    if (prevPositionsRef.current === key) return;
    prevPositionsRef.current = key;

    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
  }, [positions, map]);

  return null;
}

/**
 * RescueTrackingMap — full-screen map overlay for live rescue tracking.
 *
 * @param {number} requestId        — the rescue request being tracked
 * @param {string} userRole         — "citizen" or "rescuer" (current user's role)
 * @param {{ lat, lng }} citizenPos — citizen's initial GPS position
 * @param {{ lat, lng }} rescuerPos — rescuer's initial GPS position (optional)
 * @param {Function} onClose        — called when the user closes the map
 * @param {Function} onComplete     — called when the rescuer clicks "Complete" (rescuer only)
 */
export default function RescueTrackingMap({
  requestId,
  userRole,
  trackingRole = null,
  shareLocation = false,
  citizenPos,
  rescuerPos,
  citizenName,
  citizenPhone,
  rescuerName,
  onClose,
  onComplete,
  onCancel,
}) {
  const { citizenLocation, rescuerLocation, isConnected, trackingEnded, trackingEndReason } =
    useRescueTracking(requestId, {
      active: true,
      participantRole: trackingRole,
      shareLocation,
    });

  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const lastRouteFetchRef = useRef(0);

  // Determine who is who
  const isCitizen = userRole === "citizen";
  // Current positions: prefer live location, fallback to initial
  const currentCitizenPos = citizenLocation || citizenPos;
  const currentRescuerPos = rescuerLocation || rescuerPos;

  // Fetch route from OSRM
  const fetchRoute = useCallback(async (from, to) => {
    if (!from || !to) return;

    // Throttle: min 5 seconds between fetches
    const now = Date.now();
    if (now - lastRouteFetchRef.current < 5000) return;
    lastRouteFetchRef.current = now;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
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
  }, []);

  // Fetch route when positions change
  useEffect(() => {
    if (currentRescuerPos && currentCitizenPos) {
      fetchRoute(currentRescuerPos, currentCitizenPos);
    }
  }, [
    currentRescuerPos?.lat,
    currentRescuerPos?.lng,
    currentCitizenPos?.lat,
    currentCitizenPos?.lng,
    fetchRoute,
  ]);

  // Handle tracking ended
  useEffect(() => {
    if (trackingEnded) {
      // Auto-close after a short delay
      setTimeout(() => onClose?.(), 2000);
    }
  }, [trackingEnded, onClose]);

  // Positions for fitBounds
  const boundsPositions = [];
  if (currentCitizenPos) boundsPositions.push([currentCitizenPos.lat, currentCitizenPos.lng]);
  if (currentRescuerPos) boundsPositions.push([currentRescuerPos.lat, currentRescuerPos.lng]);

  const mapCenter = currentCitizenPos
    ? [currentCitizenPos.lat, currentCitizenPos.lng]
    : currentRescuerPos
      ? [currentRescuerPos.lat, currentRescuerPos.lng]
      : [16.054, 108.202];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900">
      <style>{`
        .citizen-tracking-icon, .rescuer-tracking-icon { background: none !important; border: none !important; }
        .tracking-map .leaflet-popup-content-wrapper {
          border-radius: 16px !important; padding: 0 !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
        }
        .tracking-map .leaflet-popup-content { margin: 0 !important; min-width: 180px; }
      `}</style>

      {/* Top bar */}
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className={`size-3 rounded-full ${isConnected ? "bg-safe animate-pulse" : "bg-slate-400"}`} />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              🚨 Rescue Tracking
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {isConnected ? "Live — Đang kết nối" : "Đang kết nối lại..."}
              {trackingEnded && ` • ${trackingEndReason === "cancelled" ? "Đã huỷ mission" : "Đã hoàn thành!"}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="size-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-500 text-lg">close</span>
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative tracking-map">
        <MapContainer
          center={mapCenter}
          zoom={14}
          className="w-full h-full z-0"
          zoomControl={true}
          scrollWheelZoom={true}
        >
          {boundsPositions.length >= 2 && <FitBounds positions={boundsPositions} />}

          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
          />

          {/* Route */}
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: "#3b82f6",
                weight: 5,
                opacity: 0.8,
                dashArray: "12 8",
              }}
            />
          )}

          {/* Citizen marker */}
          {currentCitizenPos && (
            <Marker position={[currentCitizenPos.lat, currentCitizenPos.lng]} icon={citizenIcon}>
              <Popup>
                <div className="p-3">
                  <p className="font-black text-sm text-red-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">person</span>
                    {citizenName || "Citizen"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Người cần cứu hộ
                  </p>
                  {citizenPhone && (
                    <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-xs">call</span>
                      {citizenPhone}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Rescuer marker */}
          {currentRescuerPos && (
            <Marker position={[currentRescuerPos.lat, currentRescuerPos.lng]} icon={rescuerIcon}>
              <Popup>
                <div className="p-3">
                  <p className="font-black text-sm text-blue-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">local_shipping</span>
                    {rescuerName || "Rescuer"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Đội cứu hộ
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Route info banner */}
        {routeInfo && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500 text-white px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold">
            <span className="material-symbols-outlined text-lg">directions</span>
            <span>{routeInfo.distance} km</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">
              ~{routeInfo.duration} phút
            </span>
          </div>
        )}

        {/* Tracking ended overlay */}
        {trackingEnded && (
          <div className="absolute inset-0 z-[1001] bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
              <span className={`material-symbols-outlined text-6xl filled-icon mb-3 ${trackingEndReason === "cancelled" ? "text-warning" : "text-safe"}`}>
                {trackingEndReason === "cancelled" ? "undo" : "check_circle"}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                {trackingEndReason === "cancelled" ? "Đã huỷ mission" : "Hoàn thành!"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {trackingEndReason === "cancelled"
                  ? "Case cứu hộ đã được trả về hàng chờ"
                  : "Nhiệm vụ cứu hộ đã kết thúc"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar — Complete button for rescuer */}
      {!isCitizen && !trackingEnded && (onComplete || onCancel) && (
        <div className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">undo</span>
                Cancel Mission
              </button>
            )}
            {onComplete && (
              <button
                onClick={onComplete}
                className="w-full py-3.5 rounded-2xl bg-safe text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-safe/30"
              >
                <span className="material-symbols-outlined text-lg filled-icon">done_all</span>
                Complete Mission
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
