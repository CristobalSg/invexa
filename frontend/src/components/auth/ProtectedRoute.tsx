// src/components/auth/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { getDeviceToken, getStoredUser } from "../../services/authService";
import type { UserRole } from "../../types/api";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to={getDeviceToken() ? "/perfiles" : "/login"} replace />;
  }

  const user = getStoredUser();
  if (roles && (!user || !roles.includes(user.rol))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
