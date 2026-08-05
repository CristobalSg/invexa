import { NavLink, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TagIcon,
  UserGroupIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getStoredUser, logout } from "../services/authService";

const sidebarLinkClass = (isOpen: boolean) => ({ isActive }: { isActive: boolean }) =>
  `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${
    isOpen ? "justify-start" : "justify-center"
  } ${
    isActive
      ? "bg-blue-600 text-white shadow-sm"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

export default function Layout() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const user = getStoredUser();
  const isOwner = user?.rol === "OWNER";
  const sidebarWidth = isOpen ? "w-64" : "w-20";
  const contentOffset = isOpen ? "lg:pl-64" : "lg:pl-20";
  const iconClass = "h-5 w-5 shrink-0";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = [
    { to: "/", label: "POS", icon: ShoppingCartIcon, visible: true },
    { to: "/productos", label: "Productos", icon: CubeIcon, visible: true },
    { to: "/caja", label: "Caja", icon: WalletIcon, visible: true },
    { to: "/ventas", label: "Ventas", icon: ShoppingBagIcon, visible: true },
    { to: "/compras", label: "Compras", icon: ClipboardDocumentListIcon, visible: true },
    { to: "/catalogos", label: "Catálogos", icon: BookOpenIcon, visible: isOwner },
    { to: "/catalogos/ofertas", label: "Ofertas", icon: TagIcon, visible: isOwner },
    { to: "/usuarios", label: "Usuarios", icon: UserGroupIcon, visible: isOwner },
    { to: "/reportes", label: "Reportes", icon: ChartBarIcon, visible: isOwner },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden border-r border-gray-200 bg-white shadow-sm transition-[width] duration-200 lg:flex ${sidebarWidth}`}
      >
        <div className="flex min-h-0 w-full flex-col px-3 py-4">
          <div className={`flex h-12 items-center ${isOpen ? "justify-between" : "justify-center"}`}>
            {isOpen && (
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold text-blue-700">Invexa</p>
                {user && <p className="truncate text-xs text-gray-500">{user.nombre} · {user.rol}</p>}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label={isOpen ? "Cerrar sidebar" : "Abrir sidebar"}
              title={isOpen ? "Cerrar sidebar" : "Abrir sidebar"}
            >
              {isOpen ? <XMarkIcon className={iconClass} /> : <Bars3Icon className={iconClass} />}
            </button>
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
            {links.filter((link) => link.visible).map((link) => {
              const Icon = link.icon;

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  className={sidebarLinkClass(isOpen)}
                  title={link.label}
                  aria-label={link.label}
                >
                  <Icon className={iconClass} />
                  {isOpen && <span className="truncate">{link.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 ${
                isOpen ? "justify-start" : "justify-center"
              }`}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <ArrowLeftOnRectangleIcon className={iconClass} />
              {isOpen && <span className="truncate">Cerrar sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-blue-700">Invexa</p>
            {user && <p className="text-xs text-gray-500">{user.nombre} · {user.rol}</p>}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-red-700 hover:bg-red-50"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <ArrowLeftOnRectangleIcon className={iconClass} />
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {links.filter((link) => link.visible).map((link) => {
            const Icon = link.icon;

            return (
              <NavLink key={link.to} to={link.to} end className={sidebarLinkClass(true)}>
                <Icon className={iconClass} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <main className={`min-h-screen transition-[padding] duration-200 ${contentOffset}`}>
        <div className="mx-auto max-w-screen-2xl px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
