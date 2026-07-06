import { useEffect } from "react";

/**
 * Reusable confirmation dialog. Controlled via `open`.
 * Sits at z-[10000] so it renders above the full-screen tracking map (z-[9999]).
 * All labels are passed in (already translated by the caller).
 *
 * @param {boolean}  open
 * @param {string}   title
 * @param {string}   message
 * @param {string}   confirmLabel
 * @param {string}   cancelLabel
 * @param {Function} onConfirm
 * @param {Function} onCancel
 * @param {boolean}  [loading]   disables buttons + shows a spinner on confirm
 * @param {"primary"|"safe"|"danger"} [tone]
 * @param {string}   [icon]      Material Symbols icon name
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  tone = "primary",
  icon = "help",
}) {
  // Close on Escape (unless a confirm is in flight).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const tones = {
    primary: { btn: "bg-primary hover:bg-primary/90", ring: "bg-primary/10 text-primary" },
    safe: { btn: "bg-safe hover:bg-green-600", ring: "bg-safe/10 text-safe" },
    danger: { btn: "bg-danger hover:bg-red-600", ring: "bg-danger/10 text-danger" },
  };
  const st = tones[tone] || tones.primary;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className={`mx-auto size-14 rounded-2xl flex items-center justify-center mb-4 ${st.ring}`}>
          <span className="material-symbols-outlined text-3xl filled-icon">{icon}</span>
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">{title}</h3>
        {message && <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-2xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${st.btn}`}
          >
            {loading && (
              <span className="inline-block size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
