/**
 * Location Sync Utility
 * Gets the user's GPS position and sends it to the backend.
 * Used after login/register to automatically save the user's location.
 */

import { reverseGeocodeAddress } from "./reverseGeocode";

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
 * Returns { latitude, longitude, ageMs } if present and (optionally) fresh enough, else null.
 * Pass maxAgeMs = Infinity to retrieve a stale cache as a last-resort fallback.
 */
export function getCachedGpsPosition(maxAgeMs = 300000) {
  try {
    const raw = sessionStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const ageMs = Date.now() - cached.timestamp;
    if (ageMs > maxAgeMs) return null;
    return { latitude: cached.latitude, longitude: cached.longitude, ageMs };
  } catch {
    return null;
  }
}

/**
 * Pre-warm GPS: fire a non-blocking geolocation request that caches the result.
 * Use this as soon as a page that needs GPS mounts, so the browser's internal
 * position cache is fresh by the time the user actually submits anything.
 * Cheap to call repeatedly — no-op if there is already a fresh cached position.
 */
export function prewarmGps() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return;
  if (getCachedGpsPosition(60000)) return; // already fresh within last 60s

  navigator.geolocation.getCurrentPosition(
    (pos) => cacheGpsPosition(pos.coords.latitude, pos.coords.longitude),
    () => { /* silent — best-effort warmup */ },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
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

    // Không tra được địa chỉ thì gửi chuỗi rỗng — backend sẽ giữ nguyên địa chỉ
    // cũ. Tuyệt đối không gửi chuỗi toạ độ làm địa chỉ: nó sẽ nằm lại trong DB
    // và hiện ra ở mọi chỗ đọc `address` (header, hàng đợi cứu hộ...).
    const address = await reverseGeocodeAddress(coords.latitude, coords.longitude);

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
