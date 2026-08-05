import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label, Field} from "@headlessui/react";
import { ComputerDesktopIcon, UserIcon } from "@heroicons/react/20/solid";
import { authorizeDevice, getDeviceToken } from "../../services/authService";

export default function LoginForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ nombre_usuario: string; contraseña: string; nombre_dispositivo: string }>({
    defaultValues: {
      nombre_dispositivo: window.navigator.platform ? `Caja ${window.navigator.platform}` : "Caja POS",
    },
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (getDeviceToken()) {
      navigate("/perfiles", { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (data: { nombre_usuario: string; contraseña: string; nombre_dispositivo: string }) => {
    try {
      await authorizeDevice(data);
      setMessage("Equipo autorizado");
      navigate("/perfiles");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo autorizar el equipo");
    }
  };

  return (
    <div className="w-full max-w-lg px-10 py-8 mx-auto bg-white border rounded-lg shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
        <ComputerDesktopIcon className="h-6 w-6 text-blue-600" /> Autorizar equipo
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field>
          <Label className="block text-sm font-medium text-gray-700">Nombre del equipo</Label>
          <input
            type="text"
            {...register("nombre_dispositivo", { required: true })}
            className="block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.nombre_dispositivo && <p className="text-sm text-red-500 mt-1">Campo requerido</p>}
        </Field>

        <Field>
          <Label className="block text-sm font-medium text-gray-700">Usuario administrador</Label>
          <div className="mt-1 relative">
            <input
              type="text"
              {...register("nombre_usuario", { required: true })}
              className="block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <UserIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          {errors.nombre_usuario && <p className="text-sm text-red-500 mt-1">Campo requerido</p>}
        </Field>

        <Field>
          <Label className="block text-sm font-medium text-gray-700">Contraseña</Label>
          <input
            type="password"
            {...register("contraseña", { required: true })}
            className="block w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.contraseña && <p className="text-sm text-red-500 mt-1">Campo requerido</p>}
        </Field>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Autorizar este PC
        </button>

        {message && <p className="text-sm text-center mt-4 text-gray-600">{message}</p>}
      </form>
    </div>
  );
}
