import { useState, useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:5001";

/**
 * Custom hook for WebSocket-based live rescue tracking.
 *
 * @param {number|null} requestId  — the rescue request ID to track
 * @param {boolean} active         — whether tracking should be active
 * @returns {{ myLocation, otherLocation, isConnected, routeCoords, routeInfo }}
 */
export default function useRescueTracking(requestId, active = false) {
  const [myLocation, setMyLocation] = useState(null);
  const [otherLocation, setOtherLocation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [trackingEnded, setTrackingEnded] = useState(false);

  const wsRef = useRef(null);
  const watchIdRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Send location to server
  const sendLocation = useCallback((lat, lng) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "location_update",
        latitude: lat,
        longitude: lng,
      }));
    }
  }, []);

  // Connect WebSocket
  useEffect(() => {
    if (!active || !requestId) return;

    const token = localStorage.getItem("aquaguard_token");
    if (!token) return;

    let ws;
    let closed = false;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(`${WS_BASE}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Join tracking room
        ws.send(JSON.stringify({
          type: "join_tracking",
          requestId: requestId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "location_update":
              setOtherLocation({
                lat: msg.latitude,
                lng: msg.longitude,
                role: msg.role,
                timestamp: msg.timestamp,
              });
              break;
            case "tracking_started":
              // Could update UI to show tracking has begun
              break;
            case "tracking_ended":
              setTrackingEnded(true);
              break;
            default:
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Reconnect after 3 seconds if still active
        if (!closed) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [active, requestId]);

  // Start GPS tracking (watchPosition)
  useEffect(() => {
    if (!active || !requestId) return;

    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMyLocation(loc);
        sendLocation(loc.lat, loc.lng);
      },
      (err) => {
        console.warn("GPS error:", err.message);
        // Fallback: try getting position once
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMyLocation(loc);
            sendLocation(loc.lat, loc.lng);
          },
          () => {}
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active, requestId, sendLocation]);

  // Cleanup on trackingEnded
  useEffect(() => {
    if (trackingEnded) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [trackingEnded]);

  return {
    myLocation,
    otherLocation,
    isConnected,
    trackingEnded,
  };
}
