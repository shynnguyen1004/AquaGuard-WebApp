import { useState, useEffect, useRef, useCallback } from "react";
import { getStoredToken } from "../utils/authStorage";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:5001";

/**
 * Custom hook for WebSocket-based live rescue tracking.
 *
 * @param {number|null} requestId  — the rescue request ID to track
 * @param {{
 *   active?: boolean,
 *   participantRole?: "citizen" | "rescuer" | null,
 *   shareLocation?: boolean,
 * }} options
 * @returns {{ citizenLocation, rescuerLocation, isConnected, trackingEnded, trackingEndReason }}
 */
export default function useRescueTracking(
  requestId,
  {
    active = false,
    participantRole = null,
    shareLocation = false,
  } = {}
) {
  const [citizenLocation, setCitizenLocation] = useState(null);
  const [rescuerLocation, setRescuerLocation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [trackingEnded, setTrackingEnded] = useState(false);
  const [trackingEndReason, setTrackingEndReason] = useState(null);

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

    const token = getStoredToken();
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
              if (msg.role === "citizen") {
                setCitizenLocation({
                  lat: msg.latitude,
                  lng: msg.longitude,
                  timestamp: msg.timestamp,
                });
              } else if (msg.role === "rescuer") {
                setRescuerLocation({
                  lat: msg.latitude,
                  lng: msg.longitude,
                  timestamp: msg.timestamp,
                });
              }
              break;
            case "tracking_started":
              if (msg.citizenLatitude != null && msg.citizenLongitude != null) {
                setCitizenLocation({
                  lat: msg.citizenLatitude,
                  lng: msg.citizenLongitude,
                  timestamp: Date.now(),
                });
              }
              if (msg.rescuerLatitude != null && msg.rescuerLongitude != null) {
                setRescuerLocation({
                  lat: msg.rescuerLatitude,
                  lng: msg.rescuerLongitude,
                  timestamp: Date.now(),
                });
              }
              break;
            case "tracking_ended":
              setTrackingEndReason("completed");
              setTrackingEnded(true);
              break;
            case "tracking_cancelled":
              setTrackingEndReason("cancelled");
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
    if (!active || !requestId || !shareLocation || !participantRole) return;

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
        if (participantRole === "citizen") {
          setCitizenLocation(loc);
        } else if (participantRole === "rescuer") {
          setRescuerLocation(loc);
        }
        sendLocation(loc.lat, loc.lng);
      },
      (err) => {
        console.warn("GPS watch error:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );

    watchIdRef.current = watchId;

    // Interval fallback: poll position every 2s for continuous updates
    // (watchPosition may not fire frequently enough on some devices)
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (participantRole === "citizen") {
            setCitizenLocation(loc);
          } else if (participantRole === "rescuer") {
            setRescuerLocation(loc);
          }
          sendLocation(loc.lat, loc.lng);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 3000 }
      );
    }, 2000);

    return () => {
      clearInterval(intervalId);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active, requestId, participantRole, sendLocation, shareLocation]);

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
    citizenLocation,
    rescuerLocation,
    isConnected,
    trackingEnded,
    trackingEndReason,
  };
}
