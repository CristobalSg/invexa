import { NavLink, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../services/authService";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

export default function Layout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const isOwner = user?.rol === "OWNER";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-screen-2xl mx-auto">
          <div>
            <span className="text-xl font-semibold text-blue-700">Invexa</span>
            {user && <span className="ml-3 text-sm text-gray-500">{user.nombre} · {user.rol}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NavLink to="/" className={linkClass}>POS</NavLink>
            <NavLink to="/productos" className={linkClass}>Productos</NavLink>
            <NavLink to="/caja" className={linkClass}>Caja</NavLink>
            <NavLink to="/ventas" className={linkClass}>Ventas</NavLink>
            {isOwner && <NavLink to="/compras" className={linkClass}>Compras</NavLink>}
            {isOwner && <NavLink to="/catalogos" className={linkClass}>Catálogos</NavLink>}
            {isOwner && <NavLink to="/usuarios" className={linkClass}>Usuarios</NavLink>}
            {isOwner && <NavLink to="/reportes" className={linkClass}>Reportes</NavLink>}
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-md font-semibold"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="px-4 py-6 max-w-screen-2xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
}
