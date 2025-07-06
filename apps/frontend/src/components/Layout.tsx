// src/components/Layout.tsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import React from "react";

export default function Layout() {
  const navigate = useNavigate();
  const [isLogged, setIsLogged] = React.useState(!!localStorage.getItem("token"));

  React.useEffect(() => {
    const checkToken = () => setIsLogged(!!localStorage.getItem("token"));
    checkToken();
    window.addEventListener("storage", checkToken);
    window.addEventListener("focus", checkToken);
    return () => {
      window.removeEventListener("storage", checkToken);
      window.removeEventListener("focus", checkToken);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLogged(false);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 fixed w-full top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <span className="text-xl font-semibold text-blue-600">Invexa</span>
          <div className="space-x-4 flex items-center">
            <Link to="/" className="text-gray-700 hover:text-blue-600">Inicio</Link>
            <Link to="/inventory" className="text-gray-700 hover:text-blue-600">Inventario</Link>
            {isLogged ? (
              <button
                onClick={handleLogout}
                className="ml-4 text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Cerrar sesión
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="ml-4 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Ingresar
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="pt-16 px-4 max-w-screen-xl mx-auto">
        <div className="min-h-screen bg-gray-100 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

