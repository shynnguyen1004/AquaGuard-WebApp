import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import useAlarmSound from "../../hooks/useAlarmSound";
import { SIREN_FLOOR_PCT } from "../monitoring/WaterSensorCard";
import { getCachedGpsPosition } from "../../utils/locationSync";
import { api } from "../../services/api";

/**
 * Cảnh báo ngập cho NGƯỜI DÂN, đọc từ cảm biến thật của đội cứu hộ.
 *
 * Khác thẻ trong Trung tâm Giám sát ở chỗ nó trả lời một câu hỏi duy nhất:
 * "tôi có cần làm gì không?". Nên ở đây không có phần trăm, không có biểu đồ,
 * không có mức 0-9 — chỉ 4 trạng thái kèm việc cần làm. Người dân không vận
 * hành thiết bị, đưa họ con số kỹ thuật chỉ khiến họ phải tự diễn giải.
 *
 * Còi hú thì dùng chung hook với phòng trực: nước còn cao thì còn kêu, tắt
 * tiếng được và tự lên đạn lại khi an toàn.
 */

const POLL_MS = 10000;

// Thứ tự nặng dần — dùng để chọn thiết bị đáng lo nhất làm tiêu đề.
const RANK = { danger: 3, major: 2, minor: 1, safe: 0, unknown: -1 };

const STYLES = {
  danger: {
    band: "bg-red-500",
    tint: "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/30",
    text: "text-red-600 dark:text-red-400",
    chip: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    icon: "crisis_alert",
  },
  major: {
    band: "bg-orange-500",
    tint: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-500/30",
    text: "text-orange-600 dark:text-orange-400",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    icon: "warning",
  },
  minor: {
    band: "bg-amber-400",
    tint: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    icon: "water_drop",
  },
  safe: {
    band: "bg-emerald-500",
    tint: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    icon: "check_circle",
  },
  unknown: {
    band: "bg-slate-400",
    tint: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-500 dark:text-slate-400",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300",
    icon: "help",
  },
};

/** Khoảng cách hai toạ độ, km (haversine). */
function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.latitude);
  const dLng = toRad(b.lng - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function FloodAlertCard() {
  const { t, language } = useLanguage();
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me] = useState(() => getCachedGpsPosition(30 * 60 * 1000));

  const load = useCallback(async () => {
    try {
      const res = await api.get("/sensors/public");
      if (res.success) setSensors(res.data || []);
    } catch {
      // Im lặng: thẻ phụ không được phép làm hỏng dashboard.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Còi hú theo đúng ngưỡng mà phòng trực đang dùng — người dân không nên
  // được báo động muộn hơn người trực.
  const alarming = sensors.some(
    (s) => s.online && s.percent != null && s.percent >= SIREN_FLOOR_PCT
  );
  const alarm = useAlarmSound(alarming);

  // Thiết bị đáng lo nhất quyết định tiêu đề; kèm khoảng cách nếu biết vị trí.
  const withDistance = useMemo(
    () =>
      sensors.map((s) => ({
        ...s,
        km:
          me && s.latitude != null && s.longitude != null
            ? distanceKm(me, { lat: s.latitude, lng: s.longitude })
            : null,
      })),
    [sensors, me]
  );

  const worst = useMemo(
    () =>
      withDistance.reduce(
        (acc, s) => (acc === null || RANK[s.status] > RANK[acc.status] ? s : acc),
        null
      ),
    [withDistance]
  );

  if (loading || sensors.length === 0) return null;

  const status = worst?.status || "unknown";
  const st = STYLES[status];

  const formatAgo = (iso) => {
    if (!iso) return t("waterSensor.never");
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return t("waterSensor.justNow");
    if (mins < 60) return `${mins} ${t("waterSensor.minutesAgo")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t("waterSensor.hoursAgo")}`;
    return `${Math.floor(hours / 24)} ${t("waterSensor.daysAgo")}`;
  };

  const formatKm = (km) =>
    km == null ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

  return (
    <div className={`overflow-hidden rounded-2xl border ${st.border} ${st.tint}`}>
      <div className={`h-1.5 w-full ${st.band}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className={`material-symbols-outlined filled-icon text-3xl ${st.text}`}>
              {st.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t("floodAlert.title")}
              </p>
              <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${st.text}`}>
                {t(`floodAlert.status.${status}`)}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t(`floodAlert.advice.${status}`)}
              </p>
            </div>
          </div>

          {/* Còi: đang hú → bấm để im; đang im → bật/tắt hẳn */}
          <button
            onClick={alarm.onToggle}
            title={t("floodAlert.soundHint")}
            className={`flex-shrink-0 rounded-xl border p-2 transition-colors ${
              alarm.ringing
                ? "animate-pulse border-red-500 bg-red-500 text-white"
                : alarm.muted
                  ? "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {alarm.ringing ? "notifications_active" : alarm.muted ? "volume_off" : "volume_up"}
            </span>
          </button>
        </div>

        {/* Vì sao đang cảnh báo mà không có tiếng — nói thẳng ra.
            Im lặng không giải thích khiến người dùng tưởng hệ thống hỏng. */}
        {alarming && !alarm.ringing && (
          <button
            onClick={alarm.onToggle}
            className="mt-3 flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <span className="material-symbols-outlined text-base">volume_off</span>
            {alarm.blocked
              ? t("floodAlert.soundBlocked")
              : alarm.acknowledged
                ? t("floodAlert.soundAcked")
                : t("floodAlert.soundMuted")}
          </button>
        )}

        {/* Nước đã lên nhưng chưa tới ngưỡng hú: nói trước để người dùng không
            tưởng còi hỏng khi thấy cảnh báo mà chẳng nghe gì. */}
        {!alarming && status === "minor" && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="material-symbols-outlined text-sm">notifications_paused</span>
            {t("floodAlert.soundWillRing")}
          </p>
        )}

        {/* Danh sách điểm đo — gọn, không số liệu kỹ thuật */}
        <div className="mt-4 space-y-1.5">
          {withDistance.slice(0, 4).map((s) => {
            const rowSt = STYLES[s.status];
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 dark:bg-slate-900/40"
              >
                <span className={`material-symbols-outlined text-base ${rowSt.text}`}>
                  {s.online ? "sensors" : "sensors_off"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {[s.address, formatKm(s.km) && t("floodAlert.awayFromYou").replace("{d}", formatKm(s.km))]
                      .filter(Boolean)
                      .join(" · ") || formatAgo(s.lastSeenAt)}
                  </p>
                </div>
                <span className={`flex-shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ${rowSt.chip}`}>
                  {t(`floodAlert.status.${s.status}`)}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          {t("floodAlert.source")}
          {worst?.lastSeenAt ? ` · ${t("floodAlert.updated")} ${formatAgo(worst.lastSeenAt)}` : ""}
        </p>
      </div>
    </div>
  );
}
