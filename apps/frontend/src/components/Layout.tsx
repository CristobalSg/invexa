// src/components/Layout.tsx
import { Link, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  return (
    <div className="min-h-screen from-purple-900 via-indigo-800 to-indigo-500 bg-gradient-to-br">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 fixed w-full top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <span className="text-xl font-semibold text-blue-600">Invexa</span>
          <div className="space-x-4">
            <Link to="/" className="text-gray-700 hover:text-blue-600">Inicio</Link>
            <Link to="/inventory" className="text-gray-700 hover:text-blue-600">Inventario</Link>
            {/* <Link to="/stats" className="text-gray-700 hover:text-blue-600">Estadísticas</Link> */}
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 font-semibold ml-4"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="pt-16 pb-8 px-4 max-w-screen-xl mx-auto">
        <div className="min-h-screen bg-gray-100 p-6 rounded-lg">
          <Outlet />
        </div>
      </div>

      <div className="bg-gray-100">
        <div className="max-w-screen-lg py-10 px-4 sm:px-6 text-gray-800 sm:flex justify-between mx-auto">
            <div className="p-5 sm:w-2/12 ">
                <div className="text-sm uppercase text-indigo-600 font-bold">Menu</div>
                <ul>
                    <li className="my-2">
                        <a className="hover:text-indigo-600" href="/">Home</a>
                    </li>
                    <li className="my-2">
                        <a className="hover:text-indigo-600" href="/inventory">Inventory</a>
                    </li>
                    <li className="my-2">
                        <a className="hover:text-indigo-600" href="/register">Registro</a>
                    </li>
                </ul>
            </div>
            <div className="p-5 sm:w-7/12  text-center">
                <h3 className="font-bold text-xl text-indigo-600 mb-4">Componentity</h3>
                <p className="text-gray-500 text-sm mb-10">Lorem Ipsum is simply dummy text of the printing and typesetting
                    industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.</p>
            </div>
            <div className="p-5 sm:w-3/12">
                <div className="text-sm uppercase text-indigo-600 font-bold">Contact Us</div>
                <ul>
                    <li className="my-2">
                        <a className="hover:text-indigo-600" href="#">XXX XXXX, Floor 4 San Francisco, CA</a>
                    </li>
                    <li className="my-2">
                        <a className="hover:text-indigo-600" href="#">contact@company.com</a>
                    </li>
                </ul>
            </div>
        </div>
        <div className="flex py-5 m-auto text-gray-800 text-sm flex-col items-center  max-w-screen-xl">
            <div className="my-5">© Copyright 2023. All Rights Reserved.</div>
        </div>
    </div>
    </div>
  );
}

