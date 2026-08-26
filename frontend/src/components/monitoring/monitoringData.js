/**
 * Dummy data + live-simulation helpers for the Monitoring Center.
 *
 * There is NO backend for IoT sensors or drones yet — this module fabricates
 * believable readings and mutates them slightly on a timer so the UI feels live.
 * Place/device names are treated as *data* (kept as literals); every piece of
 * UI chrome is translated via `t("monitoring.*")` in the components.
 */

// ── Tiny seeded RNG (mulberry32) so each drone's aerial scene is stable ──
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

// Build a short reading history around a base value (oldest → newest).
function genHistory(base, spread, n = 18) {
  const out = [];
  let v = base - spread * 0.6;
  for (let i = 0; i < n; i++) {
    v = clamp(v + rand(-spread, spread) * 0.5 + (base - v) * 0.15, 0, base + spread * 3);
    out.push(Number(v.toFixed(2)));
  }
  out[n - 1] = base;
  return out;
}

// ── IoT sensor devices (rainfall, flow rate) ──
//
// KHÔNG còn thiết bị "water_level" giả ở đây: mực nước giờ là dữ liệu THẬT từ
// các board ESP32 của người dân (GET /api/sensors/monitor, xem SensorPanel).
// Trộn trạm đo giả vào cùng loại với thiết bị thật thì người trực không biết
// con số nào đáng tin.
const SENSOR_SEED = [
  { id: "RN-01", name: "Trạm mưa Gò Vấp",  type: "rainfall",    location: "Q. Gò Vấp",     value: 38,  warn: 50,  danger: 80 },
  { id: "RN-02", name: "Trạm mưa An Phú",  type: "rainfall",    location: "TP. Thủ Đức",   value: 64,  warn: 50,  danger: 80 },
  { id: "FL-01", name: "Lưu lượng Tham Lương", type: "flow",    location: "Q. 12",         value: 41,  warn: 55,  danger: 75 },
  { id: "FL-02", name: "Lưu lượng Tàu Hủ", type: "flow",        location: "Q. 5",          value: 58,  warn: 55,  danger: 75, offline: true },
];

export const SENSOR_UNITS = {
  water_level: "m",
  rainfall: "mm/h",
  flow: "m³/s",
};

export const SENSOR_ICONS = {
  water_level: "water_drop",
  rainfall: "rainy",
  flow: "waves",
};

export function makeInitialSensors() {
  const now = Date.now();
  return SENSOR_SEED.map((s) => {
    const spread = s.type === "water_level" ? 0.25 : s.type === "rainfall" ? 6 : 5;
    return {
      ...s,
      online: !s.offline,
      battery: Math.round(rand(55, 99)),
      signal: Math.round(rand(2, 5)),
      history: genHistory(s.value, spread),
      trend: "stable",
      updatedAt: now - Math.round(rand(1, 20)) * 1000,
      _spread: spread,
    };
  });
}

// Derived alert level for a sensor.
export function sensorStatus(s) {
  if (!s.online) return "offline";
  if (s.value >= s.danger) return "critical";
  if (s.value >= s.warn) return "warning";
  return "normal";
}

// Nudge every sensor a little — new reading, recomputed trend.
export function tickSensors(sensors) {
  const now = Date.now();
  return sensors.map((s) => {
    if (!s.online) return s;
    const prev = s.value;
    const step = s._spread * (Math.random() < 0.5 ? -1 : 1) * rand(0.15, 0.6);
    const value = Number(clamp(prev + step, 0, s.danger * 1.6).toFixed(2));
    const history = [...s.history.slice(1), value];
    const delta = value - prev;
    const trend = Math.abs(delta) < s._spread * 0.1 ? "stable" : delta > 0 ? "rising" : "falling";
    return { ...s, value, history, trend, updatedAt: now };
  });
}

