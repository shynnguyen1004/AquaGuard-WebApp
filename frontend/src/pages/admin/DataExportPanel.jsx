import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "../../config/firebase";
import { getStoredToken } from "../../utils/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

// Datasets served by the backend as CSV. `flood_zones` is handled client-side
// (it lives in Firebase, not Postgres) and appended below.
const DATASETS = [
  { key: "users", label: "Users", icon: "group", source: "backend", desc: "All accounts — citizens, rescuers, admins (id, role, contact, created)." },
  { key: "rescue_requests", label: "SOS requests", icon: "emergency", source: "backend", desc: "Every rescue request: status, urgency, coordinates, timing." },
  { key: "user_locations", label: "User locations", icon: "location_on", source: "backend", desc: "Last-known GPS position per user." },
  { key: "rescue_groups", label: "Rescue teams", icon: "groups", source: "backend", desc: "Rescue groups: name, status, creator." },
  { key: "rescue_group_members", label: "Team members", icon: "badge", source: "backend", desc: "Which user belongs to which team, and their role." },
  { key: "rescue_request_logs", label: "Request logs", icon: "history", source: "backend", desc: "Status-change history (audit trail) for SOS requests." },
  { key: "audit_logs", label: "Audit logs", icon: "shield", source: "backend", desc: "Admin/system actions with before/after + IP." },
  { key: "analytics_summary", label: "Analytics summary", icon: "insights", source: "backend", desc: "Aggregated totals (users, requests, teams, avg response)." },
  { key: "flood_zones", label: "Flood zones", icon: "flood", source: "firebase", desc: "Admin-drawn flood zones (Firebase): severity, water level, coordinates." },
];

// ── Client-side CSV helpers (mirror the backend's, incl. UTF-8 BOM) ──
function csvCell(v) {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
function buildCsv(headers, rows) {
  const head = headers.map(csvCell).join(",");
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  return "﻿" + head + (rows.length ? "\r\n" + body : "") + "\r\n";
}
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function filenameFromRes(res, fallback) {
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename="?([^"]+)"?/);
  return m ? m[1] : fallback;
}

export default function DataExportPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [anonymize, setAnonymize] = useState(false);
  const [busy, setBusy] = useState(null); // dataset key or "all" currently running
  const [error, setError] = useState("");

  const buildQs = () => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (anonymize) qs.set("anonymize", "1");
    return qs.toString();
  };

  const downloadBackend = async (key) => {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/export/${key}?${buildQs()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Export "${key}" failed (${res.status})`);
    triggerDownload(await res.blob(), filenameFromRes(res, `aquaguard_${key}.csv`));
  };

  const downloadFloodZones = async () => {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "flood_zones"));
    let rows = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        name: x.name || "",
        severity: x.severity || "",
        water_level: x.water_level ?? "",
        latitude: x.location?.latitude ?? x.location?.lat ?? "",
        longitude: x.location?.longitude ?? x.location?.lng ?? "",
        updatedAt: x.updatedAt || "",
      };
    });
    if (from) rows = rows.filter((r) => !r.updatedAt || r.updatedAt >= from);
    if (to) rows = rows.filter((r) => !r.updatedAt || r.updatedAt <= `${to}T23:59:59`);
    if (anonymize) {
      rows = rows.map((r) => ({
        ...r,
        latitude: r.latitude === "" ? "" : Number(r.latitude).toFixed(2),
        longitude: r.longitude === "" ? "" : Number(r.longitude).toFixed(2),
      }));
    }
    const headers = ["id", "name", "severity", "water_level", "latitude", "longitude", "updatedAt"];
    const csv = buildCsv(headers, rows.map((r) => headers.map((h) => r[h])));
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `aquaguard_flood_zones${anonymize ? "_anon" : ""}_${stamp}.csv`
    );
  };

  const runOne = (ds) => (ds.source === "firebase" ? downloadFloodZones() : downloadBackend(ds.key));

  const handle = async (ds) => {
    setError("");
    setBusy(ds.key);
    try {
      await runOne(ds);
    } catch (e) {
      console.error(e);
      setError(e.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setError("");
    setBusy("all");
    try {
      for (const ds of DATASETS) {
        await runOne(ds);
        await new Promise((r) => setTimeout(r, 400)); // stagger so the browser accepts each file
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-700/30 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">From date</label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">To date</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">Leave dates blank to export everything. The range filters each dataset by its date column (created/updated).</p>

        {/* Anonymize toggle */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={anonymize}
            onChange={(e) => setAnonymize(e.target.checked)}
            className="mt-0.5 size-4 rounded accent-primary cursor-pointer"
          />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">Anonymize personal data</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Removes names, phone numbers, emails, IPs and free-text (descriptions/notes); rounds GPS to ~1&nbsp;km; keeps birth year only.
              Numeric IDs are preserved so datasets still join. Recommended before sharing or publishing.
            </span>
          </span>
        </label>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-slate-400">
            {anonymize ? "Exports will be anonymized." : "Exports include full personal data — for authorized internal use."}
          </p>
          <button
            onClick={downloadAll}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${busy === "all" ? "animate-spin" : ""}`}>
              {busy === "all" ? "progress_activity" : "download_for_offline"}
            </span>
            Download all (CSV)
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-sm text-danger font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}
      </div>

      {/* Dataset cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {DATASETS.map((ds) => (
          <div key={ds.key} className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/30 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary filled-icon">{ds.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold flex items-center gap-1.5">
                  {ds.label}
                  {ds.source === "firebase" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">Firebase</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{ds.desc}</p>
              </div>
            </div>
            <button
              onClick={() => handle(ds)}
              disabled={busy !== null}
              className="mt-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${busy === ds.key ? "animate-spin" : ""}`}>
                {busy === ds.key ? "progress_activity" : "download"}
              </span>
              Download CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
