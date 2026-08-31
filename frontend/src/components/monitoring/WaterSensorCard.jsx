import { useLanguage } from "../../contexts/LanguageContext";
import Sparkline from "./Sparkline";

/**
 * Một cảm biến mực nước THẬT trên Trung tâm Giám sát (rescuer + admin).
 *
 * Khác thẻ trên dashboard người dân ở góc nhìn: người dân xem thiết bị của
 * chính mình nên cần nút chỉnh; rescuer/admin xem thiết bị của người khác nên
 * cần biết CHỦ LÀ AI, Ở ĐÂU, và có đang vượt ngưỡng không — để còn phân loại
 * việc mà đi. Vì vậy ở đây không có nút cài đặt nào.
 *
 * Bố cục bám theo SensorCard (thiết bị mô phỏng) để hai loại nằm cạnh nhau
 * không bị lệch nhịp thị giác.
 */

// Chuỗi class đầy đủ theo từng trạng thái — Tailwind JIT chỉ thấy class viết
// nguyên văn trong mã nguồn, không ghép từ template string được.
const STATUS_STYLE = {
  normal:   { text: "text-safe",      bg: "bg-safe/10",      border: "border-safe/20",      dot: "bg-safe",      hex: "#10b981" },
  warning:  { text: "text-warning",   bg: "bg-warning/10",   border: "border-warning/20",   dot: "bg-warning",   hex: "#f59e0b" },
  critical: { text: "text-danger",    bg: "bg-danger/10",    border: "border-danger/20",    dot: "bg-danger",    hex: "#ef4444" },
  offline:  { text: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-300/30", dot: "bg-slate-400", hex: "#94a3b8" },
};

/** Trạng thái cảnh báo của một cảm biến thật, theo ngưỡng CHỦ THIẾT BỊ đặt. */
export function waterSensorStatus(s) {
  if (!s.online) return "offline";
  if (s.level === 9) return "critical";
  if (s.percent != null && s.percent >= s.alertThreshold) return "warning";
  return "normal";
}

/**
 * Mực nước bắt đầu HÚ CÒI. Cố định cho cả hệ thống, khác với `alertThreshold`
 * của từng thiết bị — cái đó quyết định thông báo/email gửi cho người phụ
 * trách, còn con số này quyết định lúc nào phòng trực có tiếng động.
 */
export const SIREN_FLOOR_PCT = 30;

/**
 * Biên độ trễ khi TẮT còi: phải tụt xuống dưới (SIREN_FLOOR_PCT − ngần này)
 * mới cho im. Nước dao động quanh đúng ranh giới mà không có độ trễ thì còi
 * bật tắt liên tục, nghe còn khó chịu hơn để nó hú thẳng.
 */
export const ALARM_CLEAR_MARGIN = 3;

/** Xu hướng suy ra từ chuỗi số đo gần đây (so điểm cuối với ~5 điểm trước). */
export function waterTrend(history) {
  if (!history || history.length < 3) return "stable";
  const last = history[history.length - 1].percent;
  const prev = history[Math.max(0, history.length - 6)].percent;
  const delta = last - prev;
  if (delta >= 2) return "rising";
  if (delta <= -2) return "falling";
  return "stable";
}

export default function WaterSensorCard({ sensor, onOpen }) {
  const { t, language } = useLanguage();

  const status = waterSensorStatus(sensor);
  const st = STATUS_STYLE[status];
  const trend = waterTrend(sensor.history);
  const trendIcon =
    trend === "rising" ? "trending_up" : trend === "falling" ? "trending_down" : "trending_flat";

  const hasReading = sensor.percent != null;
  const values = (sensor.history || []).map((h) => h.percent);

  const lastSeen = () => {
    if (!sensor.lastSeenAt) return t("waterSensor.never");
    const mins = Math.floor((Date.now() - new Date(sensor.lastSeenAt).getTime()) / 60000);
    if (mins < 1) return t("waterSensor.justNow");
    if (mins < 60) return `${mins} ${t("waterSensor.minutesAgo")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t("waterSensor.hoursAgo")}`;
    return `${Math.floor(hours / 24)} ${t("waterSensor.daysAgo")}`;
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(sensor)}
      className="text-left bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-4 flex flex-col gap-3 transition-colors hover:border-primary/40"
    >
      {/* Đầu thẻ: tên + vị trí + chủ thiết bị */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${st.bg}`}>
            <span className={`material-symbols-outlined filled-icon ${st.text}`}>water_drop</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{sensor.name}</p>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              {sensor.address || t("monitoring.water.noAddress")}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${st.bg} ${st.text} ${st.border}`}>
          <span className={`size-1.5 rounded-full ${st.dot} ${status !== "offline" ? "animate-pulse" : ""}`} />
          {t(`monitoring.sensors.status_${status}`)}
        </span>
      </div>

      {/* Số đo + xu hướng */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-black ${sensor.online ? st.text : "text-slate-400"}`}>
            {hasReading ? sensor.percent : "—"}
          </span>
          <span className="text-xs font-medium text-slate-400">%</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">
            {hasReading ? t(`waterSensor.levels.${sensor.levelKey}`) : t("waterSensor.never")}
          </p>
          {sensor.online && (
            <p className={`text-xs font-semibold flex items-center gap-0.5 justify-end ${
              trend === "rising" ? "text-danger" : trend === "falling" ? "text-safe" : "text-slate-400"
            }`}>
              <span className="material-symbols-outlined text-sm">{trendIcon}</span>
              {t(`monitoring.sensors.trend_${trend}`)}
            </p>
          )}
        </div>
      </div>

      {/* Thanh 0-100% + vạch ngưỡng của chủ thiết bị */}
      <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: sensor.online && hasReading ? `${sensor.percent}%` : "0%", backgroundColor: st.hex }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-danger/70" style={{ left: `${sensor.alertThreshold}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 -mt-1.5">
        <span>0%</span>
        <span className="text-danger">
          {t("monitoring.water.threshold")} {sensor.alertThreshold}%
        </span>
        <span>100%</span>
      </div>

      <Sparkline values={values} color={st.hex} domain={[0, 100]} />

      {/* Chân thẻ: chủ thiết bị + lần cập nhật cuối */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/30">
        <span className="flex items-center gap-1 min-w-0">
          <span className="material-symbols-outlined text-sm text-slate-400">person</span>
          <span className="truncate">{sensor.owner?.displayName || "—"}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
          {lastSeen()}
        </span>
      </div>

      {!sensor.calibrated && (
        <p className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 -mt-1">
          <span className="material-symbols-outlined text-[13px]">info</span>
          {t("waterSensor.notCalibrated")}
        </p>
      )}
    </button>
  );
}
