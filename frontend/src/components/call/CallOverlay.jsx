import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { createRingtone } from "../../utils/ringtone";
import AudioLevelRing, { useAudioLevel } from "./AudioLevelRing";

/**
 * App-wide call UI. Rendered once by `CallProvider`; floats above everything
 * (z-[10000], over the tracking map's z-[9999]). Driven entirely by the `call`
 * object from `useWebRTCCall`.
 *
 * v1 is voice-only: the remote audio plays through a hidden <audio>, the peer is
 * shown as an avatar + name + status/timer. Video tiles come in phase 2.
 */
export default function CallOverlay({ call }) {
  const { t } = useLanguage();
  const {
    callState,
    media,
    peer,
    ringing,
    muted,
    remoteStream,
    localStream,
    endReason,
    acceptCall,
    rejectCall,
    cancelCall,
    hangup,
    toggleMute,
  } = call;

  const audioRef = useRef(null);
  const ringtoneRef = useRef(null);
  const [seconds, setSeconds] = useState(0);

  // Pipe the remote stream into the hidden audio element and force playback.
  // Setting srcObject dynamically does NOT reliably autoplay even with the
  // `autoplay` attribute — we must call .play(). The accept/call click is the
  // user gesture that unblocks it.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !remoteStream) return;
    el.srcObject = remoteStream;
    el.muted = false;
    el.volume = 1;
    el.play?.().catch((err) => console.warn("[Call] remote audio play blocked:", err?.message));
  }, [remoteStream]);

  // Ring while a call is incoming.
  useEffect(() => {
    if (callState === "incoming") {
      const rt = createRingtone();
      rt.start();
      ringtoneRef.current = rt;
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }
    };
  }, [callState]);

  // Incoming: OS notification + flashing tab title so the callee can't miss it
  // even when this tab is in the background / behind other windows.
  useEffect(() => {
    if (callState !== "incoming") return;
    const label = peer?.name || t("call.unknownPeer");
    const heading = media === "video" ? t("call.incomingVideo") : t("call.incomingVoice");

    let notif = null;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        notif = new Notification(heading, {
          body: label,
          tag: "aquaguard-call",
          requireInteraction: true,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch {
      /* notifications unsupported — overlay + ringtone still cover it */
    }

    const originalTitle = document.title;
    const flash = setInterval(() => {
      document.title = document.title.startsWith("📞") ? originalTitle : `📞 ${heading}`;
    }, 1000);

    return () => {
      clearInterval(flash);
      document.title = originalTitle;
      if (notif) {
        try {
          notif.close();
        } catch {
          /* noop */
        }
      }
    };
  }, [callState, peer, media, t]);

  // Call duration timer (only while connected).
  useEffect(() => {
    if (callState !== "in_call") {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callState]);

  // Local mic level → glow behind the mic button, so you can see your own mic
  // is picking up sound while you speak (and it goes dark when muted).
  const micGlowRef = useRef(null);
  useAudioLevel(
    localStream,
    callState === "in_call" || callState === "connecting",
    (level) => {
      if (micGlowRef.current) {
        micGlowRef.current.style.transform = `scale(${1 + level * 0.6})`;
        micGlowRef.current.style.opacity = String(muted ? 0 : 0.15 + level * 0.6);
      }
    }
  );

  if (callState === "idle") return null;

  const name = peer?.name || t("call.unknownPeer");
  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  let status = "";
  if (callState === "outgoing") status = ringing ? t("call.ringing") : t("call.calling");
  else if (callState === "incoming")
    status = media === "video" ? t("call.incomingVideo") : t("call.incomingVoice");
  else if (callState === "connecting") status = t("call.connecting");
  else if (callState === "in_call") status = fmt(seconds);
  else if (callState === "ended")
    status = endReason ? t(`call.reason.${endReason}`) : t("call.ended");

  const roundBtn =
    "size-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95";

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-between bg-slate-900/95 backdrop-blur-md text-white p-8">
      {/* Hidden remote audio sink */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {/* Peer + status */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AudioLevelRing
          stream={remoteStream}
          active={callState === "in_call" || callState === "connecting"}
        >
          <div className="size-28 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl">person</span>
          </div>
        </AudioLevelRing>
        <h2 className="text-2xl font-black">{name}</h2>
        <p className="text-slate-300 flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-lg">
            {media === "video" ? "videocam" : "call"}
          </span>
          {status}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8 pb-4">
        {callState === "incoming" ? (
          <>
            <button
              onClick={rejectCall}
              aria-label={t("call.reject")}
              className={`${roundBtn} bg-danger hover:bg-red-600`}
            >
              <span className="material-symbols-outlined text-3xl">call_end</span>
            </button>
            <button
              onClick={acceptCall}
              aria-label={t("call.answer")}
              className={`${roundBtn} bg-safe hover:bg-green-600`}
            >
              <span className="material-symbols-outlined text-3xl">call</span>
            </button>
          </>
        ) : callState === "outgoing" ? (
          <button
            onClick={cancelCall}
            aria-label={t("call.cancel")}
            className={`${roundBtn} bg-danger hover:bg-red-600`}
          >
            <span className="material-symbols-outlined text-3xl">call_end</span>
          </button>
        ) : callState === "connecting" || callState === "in_call" ? (
          <>
            <div className="relative flex items-center justify-center">
              <div
                ref={micGlowRef}
                className="pointer-events-none absolute inset-0 rounded-full bg-safe blur-sm"
                style={{ transform: "scale(1)", opacity: 0, transition: "transform 90ms linear, opacity 90ms linear" }}
              />
              <button
                onClick={toggleMute}
                aria-label={muted ? t("call.unmute") : t("call.mute")}
                className={`relative z-10 ${roundBtn} ${muted ? "bg-white text-slate-900" : "bg-slate-700 hover:bg-slate-600"}`}
              >
                <span className="material-symbols-outlined text-2xl">
                  {muted ? "mic_off" : "mic"}
                </span>
              </button>
            </div>
            <button
              onClick={hangup}
              aria-label={t("call.hangup")}
              className={`${roundBtn} bg-danger hover:bg-red-600`}
            >
              <span className="material-symbols-outlined text-3xl">call_end</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
