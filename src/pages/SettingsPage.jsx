import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getRoleLabel, getRoleBadgeClasses } from "../config/rbac";

const familyMembers = [
  { id: 1, name: "Nguyen Van A", relation: "Father", phone: "0901 234 567", status: "safe", avatar: "NVA" },
  { id: 2, name: "Nguyen Thi B", relation: "Mother", phone: "0901 234 568", status: "safe", avatar: "NTB" },
  { id: 3, name: "Nguyen Van C", relation: "Brother", phone: "0901 234 569", status: "unknown", avatar: "NVC" },
];

const statusColors = {
  safe: "bg-safe text-white",
  danger: "bg-danger text-white",
  unknown: "bg-slate-400 text-white",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({
    displayName: user?.displayName || "User",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    address: "Da Nang, Vietnam",
    emergencyContact: "",
  });
  const [family, setFamily] = useState(familyMembers);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", relation: "", phone: "" });
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

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

  const tabs = [
    { id: "profile", label: "Profile", icon: "person" },
    { id: "family", label: "Family", icon: "group" },
    { id: "appearance", label: "Appearance", icon: "palette" },
  ];

  const handleProfileSave = () => {
    alert("Profile updated successfully!");
  };

  const handleAddFamily = () => {
    if (!newMember.name || !newMember.relation) return;
    setFamily((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...newMember,
        status: "unknown",
        avatar: newMember.name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase(),
      },
    ]);
    setNewMember({ name: "", relation: "", phone: "" });
    setShowAddFamily(false);
  };

  const handleRemoveFamily = (id) => {
    setFamily((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your profile, family, and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
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
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">edit</span>
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Emergency Contact</label>
                <input
                  type="tel"
                  value={profile.emergencyContact}
                  onChange={(e) => setProfile((p) => ({ ...p, emergencyContact: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>
            </div>

            <button
              onClick={handleProfileSave}
              className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Family Tab */}
      {activeTab === "family" && (
        <div className="max-w-2xl space-y-6">
          {/* Family header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Family Members</h3>
              <p className="text-xs text-slate-500 mt-0.5">Track the safety status of your family during emergencies</p>
            </div>
            <button
              onClick={() => setShowAddFamily(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Add Member
            </button>
          </div>

          {/* Add Family Modal */}
          {showAddFamily && (
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-primary/30 p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">person_add</span>
                Add New Family Member
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newMember.name}
                  onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="text"
                  placeholder="Relation (e.g. Sister)"
                  value={newMember.relation}
                  onChange={(e) => setNewMember((p) => ({ ...p, relation: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newMember.phone}
                  onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddFamily}
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddFamily(false); setNewMember({ name: "", relation: "", phone: "" }); }}
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Family List */}
          <div className="space-y-3">
            {family.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
              >
                {/* Avatar */}
                <div className="size-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {member.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.relation}</p>
                  {member.phone && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">call</span>
                      {member.phone}
                    </p>
                  )}
                </div>

                {/* Status */}
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${statusColors[member.status]}`}>
                  {member.status}
                </span>

                {/* Actions */}
                <button
                  onClick={() => handleRemoveFamily(member.id)}
                  className="size-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-danger/10 hover:text-danger flex items-center justify-center text-slate-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}
          </div>

          {family.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
              <p className="text-sm">No family members added yet</p>
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
              Theme
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "light", label: "Light", icon: "light_mode", desc: "Bright and clean" },
                { id: "dark", label: "Dark", icon: "dark_mode", desc: "Easy on the eyes" },
                { id: "system", label: "System", icon: "desktop_windows", desc: "Match device setting" },
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


    </div>
  );
}
