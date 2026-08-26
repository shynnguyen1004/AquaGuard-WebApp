import { useState } from "react";
import { useDispatch } from "../../contexts/DispatchContext";
import { useLanguage } from "../../contexts/LanguageContext";

/**
 * Công tắc ca trực của rescuer.
 *
 * Chỉ rescuer đang BẬT trực mới lọt vào pool điều phối tự động — đây là bộ lọc
 * đầu tiên của thuật toán. Tắt trực sẽ huỷ luôn lời mời đang treo (nếu có) và
 * đẩy ca đó sang người khác ngay, nên nút này có hệ quả thật, không chỉ là
 * một cờ hiển thị.
 */
export default function DutyToggle() {
  const { dutyStatus, dutyLoading, setDuty } = useDispatch();
  const { t } = useLanguage();
  const [error, setError] = useState("");

  const isOn = dutyStatus === "on";

  const handleToggle = async () => {
    setError("");
    const result = await setDuty(isOn ? "off" : "on");
    if (!result.ok) {
      // NO_TEAM là lỗi hay gặp nhất: bật trực khi chưa vào đội nào.
      setError(
        result.code === "NO_TEAM" ? t("dispatch.needTeam") : t("dispatch.dutyError")
      );
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={dutyLoading}
        aria-pressed={isOn}
        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          isOn
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      >
        <span className="relative flex h-2.5 w-2.5">
          {isOn && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              isOn ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
        </span>
        {isOn ? t("dispatch.onDuty") : t("dispatch.offDuty")}
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
