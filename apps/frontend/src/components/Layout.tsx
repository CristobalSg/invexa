// src/components/Layout.tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 fixed w-full top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <span className="text-xl font-semibold text-blue-600">Invexa</span>
          <div className="space-x-4">
            <Link to="/" className="text-gray-700 hover:text-blue-600">Inicio</Link>
            <Link to="/products" className="text-gray-700 hover:text-blue-600">Productos</Link>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="pt-16 px-4 max-w-screen-xl mx-auto">
        {children}
      </div>
    </div>
  );
}
