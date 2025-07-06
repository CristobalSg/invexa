import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Home from "./pages/Home";
import InventoryPage from "./pages/InventoryPage";
import ProductsPage from "./pages/ProductsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas dentro del layout */}
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
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
