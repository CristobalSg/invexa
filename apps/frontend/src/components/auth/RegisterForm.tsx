import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow bg-white">
      <h2 className="text-2xl font-bold mb-4 text-center">Registro de Usuario</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
            Nombre de la empresa
          </label>
          <input
            id="companyName"
            type="text"
            {...register("companyName", { required: true })}
            className="mt-1 w-full border p-2 rounded"
          />
          {errors.companyName && <p className="text-red-500 text-sm">Campo requerido</p>}
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Nombre de usuario
          </label>
          <input
            id="username"
            type="text"
            {...register("username", { required: true })}
            className="mt-1 w-full border p-2 rounded"
          />
          {errors.username && <p className="text-red-500 text-sm">Campo requerido</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            {...register("password", { required: true })}
            className="mt-1 w-full border p-2 rounded"
          />
          {errors.password && <p className="text-red-500 text-sm">Campo requerido</p>}
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre completo
          </label>
          <input
            id="name"
            type="text"
            {...register("name", { required: true })}
            className="mt-1 w-full border p-2 rounded"
          />
          {errors.name && <p className="text-red-500 text-sm">Campo requerido</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            {...register("email", { required: true })}
            className="mt-1 w-full border p-2 rounded"
          />
          {errors.email && <p className="text-red-500 text-sm">Campo requerido</p>}
        </div>

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
