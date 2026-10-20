import { NavLink, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useState } from "react";
import {
  ArrowPathIcon,
  ArrowLeftOnRectangleIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  CursorArrowRaysIcon,
  MoonIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SunIcon,
  TagIcon,
  UserGroupIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { getStoredUser, logout } from "../services/authService";
import {
  getStoredShowCursor,
  getStoredTheme,
  setStoredShowCursor,
  setStoredTheme,
  type ThemeMode,
} from "../services/themeService";
import {
  DEFAULT_POS_SHORTCUTS,
  getStoredPosShortcuts,
  isAllowedPosShortcut,
  setStoredPosShortcuts,
  type PosShortcuts,
} from "../services/posPreferencesService";

const sidebarLinkClass = () => ({ isActive }: { isActive: boolean }) =>
  `flowly-nav-item ${isActive ? "active" : ""}`;

export default function Layout() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [showCursor, setShowCursor] = useState(() => getStoredShowCursor());
  const [posShortcuts, setPosShortcuts] = useState<PosShortcuts>(() => getStoredPosShortcuts());
  const [shortcutError, setShortcutError] = useState("");
  const user = getStoredUser();
  const isOwner = user?.rol === "OWNER";
  const iconClass = "h-5 w-5 shrink-0";

  const handleLogout = () => {
    logout();
    navigate("/perfiles");
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  const handleToggleCursor = () => {
    const nextShowCursor = !showCursor;
    setShowCursor(nextShowCursor);
    setStoredShowCursor(nextShowCursor);
  };

  const handleShortcutChange = (field: keyof PosShortcuts, value: string) => {
    if (!isAllowedPosShortcut(value)) {
      setShortcutError("Usa un símbolo o una tecla entre F1 y F12.");
      return;
    }

    const next = { ...posShortcuts, [field]: value };
    if (next.cart === next.checkout) {
      setShortcutError("Cada acción debe usar una tecla distinta.");
      return;
    }

    setShortcutError("");
    setPosShortcuts(next);
    setStoredPosShortcuts(next);
  };

  const handleResetShortcuts = () => {
    setShortcutError("");
    setPosShortcuts(DEFAULT_POS_SHORTCUTS);
    setStoredPosShortcuts(DEFAULT_POS_SHORTCUTS);
  };

  const links = [
    { to: "/", label: "POS", icon: ShoppingCartIcon, visible: true },
    { to: "/productos", label: "Productos", icon: CubeIcon, visible: true },
    { to: "/caja", label: "Caja", icon: WalletIcon, visible: true },
    { to: "/ventas", label: "Ventas", icon: ShoppingBagIcon, visible: true },
    { to: "/compras", label: "Compras", icon: ClipboardDocumentListIcon, visible: true },
    { to: "/catalogos", label: "Catálogos", icon: BookOpenIcon, visible: isOwner },
    { to: "/catalogos/ofertas", label: "Ofertas", icon: TagIcon, visible: isOwner },
    { to: "/usuarios", label: "Administración", icon: UserGroupIcon, visible: isOwner },
    { to: "/reportes", label: "Reportes", icon: ChartBarIcon, visible: isOwner },
  ];
  const mainLinks = links.filter((link) => ["POS", "Ventas", "Caja"].includes(link.label));
  const inventoryLinks = links.filter((link) => ["Productos", "Compras", "Catálogos", "Ofertas", "Administración", "Reportes"].includes(link.label));

  return (
    <div className={`flowly-shell ${theme === "dark" ? "dark" : ""}`}>
      <aside className={`flowly-sidebar hidden lg:block ${isOpen ? "" : "collapsed"}`} aria-label="Navegación principal">
        <div className="flowly-brand">
          <button
            type="button"
            onClick={() => {
              if (!isOpen) setIsOpen(true);
            }}
            className="flowly-logo"
            aria-label={isOpen ? "Invexa" : "Abrir sidebar"}
            title={isOpen ? "Invexa" : "Abrir sidebar"}
          />
          <div className="flowly-brand-copy">
            <strong>Invexa</strong>
            <span>{user ? `${user.nombre} · ${user.rol}` : "Point of Sale"}</span>
          </div>
          {isOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flowly-collapse"
              aria-label="Cerrar sidebar"
              aria-expanded={isOpen}
              title="Cerrar sidebar"
            >
              <ChevronRightIcon className={iconClass} />
            </button>
          )}
        </div>

        <div className="flowly-separator" />

        <nav className="flowly-nav">
          <div className="flowly-nav-section">
            <div className="flowly-section-title">MAIN</div>
            {mainLinks.filter((link) => link.visible).map((link) => {
              const Icon = link.icon;

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  className={sidebarLinkClass()}
                  title={link.label}
                  aria-label={link.label}
                  data-label={link.label}
                >
                  <span className="flowly-nav-icon"><Icon /></span>
                  <span className="flowly-nav-label">{link.label}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="flowly-nav-section">
            <div className="flowly-section-title">INVENTARIO</div>
            {inventoryLinks.filter((link) => link.visible).map((link) => {
              const Icon = link.icon;

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  className={sidebarLinkClass()}
                  title={link.label}
                  aria-label={link.label}
                  data-label={link.label}
                >
                  <span className="flowly-nav-icon"><Icon /></span>
                  <span className="flowly-nav-label">{link.label}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="flowly-nav-section flowly-nav-support">
            <div className="flowly-section-title">SOPORTE</div>
            <Menu as="div" className="flowly-settings-menu">
              <MenuButton
                className="flowly-nav-item"
                aria-label="Configuración"
                title="Configuración"
              >
                <span className="flowly-nav-icon"><Cog6ToothIcon /></span>
                <span className="flowly-nav-label">Configuración</span>
              </MenuButton>
              <MenuItems anchor="right end" className="flowly-settings-panel">
                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={handleToggleTheme}
                      className={`flowly-settings-option ${focus ? "active" : ""}`}
                    >
                      <span className="flowly-settings-option-icon">
                        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                      </span>
                      <span>
                        <strong>Modo noche</strong>
                        <small>{theme === "dark" ? "Activado" : "Desactivado"}</small>
                      </span>
                      <span className={`flowly-switch ${theme === "dark" ? "on" : ""}`} aria-hidden="true" />
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      type="button"
                      onClick={handleToggleCursor}
                      className={`flowly-settings-option ${focus ? "active" : ""}`}
                    >
                      <span className="flowly-settings-option-icon"><CursorArrowRaysIcon /></span>
                      <span>
                        <strong>Ver mouse</strong>
                        <small>{showCursor ? "Visible" : "Oculto"}</small>
                      </span>
                      <span className={`flowly-switch ${showCursor ? "on" : ""}`} aria-hidden="true" />
                    </button>
                  )}
                </MenuItem>
                <div className="flowly-settings-shortcuts" onKeyDown={(event) => event.stopPropagation()}>
                  <div className="flowly-settings-shortcuts-title">
                    <span className="flowly-settings-option-icon"><CommandLineIcon /></span>
                    <span>
                      <strong>Atajos del POS</strong>
                      <small>Haz clic y escribe una tecla</small>
                    </span>
                  </div>
                  <label>
                    <span>Carrito</span>
                    <input
                      aria-label="Tecla para abrir el carrito"
                      data-pos-shortcut-input="true"
                      value={posShortcuts.cart}
                      readOnly
                      onKeyDown={(event) => {
                        event.preventDefault();
                        handleShortcutChange("cart", event.key);
                      }}
                    />
                  </label>
                  <label>
                    <span>Finalizar venta</span>
                    <input
                      aria-label="Tecla para finalizar la venta"
                      data-pos-shortcut-input="true"
                      value={posShortcuts.checkout}
                      readOnly
                      onKeyDown={(event) => {
                        event.preventDefault();
                        handleShortcutChange("checkout", event.key);
                      }}
                    />
                  </label>
                  {shortcutError && <p>{shortcutError}</p>}
                  <button type="button" onClick={handleResetShortcuts} className="flowly-settings-reset">
                    <ArrowPathIcon /> Restablecer
                  </button>
                </div>
              </MenuItems>
            </Menu>
            <button
              type="button"
              onClick={handleLogout}
              className="flowly-nav-item flowly-nav-danger"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <span className="flowly-nav-icon"><ArrowLeftOnRectangleIcon /></span>
              <span className="flowly-nav-label">Cerrar sesión</span>
            </button>
          </div>
        </nav>
      </aside>

      <div className="rounded-3xl border border-white bg-white px-4 py-3 shadow-sm lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-gray-900">Invexa</p>
            {user && <p className="text-xs text-gray-500">{user.nombre} · {user.rol}</p>}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
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
              <NavLink key={link.to} to={link.to} end className="flex h-11 items-center gap-2 rounded-xl bg-gray-50 px-3 text-sm font-semibold">
                <Icon className={iconClass} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <main className="flowly-page">
        <div className="flowly-outlet">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
