import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { syncLocationAfterAuth } from "../../utils/locationSync";

/**
 * LocationGate — blocks access to the app until the user grants GPS permission.
 * Shown after login/register when location has not been synced yet.
 *
 * Flow:
 *  1. User logs in → ProtectedRoute renders → LocationGate wraps children
 *  2. LocationGate checks if GPS permission is granted
 *  3. If not granted, shows a full-screen prompt
 *  4. Once granted, syncs location and renders children
 */
export default function LocationGate({ children }) {
  const { t } = useLanguage();
  const { token } = useAuth();

  // "checking" | "prompt" | "requesting" | "granted" | "denied"
  const [status, setStatus] = useState("checking");

  const checkPermission = useCallback(async () => {
    // If Permissions API is not supported, go straight to requesting
    if (!navigator.permissions?.query) {
      setStatus("prompt");
      return;
    }

    try {
      const permissionStatus = await navigator.permissions.query({ name: "geolocation" });

      if (permissionStatus.state === "granted") {
        setStatus("granted");
        // Sync location silently in background
        syncLocationAfterAuth(token);
      } else if (permissionStatus.state === "denied") {
        setStatus("denied");
      } else {
        // "prompt" — user hasn't decided yet
        setStatus("prompt");
      }
    } catch {
      // Permissions API failed, default to showing prompt
      setStatus("prompt");
    }
  }, [token]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      () => {
        setStatus("granted");
        // Sync location to backend
        syncLocationAfterAuth(token);
      },
      (err) => {
        console.warn("[LocationGate] Permission denied:", err.message);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setStatus("denied");
        } else {
          // POSITION_UNAVAILABLE or TIMEOUT — still let them through but try again
          setStatus("granted");
          syncLocationAfterAuth(token);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  // If GPS is granted, render children normally
  if (status === "granted") {
    return children;
  }

  // If still checking, show loading
  if (status === "checking") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show location permission prompt
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-2xl border border-white/10 dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`size-20 rounded-full flex items-center justify-center ${
              status === "denied"
                ? "bg-red-500/10 border-2 border-red-500/30"
                : "bg-primary/10 border-2 border-primary/30"
            }`}>
              <span className={`material-symbols-outlined text-4xl ${
                status === "denied" ? "text-red-400" : "text-primary"
              } ${status === "requesting" ? "animate-pulse" : ""}`}>
                {status === "denied" ? "location_off" : "location_on"}
              </span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {status === "denied"
              ? t("locationGate.deniedTitle")
              : t("locationGate.title")}
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            {status === "denied"
              ? t("locationGate.deniedDesc")
              : t("locationGate.desc")}
          </p>

          {/* Features that require GPS */}
          <div className="space-y-3 mb-8 text-left">
            {[
              { icon: "sos", text: t("locationGate.featureSOS") },
              { icon: "group", text: t("locationGate.featureFamily") },
              { icon: "map", text: t("locationGate.featureMap") },
            ].map((feature) => (
              <div key={feature.icon} className="flex items-center gap-3 text-slate-300">
                <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-lg">
                    {feature.icon}
                  </span>
                </div>
                <span className="text-xs font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Action button */}
          {status === "denied" ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 leading-relaxed">
                  {t("locationGate.deniedInstructions")}
                </p>
              </div>
              <button
                onClick={() => {
                  setStatus("prompt");
                  // Give a moment, then try requesting again
                  setTimeout(handleRequestLocation, 300);
                }}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl"
              >
                <span className="material-symbols-outlined text-xl">refresh</span>
                <span>{t("locationGate.tryAgain")}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleRequestLocation}
              disabled={status === "requesting"}
              className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "requesting" ? (
                <>
                  <div className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>{t("locationGate.requesting")}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">my_location</span>
                  <span>{t("locationGate.allowLocation")}</span>
                </>
              )}
            </button>
          )}

          {/* Privacy note */}
          <p className="mt-5 text-[11px] text-slate-500 leading-relaxed">
            <span className="material-symbols-outlined text-[10px] align-middle mr-1">lock</span>
            {t("locationGate.privacyNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
