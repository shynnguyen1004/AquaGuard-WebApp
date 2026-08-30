import { useMemo } from "react";

// CSS rain adapted from https://codepen.io/vishwaoffl/pen/oNyrbLy
// (drops only — wind-on-hover and lightning removed)
const DROP_COUNT = 220;

export default function RainOverlay() {
  const drops = useMemo(
    () =>
      Array.from({ length: DROP_COUNT }, (_, i) => ({
        id: i,
        opacity: Math.random() * 0.9,
        left: `${Math.random() * 120 - 10}vw`,
        borderLeftWidth: `${Math.random() * 8}vmin`,
        duration: `${0.15 + Math.random() * 2.1}s`,
        delay: `${-Math.random() * 12.5}s`,
      })),
    []
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-[5]"
      aria-hidden="true"
    >
      {drops.map((drop) => (
        <span
          key={drop.id}
          className="rain-drop"
          style={{
            opacity: drop.opacity,
            left: drop.left,
            borderLeftWidth: drop.borderLeftWidth,
            animationDuration: drop.duration,
            animationDelay: drop.delay,
          }}
        />
      ))}
    </div>
  );
}
