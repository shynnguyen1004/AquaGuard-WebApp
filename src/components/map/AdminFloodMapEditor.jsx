import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "../../config/firebase";

const OWM_KEY = import.meta.env.VITE_OWM_API_KEY || "";

const WEATHER_LAYERS = [
  { key: "rain_radar", label: "Radar mưa", icon: "rainy", color: "#3b82f6", free: true },
  { key: "wind_new", label: "Gió", icon: "air", color: "#38bdf8", free: false },
  { key: "clouds_new", label: "Mây", icon: "cloud", color: "#94a3b8", free: false },
  { key: "temp_new", label: "Nhiệt độ", icon: "thermostat", color: "#f97316", free: false },
  { key: "pressure_new", label: "Áp suất", icon: "speed", color: "#a78bfa", free: false },
];

// Custom colored pin icon
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

const severityMap = {
  critical: { color: "#a855f7", label: "Critical" },
  severe:   { color: "#ef4444", label: "Severe" },
  moderate: { color: "#f59e0b", label: "Moderate" },
  low:      { color: "#10b981", label: "Low" },
  safe:     { color: "#10b981", label: "Safe" },
};

export default function AdminFloodMapEditor() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMarkerPos, setNewMarkerPos] = useState(null);
  const [editingMarker, setEditingMarker] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    severity: "low",
    water_level: 0,
  });
  const [activeWeatherLayers, setActiveWeatherLayers] = useState([]);
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const [rainRadarUrl, setRainRadarUrl] = useState(null);

  const toggleWeatherLayer = (layerKey) => {
    setActiveWeatherLayers((prev) =>
      prev.includes(layerKey)
        ? prev.filter((k) => k !== layerKey)
        : [...prev, layerKey]
    );
  };

  // Fetch RainViewer radar timestamp (free, no API key)
  useEffect(() => {
    async function fetchRainRadar() {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await res.json();
        const lastFrame = data.radar?.past?.slice(-1)[0];
        if (lastFrame) {
          setRainRadarUrl(`${data.host}${lastFrame.path}/256/{z}/{x}/{y}/6/1_1.png`);
        }
      } catch (err) {
        console.warn("[AdminMap] Could not fetch RainViewer data:", err);
      }
    }
    fetchRainRadar();
    const interval = setInterval(fetchRainRadar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    const unsubscribe = onSnapshot(collection(db, "flood_zones"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          lat: d.location?.latitude || d.location?.lat || 0,
          lng: d.location?.longitude || d.location?.lng || 0,
          ...d,
        };
      });
      setMarkers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMapClick = (e) => {
    setNewMarkerPos(e.latlng);
    setEditingMarker(null);
    setFormData({ name: "", severity: "low", water_level: 0 });
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    if (!newMarkerPos) return;

    try {
      const db = getFirebaseDb();
      await addDoc(collection(db, "flood_zones"), {
        name: formData.name,
        severity: formData.severity,
        water_level: parseFloat(formData.water_level),
        location: {
          latitude: newMarkerPos.lat,
          longitude: newMarkerPos.lng,
        },
        updatedAt: new Date().toISOString(),
      });
      setNewMarkerPos(null);
    } catch (err) {
      console.error("Error creating flood zone:", err);
    }
  };

  const handleUpdateZone = async (e) => {
    e.preventDefault();
    if (!editingMarker) return;

    try {
      const db = getFirebaseDb();
      await updateDoc(doc(db, "flood_zones", editingMarker.id), {
        name: formData.name,
        severity: formData.severity,
        water_level: parseFloat(formData.water_level),
        updatedAt: new Date().toISOString(),
      });
      setEditingMarker(null);
    } catch (err) {
      console.error("Error updating flood zone:", err);
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm("Are you sure you want to delete this flood zone?")) return;
    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, "flood_zones", id));
      setEditingMarker(null);
    } catch (err) {
      console.error("Error deleting flood zone:", err);
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click: handleMapClick,
    });
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-[600px] w-full bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700/30 shadow-xl">
      <style>{`.custom-pin-icon { background: none !important; border: none !important; }`}</style>
      
      {/* Sidebar Form */}
      <div className="w-full lg:w-80 p-6 border-r border-slate-100 dark:border-slate-700/30 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">edit_location</span>
          {editingMarker ? "Edit Flood Zone" : "Add New Zone"}
        </h3>
        
        {!newMarkerPos && !editingMarker ? (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">touch_app</span>
            <p className="text-xs text-slate-500">Click anywhere on the map to start adding a new flood zone</p>
          </div>
        ) : (
          <form onSubmit={editingMarker ? handleUpdateZone : handleCreateZone} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Zone Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. District 1 Riverfront"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Severity Level</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                {Object.entries(severityMap).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Water Level (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.water_level}
                onChange={(e) => setFormData({ ...formData, water_level: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">{editingMarker ? "save" : "add_location"}</span>
                {editingMarker ? "Update Zone" : "Create Zone"}
              </button>
              
              {editingMarker && (
                <button
                  type="button"
                  onClick={() => handleDeleteZone(editingMarker.id)}
                  className="w-full bg-red-50 text-red-500 font-bold py-2.5 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Delete Zone
                </button>
              )}
              
              <button
                type="button"
                onClick={() => { setNewMarkerPos(null); setEditingMarker(null); }}
                className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Map Content */}
      <div className="flex-1 relative min-h-[400px]">
        {/* Weather Layer Toggle */}
        <div className="absolute top-3 right-3 z-[1000]">
          <button
            onClick={() => setWeatherPanelOpen(!weatherPanelOpen)}
            className={`size-9 rounded-lg flex items-center justify-center shadow-lg transition-all ${activeWeatherLayers.length > 0 ? "bg-primary text-white" : "bg-white/90 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"} hover:scale-105`}
            title="Lớp thời tiết"
          >
            <span className="material-symbols-outlined text-lg">layers</span>
          </button>
          {weatherPanelOpen && (
            <div className="mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 min-w-[170px]">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Thời tiết</p>
              {WEATHER_LAYERS.map((layer) => {
                const isActive = activeWeatherLayers.includes(layer.key);
                const isDisabled = !layer.free && !OWM_KEY;
                return (
                  <button
                    key={layer.key}
                    onClick={() => !isDisabled && toggleWeatherLayer(layer.key)}
                    className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isDisabled ? "text-slate-300 dark:text-slate-600 cursor-not-allowed" : isActive ? "bg-primary/10 text-primary" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"}`}
                  >
                    <span className="material-symbols-outlined text-sm" style={isActive ? { color: layer.color } : {}}>{layer.icon}</span>
                    <span className="flex-1 text-left">{layer.label}</span>
                    {layer.free && <span className="text-[7px] font-bold bg-green-100 text-green-600 px-1 py-0.5 rounded">FREE</span>}
                    {isActive && <span className="material-symbols-outlined text-xs text-primary">check</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <MapContainer
          center={[16.054, 108.202]}
          zoom={6}
          className="w-full h-full z-0"
        >
          {/* Google Maps roadmap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxZoom={20}
          />

          {/* RainViewer precipitation radar (FREE) */}
          {activeWeatherLayers.includes("rain_radar") && rainRadarUrl && (
            <TileLayer url={rainRadarUrl} opacity={0.7} zIndex={10} />
          )}

          {/* OpenWeatherMap weather overlay layers (requires active API key) */}
          {OWM_KEY && activeWeatherLayers.filter(k => k !== "rain_radar").map((layerKey) => (
            <TileLayer
              key={layerKey}
              url={`https://tile.openweathermap.org/map/${layerKey}/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.6}
              zIndex={10}
            />
          ))}

          <MapEvents />

          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createPinIcon(severityMap[marker.severity]?.color || severityMap.low.color)}
              eventHandlers={{
                click: () => {
                  setEditingMarker(marker);
                  setNewMarkerPos(null);
                  setFormData({
                    name: marker.name || "",
                    severity: marker.severity || "low",
                    water_level: marker.water_level || 0,
                  });
                },
              }}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-bold text-sm">{marker.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{marker.severity} intensity</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {newMarkerPos && (
            <Marker position={newMarkerPos} icon={createPinIcon("#11a0b6")} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
