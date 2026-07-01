import { useCallback, useRef, useState } from "react";
import { getIceServers } from "../services/rtc";

/**
 * Drives one 1-1 WebRTC call over an external signaling channel.
 *
 * The hook owns the `RTCPeerConnection`, local media and the call state machine,
 * but does NOT own the socket — signaling is sent via the `sendSignal` callback
 * and delivered in via `handleSignal(msg)`. `CallProvider` wires both to its
 * always-on call socket.
 *
 * Call states: idle → outgoing/incoming → connecting → in_call → ended → idle
 *
 * v1 is voice-only; video is scaffolded (pass media: "video" and use the
 * camera/localStream fields), just not surfaced in the UI yet.
 *
 * @param {(msg: object) => void} sendSignal
 */
const ENDED_DISPLAY_MS = 3000;

export default function useWebRTCCall(sendSignal) {
  const [callState, setCallState] = useState("idle");
  const [media, setMedia] = useState("audio");
  const [peer, setPeer] = useState(null); // { name, role }
  const [ringing, setRinging] = useState(false); // caller: server confirmed peer is being rung
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [endReason, setEndReason] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callRef = useRef(null); // { requestId, media, role: "caller" | "callee" }
  const iceServersRef = useRef(null);
  const pendingIceRef = useRef([]);
  const remoteReadyRef = useRef(false);
  const endTimerRef = useRef(null);
  const ringTimeoutRef = useRef(null); // auto-end an unanswered outgoing call
  const offerPendingRef = useRef(false); // callee accepted before caller's pc was ready

  const getIce = useCallback(async () => {
    if (!iceServersRef.current) iceServersRef.current = await getIceServers();
    return iceServersRef.current;
  }, []);

  const cleanupMedia = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch {
        /* noop */
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    pendingIceRef.current = [];
    remoteReadyRef.current = false;
    setRemoteStream(null);
    setLocalStream(null);
  }, []);

  const resetToIdle = useCallback(() => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    cleanupMedia();
    callRef.current = null;
    setCallState("idle");
    setPeer(null);
    setMuted(false);
    setCameraOff(false);
    setRinging(false);
    setEndReason(null);
  }, [cleanupMedia]);

  // Terminal state that briefly shows a reason ("rejected"/"peer_hangup"/…) then resets.
  const showEnded = useCallback(
    (reason) => {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      cleanupMedia();
      callRef.current = null;
      setEndReason(reason);
      setCallState("ended");
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      endTimerRef.current = setTimeout(resetToIdle, ENDED_DISPLAY_MS);
    },
    [cleanupMedia, resetToIdle]
  );

  const buildPeerConnection = useCallback(
    async (requestId) => {
      const iceServers = await getIce();
      const pc = new RTCPeerConnection({ iceServers });
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal({ type: "webrtc_ice", requestId, candidate: e.candidate });
      };
      pc.ontrack = (e) => {
        // Prefer the associated stream; fall back to wrapping the bare track.
        const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
        setRemoteStream(stream);
      };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === "connected") setCallState("in_call");
        else if (st === "failed") showEnded("error");
        // "disconnected"/"closed" are handled via explicit hangup signals
      };
      pcRef.current = pc;
      return pc;
    },
    [getIce, sendSignal, showEnded]
  );

  const acquireMedia = useCallback(async (wantVideo) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!wantVideo });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    remoteReadyRef.current = true;
    const pending = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(c);
      } catch (err) {
        console.warn("[RTC] addIceCandidate (flush) failed:", err.message);
      }
    }
  }, []);

  // Caller creates the SDP offer once the callee accepts and the pc is ready.
  const createAndSendOffer = useCallback(
    async (pc, requestId) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: "webrtc_offer", requestId, sdp: pc.localDescription });
      } catch (err) {
        console.warn("[RTC] createOffer failed:", err.message);
        showEnded("error");
      }
    },
    [sendSignal, showEnded]
  );

  // ── Caller: start an outgoing call ──
  const startCall = useCallback(
    async (requestId, callMedia = "audio", peerInfo = null) => {
      if (callState !== "idle") return;
      const wantVideo = callMedia === "video";
      callRef.current = { requestId, media: callMedia, role: "caller" };
      setMedia(callMedia);
      setPeer(peerInfo ? { name: peerInfo.name, role: peerInfo.role } : null);
      setMuted(false);
      setRinging(false);
      setEndReason(null);
      setCallState("outgoing");
      offerPendingRef.current = false;
      // Give up if the callee never answers (or the signal never reaches them).
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        const c = callRef.current;
        if (c) sendSignal({ type: "call_cancel", requestId: c.requestId });
        showEnded("unavailable");
      }, 30000);

      // Ring the callee immediately — independent of local mic/camera setup.
      // (sendSignal queues the invite if the socket is momentarily reconnecting.)
      console.log("[Call] startCall → sending call_invite req", requestId, callMedia);
      sendSignal({ type: "call_invite", requestId, media: callMedia });

      try {
        const stream = await acquireMedia(wantVideo);
        const pc = await buildPeerConnection(requestId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        // If the callee accepted while we were acquiring media, send the offer now.
        if (offerPendingRef.current) {
          offerPendingRef.current = false;
          await createAndSendOffer(pc, requestId);
        }
      } catch (err) {
        console.warn("[RTC] startCall media error:", err.message);
        sendSignal({ type: "call_cancel", requestId });
        showEnded("mic_denied");
      }
    },
    [callState, acquireMedia, buildPeerConnection, createAndSendOffer, sendSignal, showEnded]
  );

  // ── Callee: accept the ringing call ──
  const acceptCall = useCallback(async () => {
    const call = callRef.current;
    if (!call || call.role !== "callee") return;
    const wantVideo = call.media === "video";
    setCallState("connecting");
    try {
      const stream = await acquireMedia(wantVideo);
      const pc = await buildPeerConnection(call.requestId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      sendSignal({ type: "call_accept", requestId: call.requestId });
    } catch (err) {
      console.warn("[RTC] acceptCall media error:", err.message);
      sendSignal({ type: "call_reject", requestId: call.requestId });
      showEnded("mic_denied");
    }
  }, [acquireMedia, buildPeerConnection, sendSignal, showEnded]);

  const rejectCall = useCallback(() => {
    const call = callRef.current;
    if (call) sendSignal({ type: "call_reject", requestId: call.requestId });
    resetToIdle();
  }, [sendSignal, resetToIdle]);

  const cancelCall = useCallback(() => {
    const call = callRef.current;
    if (call) sendSignal({ type: "call_cancel", requestId: call.requestId });
    resetToIdle();
  }, [sendSignal, resetToIdle]);

  const hangup = useCallback(() => {
    const call = callRef.current;
    if (call) sendSignal({ type: "call_hangup", requestId: call.requestId });
    resetToIdle();
  }, [sendSignal, resetToIdle]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  }, [cameraOff]);

  // ── Signaling from the server (dispatched by CallProvider) ──
  const handleSignal = useCallback(
    async (msg) => {
      switch (msg.type) {
        case "call_incoming": {
          // Busy → auto-reject the newcomer so the caller isn't left hanging.
          if (callState !== "idle" || callRef.current) {
            sendSignal({ type: "call_reject", requestId: msg.requestId });
            return;
          }
          const m = msg.media === "video" ? "video" : "audio";
          callRef.current = { requestId: msg.requestId, media: m, role: "callee" };
          setMedia(m);
          setPeer({ name: msg.fromName || "", role: msg.fromRole || "" });
          setEndReason(null);
          setCallState("incoming");
          break;
        }
        case "call_ringing":
          // caller: server confirmed the callee is being rung. Correct the name
          // from the server (frontend props may have been empty).
          setRinging(true);
          if (msg.toName) setPeer((p) => ({ ...(p || {}), name: msg.toName }));
          break;
        case "call_accepted": {
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
          }
          const call = callRef.current;
          if (!call) return;
          setCallState("connecting");
          const pc = pcRef.current;
          if (!pc) {
            // Local media/pc setup is still running; startCall will send the
            // offer as soon as it finishes.
            offerPendingRef.current = true;
            return;
          }
          await createAndSendOffer(pc, call.requestId);
          break;
        }
        case "webrtc_offer": {
          const pc = pcRef.current;
          const call = callRef.current;
          if (!pc || !call) return;
          try {
            await pc.setRemoteDescription(msg.sdp);
            await flushPendingIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({ type: "webrtc_answer", requestId: call.requestId, sdp: pc.localDescription });
          } catch (err) {
            console.warn("[RTC] handle offer failed:", err.message);
            showEnded("error");
          }
          break;
        }
        case "webrtc_answer": {
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(msg.sdp);
            await flushPendingIce();
          } catch (err) {
            console.warn("[RTC] handle answer failed:", err.message);
            showEnded("error");
          }
          break;
        }
        case "webrtc_ice": {
          const pc = pcRef.current;
          if (!pc || !msg.candidate) return;
          if (remoteReadyRef.current) {
            try {
              await pc.addIceCandidate(msg.candidate);
            } catch (err) {
              console.warn("[RTC] addIceCandidate failed:", err.message);
            }
          } else {
            pendingIceRef.current.push(msg.candidate);
          }
          break;
        }
        case "call_rejected":
          showEnded("rejected");
          break;
        case "call_unavailable":
          // reason from server: "inactive" | "no_peer" | "offline"
          showEnded(msg.reason || "unavailable");
          break;
        case "call_cancelled":
          resetToIdle();
          break;
        case "call_hangup":
          showEnded("peer_hangup");
          break;
        default:
          break;
      }
    },
    [callState, sendSignal, showEnded, resetToIdle, flushPendingIce, createAndSendOffer]
  );

  return {
    callState,
    media,
    peer,
    ringing,
    muted,
    cameraOff,
    localStream,
    remoteStream,
    endReason,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    hangup,
    toggleMute,
    toggleCamera,
    handleSignal,
  };
}
