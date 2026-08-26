import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";

/**
 * Ghép một board ESP32 cảm biến mực nước vào hệ thống.
 *
 * Chỉ cứu hộ và quản trị mở được (Trung tâm Giám sát): thiết bị thuộc về người
 * tạo, và chính họ là người nhận cảnh báo khi nó vượt ngưỡng.
 *
 * Hai bước: đặt tên → nhận device key. Key CHỈ hiện đúng một lần (server chỉ
 * giữ SHA-256 của nó), nên bước 2 bày sẵn đoạn config.py để chép thẳng vào
 * board thay vì phải tự ghép chuỗi.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export default function WaterSensorSetupModal({ onClose, onCreated }) {
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null); // { ...sensor, deviceKey }
  const [copied, setCopied] = useState("");

  const grabLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }
    setLocating(true);
    setLocationError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/sensors", {
        name: name.trim(),
        ...(coords || {}),
      });
      if (res.success) {
        setCreated(res.data);
        onCreated?.(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const copy = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      // Clipboard bị chặn (http, quyền) — key vẫn hiện trên màn hình để chép tay.
    }
  };

  const ingestUrl = `${API_BASE}/sensors/ingest`;
  const snippet = created
    ? `WIFI_SSID = "..."\nWIFI_PASSWORD = "..."\nAPI_URL = "${ingestUrl}"\nDEVICE_KEY = "${created.deviceKey}"`
    : "";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="h-1.5 w-full bg-primary" />

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <span className="material-symbols-outlined text-primary filled-icon">sensors</span>
                {created ? t("waterSensor.keyTitle") : t("waterSensor.setupTitle")}
              </h3>
              {!created && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("waterSensor.setupDesc")}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {!created ? (
            /* ── Bước 1: đặt tên + vị trí ── */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  {t("waterSensor.name")}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder={t("waterSensor.namePlaceholder")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={grabLocation}
                disabled={locating}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                  coords
                    ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {coords ? "check_circle" : locating ? "progress_activity" : "my_location"}
                </span>
                {coords ? t("waterSensor.locationSet") : t("waterSensor.useMyLocation")}
              </button>
              {locationError && (
                <p className="text-xs text-red-500">{t("waterSensor.locationFailed")}</p>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t("waterSensor.cancel")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? t("waterSensor.creating") : t("waterSensor.create")}
                </button>
              </div>
            </div>
          ) : (
            /* ── Bước 2: key + đoạn cấu hình ── */
            <div className="space-y-4">
              <div className="flex gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg flex-shrink-0">
                  warning
                </span>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  {t("waterSensor.keyWarning")}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                <code className="flex-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">
                  {created.deviceKey}
                </code>
                <button
                  onClick={() => copy(created.deviceKey, "key")}
                  className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs font-bold shadow-sm hover:opacity-80"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copied === "key" ? "check" : "content_copy"}
                  </span>
                  {copied === "key" ? t("waterSensor.copied") : t("waterSensor.copy")}
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  {t("waterSensor.firmwareHint")}
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-xl bg-slate-900 dark:bg-black/40 p-3 pr-12 text-[11px] leading-relaxed text-slate-100 font-mono">
{snippet}
                  </pre>
                  <button
                    onClick={() => copy(snippet, "snippet")}
                    className="absolute right-2 top-2 rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copied === "snippet" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                {t("waterSensor.done")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
