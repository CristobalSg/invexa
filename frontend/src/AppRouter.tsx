import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { getDeviceToken, getSetupStatus } from "./services/authService";

const LoginPage = lazy(() => import("./pages/auth/Login"));
const ProfilesPage = lazy(() => import("./pages/auth/ProfilesPage"));
const SetupAdminPage = lazy(() => import("./pages/auth/SetupAdminPage"));
const Home = lazy(() => import("./pages/Home"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const CajaPage = lazy(() => import("./pages/CajaPage"));
const VentasPage = lazy(() => import("./pages/VentasPage"));
const ComprasPage = lazy(() => import("./pages/ComprasPage"));
const CatalogosPage = lazy(() => import("./pages/CatalogosPage"));
const OfertasPage = lazy(() => import("./pages/OfertasPage"));
const UsuariosPage = lazy(() => import("./pages/UsuariosPage"));

const pageFallback = (
  <div className="setup-screen">
    <div className="setup-form max-w-md">
      <p className="text-sm font-bold text-[#5f626b]">Cargando pantalla...</p>
    </div>
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={pageFallback}>
        <SetupAwareRoutes />
      </Suspense>
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
