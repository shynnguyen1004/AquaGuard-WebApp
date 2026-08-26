import { useDispatch } from "../../contexts/DispatchContext";
import { useLanguage } from "../../contexts/LanguageContext";

/**
 * Thông báo "bạn vừa được giao một ca cứu hộ".
 *
 * Chế độ GIAO THẲNG: đây là thông báo, KHÔNG phải câu hỏi. Không có nút Từ
 * chối và không có đồng hồ đếm ngược — nhiệm vụ đã là của rescuer kể cả khi
 * họ đóng lớp phủ này đi. Nút "Đóng" chỉ tắt thông báo, không trả ca lại.
 *
 * Muốn bỏ ca thì phải vào dashboard bấm huỷ một cách có ý thức, và lần đó bị
 * ghi vào tỉ lệ bỏ ca (ảnh hưởng điểm tin cậy ở những lần giao sau).
 */

const URGENCY_STYLES = {
  critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export default function DispatchAssignmentModal() {
  const { assignment, dismissAssignment } = useDispatch();
  const { t } = useLanguage();

  if (!assignment) return null;

  const goToMission = () => {
    // Điều hướng bằng đúng cơ chế mà dashboard đang dùng cho menu bên trái.
    window.dispatchEvent(
      new CustomEvent("app_navigate", { detail: { page: "rescuer-missions" } })
    );
    dismissAssignment();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="h-1.5 w-full bg-emerald-500" />

        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/15">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">
                assignment_ind
              </span>
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("dispatch.offerLabel")}
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                {t("dispatch.assignedTitle")}
              </h2>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  URGENCY_STYLES[assignment.urgency] || URGENCY_STYLES.medium
                }`}
              >
                {t(`dispatch.urgency.${assignment.urgency || "medium"}`)}
              </span>
              {assignment.distanceKm != null && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                  {/* t() không nội suy tham số → ghép chuỗi ở đây */}
                  {assignment.distanceKm.toFixed(1)} km · {t("dispatch.awayFromYou")}
                </span>
              )}
            </div>

            <Row label={t("dispatch.citizen")} value={assignment.citizenName || "—"} />
            <Row label={t("dispatch.location")} value={assignment.location} />
            <Row label={t("dispatch.description")} value={assignment.description} />
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={dismissAssignment}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("dispatch.dismiss")}
            </button>
            <button
              type="button"
              onClick={goToMission}
              className="flex-[2] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
            >
              {t("dispatch.viewMission")}
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            {assignment.needsConfirm
              ? t("dispatch.confirmHint")
              : t("dispatch.assignedHint")}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex-1 font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
