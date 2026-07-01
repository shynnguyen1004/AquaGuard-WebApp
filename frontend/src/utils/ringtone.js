/**
 * Synthesized ringtone via the Web Audio API — no binary asset needed and it
 * works offline. Plays a repeating two-pulse "bring-bring" like a classic phone.
 *
 * Usage:
 *   const rt = createRingtone();
 *   rt.start();   // begins looping
 *   rt.stop();    // stops and releases the audio context
 */
export function createRingtone() {
  let ctx = null;
  let timer = null;

  const playPattern = () => {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 466; // ~Bb4 — phone-ish
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.0001;

    // Two short pulses within ~1s, then silence until the next interval.
    [0, 0.6].forEach((start) => {
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.linearRampToValueAtTime(0.22, now + start + 0.02);
      gain.gain.setValueAtTime(0.22, now + start + 0.35);
      gain.gain.linearRampToValueAtTime(0.0001, now + start + 0.4);
    });

    osc.start(now);
    osc.stop(now + 1.1);
  };

  return {
    start() {
      if (ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        // May be suspended until a user gesture; resume best-effort.
        ctx.resume?.().catch(() => {});
        playPattern();
        timer = setInterval(playPattern, 3000);
      } catch {
        /* audio unavailable — visual ring still shows */
      }
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (ctx) {
        ctx.close().catch(() => {});
        ctx = null;
      }
    },
  };
}
