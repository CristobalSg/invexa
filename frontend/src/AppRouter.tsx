import { useQuery } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";

import Layout from "./components/Layout";
import LoginPage from "./pages/auth/Login";
import ProfilesPage from "./pages/auth/ProfilesPage";
import SetupAdminPage from "./pages/auth/SetupAdminPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { getDeviceToken, getSetupStatus } from "./services/authService";

import Home from "./pages/Home";
import ProductsPage from "./pages/ProductsPage";
import StatsPage from "./pages/StatsPage";
import CajaPage from "./pages/CajaPage";
import VentasPage from "./pages/VentasPage";
import ComprasPage from "./pages/ComprasPage";
import CatalogosPage from "./pages/CatalogosPage";
import OfertasPage from "./pages/OfertasPage";
import UsuariosPage from "./pages/UsuariosPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <SetupAwareRoutes />
    </BrowserRouter>
  );
}

function SetupAwareRoutes() {
  const location = useLocation();
  const setupStatus = useQuery({
    queryKey: ["setup-status"],
    queryFn: getSetupStatus,
    retry: false,
    staleTime: 15_000,
  });
  const requiresSetup = setupStatus.data?.requiere_setup === true;
  const isSetupRoute = location.pathname === "/setup";

  if (setupStatus.isLoading) {
    return (
      <div className="setup-screen">
        <div className="setup-form max-w-md">
          <p className="text-sm font-bold text-[#5f626b]">Preparando Invexa POS...</p>
        </div>
      </div>
    );
  }

  if (!setupStatus.isError && requiresSetup && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  if (!setupStatus.isError && !requiresSetup && isSetupRoute) {
    return <Navigate to={getDeviceToken() ? "/perfiles" : "/login"} replace />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<SetupAdminPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/perfiles" element={<ProfilesPage />} />

      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caja"
          element={
            <ProtectedRoute>
              <CajaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ventas"
          element={
            <ProtectedRoute>
              <VentasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compras"
          element={
            <ProtectedRoute roles={["OWNER", "CASHIER"]}>
              <ComprasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogos"
          element={
            <ProtectedRoute roles={["OWNER"]}>
              <CatalogosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogos/ofertas"
          element={
            <ProtectedRoute roles={["OWNER"]}>
              <OfertasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={["OWNER"]}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute roles={["OWNER"]}>
              <StatsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
