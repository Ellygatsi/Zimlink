import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="overline">Checking admin access…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!user.is_admin) {
    return (
      <div className="nb-card p-6 bg-white">
        <h1 className="text-3xl font-black">Admin access required.</h1>
        <p className="text-sm text-neutral-600 mt-2">You are logged in, but this account is not marked as admin.</p>
        <p className="text-xs mt-4">Current account: <strong>{user.email}</strong></p>
      </div>
    );
  }

  return children;
}
