import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return children;
}
