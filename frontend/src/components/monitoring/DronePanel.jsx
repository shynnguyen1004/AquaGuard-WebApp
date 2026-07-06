import { useId, useMemo, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  mulberry32,
  dronePeopleCount,
  droneDangerCount,
  droneFloodCount,
} from "./monitoringData";

// Turn "DRN-01" into a stable numeric seed for the procedural scene.
const seedFrom = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) * 2654435761;

/**
 * Procedurally-drawn top-down "aerial flood" scene (pure SVG, no assets).
 * Deterministic per drone so each feed looks distinct but stable across renders.
 */
function AerialScene({ id }) {
  // Unique gradient ids per rendered instance — the same drone can appear twice
  // (featured + thumbnail), which would otherwise collide on duplicate DOM ids.
  const uid = useId().replace(/:/g, "");
  const scene = useMemo(() => {
    const rng = mulberry32(seedFrom(id));
    const water = Array.from({ length: 3 }, () => {
      const cx = rng() * 100;
      const cy = 30 + rng() * 60;
      const rx = 20 + rng() * 30;
      const ry = 14 + rng() * 20;
      return { cx, cy, rx, ry, rot: rng() * 60 - 30 };
    });
    const buildings = Array.from({ length: 14 }, () => ({
      x: rng() * 92,
      y: rng() * 88,
      w: 4 + rng() * 7,
      h: 4 + rng() * 7,
      shade: 0.5 + rng() * 0.4,
    }));
    const roadY = 20 + rng() * 60;
    const roadX = 20 + rng() * 60;
    return { water, buildings, roadY, roadX };
  }, [id]);

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id={`land-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f3a2e" />
          <stop offset="55%" stopColor="#4a4b33" />
          <stop offset="100%" stopColor="#2f3a2c" />
        </linearGradient>
        <radialGradient id={`water-${uid}`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#2b7a86" />
          <stop offset="100%" stopColor="#15505e" />
        </radialGradient>
      </defs>

      {/* Land base */}
      <rect x="0" y="0" width="100" height="100" fill={`url(#land-${uid})`} />

      {/* Roads */}
      <rect x="0" y={scene.roadY} width="100" height="2.4" fill="#6b6552" opacity="0.7" />
      <rect x={scene.roadX} y="0" width="2.4" height="100" fill="#6b6552" opacity="0.7" />

      {/* Buildings (rooftops) */}
      {scene.buildings.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="0.6"
          fill="#8a8574" opacity={b.shade} />
      ))}

      {/* Floodwater on top — the muddy water covering the area */}
      <g opacity="0.82">
        {scene.water.map((w, i) => (
          <ellipse key={i} cx={w.cx} cy={w.cy} rx={w.rx} ry={w.ry}
            fill={`url(#water-${uid})`} transform={`rotate(${w.rot} ${w.cx} ${w.cy})`} />
        ))}
      </g>
      {/* Water sheen */}
      <g opacity="0.25">
        {scene.water.map((w, i) => (
          <ellipse key={i} cx={w.cx - 4} cy={w.cy - 3} rx={w.rx * 0.5} ry={w.ry * 0.35}
            fill="#bfe9f0" transform={`rotate(${w.rot} ${w.cx} ${w.cy})`} />
        ))}
      </g>
    </svg>
  );
}

