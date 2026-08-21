import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCircleIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { createUsuario, deactivateUsuario, getUsuarios } from "../services/catalogService";
import type { UserRole } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";

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
    <div className="admin-page space-y-6">
      <h1 className="admin-page-title">Usuarios</h1>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="xl:sticky xl:top-6 xl:self-start">
      <ModuleCard title="Crear usuario" icon={UserCircleIcon} contentClassName="p-5">
        <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Usuario">
            <input className={inputClassName} value={form.nombre_usuario} onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })} />
          </FormField>
          <FormField label="Contraseña">
            <input className={inputClassName} type="password" value={form.contraseña} onChange={(e) => setForm({ ...form, contraseña: e.target.value })} />
          </FormField>
          <FormField label="Nombre">
            <input className={inputClassName} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <input className={inputClassName} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Rol">
            <select className={inputClassName} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as UserRole })}><option value="CASHIER">Cajero</option><option value="OWNER">Owner</option></select>
          </FormField>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Creando..." : "Crear"}</Button>
        </div>
        {message && <p className="text-sm">{message}</p>}
        </div>
      </ModuleCard>
        </div>
        <div>
      <ListPanel
        title="Usuarios"
        icon={UserGroupIcon}
        isLoading={isLoading}
        loadingMessage="Cargando usuarios..."
        emptyMessage="Sin usuarios registrados."
        items={(data ?? []).map((u) => ({
          id: u.id,
          icon: UserCircleIcon,
          title: u.nombre_usuario,
          description: u.nombre,
          meta: [u.email ?? "Sin email", u.rol, u.activo ? "Activo" : "Inactivo"],
          action: u.activo ? (
            <button
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              onClick={() => disable.mutate(u.id)}
            >
              Desactivar
            </button>
          ) : undefined,
        }))}
      />
        </div>
      </div>
    </div>
  );
}