// ── Drones (aerial CV surveillance) ──
// Detection boxes are positioned in PERCENT of the feed frame so they scale.
const DRONE_SEED = [
  {
    id: "DRN-01", name: "Sky Guardian 01", area: "P. An Phú, TP. Thủ Đức",
    status: "live", battery: 78, altitude: 118, speed: 24, signal: 5, coverage: 63,
    detections: [
      { id: "a1", type: "person", danger: true,  confidence: 0.94, x: 21, y: 44, w: 9,  h: 20 },
      { id: "a2", type: "person", danger: true,  confidence: 0.9,  x: 30, y: 52, w: 8,  h: 18 },
      { id: "a3", type: "person", danger: false, confidence: 0.86, x: 66, y: 33, w: 7,  h: 16 },
      { id: "a4", type: "flood",  confidence: 0.97, depth: 1.4, x: 6,  y: 58, w: 82, h: 34 },
    ],
  },
  {
    id: "DRN-02", name: "Sky Guardian 02", area: "P. Hiệp Bình Chánh, TP. Thủ Đức",
    status: "live", battery: 64, altitude: 96, speed: 18, signal: 4, coverage: 71,
    detections: [
      { id: "b1", type: "person", danger: true,  confidence: 0.91, x: 48, y: 38, w: 9,  h: 21 },
      { id: "b2", type: "flood",  confidence: 0.95, depth: 1.9, x: 4,  y: 30, w: 92, h: 60 },
    ],
  },
  {
    id: "DRN-03", name: "Sky Guardian 03", area: "P. Thảo Điền, TP. Thủ Đức",
    status: "live", battery: 52, altitude: 132, speed: 27, signal: 5, coverage: 44,
    detections: [
      { id: "c1", type: "person", danger: false, confidence: 0.82, x: 40, y: 47, w: 8, h: 17 },
      { id: "c2", type: "person", danger: false, confidence: 0.79, x: 55, y: 40, w: 7, h: 16 },
      { id: "c3", type: "flood",  confidence: 0.9, depth: 0.8, x: 10, y: 64, w: 55, h: 28 },
    ],
  },
  {
    id: "DRN-04", name: "Sky Guardian 04", area: "P. Trường Thọ, TP. Thủ Đức",
    status: "returning", battery: 21, altitude: 74, speed: 31, signal: 3, coverage: 38,
    detections: [
      { id: "d1", type: "person", danger: true, confidence: 0.88, x: 58, y: 50, w: 9, h: 20 },
      { id: "d2", type: "flood", confidence: 0.93, depth: 1.1, x: 30, y: 55, w: 66, h: 32 },
    ],
  },
];

export function makeInitialDrones() {
  return DRONE_SEED.map((d) => ({ ...d, detections: d.detections.map((x) => ({ ...x })) }));
}

export const dronePeopleCount = (d) => d.detections.filter((x) => x.type === "person").length;
export const droneDangerCount = (d) => d.detections.filter((x) => x.type === "person" && x.danger).length;
export const droneFloodCount = (d) => d.detections.filter((x) => x.type === "flood").length;

// Jitter drones: telemetry drifts, confidences wobble, boxes breathe slightly.
export function tickDrones(drones) {
  return drones.map((d) => {
    if (d.status === "offline") return d;
    const draining = d.status === "returning" ? rand(0.1, 0.4) : rand(0, 0.25);
    return {
      ...d,
      battery: Number(clamp(d.battery - draining, 0, 100).toFixed(1)),
      altitude: Math.round(clamp(d.altitude + rand(-3, 3), 40, 160)),
      speed: Math.round(clamp(d.speed + rand(-2, 2), 0, 45)),
      coverage: Math.round(clamp(d.coverage + rand(-2, 2), 0, 100)),
      detections: d.detections.map((x) => ({
        ...x,
        confidence: Number(clamp(x.confidence + rand(-0.02, 0.02), 0.6, 0.99).toFixed(2)),
        x: x.type === "person" ? Number(clamp(x.x + rand(-0.6, 0.6), 2, 92).toFixed(2)) : x.x,
        y: x.type === "person" ? Number(clamp(x.y + rand(-0.6, 0.6), 2, 78).toFixed(2)) : x.y,
      })),
    };
  });
}

// Human-friendly "x s/min ago" using the current language.
export function timeAgo(ts, lang, t) {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return t("monitoring.sensors.secAgo").replace("{n}", String(secs));
  const mins = Math.round(secs / 60);
  return t("monitoring.sensors.minAgo").replace("{n}", String(mins));
}
