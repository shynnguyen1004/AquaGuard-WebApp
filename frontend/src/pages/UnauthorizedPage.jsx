import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getRoleLabel } from "../config/rbac";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="text-center max-w-md px-6">
        {/* Icon */}
        <div className="size-20 mx-auto rounded-2xl bg-danger/10 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined filled-icon text-danger text-4xl">
            lock
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-2">
          Access Denied
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          You don't have permission to view this page.
          {role && (
            <>
              {" "}Your current role is{" "}
              <span className="font-bold text-primary">{getRoleLabel(role)}</span>.
            </>
          )}
        </p>

        <button
          onClick={() => navigate("/", { replace: true })}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">home</span>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
