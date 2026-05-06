import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUsuario, deactivateUsuario, getUsuarios } from "../services/catalogService";
import type { UserRole } from "../types/api";

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nombre_usuario: "", contraseña: "", nombre: "", email: "", rol: "CASHIER" as UserRole });
  const [message, setMessage] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["usuarios"], queryFn: getUsuarios });
  const create = useMutation({
    mutationFn: () => createUsuario({ ...form, email: form.email || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setForm({ nombre_usuario: "", contraseña: "", nombre: "", email: "", rol: "CASHIER" });
      setMessage("Usuario creado.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo crear usuario"),
  });
  const disable = useMutation({
    mutationFn: deactivateUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <section className="bg-white border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold">Crear usuario</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Usuario" value={form.nombre_usuario} onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Contraseña" type="password" value={form.contraseña} onChange={(e) => setForm({ ...form, contraseña: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="border rounded px-3 py-2" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as UserRole })}><option value="CASHIER">Cajero</option><option value="OWNER">Owner</option></select>
          <button onClick={() => create.mutate()} className="bg-blue-600 text-white rounded px-4 py-2">Crear</button>
        </div>
        {message && <p className="text-sm">{message}</p>}
      </section>
      <section className="bg-white border rounded-lg overflow-x-auto">
        {isLoading ? <p className="p-4">Cargando usuarios...</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th className="p-3">Usuario</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>{data?.map((u) => <tr key={u.id} className="border-t"><td className="p-3">{u.nombre_usuario}</td><td>{u.nombre}</td><td>{u.email ?? "-"}</td><td>{u.rol}</td><td>{u.activo ? "Activo" : "Inactivo"}</td><td>{u.activo && <button className="text-red-600" onClick={() => disable.mutate(u.id)}>Desactivar</button>}</td></tr>)}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
