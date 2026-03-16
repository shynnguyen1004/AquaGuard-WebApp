import { useState, useEffect } from "react";
import { collection, addDoc, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { getFirebaseDb } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import RescueRequestForm from "../../components/rescue/RescueRequestForm";

const STATUS_CONFIG = {
  pending:     { label: "Pending",     icon: "schedule",        color: "text-warning",  bg: "bg-warning/10", border: "border-warning/20" },
  assigned:    { label: "Assigned",    icon: "person_search",   color: "text-primary",  bg: "bg-primary/10", border: "border-primary/20" },
  in_progress: { label: "In Progress", icon: "local_shipping",  color: "text-blue-500", bg: "bg-blue-50",    border: "border-blue-200" },
  resolved:    { label: "Resolved",    icon: "check_circle",    color: "text-safe",     bg: "bg-safe/10",    border: "border-safe/20" },
};

const URGENCY_CONFIG = {
  low:      { label: "Low",      color: "text-slate-500", bg: "bg-slate-100" },
  medium:   { label: "Medium",   color: "text-warning",   bg: "bg-warning/10" },
  high:     { label: "High",     color: "text-danger",    bg: "bg-danger/10" },
  critical: { label: "Critical", color: "text-white",     bg: "bg-danger" },
};

export default function CitizenSOSPage() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Real-time listener for current user's requests
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const db = getFirebaseDb();
      const q = query(
        collection(db, "rescue_requests"),
        where("citizenId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMyRequests(data);
        setLoading(false);
      }, (err) => {
        console.warn("Firestore listener error:", err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore not available:", err.message);
      setLoading(false);
    }
  }, [user?.uid]);

  // Submit new SOS request to Firestore
  const handleNewRequest = async (formData) => {
    if (!user?.uid) return;
    setSubmitting(true);
    try {
      const db = getFirebaseDb();
      await addDoc(collection(db, "rescue_requests"), {
        citizenId: user.uid,
        userName: user.displayName || "Citizen",
        userEmail: user.email || "",
        location: formData.location,
        description: formData.description,
        severity: formData.urgency || "medium",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to submit SOS request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-danger filled-icon text-3xl">sos</span>
              SOS Request
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Send a rescue request and track its status in real time
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-danger text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-danger/20 hover:shadow-xl hover:shadow-danger/30"
          >
            <span className="material-symbols-outlined text-lg filled-icon">add_circle</span>
            Send SOS
          </button>
        </div>

        {/* My Requests */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-base">history</span>
            My Requests ({myRequests.length})
          </h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center gap-3 text-slate-400">
                <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading your requests...
              </div>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/30">
              <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-600 mb-4">inbox</span>
              <p className="text-lg font-bold text-slate-400 dark:text-slate-500">No requests yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-600 mt-1">
                Click "Send SOS" to submit your first rescue request
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => {
                const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const urgency = URGENCY_CONFIG[req.severity] || URGENCY_CONFIG.medium;

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-5 hover:shadow-lg transition-shadow"
                  >
                    {/* Top row: status + time */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}>
                        <span className="material-symbols-outlined text-sm filled-icon">{status.icon}</span>
                        {status.label}
                      </span>
                      <span className="text-xs text-slate-400">{formatTime(req.createdAt)}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="material-symbols-outlined text-danger text-base mt-0.5 filled-icon">location_on</span>
                      <p className="text-sm font-semibold">{req.location || "Unknown location"}</p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 ml-6 mb-3 line-clamp-3">
                      {req.description}
                    </p>

                    {/* Bottom: urgency + assigned */}
                    <div className="flex items-center gap-3 ml-6">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgency.bg} ${urgency.color}`}>
                        {urgency.label} urgency
                      </span>
                      {req.assignedTo && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">person</span>
                          Assigned to: {req.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <RescueRequestForm
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            handleNewRequest(data);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
