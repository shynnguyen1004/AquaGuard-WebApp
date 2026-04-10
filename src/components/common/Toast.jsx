import { useState, useEffect, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(null);

/**
 * Toast notification component — replaces native alert().
 * Usage:
 *   const { showToast } = useToast();
 *   showToast("Success!", "success");
 *   showToast("Something went wrong", "error");
 */

const ICONS = {
  success: "check_circle",
  error: "error",
  warning: "warning",
  info: "info",
};

const COLORS = {
  success: "bg-safe/10 border-safe text-safe",
  error: "bg-danger/10 border-danger text-danger",
  warning: "bg-warning/10 border-warning text-warning",
  info: "bg-primary/10 border-primary text-primary",
};

function ToastItem({ id, message, type = "info", onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${COLORS[type] || COLORS.info} ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <span className="material-symbols-outlined text-xl filled-icon">
        {ICONS[type] || ICONS.info}
      </span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onDismiss(id), 300);
        }}
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if used outside provider — use console.warn
    return {
      showToast: (msg, type) => {
        console.warn(`[Toast fallback] ${type}: ${msg}`);
      },
    };
  }
  return ctx;
}
