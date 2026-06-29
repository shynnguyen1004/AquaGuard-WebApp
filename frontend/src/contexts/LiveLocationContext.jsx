import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { cacheGpsPosition, syncLocationAfterAuth } from "../utils/locationSync";

// WebSocket endpoint cho live-location: lấy từ env, fallback về localhost khi dev.
const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:5001";

const LiveLocationContext = createContext({ isConnected: false });

/**
 * Continuous, always-on location publisher.
 *
 * While a user is logged in, this keeps a single dedicated WebSocket open and
 * streams the device GPS as `presence_location` messages — so rescuers are
 * "online" the whole session (ride-hailing driver style), not just while a
 * tracking modal is open. The backend writes these to the Redis hot store and
 * flushes the first/last fix to Postgres.
 *
 * This socket never joins a tracking room; the RescueTrackingMap modal keeps
 * its own short-lived socket (useRescueTracking) for per-request room exchange.
 */
export function LiveLocationProvider({ children }) {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const reconnectRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let closed = false;

    // Durable last-known-location sync (user_locations). Non-blocking, best-effort.
    // Login/register already trigger this in AuthContext; this covers returning
    // sessions (page refresh without re-login) now that the blocking gate is gone.
    syncLocationAfterAuth(token);

    const sendPresence = (lat, lng) => {
      cacheGpsPosition(lat, lng);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "presence_location", latitude: lat, longitude: lng })
        );
      }
    };

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(`${WS_BASE}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (!closed) reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    // Continuous GPS: watchPosition + a 2s fallback poll (some devices fire
    // watchPosition infrequently). Mirrors the cadence used by useRescueTracking.
    const geoOpts = { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 };
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPresence(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn("[LiveLocation] GPS watch error:", err.message),
      geoOpts
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendPresence(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 3000 }
      );
    }, 2000);

    return () => {
      closed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [token]);

  return (
    <LiveLocationContext.Provider value={{ isConnected }}>
      {children}
    </LiveLocationContext.Provider>
  );
}

export function useLiveLocation() {
  return useContext(LiveLocationContext);
}
