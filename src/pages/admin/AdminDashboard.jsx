import { useState, useEffect } from "react";
import { ROLES, getRoleLabel, getRoleBadgeClasses } from "../../config/rbac";
import { useAuth } from "../../contexts/AuthContext";
import AdminFloodMapEditor from "../../components/map/AdminFloodMapEditor";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const TABS = [
  { key: "overview", label: "Overview", icon: "dashboard" },
  { key: "rescuers", label: "Rescue Teams", icon: "local_fire_department" },
  { key: "requests", label: "SOS Requests", icon: "emergency" },
  { key: "map", label: "Flood Map", icon: "map" },
];

// Map sidebar page names to internal tab keys
const SIDEBAR_TO_TAB = {
  "admin-users": "users",
  "admin-teams": "rescuers",
  "admin-sensors": "overview",
  "admin-analytics": "overview",
  "admin": "overview",
};

function StatCard({ icon, label, value, color, bgColor }) {
  return (
    <div className={`${bgColor} rounded-2xl p-5 border border-slate-100 dark:border-slate-700/30`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`size-10 rounded-xl bg-white/60 dark:bg-white/5 flex items-center justify-center`}>
          <span className={`material-symbols-outlined filled-icon ${color}`}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{label}</p>
    </div>
  );
}

function UserRow({ userData, onRoleChange }) {
  const [changingRole, setChangingRole] = useState(false);

  const handleRoleChange = async (newRole) => {
    setChangingRole(true);
    try {
      await onRoleChange(userData.id, newRole);
    } finally {
      setChangingRole(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/30">
      <div className="flex items-center gap-3 min-w-0">
        <img
          alt={userData.displayName}
          className="size-10 rounded-full border-2 border-primary/20 object-cover flex-shrink-0"
          src={
            userData.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || "User")}&background=11a0b6&color=fff`
          }
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{userData.displayName || "Unknown"}</p>
          <p className="text-xs text-slate-500 truncate">{userData.phoneNumber || userData.email || "No contact"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getRoleBadgeClasses(userData.role)}`}>
          {getRoleLabel(userData.role)}
        </span>
        <select
          disabled={changingRole}
          value={userData.role || ROLES.CITIZEN}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50"
        >
          <option value={ROLES.CITIZEN}>Citizen</option>
          <option value={ROLES.RESCUER}>Rescuer</option>
          <option value={ROLES.ADMIN}>Admin</option>
        </select>
      </div>
    </div>
  );
}

