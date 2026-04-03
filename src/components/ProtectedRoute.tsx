import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#B7FF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