// ── A single detection bounding box overlaid on the feed ──
function DetectionBox({ det, t }) {
  if (det.type === "flood") {
    return (
      <div
        className="absolute border-2 border-dashed border-cyan-300/80 rounded-md bg-cyan-400/10 pointer-events-none"
        style={{ left: `${det.x}%`, top: `${det.y}%`, width: `${det.w}%`, height: `${det.h}%` }}
      >
        <span className="absolute -top-5 left-0 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/90 text-white flex items-center gap-1">
          <span className="material-symbols-outlined text-[11px]">water</span>
          {t("monitoring.drones.floodZone")} · {t("monitoring.drones.depth").replace("{n}", String(det.depth))}
        </span>
      </div>
    );
  }

  // Person — corner-bracket "CV" box, red + pulsing when in danger.
  const c = det.danger ? "border-red-500" : "border-amber-300";
  const tag = det.danger ? "bg-red-600" : "bg-amber-500";
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${det.x}%`, top: `${det.y}%`, width: `${det.w}%`, height: `${det.h}%` }}
    >
      <div className={`absolute inset-0 border-2 ${c} ${det.danger ? "animate-pulse" : ""}`} />
      {/* corner brackets */}
      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos) => (
        <span key={pos} className={`absolute ${pos} size-1.5 border-2 ${c}`} />
      ))}
      <span className={`absolute -top-4 left-0 whitespace-nowrap text-[9px] font-bold px-1 py-0.5 rounded ${tag} text-white flex items-center gap-0.5`}>
        {det.danger && <span className="material-symbols-outlined text-[10px]">priority_high</span>}
        {t("monitoring.drones.person")} {Math.round(det.confidence * 100)}%
      </span>
    </div>
  );
}

const STATUS_BADGE = {
  live:      { dot: "bg-red-500", text: "text-white", bg: "bg-black/60", label: "live" },
  returning: { dot: "bg-amber-400", text: "text-white", bg: "bg-black/60", label: "returning" },
  offline:   { dot: "bg-slate-400", text: "text-white", bg: "bg-black/60", label: "offline" },
};

/**
 * One drone camera feed — the aerial scene + HUD chrome + CV detection boxes.
 * `size="lg"` renders the featured, larger view.
 */
function DroneFeed({ drone, size = "sm", onClick, selected }) {
  const { t } = useLanguage();
  const badge = STATUS_BADGE[drone.status] || STATUS_BADGE.offline;
  const big = size === "lg";

  return (
    <button
      onClick={onClick}
      className={`relative w-full aspect-video overflow-hidden rounded-2xl bg-slate-900 text-left group ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : ""
      }`}
    >
      <AerialScene id={drone.id} />

      {/* HUD grid + vignette + moving scanline */}
      <div className="absolute inset-0 mon-grid opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
      {drone.status === "live" && <div className="absolute inset-x-0 h-8 mon-scan pointer-events-none" />}

      {/* Center reticle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="size-8 border border-white/30 rounded-full flex items-center justify-center">
          <div className="size-1 bg-white/50 rounded-full" />
        </div>
      </div>

      {/* Detections */}
      {drone.detections.map((d) => (
        <DetectionBox key={d.id} det={d} t={t} />
      ))}

      {/* Top-left: LIVE badge + drone name */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 ${badge.bg} ${badge.text} text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-sm uppercase tracking-wide`}>
          <span className={`size-1.5 rounded-full ${badge.dot} ${drone.status === "live" ? "animate-pulse" : ""}`} />
          {t(`monitoring.drones.status_${badge.label}`)}
        </span>
        <span className="text-[10px] font-bold text-white/90 drop-shadow bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {drone.name}
        </span>
      </div>

      {/* Top-right: signal + battery */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] font-bold text-white/90">
        <span className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
          <span className="material-symbols-outlined text-[13px]">
            {drone.signal >= 4 ? "signal_cellular_alt" : "signal_cellular_alt_2_bar"}
          </span>
        </span>
        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded backdrop-blur-sm ${drone.battery < 25 ? "bg-red-600/70" : "bg-black/40"}`}>
          <span className="material-symbols-outlined text-[13px]">
            {drone.battery < 25 ? "battery_alert" : "battery_full"}
          </span>
          {Math.round(drone.battery)}%
        </span>
      </div>

      {/* People-detected chip */}
      {dronePeopleCount(drone) > 0 && (
        <div className="absolute top-10 left-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm ${
            droneDangerCount(drone) > 0 ? "bg-red-600/80 text-white" : "bg-black/50 text-white/90"
          }`}>
            <span className="material-symbols-outlined text-[13px]">person_alert</span>
            {t("monitoring.drones.peopleTag").replace("{n}", String(dronePeopleCount(drone)))}
          </span>
        </div>
      )}

      {/* Bottom telemetry bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2">
        <div className="flex items-center justify-between text-white">
          <p className={`font-semibold flex items-center gap-1 ${big ? "text-sm" : "text-[11px]"}`}>
            <span className="material-symbols-outlined text-[15px]">location_on</span>
            {drone.area}
          </p>
          <div className={`flex items-center gap-3 ${big ? "text-xs" : "text-[10px]"} font-medium text-white/85`}>
            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">height</span>{drone.altitude}m</span>
            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">speed</span>{drone.speed}km/h</span>
            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">water</span>{drone.coverage}%</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function Stat({ icon, label, value, tone }) {
  const map = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    danger: { bg: "bg-danger/10", text: "text-danger" },
    warning: { bg: "bg-warning/10", text: "text-warning" },
    safe: { bg: "bg-safe/10", text: "text-safe" },
  };
  const s = map[tone];
  return (
    <div className={`rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30 ${s.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined filled-icon ${s.text}`}>{icon}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
    </div>
  );
}

// ── Detection list beside the featured feed ──
function DetectionList({ drone }) {
  const { t } = useLanguage();
  const [dispatched, setDispatched] = useState(() => new Set());

  const people = drone.detections.filter((d) => d.type === "person");
  const floods = drone.detections.filter((d) => d.type === "flood");

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-4 flex flex-col">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary">center_focus_strong</span>
        {t("monitoring.drones.detections")}
        <span className="ml-auto text-[11px] font-medium text-slate-400">{drone.name}</span>
      </h3>

      <div className="space-y-2 overflow-y-auto flex-1 min-h-0 max-h-[360px] pr-1">
        {people.map((p) => {
          const done = dispatched.has(p.id);
          return (
            <div key={p.id} className={`rounded-xl p-3 border ${p.danger ? "border-danger/30 bg-danger/5" : "border-slate-100 dark:border-slate-700/40"}`}>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined ${p.danger ? "text-danger" : "text-amber-500"}`}>
                  {p.danger ? "person_alert" : "person"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">
                    {p.danger ? t("monitoring.drones.personDanger") : t("monitoring.drones.person")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t("monitoring.drones.confidence")}: {Math.round(p.confidence * 100)}%
                  </p>
                </div>
                {p.danger && (
                  <button
                    onClick={() => setDispatched((prev) => new Set(prev).add(p.id))}
                    disabled={done}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
                      done ? "bg-safe/10 text-safe cursor-default" : "bg-danger text-white hover:bg-red-600"
                    }`}
                  >
                    {done ? t("monitoring.drones.dispatched") : t("monitoring.drones.dispatchTeam")}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {floods.map((f) => (
          <div key={f.id} className="rounded-xl p-3 border border-cyan-500/30 bg-cyan-500/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-500">water</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{t("monitoring.drones.floodZone")}</p>
                <p className="text-[11px] text-slate-500">
                  {t("monitoring.drones.depth").replace("{n}", String(f.depth))} · {t("monitoring.drones.confidence")}: {Math.round(f.confidence * 100)}%
                </p>
              </div>
            </div>
          </div>
        ))}

        {drone.detections.length === 0 && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">visibility_off</span>
            <p className="text-xs text-slate-400 mt-1">{t("monitoring.drones.noDetections")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DronePanel({ drones }) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState(drones[0]?.id);

  const selected = drones.find((d) => d.id === selectedId) || drones[0];

  const totals = useMemo(() => ({
    active: drones.filter((d) => d.status !== "offline").length,
    people: drones.reduce((a, d) => a + dronePeopleCount(d), 0),
    danger: drones.reduce((a, d) => a + droneDangerCount(d), 0),
    floods: drones.reduce((a, d) => a + droneFloodCount(d), 0),
  }), [drones]);

  return (
    <div className="space-y-5">
      {/* Keyframes for the live scanline + HUD grid */}
      <style>{`
        @keyframes mon-scan-move { 0% { top: -12%; } 100% { top: 104%; } }
        .mon-scan {
          background: linear-gradient(180deg, transparent, rgba(56,189,248,0.35), transparent);
          animation: mon-scan-move 3.2s linear infinite;
        }
        .mon-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon="flight_takeoff" label={t("monitoring.drones.activeDrones")} value={totals.active} tone="primary" />
        <Stat icon="groups" label={t("monitoring.drones.peopleDetected")} value={totals.people} tone="warning" />
        <Stat icon="e911_emergency" label={t("monitoring.drones.inDanger")} value={totals.danger} tone="danger" />
        <Stat icon="flood" label={t("monitoring.drones.floodZones")} value={totals.floods} tone="safe" />
      </div>

      {/* Featured feed + detections */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DroneFeed drone={selected} size="lg" onClick={() => {}} />
          </div>
          <DetectionList drone={selected} />
        </div>
      )}

      {/* All drones grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">grid_view</span>
          {t("monitoring.drones.allFeeds")} ({drones.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {drones.map((d) => (
            <DroneFeed key={d.id} drone={d} onClick={() => setSelectedId(d.id)} selected={d.id === selectedId} />
          ))}
        </div>
      </div>
    </div>
  );
}
