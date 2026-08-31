import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { api } from "../../services/api";
import { getCachedGpsPosition } from "../../utils/locationSync";
import { extractCityLabel, looksLikeCoordinates, reverseGeocode } from "../../utils/reverseGeocode";
import NotificationBell from "../notifications/NotificationBell";

export default function Header() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [cityLabel, setCityLabel] = useState(null);
  const [resolving, setResolving] = useState(true);

  const fetchUserCity = useCallback(async () => {
    if (!token) return;
    setResolving(true);
    try {
      // Ưu tiên GPS đang chạy: LiveLocationProvider ghi mỗi lần đọc vị trí vào
      // cache này, nên nó là chỗ user đang đứng THẬT. Hồ sơ trong DB chỉ là vị
      // trí lần sync gần nhất — đi tỉnh khác là nó sai ngay.
      const live = getCachedGpsPosition(600000); // chấp nhận tối đa 10 phút
      if (live) {
        const resolved = await reverseGeocode(live.latitude, live.longitude);
        if (resolved?.full) {
          setCityLabel(extractCityLabel(resolved.full));
          return;
        }
      }

      const res = await api.get("/auth/profile");
      if (!res.success || !res.data) return;

      const { address, latitude, longitude } = res.data;

      // Địa chỉ đã đọc được thì dùng luôn.
      if (address && !looksLikeCoordinates(address)) {
        const city = extractCityLabel(address);
        if (city) {
          setCityLabel(city);
          return;
        }
      }

      // Hồ sơ chưa có địa chỉ, hoặc đang lưu chuỗi toạ độ từ lần sync GPS
      // trước (reverse-geocode lúc đó thất bại) — tra lại từ toạ độ.
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const resolved = await reverseGeocode(lat, lng);
      if (resolved?.full) setCityLabel(extractCityLabel(resolved.full));
    } catch {
      // Im lặng — chỗ hiển thị sẽ báo "chưa xác định được".
    } finally {
      setResolving(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserCity();

    // Also listen for profile updates from SettingsPage
    const onProfileUpdate = () => fetchUserCity();
    window.addEventListener("profile_updated", onProfileUpdate);

    // GPS về sau lần render đầu (hoặc user di chuyển) → tra lại.
    const retry = setInterval(fetchUserCity, 120000);

    return () => {
      window.removeEventListener("profile_updated", onProfileUpdate);
      clearInterval(retry);
    };
  }, [fetchUserCity]);

  return (
    <header
      className="shrink-0 h-16 lg:h-20 hidden lg:flex items-center justify-between z-10 overflow-hidden px-6 lg:px-8 bg-white dark:bg-[#171b26] border-b border-slate-200 dark:border-[#252a38]"
    >
      <div className="flex items-center gap-2 md:gap-4 lg:gap-6 min-w-0 flex-1">
        <div className="min-w-0">
          <h2 className="text-sm md:text-base lg:text-lg font-bold truncate text-slate-900 dark:text-[#e8eaf0]">
            {t("header.welcomeBack")} {user?.displayName?.split(" ")[0] || "User"}
          </h2>
          <div className="hidden md:flex items-center gap-1.5 text-slate-500 dark:text-[#8891a8]">
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>
            <span className="text-xs font-medium truncate">
              {cityLabel || t(resolving ? "header.locationDetecting" : "header.locationUnknown")}
            </span>
          </div>
        </div>

        <div className="hidden lg:block h-10 w-px shrink-0 bg-slate-200 dark:bg-[#252a38]" />

        {/* Risk Level Badge */}
        <div
          className="rounded-lg px-2 md:px-3 lg:px-4 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-3 shrink-0 bg-emerald-50 dark:bg-emerald-500/12 border border-emerald-200 dark:border-emerald-500/25"
        >
          <span className="material-symbols-outlined filled-icon text-base md:text-xl text-emerald-500">
            verified_user
          </span>
          <div>
            <p className="text-[9px] md:text-[10px] font-bold uppercase leading-none whitespace-nowrap text-emerald-600 dark:text-emerald-400">
              {t("header.riskLabel")}
            </p>
            <p className="text-xs md:text-sm font-black tracking-tight whitespace-nowrap text-emerald-600 dark:text-emerald-400">
              {t("header.riskValue")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
        {/* Search */}
        <div className="relative group hidden md:block">
          <input
            className="w-40 lg:w-64 pl-10 pr-4 py-2 rounded-xl border-none focus:ring-2 focus:ring-primary/30 text-sm transition-all bg-slate-100 dark:bg-[#1e2333] text-slate-900 dark:text-[#e8eaf0] placeholder-slate-400 dark:placeholder-[#4a5068] outline-none"
            placeholder={t("header.searchPlaceholder")}
            type="text"
          />
          <span className="material-symbols-outlined absolute left-3 top-2 text-xl text-slate-400 dark:text-[#4a5068]">
            search
          </span>
        </div>

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
}

