import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import useWebRTCCall from "../hooks/useWebRTCCall";
import CallOverlay from "../components/call/CallOverlay";

// Same WS endpoint as tracking/presence — the call socket is just another client.
const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:5001";

const CallContext = createContext(null);

/**
 * Always-on call signaling.
 *
 * While logged in, keeps a dedicated WebSocket open (mirrors LiveLocationProvider)
 * so an incoming call can ring on ANY page, even before the tracking modal is
 * opened. Only `call_*` / `webrtc_*` messages are consumed here; everything else
 * on this socket is ignored. The actual media/negotiation lives in useWebRTCCall.
 *
 * Mounted in App.jsx inside AuthProvider (needs the token).
 */
export function CallProvider({ children }) {
  const { token } = useAuth();
  const wsRef = useRef(null);
  const pendingSendRef = useRef([]); // messages sent while the socket was reconnecting
  const [socketReady, setSocketReady] = useState(false);

  // Stable signaling sender — reads the current socket at send time. If the
  // socket is momentarily not OPEN (reconnecting), queue the message and flush
  // it on the next open, so a call_invite/answer/ICE is never silently dropped.
  const sendSignal = useCallback((message) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn("[Call] socket not open — queued", message.type);
      pendingSendRef.current.push(message);
    }
  }, []);

  const call = useWebRTCCall(sendSignal);

  // Keep the latest handler in a ref so the socket effect (bound once per token)
  // always dispatches to the current closure without re-opening the socket.
  const handleSignalRef = useRef(call.handleSignal);
  handleSignalRef.current = call.handleSignal;

  // Ask once for OS notification permission so incoming calls can pop a system
  // notification even when the app tab is in the background.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    let closed = false;
    let reconnectTimer = null;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(`${WS_BASE}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setSocketReady(true);
        console.log("[Call] signaling socket open");
        // Flush anything queued while we were reconnecting.
        const queued = pendingSendRef.current;
        pendingSendRef.current = [];
        queued.forEach((m) => {
          try {
            ws.send(JSON.stringify(m));
          } catch {
            /* noop */
          }
        });
      };

      ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg?.type && (msg.type.startsWith("call_") || msg.type.startsWith("webrtc_"))) {
          console.log("[Call] recv", msg.type, msg.type.startsWith("call_") ? msg : "");
          handleSignalRef.current?.(msg);
        }
      };

      ws.onclose = (e) => {
        setSocketReady(false);
        wsRef.current = null;
        console.log("[Call] signaling socket closed", e?.code || "");
        if (!closed) reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.warn("[Call] signaling socket error", e?.message || "");
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setSocketReady(false);
    };
  }, [token]);

  const value = {
    callState: call.callState,
    media: call.media,
    peer: call.peer,
    startCall: call.startCall,
    socketReady,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay call={call} />
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
}
