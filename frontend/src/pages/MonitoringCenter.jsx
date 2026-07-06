import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import SensorPanel from "../components/monitoring/SensorPanel";
import DronePanel from "../components/monitoring/DronePanel";
import {
  makeInitialSensors,
  makeInitialDrones,
  tickSensors,
  tickDrones,
} from "../components/monitoring/monitoringData";

/**
 * Quadcopter drone icon (inline SVG). Material Symbols has no real "drone" glyph,
 * so we draw one that inherits the surrounding text color via `currentColor`.
 */
function DroneIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* rotors (top-view propellers) */}
      <ellipse cx="5" cy="5" rx="3" ry="1.5" />
      <ellipse cx="19" cy="5" rx="3" ry="1.5" />
      <ellipse cx="5" cy="19" rx="3" ry="1.5" />
      <ellipse cx="19" cy="19" rx="3" ry="1.5" />
      {/* arms */}
      <path d="M7 7l2.6 2.6M17 7l-2.6 2.6M7 17l2.6-2.6M17 17l-2.6-2.6" />
      {/* body */}
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.4" />
      {/* camera lens */}
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Monitoring Center — a shared page for admin + rescuer roles.
 *
 * Two tabs:
 *   • IoT Sensors     — water-level / rainfall / flow devices (live readings)
 *   • Drone Surveillance — aerial drone camera feeds with computer-vision
 *     detection of flood zones and people in danger.
 *
 * All data is simulated (no backend yet): a single interval nudges every reading
 * so the dashboard feels live. State lives here so both tabs keep moving even
 * while the other tab is on screen.
 */
export default function MonitoringCenter({ role = "admin" }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("sensors");
  const [sensors, setSensors] = useState(makeInitialSensors);
  const [drones, setDrones] = useState(makeInitialDrones);
  const [live, setLive] = useState(true);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    const iv = setInterval(() => {
      if (!liveRef.current) return;
      setSensors((prev) => tickSensors(prev));
      setDrones((prev) => tickDrones(prev));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const tabs = [
    { key: "sensors", icon: "sensors", label: t("monitoring.tabs.sensors") },
    { key: "drones", icon: "drone", label: t("monitoring.tabs.drones") },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined filled-icon text-primary text-2xl">radar</span>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{t("monitoring.title")}</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {role === "rescuer" ? t("monitoring.subtitleRescuer") : t("monitoring.subtitleAdmin")}
            </p>
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setLive((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              live
                ? "bg-safe/10 text-safe border-safe/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}
          >
            <span className={`size-2 rounded-full ${live ? "bg-safe animate-pulse" : "bg-slate-400"}`} />
            {live ? t("monitoring.liveOn") : t("monitoring.liveOff")}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                tab === tb.key
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:text-primary"
              }`}
            >
              {tb.icon === "drone" ? (
                <DroneIcon />
              ) : (
                <span className="material-symbols-outlined text-base">{tb.icon}</span>
              )}
              {tb.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "sensors" ? <SensorPanel sensors={sensors} /> : <DronePanel drones={drones} />}
      </div>
    </div>
  );
}
