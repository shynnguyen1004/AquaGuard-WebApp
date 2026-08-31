import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";
import { waterSensorStatus } from "./WaterSensorCard";

/**
 * Xem sâu một cảm biến mực nước từ Trung tâm Giám sát.
 *
 * Thẻ ngoài danh sách chỉ có sparkline 6 giờ gọn; ở đây rescuer/admin đổi được
 * khoảng thời gian để phân biệt "nước dâng đột ngột" với "cả tuần nay vẫn thế"
 * — hai tình huống đòi hai cách xử lý khác nhau.
 */

const HEX = {
  normal: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
  offline: "#94a3b8",
};

const RANGES = [
  { hours: 6, key: "range6h" },
  { hours: 24, key: "range24h" },
  { hours: 168, key: "range7d" },
];

// Trần số điểm giữ trong bộ nhớ khi modal mở lâu (poll 5s → 720 điểm/giờ).
const MAX_POINTS = 1200;

export default function WaterSensorDetail({ sensor, onClose, onChanged }) {
  const { t, language } = useLanguage();
  const [rangeHours, setRangeHours] = useState(6);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manage, setManage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`/sensors/${sensor.id}/readings?hours=${rangeHours}`);
        if (!cancelled && res.success) setSeries(res.data || []);
      } catch {
        if (!cancelled) setSeries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sensor.id, rangeHours]);

  // ── Bám theo số đo mới ──
  // Trang cha poll 5 giây một lần và đẩy xuống `sensor` mới; nếu có fix mới hơn
  // điểm cuối của chuỗi thì nối thêm vào. Không nạp lại cả chuỗi: chỉ để vẽ
  // tiếp một điểm mà kéo về 1000 điểm mỗi 5 giây là phí, và biểu đồ sẽ giật.
  useEffect(() => {
    if (!sensor.lastSeenAt || sensor.percent == null) return;
    const ts = new Date(sensor.lastSeenAt).getTime();
    if (!Number.isFinite(ts)) return;

    setSeries((prev) => {
      const last = prev[prev.length - 1];
      if (last && new Date(last.at).getTime() >= ts) return prev;
      return [...prev, { percent: sensor.percent, at: sensor.lastSeenAt }].slice(-MAX_POINTS);
    });
  }, [sensor.lastSeenAt, sensor.percent]);

  const color = HEX[waterSensorStatus(sensor)];

  const chartData = useMemo(
    () => series.map((p) => ({ percent: p.percent, at: new Date(p.at).getTime() })),
    [series]
  );

  const formatTick = useCallback(
    (ms) =>
      new Date(ms).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [language]
  );

  const coords =
    sensor.latitude != null && sensor.longitude != null
      ? `${sensor.latitude.toFixed(5)}, ${sensor.longitude.toFixed(5)}`
      : null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Đầu ─ tên + số đo hiện tại */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-black truncate">{sensor.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {sensor.address || t("monitoring.water.noAddress")}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {sensor.canManage && (
                <button
                  onClick={() => setManage((v) => !v)}
                  title={t("waterSensor.settings")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    manage
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">settings</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black" style={{ color }}>
              {sensor.percent != null ? sensor.percent : "—"}
            </span>
            <span className="text-lg font-bold text-slate-400">%</span>
            {sensor.percent != null && (
              <span className="text-sm font-bold" style={{ color }}>
                {t(`waterSensor.levels.${sensor.levelKey}`)}
              </span>
            )}
            <span
              className={`ml-auto text-xs font-bold ${
                sensor.online ? "text-safe" : "text-slate-400"
              }`}
            >
              {sensor.online ? t("waterSensor.online") : t("waterSensor.offline")}
            </span>
          </div>

          {/* Thông tin thiết bị */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label={t("monitoring.water.owner")} value={sensor.owner?.displayName || "—"} icon="person" />
            {sensor.owner?.phoneNumber && (
              <Field label={t("monitoring.water.contact")} value={sensor.owner.phoneNumber} icon="call" />
            )}
            <Field label={t("monitoring.water.threshold")} value={`${sensor.alertThreshold}%`} icon="notifications_active" />
            {coords && <Field label={t("monitoring.water.coords")} value={coords} icon="my_location" />}
            {sensor.raw != null && (
              <Field label={t("waterSensor.rawValue")} value={String(sensor.raw)} icon="memory" />
            )}
          </div>

          {/* Quản lý thiết bị — chỉ hiện với người có quyền */}
          {manage && sensor.canManage && (
            <SensorManage
              sensor={sensor}
              onChanged={onChanged}
              onDeleted={() => {
                onChanged?.();
                onClose();
              }}
            />
          )}

          {/* Biểu đồ */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {t("waterSensor.chart")}
              </h4>
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.hours}
                    onClick={() => setRangeHours(r.hours)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition-colors ${
                      rangeHours === r.hours
                        ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                        : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t(`waterSensor.${r.key}`)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-48 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
            ) : chartData.length < 2 ? (
              <div className="flex h-48 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400 dark:bg-slate-800/50">
                {t("waterSensor.noData")}
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <defs>
                      <linearGradient id="monitorWaterFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                    <XAxis
                      dataKey="at"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={formatTick}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={formatTick}
                      formatter={(value) => [`${value}%`, t("monitoring.sensors.type_water_level")]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <ReferenceLine y={sensor.alertThreshold} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.7} />
                    <Area
                      type="monotone"
                      dataKey="percent"
                      stroke={color}
                      strokeWidth={2}
                      fill="url(#monitorWaterFill)"
                      isAnimationActive={false}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Chỉnh ngưỡng cảnh báo, đổi tên, xoay key, gỡ thiết bị.
 *
 * Chỉ render khi `sensor.canManage` — cờ do SERVER chấm (admin: mọi thiết bị;
 * rescuer: thiết bị mình tạo), không phải giao diện tự suy ra từ id.
 */
function SensorManage({ sensor, onChanged, onDeleted }) {
  const { t } = useLanguage();
  const [name, setName] = useState(sensor.name);
  const [threshold, setThreshold] = useState(sensor.alertThreshold);
  const [alertEnabled, setAlertEnabled] = useState(sensor.alertEnabled);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Key hiện tại: `newKey` là key vừa xoay (chưa kịp về qua vòng poll),
  // còn `sensor.deviceKey` là bản server trả cho người quản lý được thiết bị.
  const deviceKey = newKey || sensor.deviceKey || "";

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(deviceKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bị chặn (http, quyền) — key vẫn hiện trên màn hình để chép tay.
    }
  };

  const patch = async (body) => {
    setSaving(true);
    try {
      await api.put(`/sensors/${sensor.id}`, body);
      onChanged?.();
    } catch {
      // Giữ nguyên giá trị đang hiện; lần poll sau sẽ đồng bộ lại từ server.
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    if (!window.confirm(t("waterSensor.rotateConfirm"))) return;
    try {
      const res = await api.post(`/sensors/${sensor.id}/rotate-key`, {});
      if (res.success) {
        setNewKey(res.data.deviceKey);
        setShowKey(true);
      }
      onChanged?.();
    } catch {
      // bỏ qua
    }
  };

  const remove = async () => {
    if (!window.confirm(t("waterSensor.removeConfirm"))) return;
    try {
      await api.delete(`/sensors/${sensor.id}`);
      onDeleted?.();
    } catch {
      // bỏ qua
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
      {/* ── Device key ── */}
      <div>
        <label className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {t("waterSensor.deviceKey")}
        </label>
        {deviceKey ? (
          <div className="flex items-center gap-2 rounded-lg bg-white p-2 dark:bg-slate-900">
            <code className="flex-1 break-all font-mono text-[11px] text-slate-700 dark:text-slate-200">
              {showKey ? deviceKey : `${deviceKey.slice(0, 8)}${"•".repeat(18)}`}
            </code>
            <button
              onClick={() => setShowKey((v) => !v)}
              className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={showKey ? t("waterSensor.hideKey") : t("waterSensor.showKey")}
            >
              <span className="material-symbols-outlined text-base">
                {showKey ? "visibility_off" : "visibility"}
              </span>
            </button>
            <button
              onClick={copyKey}
              className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-bold hover:opacity-80 dark:bg-slate-800"
            >
              <span className="material-symbols-outlined text-sm">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? t("waterSensor.copied") : t("waterSensor.copy")}
            </button>
          </div>
        ) : (
          <p className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {t("waterSensor.keyLegacy")}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {t("waterSensor.name")}
        </label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            onClick={() => patch({ name: name.trim() })}
            disabled={saving || !name.trim() || name.trim() === sensor.name}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {t("waterSensor.save")}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {t("waterSensor.threshold")}
          </label>
          <span className="text-xs font-black text-danger">{threshold}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          onMouseUp={() => patch({ alertThreshold: threshold })}
          onTouchEnd={() => patch({ alertThreshold: threshold })}
          onKeyUp={() => patch({ alertThreshold: threshold })}
          className="w-full accent-red-500"
        />
        <p className="mt-0.5 text-[11px] text-slate-400">{t("waterSensor.thresholdHint")}</p>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={alertEnabled}
          onChange={(e) => {
            setAlertEnabled(e.target.checked);
            patch({ alertEnabled: e.target.checked });
          }}
          className="h-4 w-4 accent-primary"
        />
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {t("waterSensor.alertsEnabled")}
        </span>
      </label>

      {newKey && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {t("waterSensor.keyRotated")}
        </p>
      )}

      <div className="flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
        <button
          onClick={rotate}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-sm">key</span>
          {t("waterSensor.rotateKey")}
        </button>
        <button
          onClick={remove}
          className="flex items-center gap-1 rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
          {t("waterSensor.remove")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, icon }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1 mb-0.5">
        <span className="material-symbols-outlined text-[13px]">{icon}</span>
        {label}
      </p>
      <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{value}</p>
    </div>
  );
}
