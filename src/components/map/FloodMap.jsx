import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

const floodMarkers = [
  {
    lat: 15.985, lng: 108.05,
    color: "#a855f7",
    label: "Critical",
    detail: "Water +3.2m",
    address: "Hoa Vang District, Da Nang",
    description: "Flash flood — multiple households submerged. Rescue teams deployed.",
  },
  {
    lat: 16.068, lng: 108.214,
    color: "#ef4444",
    label: "Severe",
    detail: "Water +2.5m",
    address: "268 Ly Thuong Kiet, Hai Chau, Da Nang",
    description: "Road completely flooded. Vehicles stranded, pedestrians trapped.",
  },
  {
    lat: 16.108, lng: 108.215,
    color: "#ef4444",
    label: "Severe",
    detail: "Water +1.8m",
    address: "Son Tra District, Da Nang",
    description: "Coastal flooding due to high tide. Evacuation in progress.",
  },
  {
    lat: 16.015, lng: 108.205,
    color: "#f59e0b",
    label: "Moderate",
    detail: "Water +0.9m",
    address: "Cam Le District, Da Nang",
    description: "Low-lying areas experiencing rising water levels. Monitoring active.",
  },
  {
    lat: 16.039, lng: 108.237,
    color: "#10b981",
    label: "Safe",
    detail: "Normal level",
    address: "My An, Ngu Hanh Son, Da Nang",
    description: "Water levels stable. No immediate risk detected.",
  },
];

export default function FloodMap() {
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

        {floodMarkers.map((marker, i) => (
          <Marker
            key={i}
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
                  <span className="text-[10px] font-bold text-slate-500 ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
                    {marker.detail}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mb-2">
                  {marker.description}
                </p>
                <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                  <span className="material-symbols-outlined text-sm mt-px">location_on</span>
                  <span>{marker.address}</span>
                </div>
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
