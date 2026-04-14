import { useState } from "react";

const ADMIN_PASSWORD = "aquaguard2026";

const roles = [
  {
    key: "citizen",
    label: "Citizen",
    icon: "person",
    desc: "View flood maps, send SOS requests, and receive alerts",
    color: "border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10",
    activeColor: "border-primary bg-primary/15 ring-2 ring-primary/30",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    key: "rescuer",
    label: "Rescuer",
    icon: "local_fire_department",
    desc: "Respond to SOS requests, manage rescue missions",
    color: "border-warning/30 hover:border-warning bg-warning/5 hover:bg-warning/10",
    activeColor: "border-warning bg-warning/15 ring-2 ring-warning/30",
    iconBg: "bg-warning/10 text-warning",
  },
  {
    key: "admin",
    label: "Admin",
    icon: "admin_panel_settings",
    desc: "Manage users, flood zones, rescue teams, and system settings",
    color: "border-danger/30 hover:border-danger bg-danger/5 hover:bg-danger/10",
    activeColor: "border-danger bg-danger/15 ring-2 ring-danger/30",
    iconBg: "bg-danger/10 text-danger",
    requiresPassword: true,
  },
];

export default function RoleSelectionModal({ userName, onSelect }) {
  const [selected, setSelected] = useState("citizen");
  const [adminPass, setAdminPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setError("");

    if (selected === "admin") {
      if (!adminPass.trim()) {
        setError("Please enter the admin password");
        return;
      }
      if (adminPass !== ADMIN_PASSWORD) {
        setError("Incorrect admin password");
        return;
      }
    }

    setLoading(true);
    onSelect(selected);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 text-center border-b border-slate-100 dark:border-slate-800">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl filled-icon">shield_person</span>
          </div>
          <h2 className="text-xl font-black">Welcome, {userName}!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose your role to get started
          </p>
        </div>

        {/* Role Cards */}
        <div className="p-6 space-y-3">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => { setSelected(role.key); setError(""); setAdminPass(""); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                selected === role.key ? role.activeColor : role.color
              }`}
            >
              <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${role.iconBg}`}>
                <span className="material-symbols-outlined text-2xl filled-icon">{role.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{role.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{role.desc}</p>
              </div>
              {selected === role.key && (
                <span className="material-symbols-outlined text-xl text-primary filled-icon shrink-0">check_circle</span>
              )}
            </button>
          ))}

          {/* Admin Password */}
          {selected === "admin" && (
            <div className="mt-4 p-4 bg-danger/5 rounded-2xl border border-danger/20">
              <label className="block text-xs font-bold text-danger mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">lock</span>
                Admin Password Required
              </label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={adminPass}
                onChange={(e) => { setAdminPass(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                className="w-full px-4 py-2.5 rounded-xl border border-danger/20 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-danger/20 outline-none"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-danger font-bold flex items-center gap-1.5 px-1">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </p>
          )}
        </div>

        {/* Confirm */}
        <div className="p-6 pt-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Setting up...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                Continue as {roles.find((r) => r.key === selected)?.label}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
