import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      setMessage(
        error.response?.data?.message || "Error al registrar usuario"
      );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Registro de Usuario</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input
          type="text"
          placeholder="Nombre de la empresa"
          {...register("companyName", { required: true })}
          className="w-full border p-2 rounded"
        />
        {errors.companyName && <p className="text-red-500">Campo requerido</p>}

        <input
          type="text"
          placeholder="Nombre de usuario"
          {...register("username", { required: true })}
          className="w-full border p-2 rounded"
        />
        {errors.username && <p className="text-red-500">Campo requerido</p>}

        <input
          type="password"
          placeholder="Contraseña"
          {...register("password", { required: true })}
          className="w-full border p-2 rounded"
        />
        {errors.password && <p className="text-red-500">Campo requerido</p>}

        <input
          type="text"
          placeholder="Nombre completo"
          {...register("name", { required: true })}
          className="w-full border p-2 rounded"
        />
        {errors.name && <p className="text-red-500">Campo requerido</p>}

        <input
          type="email"
          placeholder="Correo electrónico"
          {...register("email", { required: true })}
          className="w-full border p-2 rounded"
        />
        {errors.email && <p className="text-red-500">Campo requerido</p>}

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Registrarse
        </button>
      </form>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
