import { useState } from "react";
import RescueRequestCard from "../components/rescue/RescueRequestCard";
import RescueRequestForm from "../components/rescue/RescueRequestForm";

const initialRequests = [
  {
    id: 1,
    userName: "Nguyen Truong Son",
    userAvatar: "",
    description:
      "First floor flooded, family of 4 trapped on second floor. Need urgent evacuation assistance.",
    location: "268 Ly Thuong Kiet, District 10, HCMC",
    urgency: "critical",
    status: "in_progress",
    assignedTeam: "Rescue Team Delta",
    timeAgo: "15 min ago",
    images: [
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=200&h=150&fit=crop",
    ],
  },
  {
    id: 2,
    userName: "Nguyen Minh Quan",
    userAvatar: "",
    description:
      "Water level rose 1.5m, road cut off. 2 elderly people need immediate evacuation.",
    location: "45 Bui Vien, District 1, HCMC",
    urgency: "high",
    status: "pending",
    assignedTeam: "Rescue Team Alpha",
    timeAgo: "32 min ago",
    images: [
      "https://cdn.tienphong.vn/images/45fb2939182052a1a9affe1576b88e79c0d73c1560287970d5114670403ad6c40f2d12a98b34fb9e4f5a00e98dd6d9c9/24.jpg",
    ],
  },
  {
    id: 3,
    userName: "Tran Tuan Nghia",
    userAvatar: "",
    description:
      "Fallen tree blocking the only escape route. Need assistance clearing the path.",
    location: "12 Nguyen Hue, District 1, HCMC",
    urgency: "medium",
    status: "pending",
    assignedTeam: "Rescue Team Gamma",
    timeAgo: "1 hour ago",
    images: [
      "https://baokhanhhoa.vn/file/e7837c02857c8ca30185a8c39b582c03/dataimages/201611/original/images1182686_2.jpg"
    ],
  },
  {
    id: 4,
    userName: "Pham Thi D",
    userAvatar: "",
    description:
      "Family of 3 successfully evacuated to Tran Hung Dao Middle School shelter.",
    location: "78 Phan Xich Long, Phu Nhuan",
    urgency: "high",
    status: "resolved",
    assignedTeam: "Rescue Team Beta",
    timeAgo: "2 hours ago",
    images: [
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&h=150&fit=crop",
    ],
  },
  {
    id: 5,
    userName: "Hoang Van E",
    userAvatar: "",
    description:
      "Water is receding but still isolated. 6 people need food and drinking water.",
    location: "156 Cach Mang Thang Tam, District 3",
    urgency: "medium",
    status: "in_progress",
    assignedTeam: "Rescue Team Gamma",
    timeAgo: "3 hours ago",
    images: [],
  },
  {
    id: 6,
    userName: "Vo Thi F",
    userAvatar: "",
    description:
      "Roof severely damaged by strong winds. Family moved to neighbor's house, need material support.",
    location: "34 Le Dai Hanh, District 11",
    urgency: "low",
    status: "resolved",
    assignedTeam: "Rescue Team Alpha",
    timeAgo: "5 hours ago",
    images: [],
  },
  {
    id: 7,
    userName: "Dang Van G",
    userAvatar: "",
    description:
      "Small alley flooded 2m deep. About 10 households need urgent evacuation.",
    location: "Alley 202 Nguyen Xi, Binh Thanh",
    urgency: "critical",
    status: "in_progress",
    assignedTeam: "Rescue Team Delta",
    timeAgo: "45 min ago",
    images: [
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=200&h=150&fit=crop",
      "https://baokhanhhoa.vn/file/e7837c02857c8ca30185a8c39b582c03/dataimages/201611/original/images1182686_2.jpg",
    ],
  },
  {
    id: 8,
    userName: "Ngo Thi H",
    userAvatar: "",
    description:
      "Rescued and taken to district gathering point. Need medical support for 1 person with minor injuries.",
    location: "89 Hai Ba Trung, District 1",
    urgency: "medium",
    status: "resolved",
    assignedTeam: "Rescue Team Beta",
    timeAgo: "6 hours ago",
    images: [],
  },
];

const tabs = [
  { key: "all", label: "All Requests", icon: "list" },
  { key: "pending", label: "Pending", icon: "schedule" },
  { key: "in_progress", label: "In Progress", icon: "local_shipping" },
  { key: "resolved", label: "Resolved", icon: "check_circle" },
];

export default function RescueRequestPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState(initialRequests);

  const filtered =
    activeTab === "all"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    resolved: requests.filter((r) => r.status === "resolved").length,
  };

  const handleNewRequest = (data) => {
    setRequests((prev) => [
      { id: Date.now(), ...data },
      ...prev,
    ]);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Rescue Requests
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage and track rescue requests
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-danger text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-danger/20 hover:shadow-xl hover:shadow-danger/30"
          >
            <span className="material-symbols-outlined text-lg filled-icon">
              add_circle
            </span>
            New Request
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total",
              value: counts.all,
              icon: "format_list_numbered",
              bg: "bg-slate-100 dark:bg-slate-800",
              iconColor: "text-slate-500",
            },
            {
              label: "Pending",
              value: counts.pending,
              icon: "schedule",
              bg: "bg-warning/10",
              iconColor: "text-warning",
            },
            {
              label: "In Progress",
              value: counts.in_progress,
              icon: "local_shipping",
              bg: "bg-primary/10",
              iconColor: "text-primary",
            },
            {
              label: "Resolved",
              value: counts.resolved,
              icon: "check_circle",
              bg: "bg-safe/10",
              iconColor: "text-safe",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-slate-700/30`}
            >
              <div
                className={`size-10 rounded-xl bg-white/60 dark:bg-white/5 flex items-center justify-center`}
              >
                <span
                  className={`material-symbols-outlined filled-icon ${stat.iconColor}`}
                >
                  {stat.icon}
                </span>
              </div>
              <div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.key
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:text-primary"
                }`}
            >
              <span className="material-symbols-outlined text-base">
                {tab.icon}
              </span>
              {tab.label}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.key
                  ? "bg-white/20"
                  : "bg-slate-100 dark:bg-slate-700"
                  }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Request List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              inbox
            </span>
            <p className="text-lg font-bold text-slate-400 dark:text-slate-500">
              No requests found
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
              There are no rescue requests in this category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((request) => (
              <RescueRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <RescueRequestForm
          onClose={() => setShowForm(false)}
          onSubmit={handleNewRequest}
        />
      )}
    </div>
  );
}
