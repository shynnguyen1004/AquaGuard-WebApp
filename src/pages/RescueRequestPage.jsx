import { useState } from "react";
import RescueRequestCard from "../components/rescue/RescueRequestCard";
import RescueRequestForm from "../components/rescue/RescueRequestForm";

const initialRequests = [
  {
    id: 1,
    userName: "Nguyen Van A",
    userAvatar: "",
    description:
      "Nước ngập tầng 1, gia đình 4 người bị mắc kẹt trên tầng 2. Cần hỗ trợ di chuyển đến nơi an toàn gấp.",
    location: "268 Lý Thường Kiệt, Quận 10, TP.HCM",
    urgency: "critical",
    status: "in_progress",
    assignedTeam: "Rescue Team Alpha",
    timeAgo: "15 min ago",
    images: [
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=200&h=150&fit=crop",
    ],
  },
  {
    id: 2,
    userName: "Tran Thi B",
    userAvatar: "",
    description:
      "Mực nước dâng cao 1.5m, đường bị chia cắt. Có 2 người già cần được di tản khẩn cấp.",
    location: "45 Bui Vien, Quận 1, TP.HCM",
    urgency: "high",
    status: "pending",
    timeAgo: "32 min ago",
    images: [
      "https://images.unsplash.com/photo-1559060017-445fb0722e8b?w=200&h=150&fit=crop",
    ],
  },
  {
    id: 3,
    userName: "Le Van C",
    userAvatar: "",
    description:
      "Cây đổ chặn đường thoát hiểm duy nhất. Cần hỗ trợ dọn dẹp để mở đường thoát.",
    location: "12 Nguyen Hue, Quận 1, TP.HCM",
    urgency: "medium",
    status: "pending",
    timeAgo: "1 hour ago",
    images: [],
  },
  {
    id: 4,
    userName: "Pham Thi D",
    userAvatar: "",
    description:
      "Gia đình 3 người đã được di tản thành công đến điểm trú ẩn Trường THCS Trần Hưng Đạo.",
    location: "78 Phan Xich Long, Phú Nhuận",
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
      "Nước đang rút dần nhưng vẫn còn bị cô lập. 6 người cần lương thực và nước uống.",
    location: "156 Cach Mang Thang Tam, Quận 3",
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
      "Mái nhà bị hư hại nặng do gió bão. Gia đình đã di chuyển sang nhà hàng xóm, cần hỗ trợ vật liệu.",
    location: "34 Le Dai Hanh, Quận 11",
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
      "Khu vực hẻm nhỏ bị ngập sâu 2m. Có khoảng 10 hộ dân cần di tản khẩn cấp.",
    location: "Hẻm 202 Nguyễn Xí, Bình Thạnh",
    urgency: "critical",
    status: "in_progress",
    assignedTeam: "Rescue Team Delta",
    timeAgo: "45 min ago",
    images: [
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=200&h=150&fit=crop",
      "https://images.unsplash.com/photo-1559060017-445fb0722e8b?w=200&h=150&fit=crop",
    ],
  },
  {
    id: 8,
    userName: "Ngo Thi H",
    userAvatar: "",
    description:
      "Đã được giải cứu và đưa về điểm tập trung quận. Cần hỗ trợ y tế cho 1 người bị thương nhẹ.",
    location: "89 Hai Bà Trưng, Quận 1",
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
              Quản lý và theo dõi các yêu cầu cứu hộ
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
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {tab.icon}
              </span>
              {tab.label}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === tab.key
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
              Không có yêu cầu nào
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
              Chưa có yêu cầu cứu hộ nào trong danh mục này
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
