import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getRoleBadgeClasses } from "../config/rbac";
import { normalizePhone, formatPhoneDisplay } from "../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function SettingsPage({ defaultTab = "profile" }) {
  const { user, token, role } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isCitizen = role === "citizen";
  const resolvedDefault = (!isCitizen && defaultTab === "family") ? "profile" : defaultTab;
  const [activeTab, setActiveTab] = useState(resolvedDefault);
  const [profile, setProfile] = useState({
    displayName: user?.displayName || "User",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    address: "",
    emergencyContact: "",
    gender: "",
    dateOfBirth: "",
    latitude: null,
    longitude: null,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  // ── Fetch profile from DB ──
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setProfile({
          displayName: d.displayName || user?.displayName || "User",
          email: d.email || user?.email || "",
          phone: d.phoneNumber || user?.phoneNumber || "",
          address: d.address || "",
          emergencyContact: d.emergencyContact || "",
          gender: d.gender || "",
          dateOfBirth: d.dateOfBirth ? d.dateOfBirth.split("T")[0] : "",
          latitude: d.latitude,
          longitude: d.longitude,
        });
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "profile") {
      fetchProfile();
    }
  }, [activeTab, fetchProfile]);

  // ── Calculate age from DOB ──
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  // ── Detect location using Geolocation API + Google Maps Geocoding ──
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setProfileMessage({ type: "error", text: t("settings.profile.locationError") });
      return;
    }

    setDetectingLocation(true);
    setProfileMessage({ type: "", text: "" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          if (GOOGLE_MAPS_API_KEY) {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=vi&result_type=street_address|route|sublocality|locality`;
            const res = await fetch(geocodeUrl);
            const data = await res.json();

            if (data.status === "OK" && data.results.length > 0) {
              address = data.results[0].formatted_address;
            }
          } else {
            // Fallback to Nominatim (free, no API key)
            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi`;
            const res = await fetch(nominatimUrl, {
              headers: { "User-Agent": "AquaGuard-WebApp" },
            });
            const data = await res.json();
            if (data.display_name) {
              address = data.display_name;
            }
          }

          setProfile((p) => ({ ...p, address, latitude, longitude }));
          setProfileMessage({ type: "success", text: t("settings.profile.locationDetected") });
        } catch (err) {
          console.error("Geocoding error:", err);
          setProfile((p) => ({
            ...p,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
          }));
          setProfileMessage({ type: "success", text: t("settings.profile.locationDetected") });
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err.code, err.message);
        setDetectingLocation(false);
        let errorMsg = t("settings.profile.locationError");
        if (err.code === 1) {
          errorMsg = t("settings.profile.locationPermissionDenied");
        } else if (err.code === 2) {
          errorMsg = t("settings.profile.locationUnavailable");
        } else if (err.code === 3) {
          errorMsg = t("settings.profile.locationTimeout");
        }
        setProfileMessage({ type: "error", text: errorMsg });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  // ── Family state ──
  const [family, setFamily] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [relation, setRelation] = useState("");
  const [mySafetyStatus, setMySafetyStatus] = useState("unknown");
  const [myHealthNote, setMyHealthNote] = useState("");

  // Build auth headers fresh each call to avoid stale closures
  const getAuthHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }), [token]);

  // ── Fetch family members ──
  const fetchFamily = useCallback(async () => {
    if (!token) return;
    setFamilyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/family/members`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setFamily(data.data);
    } catch (err) {
      console.error("Fetch family error:", err);
    } finally {
      setFamilyLoading(false);
    }
  }, [token, getAuthHeaders]);

  // ── Fetch pending requests ──
  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/family/requests`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setPendingRequests(data.data);
    } catch (err) {
      console.error("Fetch requests error:", err);
    }
  }, [token, getAuthHeaders]);

  useEffect(() => {
    if (activeTab === "family") {
      fetchFamily();
      fetchRequests();
    }
  }, [activeTab, fetchFamily, fetchRequests]);

  // ── Search user by phone ──
  const handleSearch = async () => {
    if (!searchPhone.trim()) return;
    setSearchError("");
    setSearchResult(null);
    try {
      const phone = normalizePhone(searchPhone);
      const res = await fetch(`${API_BASE}/family/search?phone=${encodeURIComponent(phone)}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setSearchResult(data.data);
      } else {
        setSearchError(t("settings.family.userNotFound"));
      }
    } catch (err) {
      setSearchError(t("settings.family.connectionError"));
    }
  };

  // ── Send connection request ──
  const handleSendRequest = async () => {
    if (!searchResult) return;
    try {
      const res = await fetch(`${API_BASE}/family/request`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ receiver_id: searchResult.id, relation }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileMessage({ type: "success", text: t("settings.family.connectionSent") });
        setShowAddFamily(false);
        setSearchResult(null);
        setSearchPhone("");
        setRelation("");
      } else {
        setProfileMessage({ type: "error", text: data.message || t("settings.family.connectionError") });
      }
    } catch (err) {
      setProfileMessage({ type: "error", text: t("settings.family.connectionError") });
    }
  };

  // ── Accept / Reject request ──
  const handleAcceptRequest = async (id) => {
    try {
      await fetch(`${API_BASE}/family/requests/${id}/accept`, { method: "PUT", headers: getAuthHeaders() });
      fetchFamily();
      fetchRequests();
    } catch (err) { console.error(err); }
  };

  const handleRejectRequest = async (id) => {
    try {
      await fetch(`${API_BASE}/family/requests/${id}/reject`, { method: "PUT", headers: getAuthHeaders() });
      fetchRequests();
    } catch (err) { console.error(err); }
  };

  // ── Remove family member ──
  const handleRemoveFamily = async (connectionId) => {
    if (!confirm(t("settings.family.removeConfirm"))) return;
    try {
      await fetch(`${API_BASE}/family/members/${connectionId}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchFamily();
    } catch (err) { console.error(err); }
  };

  // ── Update safety status ──
  const handleUpdateStatus = async (status) => {
    try {
      await fetch(`${API_BASE}/family/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ safety_status: status, health_note: myHealthNote }),
      });
      setMySafetyStatus(status);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const allTabs = [
    { id: "profile", label: t("settings.tabs.profile"), icon: "person" },
    { id: "family", label: t("settings.tabs.family"), icon: "group", citizenOnly: true },
    { id: "appearance", label: t("settings.tabs.appearance"), icon: "palette" },
    { id: "language", label: t("settings.tabs.language"), icon: "translate" },
  ];
  const tabs = allTabs.filter((tab) => !tab.citizenOnly || isCitizen);

  const handleProfileSave = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName,
          email: profile.email,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth || null,
          emergencyContact: profile.emergencyContact,
          address: profile.address,
          latitude: profile.latitude,
          longitude: profile.longitude,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileMessage({ type: "success", text: t("settings.profile.profileUpdated") });
        window.dispatchEvent(
          new CustomEvent("profile_updated", {
            detail: {
              userId: user?.uid || null,
              dateOfBirth: profile.dateOfBirth || null,
              gender: profile.gender || "",
              address: profile.address || "",
            },
          })
        );
      } else {
        setProfileMessage({ type: "error", text: data.message || "Failed to save." });
      }
    } catch (err) {
      console.error("Save profile error:", err);
      setProfileMessage({ type: "error", text: "Server error." });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMessage({ type: "", text: "" }), 3000);
    }
  };

  const statusColors = {
    safe: "bg-emerald-500 text-white",
    danger: "bg-red-500 text-white",
    injured: "bg-orange-500 text-white",
    unknown: "bg-slate-400 text-white",
  };

  const statusLabels = {
    safe: "An toàn",
    danger: "Nguy hiểm",
    injured: "Bị thương",
    unknown: "Chưa rõ",
  };

  const getAvatar = (name) => (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{t("settings.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="max-w-2xl space-y-6">
          {/* Avatar Card */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-5">
              <div className="size-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="size-20 rounded-full object-cover" />
                ) : (
                  (user?.displayName || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{profile.displayName}</h2>
                <p className="text-sm text-slate-500">{profile.phone || profile.email || "No contact"}</p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-3 py-1 rounded-full border ${getRoleBadgeClasses(user?.role)}`}>
                  {t(`roles.${user?.role || "citizen"}`)}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          {profileLoading ? (
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-center py-12">
                <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">edit</span>
                {t("settings.profile.personalInfo")}
              </h3>

              {/* Status Message */}
              {profileMessage.text && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  profileMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30"
                }`}>
                  <span className="material-symbols-outlined text-sm">
                    {profileMessage.type === "success" ? "check_circle" : "error"}
                  </span>
                  {profileMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t("settings.profile.fullName")}</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t("settings.profile.email")}</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t("settings.profile.phone")}</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                {/* Emergency Contact */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t("settings.profile.emergencyContact")}</label>
                  <input
                    type="tel"
                    value={profile.emergencyContact}
                    onChange={(e) => setProfile((p) => ({ ...p, emergencyContact: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t("settings.profile.gender")}</label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    <option value="">{t("settings.profile.selectGender")}</option>
                    <option value="male">{t("settings.profile.male")}</option>
                    <option value="female">{t("settings.profile.female")}</option>
                    <option value="other">{t("settings.profile.other")}</option>
                  </select>
                </div>
                {/* Date of Birth + Age */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {t("settings.profile.dateOfBirth")}
                    {profile.dateOfBirth && calculateAge(profile.dateOfBirth) !== null && (
                      <span className="ml-2 text-primary font-bold">
                        ({calculateAge(profile.dateOfBirth)} {t("settings.profile.age")})
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                {/* Address with Detect Location */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t("settings.profile.address")}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                    <button
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <span className={`material-symbols-outlined text-sm ${detectingLocation ? "animate-spin" : ""}`}>
                        {detectingLocation ? "progress_activity" : "my_location"}
                      </span>
                      {detectingLocation ? t("settings.profile.detecting") : t("settings.profile.detectLocation")}
                    </button>
                  </div>
                  {profile.latitude && profile.longitude && (
                    <p className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">pin_drop</span>
                      {profile.latitude.toFixed(6)}, {profile.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {profileSaving && (
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                )}
                {profileSaving ? t("settings.profile.saving") : t("settings.profile.saveChanges")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Family Tab */}
      {activeTab === "family" && (
        <div className="max-w-2xl space-y-6">
          {/* My Safety Status */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-lg">health_and_safety</span>
              Trạng thái của tôi
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {["safe", "danger", "injured", "unknown"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleUpdateStatus(s)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    mySafetyStatus === s
                      ? statusColors[s] + " shadow-lg ring-2 ring-offset-2 ring-current"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Ghi chú sức khỏe (tuỳ chọn)..."
              value={myHealthNote}
              onChange={(e) => setMyHealthNote(e.target.value)}
              onBlur={() => handleUpdateStatus(mySafetyStatus)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Family header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Người thân</h3>
              <p className="text-xs text-slate-500 mt-0.5">Theo dõi tình trạng an toàn của gia đình</p>
            </div>
            <button
              onClick={() => setShowAddFamily(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Thêm người thân
            </button>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">notifications</span>
                Lời mời kết nối ({pendingRequests.length})
              </p>
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-200 dark:border-orange-500/30 p-4 flex items-center gap-4">
                  <div className="size-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                    {getAvatar(req.from.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{req.from.displayName}</p>
                    <p className="text-[11px] text-slate-500">{req.from.phoneNumber} • {req.relation || "Người thân"}</p>
                  </div>
                  <button onClick={() => handleAcceptRequest(req.id)} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600">
                    Chấp nhận
                  </button>
                  <button onClick={() => handleRejectRequest(req.id)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300">
                    Từ chối
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Family — Search by Phone */}
          {showAddFamily && (
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/30 p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">person_search</span>
                Tìm người thân bằng số điện thoại
              </h4>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Nhập SĐT (VD: 0901234567 hoặc +84901234567)"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={handleSearch} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90">
                  <span className="material-symbols-outlined text-sm">search</span>
                </button>
              </div>
              {searchError && <p className="text-xs text-red-500">{searchError}</p>}
              {searchResult && (
                <div className="bg-primary/5 rounded-xl p-4 flex items-center gap-4">
                  <div className="size-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-sm font-bold">
                    {getAvatar(searchResult.displayName)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{searchResult.displayName}</p>
                    <p className="text-xs text-slate-500">{searchResult.phoneNumber}</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Quan hệ (VD: Bố, Mẹ...)"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-32 outline-none"
                  />
                  <button onClick={handleSendRequest} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90">
                    Gửi lời mời
                  </button>
                </div>
              )}
              <button
                onClick={() => { setShowAddFamily(false); setSearchResult(null); setSearchPhone(""); setSearchError(""); }}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          )}

          {/* Family List */}
          {familyLoading ? (
            <div className="text-center py-8">
              <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-3">
              {family.map((member) => (
                <div
                  key={member.connectionId}
                  className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
                >
                  <div className="size-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getAvatar(member.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.displayName}</p>
                    <p className="text-xs text-slate-500">{member.relation || "Người thân"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">call</span>
                      {member.phoneNumber}
                    </p>
                    {member.healthNote && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">medical_information</span>
                        {member.healthNote}
                      </p>
                    )}
                    {member.address && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {member.address}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${statusColors[member.safetyStatus] || statusColors.unknown}`}>
                    {statusLabels[member.safetyStatus] || "Chưa rõ"}
                  </span>
                  <button
                    onClick={() => handleRemoveFamily(member.connectionId)}
                    className="size-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-slate-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {!familyLoading && family.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
              <p className="text-sm">Chưa có người thân nào. Nhấn "Thêm người thân" để bắt đầu.</p>
            </div>
          )}
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary text-lg">palette</span>
              {t("settings.appearance.theme")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "light", label: t("settings.appearance.light"), icon: "light_mode", desc: t("settings.appearance.lightDesc") },
                { id: "dark", label: t("settings.appearance.dark"), icon: "dark_mode", desc: t("settings.appearance.darkDesc") },
                { id: "system", label: t("settings.appearance.system"), icon: "desktop_windows", desc: t("settings.appearance.systemDesc") },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${theme === opt.id
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                >
                  <span className={`material-symbols-outlined text-3xl ${theme === opt.id ? "text-primary" : "text-slate-400"
                    }`}>
                    {opt.icon}
                  </span>
                  <span className={`text-sm font-bold ${theme === opt.id ? "text-primary" : "text-slate-700 dark:text-slate-300"
                    }`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{opt.desc}</span>
                  {theme === opt.id && (
                    <span className="material-symbols-outlined text-primary text-base filled-icon">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Language Tab */}
      {activeTab === "language" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-lg">translate</span>
              {t("settings.language.title")}
            </h3>
            <p className="text-xs text-slate-500 mb-5">{t("settings.language.subtitle")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: "en",
                  flag: "🇺🇸",
                  label: t("settings.language.english"),
                  native: "English",
                  desc: t("settings.language.englishDesc"),
                },
                {
                  id: "vi",
                  flag: "🇻🇳",
                  label: t("settings.language.vietnamese"),
                  native: "Tiếng Việt",
                  desc: t("settings.language.vietnameseDesc"),
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setLanguage(opt.id)}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${language === opt.id
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                >
                  <span className="text-4xl leading-none">{opt.flag}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-sm font-bold ${language === opt.id ? "text-primary" : "text-slate-700 dark:text-slate-300"
                      }`}>
                      {opt.native}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">{opt.desc}</span>
                  </div>
                  {language === opt.id && (
                    <span className="material-symbols-outlined text-primary text-xl filled-icon flex-shrink-0">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
