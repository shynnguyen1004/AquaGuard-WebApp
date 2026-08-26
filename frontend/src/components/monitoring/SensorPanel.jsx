import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import Sparkline from "./Sparkline";
import WaterSensorCard, { waterSensorStatus } from "./WaterSensorCard";
import WaterSensorDetail from "./WaterSensorDetail";
import WaterSensorSetupModal from "./WaterSensorSetupModal";
import {
  SENSOR_UNITS,
  SENSOR_ICONS,
  sensorStatus,
  timeAgo,
} from "./monitoringData";

// Full literal class strings per alert level. Tailwind's JIT only sees classes
// that appear literally in source, so we never build them from template strings.
const STATUS_STYLE = {
  normal:   { text: "text-safe",     bg: "bg-safe/10",    border: "border-safe/20",    dot: "bg-safe",       hex: "#10b981" },
  warning:  { text: "text-warning",  bg: "bg-warning/10", border: "border-warning/20", dot: "bg-warning",    hex: "#f59e0b" },
  critical: { text: "text-danger",   bg: "bg-danger/10",  border: "border-danger/20",  dot: "bg-danger",     hex: "#ef4444" },
  offline:  { text: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-300/30", dot: "bg-slate-400", hex: "#94a3b8" },
};

const STAT_STYLE = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  safe:    { bg: "bg-safe/10",    text: "text-safe" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  danger:  { bg: "bg-danger/10",  text: "text-danger" },
  slate:   { bg: "bg-slate-400/10", text: "text-slate-400" },
};

// ── One device card ──
function SensorCard({ sensor }) {
  const { t, language } = useLanguage();
  const status = sensorStatus(sensor);
  const st = STATUS_STYLE[status];
  const unit = SENSOR_UNITS[sensor.type];

  // Threshold gauge: current value along a 0 → danger*1.15 track.
  const trackMax = sensor.danger * 1.15;
  const pct = (v) => `${Math.min(100, (v / trackMax) * 100)}%`;

  const trendIcon =
    sensor.trend === "rising" ? "trending_up" : sensor.trend === "falling" ? "trending_down" : "trending_flat";

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${st.bg}`}>
            <span className={`material-symbols-outlined filled-icon ${st.text}`}>{SENSOR_ICONS[sensor.type]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{sensor.name}</p>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              {sensor.location} · {sensor.id}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${st.bg} ${st.text} ${st.border}`}>
          <span className={`size-1.5 rounded-full ${st.dot} ${status !== "offline" ? "animate-pulse" : ""}`} />
          {t(`monitoring.sensors.status_${status}`)}
        </span>
      </div>

      {/* Value + trend */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-black ${!sensor.online ? "text-slate-400" : st.text}`}>
            {sensor.online ? sensor.value.toFixed(sensor.type === "water_level" ? 2 : 0) : "—"}
          </span>
          <span className="text-xs font-medium text-slate-400">{unit}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t(`monitoring.sensors.type_${sensor.type}`)}</p>
          {sensor.online && (
            <p className={`text-xs font-semibold flex items-center gap-0.5 justify-end ${
              sensor.trend === "rising" ? "text-danger" : sensor.trend === "falling" ? "text-safe" : "text-slate-400"
            }`}>
              <span className="material-symbols-outlined text-sm">{trendIcon}</span>
              {t(`monitoring.sensors.trend_${sensor.trend}`)}
            </p>
          )}
        </div>
      </div>

      {/* Threshold gauge */}
      <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: sensor.online ? pct(sensor.value) : "0%", backgroundColor: st.hex }} />
        <div className="absolute inset-y-0 w-0.5 bg-warning/70" style={{ left: pct(sensor.warn) }} />
        <div className="absolute inset-y-0 w-0.5 bg-danger/70" style={{ left: pct(sensor.danger) }} />
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 -mt-1.5">
        <span>0 {unit}</span>
        <span className="text-warning">{t("monitoring.sensors.warnLevel")} {sensor.warn}</span>
        <span className="text-danger">{t("monitoring.sensors.dangerLevel")} {sensor.danger}</span>
      </div>

      {/* Sparkline */}
      <Sparkline values={sensor.history} color={st.hex} />

      {/* Footer telemetry */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/30">
        <span className="flex items-center gap-1">
          <span className={`material-symbols-outlined text-sm ${sensor.battery < 30 ? "text-danger" : "text-slate-400"}`}>
            {sensor.battery < 20 ? "battery_1_bar" : sensor.battery < 60 ? "battery_4_bar" : "battery_full"}
          </span>
          {sensor.battery}%
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm text-slate-400">
            {sensor.signal >= 4 ? "signal_cellular_alt" : sensor.signal >= 2 ? "signal_cellular_alt_2_bar" : "signal_cellular_alt_1_bar"}
          </span>
          {sensor.online ? `${sensor.signal}/5` : t("monitoring.sensors.status_offline")}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
          {sensor.online ? timeAgo(sensor.updatedAt, language, t) : "—"}
        </span>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }) {
  const s = STAT_STYLE[color];
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

/**
 * Tab "Cảm biến IoT".
 *
 * Hai nguồn dữ liệu, cố ý KHÔNG trộn lẫn:
 *   • `waterSensors` — cảm biến mực nước THẬT do người dân tự lắp (ESP32),
 *     lấy từ GET /api/sensors/monitor.
 *   • `sensors` — trạm mưa / lưu lượng MÔ PHỎNG (chưa có phần cứng).
 *
 * Trộn thiết bị thật với thiết bị giả trong cùng một loại thì người trực không
 * biết nên tin con số nào, nên loại "Mực nước" giờ chỉ còn thiết bị thật.
 *
 * Đây cũng là nơi DUY NHẤT ghép và quản lý cảm biến: thiết bị thuộc về đội cứu
 * hộ triển khai nó, nên nút "Thêm cảm biến" nằm ở đây chứ không phải trên
 * dashboard của người dân.
 */
export default function SensorPanel({ sensors, waterSensors = [], waterLoading = false, onWaterChanged }) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState("all");
  // Chỉ giữ ID chứ KHÔNG giữ cả object thiết bị: giữ object thì modal ôm một
  // bản chụp lúc bấm vào và đứng im, trong khi nhịp poll vẫn chảy vào danh
  // sách. Tra lại từ danh sách mỗi lần render thì modal tự sống theo.
  const [detailId, setDetailId] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  const counts = useMemo(() => {
    const simOnline = sensors.filter((s) => s.online).length;
    const simWarn = sensors.filter((s) => sensorStatus(s) === "warning").length;
    const simCrit = sensors.filter((s) => sensorStatus(s) === "critical").length;

    const waterStatuses = waterSensors.map(waterSensorStatus);
    return {
      total: sensors.length + waterSensors.length,
      online: simOnline + waterStatuses.filter((st) => st !== "offline").length,
      offline:
        sensors.length - simOnline + waterStatuses.filter((st) => st === "offline").length,
      warning: simWarn + waterStatuses.filter((st) => st === "warning").length,
      critical: simCrit + waterStatuses.filter((st) => st === "critical").length,
    };
  }, [sensors, waterSensors]);

  const detailSensor = detailId ? waterSensors.find((s) => s.id === detailId) : null;

  // Thiết bị bị gỡ khi modal đang mở (admin xoá, hoặc người khác xoá) → đóng lại.
  useEffect(() => {
    if (detailId && waterSensors.length > 0 && !detailSensor) setDetailId(null);
  }, [detailId, detailSensor, waterSensors.length]);

  const types = ["all", "water_level", "rainfall", "flow"];
  const showWater = filter === "all" || filter === "water_level";
  const visibleSim = filter === "all" ? sensors : sensors.filter((s) => s.type === filter);

  return (
    <div className="space-y-5">
      {/* Hàng thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon="sensors" label={t("monitoring.sensors.total")} value={counts.total} color="primary" />
        <Stat icon="wifi" label={t("monitoring.sensors.online")} value={counts.online} color="safe" />
        <Stat icon="wifi_off" label={t("monitoring.sensors.offline")} value={counts.offline} color="slate" />
        <Stat icon="warning" label={t("monitoring.sensors.status_warning")} value={counts.warning} color="warning" />
        <Stat icon="crisis_alert" label={t("monitoring.sensors.status_critical")} value={counts.critical} color="danger" />
      </div>

      {/* Lọc theo loại */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {types.map((tp) => (
          <button
            key={tp}
            onClick={() => setFilter(tp)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === tp
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:text-primary"
            }`}
          >
            {tp !== "all" && <span className="material-symbols-outlined text-sm">{SENSOR_ICONS[tp]}</span>}
            {tp === "all" ? t("monitoring.sensors.allTypes") : t(`monitoring.sensors.type_${tp}`)}
          </button>
        ))}
      </div>

      {/* ── Cảm biến mực nước thật ── */}
      {showWater && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary filled-icon text-base">water_drop</span>
              {t("monitoring.sensors.type_water_level")}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-safe/10 text-safe border border-safe/20">
              {t("monitoring.water.realDevice")}
            </span>
            <span className="text-[11px] text-slate-400">{t("monitoring.water.sourceNote")}</span>

            <button
              onClick={() => setShowSetup(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-base">add</span>
              {t("waterSensor.add")}
            </button>
          </div>

          {waterLoading && waterSensors.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : waterSensors.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-600 mb-2 block">
                sensors_off
              </span>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                {t("monitoring.water.emptyTitle")}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 mb-4 max-w-sm mx-auto">
                {t("monitoring.water.emptyDesc")}
              </p>
              <button
                onClick={() => setShowSetup(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                {t("waterSensor.add")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {waterSensors.map((s) => (
                <WaterSensorCard key={s.id} sensor={s} onOpen={(x) => setDetailId(x.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Thiết bị mô phỏng (mưa / lưu lượng) ── */}
      {visibleSim.length > 0 && (
        <section className="space-y-3">
          {filter === "all" && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 filled-icon text-base">rainy</span>
                {t("monitoring.water.otherDevices")}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-400/10 text-slate-400 border border-slate-300/30">
                {t("monitoring.water.simulated")}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleSim.map((s) => (
              <SensorCard key={s.id} sensor={s} />
            ))}
          </div>
        </section>
      )}

      {detailSensor && (
        <WaterSensorDetail
          sensor={detailSensor}
          onClose={() => setDetailId(null)}
          onChanged={onWaterChanged}
        />
      )}

      {showSetup && (
        <WaterSensorSetupModal
          onClose={() => setShowSetup(false)}
          onCreated={onWaterChanged}
        />
      )}
    </div>
  );
}
