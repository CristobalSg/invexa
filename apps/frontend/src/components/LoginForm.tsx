import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type LoginFormInputs = {
  username: string;
  password: string;
};

export default function LoginForm() {
    const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();
  const [message, setMessage] = useState("");

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        data
      );
      const token = res.data.token;
      localStorage.setItem("token", token);
      setMessage("Inicio de sesión exitoso");
      navigate("/");
    } catch (error: any) {
      console.error(error);
      setMessage(error.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Iniciar Sesión</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input
          type="text"
          placeholder="Usuario"
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

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Iniciar Sesión
        </button>
      </form>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
