// src/components/Layout.tsx
import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 fixed w-full top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <span className="text-xl font-semibold text-blue-600">Invexa</span>
          <div className="space-x-4">
            <Link to="/" className="text-gray-700 hover:text-blue-600">Inicio</Link>
            <Link to="/inventory" className="text-gray-700 hover:text-blue-600">Inventario</Link>
            {/* <Link to="/stats" className="text-gray-700 hover:text-blue-600">Estadísticas</Link> */}
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

