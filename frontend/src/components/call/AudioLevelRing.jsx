import { useEffect, useRef } from "react";

/**
 * Measures the live loudness (RMS) of an audio MediaStream via the Web Audio
 * AnalyserNode and calls `onFrame(level)` every animation frame with a 0..1
 * value. The analyser is NOT connected to the speakers, so it only *reads* the
 * stream — no double audio. Driving the DOM from `onFrame` (via refs) avoids a
 * per-frame React re-render.
 */
export function useAudioLevel(stream, active, onFrame) {
  const cbRef = useRef(onFrame);
  cbRef.current = onFrame;

  useEffect(() => {
    if (!active || !stream) return;
    const tracks = stream.getAudioTracks?.() || [];
    if (!tracks.length) return;

    let ctx;
    let source;
    let analyser;
    let raf;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      ctx.resume?.().catch(() => {});
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const level = Math.min(1, Math.sqrt(sum / data.length) * 3.2);
        cbRef.current?.(level);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* Web Audio unavailable — no visualisation, call still works */
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { source && source.disconnect(); } catch { /* noop */ }
      try { analyser && analyser.disconnect(); } catch { /* noop */ }
      try { ctx && ctx.close(); } catch { /* noop */ }
      cbRef.current?.(0);
    };
  }, [stream, active]);
}

/**
 * Wraps the call avatar with two concentric "sound rings" that pulse with the
 * loudness of `stream` (the remote peer's voice), like Messenger/Zalo.
 */
export default function AudioLevelRing({ stream, active = true, children }) {
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);

  useAudioLevel(stream, active, (level) => {
    if (ring1Ref.current) {
      ring1Ref.current.style.transform = `scale(${1 + level * 0.35})`;
      ring1Ref.current.style.opacity = String(0.12 + level * 0.5);
    }
    if (ring2Ref.current) {
      ring2Ref.current.style.transform = `scale(${1 + level * 0.75})`;
      ring2Ref.current.style.opacity = String(0.05 + level * 0.3);
    }
  });

  return (
    <div className="relative flex items-center justify-center">
      <div
        ref={ring2Ref}
        className="pointer-events-none absolute inset-0 rounded-full bg-primary"
        style={{ transform: "scale(1)", opacity: 0.05, transition: "transform 90ms linear, opacity 90ms linear" }}
      />
      <div
        ref={ring1Ref}
        className="pointer-events-none absolute inset-0 rounded-full bg-primary blur-sm"
        style={{ transform: "scale(1)", opacity: 0.12, transition: "transform 90ms linear, opacity 90ms linear" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