export default function AdminDashboard({ activePage = "admin" }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => SIDEBAR_TO_TAB[activePage] || "overview");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [rescueRequests, setRescueRequests] = useState([]);

  // Sync internal tab when sidebar page changes
  useEffect(() => {
    const mapped = SIDEBAR_TO_TAB[activePage];
    if (mapped) setActiveTab(mapped);
  }, [activePage]);

  // Determine if a sub-page was directly navigated from sidebar
  const isSidebarSubPage = activePage !== "admin";

  // Fetch all users from PostgreSQL backend
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/auth/users`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch rescue requests
  const fetchRequests = async () => {
    try {
      const db = getFirebaseDb();
      const snapshot = await getDocs(collection(db, "rescue_requests"));
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRescueRequests(list);
    } catch (err) {
      console.error("Failed to fetch rescue requests:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRequests();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const stats = {
    totalUsers: users.length,
    citizens: users.filter((u) => u.role === ROLES.CITIZEN).length,
    rescuers: users.filter((u) => u.role === ROLES.RESCUER).length,
    admins: users.filter((u) => u.role === ROLES.ADMIN).length,
    pendingRequests: rescueRequests.filter((r) => r.status === "pending").length,
    activeRequests: rescueRequests.filter((r) => r.status === "assigned" || r.status === "in_progress").length,
    resolvedRequests: rescueRequests.filter((r) => r.status === "resolved").length,
  };

  const rescuers = users.filter((u) => u.role === ROLES.RESCUER);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined filled-icon text-danger text-2xl">admin_panel_settings</span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage users, rescue teams, and monitor system status
          </p>
        </div>

        {/* Tabs — hide when navigated from sidebar sub-page */}
        {!isSidebarSubPage && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="group" label="Total Users" value={stats.totalUsers} color="text-primary" bgColor="bg-primary/10" />
              <StatCard icon="person" label="Citizens" value={stats.citizens} color="text-safe" bgColor="bg-safe/10" />
              <StatCard icon="local_fire_department" label="Rescuers" value={stats.rescuers} color="text-warning" bgColor="bg-warning/10" />
              <StatCard icon="emergency" label="Pending SOS" value={stats.pendingRequests} color="text-danger" bgColor="bg-danger/10" />
            </div>

            {/* Quick summary cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/30">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">monitoring</span>
                  System Status
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Active Rescuers", value: stats.rescuers, icon: "local_fire_department", color: "text-warning" },
                    { label: "Active SOS", value: stats.activeRequests, icon: "emergency", color: "text-danger" },
                    { label: "Resolved Today", value: stats.resolvedRequests, icon: "check_circle", color: "text-safe" },
                    { label: "System Admins", value: stats.admins, icon: "admin_panel_settings", color: "text-primary" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-base ${item.color}`}>{item.icon}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/30">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-warning">local_fire_department</span>
                  Rescue Teams
                </h3>
                {rescuers.length === 0 ? (
                  <p className="text-sm text-slate-400">No rescuers registered yet</p>
                ) : (
                  <div className="space-y-3">
                    {rescuers.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center gap-3">
                        <img
                          alt={r.displayName}
                          className="size-8 rounded-full border border-warning/30 object-cover"
                          src={r.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.displayName || "R")}&background=f59e0b&color=fff`}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-sm font-medium">{r.displayName || "Unknown"}</p>
                          <p className="text-xs text-slate-500">{r.phoneNumber || r.email || ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">All Users ({users.length})</h2>
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-base ${loadingUsers ? "animate-spin" : ""}`}>refresh</span>
                Refresh
              </button>
            </div>
            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <div className="size-8 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">group_off</span>
                <p className="text-sm text-slate-400 mt-2">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <UserRow key={u.id} userData={u} onRoleChange={handleRoleChange} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "rescuers" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Rescue Teams ({rescuers.length})</h2>
            {rescuers.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">local_fire_department</span>
                <p className="text-sm text-slate-400 mt-2">No rescuers registered yet</p>
                <p className="text-xs text-slate-400 mt-1">Assign the Rescuer role to users from the Users tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rescuers.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/30">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        alt={r.displayName}
                        className="size-12 rounded-full border-2 border-warning/30 object-cover"
                        src={r.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.displayName || "R")}&background=f59e0b&color=fff`}
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-bold">{r.displayName || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{r.phoneNumber || r.email || ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-warning/10 text-warning border-warning/20">
                        <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
                        Rescuer
                      </span>
                      {r.createdAt && (
                        <span className="text-[10px] text-slate-400">
                          Since {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">SOS Requests ({rescueRequests.length})</h2>
            {rescueRequests.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">emergency</span>
                <p className="text-sm text-slate-400 mt-2">No rescue requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rescueRequests.map((req) => (
                  <div key={req.id} className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/30 flex items-start gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      req.status === "pending" ? "bg-warning/10" : req.status === "resolved" ? "bg-safe/10" : "bg-primary/10"
                    }`}>
                      <span className={`material-symbols-outlined filled-icon ${
                        req.status === "pending" ? "text-warning" : req.status === "resolved" ? "text-safe" : "text-primary"
                      }`}>
                        {req.status === "pending" ? "schedule" : req.status === "resolved" ? "check_circle" : "local_shipping"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{req.description || "No description"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{req.location || "Unknown location"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          req.status === "pending"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : req.status === "resolved"
                              ? "bg-safe/10 text-safe border-safe/20"
                              : "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          {req.status || "unknown"}
                        </span>
                        {req.assignedTo && (
                          <span className="text-[10px] text-slate-400">
                            Assigned to: {req.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Live Flood Map Editor</h2>
                <p className="text-xs text-slate-500">Manage flood zones and severity levels across the region</p>
              </div>
            </div>
            <AdminFloodMapEditor />
          </div>
        )}
      </div>
    </div>
  );
}
