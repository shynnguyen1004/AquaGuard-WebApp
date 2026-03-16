import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/**
 * ProtectedRoute — guards routes by auth status and optionally by role.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.roles] - Allowed roles. If omitted, any authenticated user can access.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, role, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based check
  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
