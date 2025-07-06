import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import { Label, Field} from "@headlessui/react";
import { UserIcon } from "@heroicons/react/20/solid";

type RegisterFormInputs = {
  companyName: string;
  username: string;
  password: string;
  name: string;
  email: string;
};

export default function RegisterForm() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>();

  const [message, setMessage] = useState("");

  const onSubmit = async (data: RegisterFormInputs) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        data
      );
      const token = res.data.token;
      localStorage.setItem("token", token);
      setMessage("Registro exitoso");
      navigate("/");
    } catch (error: any) {
      console.error(error);
      setMessage(error.response?.data?.message || "Error al registrar usuario");
    }
  };

  return (
    // <div className="max-w-md mx-auto mt-16 bg-white p-8 shadow-xl rounded-xl">
    <div className="w-full max-w-lg px-10 py-8 mx-auto bg-white border rounded-lg shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
        Registro de Usuario
      </h2>
    {/* <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow bg-white">
      <h2 className="text-2xl font-bold mb-4 text-center">Registro de Usuario</h2> */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Nombre de la empresa</Label>
            <input
              id="companyName"
              type="text"
              {...register("companyName", { required: true })}
              // className="mt-1 w-full border p-2 rounded"
              className="block w-full p-3 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.companyName && <p className="text-red-500 text-sm">Campo requerido</p>}
          </div>
        </Field>

        <Field>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Nombre de usuario</Label>
          <div className="mt-1 relative">
            <input
              id="username"
              type="text"
              {...register("username", { required: true })}
              className="block w-full p-3 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            <UserIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
            {errors.username && <p className="text-red-500 text-sm">Campo requerido</p>}
            </div>
          </div>
        </Field>

        <Field>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Contraseña</Label>
            <input
              id="password"
              type="password"
              {...register("password", { required: true })}
              className="block w-full p-3 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.password && <p className="text-red-500 text-sm">Campo requerido</p>}
          </div>
        </Field>

        <Field>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Nombre Completo</Label>
            <input
              id="name"
              type="text"
              {...register("name", { required: true })}
              className="block w-full p-3 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.name && <p className="text-red-500 text-sm">Campo requerido</p>}
          </div>
        </Field>

        <Field>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Correo Electrónico</Label>
            <input
              id="email"
              type="email"
              {...register("email", { required: true })}
              className="block w-full p-3 rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.email && <p className="text-red-500 text-sm">Campo requerido</p>}
          </div>
        </Field>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Registrarse
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-center text-red-500">{message}</p>}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
