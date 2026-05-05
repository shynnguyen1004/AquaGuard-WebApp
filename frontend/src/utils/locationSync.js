/**
 * Location Sync Utility
 * Gets the user's GPS position and sends it to the backend.
 * Used after login/register to automatically save the user's location.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
const GPS_CACHE_KEY = "aquaguard_gps_cache";

/**
 * Save GPS position to sessionStorage for fast reuse across components.
 */
export function cacheGpsPosition(latitude, longitude) {
  try {
    sessionStorage.setItem(GPS_CACHE_KEY, JSON.stringify({
      latitude,
      longitude,
      timestamp: Date.now(),
    }));
  } catch { /* quota exceeded — ignore */ }
}

/**
 * Read cached GPS position from sessionStorage.
 * Returns { latitude, longitude } if cache is fresh (< 5 min), else null.
 */
export function getCachedGpsPosition(maxAgeMs = 300000) {
  try {
    const raw = sessionStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > maxAgeMs) return null;
    return { latitude: cached.latitude, longitude: cached.longitude };
  } catch {
    return null;
  }
}

/**
 * Get the user's current GPS position.
 * Returns { latitude, longitude } or null if unavailable.
 */
function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("[LocationSync] Geolocation API not available");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        // Cache for instant reuse by other components
        cacheGpsPosition(coords.latitude, coords.longitude);
        resolve(coords);
      },
      (err) => {
        console.warn("[LocationSync] Could not get position:", err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Accept cached position up to 5 minutes old
      }
    );
  });
}

/**
 * Attempt to reverse-geocode coordinates into a human-readable address.
 * Uses Nominatim (free) as fallback if no Google Maps API key is configured.
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

    if (GOOGLE_MAPS_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=vi&result_type=street_address|route|sublocality|locality`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
    }

    // Fallback: Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AquaGuard-WebApp" },
    });
    const data = await res.json();
    if (data.display_name) {
      return data.display_name;
    }
  } catch (err) {
    console.warn("[LocationSync] Reverse geocode failed:", err.message);
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/**
 * Sync the user's GPS location to the backend.
 * This runs silently after login/register — errors are logged but never thrown.
 *
 * @param {string} token - JWT auth token
 */
export async function syncLocationAfterAuth(token) {
  if (!token) return;

  try {
    const coords = await getCurrentPosition();
    if (!coords) return;

    const address = await reverseGeocode(coords.latitude, coords.longitude);

    await fetch(`${API_BASE}/family/location`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address,
      }),
    });

    console.log("[LocationSync] Location synced successfully:", coords.latitude.toFixed(6), coords.longitude.toFixed(6));
  } catch (err) {
    // Silent failure — location sync is best-effort
    console.warn("[LocationSync] Failed to sync location:", err.message);
  }
}
