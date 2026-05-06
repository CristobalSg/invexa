import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import LoginPage from "./pages/auth/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Home from "./pages/Home";
import ProductsPage from "./pages/ProductsPage";
import StatsPage from "./pages/StatsPage";
import CajaPage from "./pages/CajaPage";
import VentasPage from "./pages/VentasPage";
import ComprasPage from "./pages/ComprasPage";
import CatalogosPage from "./pages/CatalogosPage";
import UsuariosPage from "./pages/UsuariosPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

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
              <ProtectedRoute roles={["OWNER"]}>
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
    </BrowserRouter>
  );
}
