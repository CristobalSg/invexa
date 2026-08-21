import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyIcon, UserCircleIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { createUsuario, deactivateUsuario, getUsuarios, updateUsuario } from "../services/catalogService";
import type { Usuario, UserRole } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nombre_usuario: "", contraseña: "", nombre: "", email: "", rol: "CASHIER" as UserRole });
  const [passwordUser, setPasswordUser] = useState<Usuario | null>(null);
  const [passwordForm, setPasswordForm] = useState({ contraseña: "", confirmar_contraseña: "" });
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
  const updatePassword = useMutation({
    mutationFn: () => {
      if (!passwordUser) {
        throw new Error("Selecciona un usuario");
      }

      if (passwordForm.contraseña !== passwordForm.confirmar_contraseña) {
        throw new Error("Las contraseñas no coinciden");
      }

      return updateUsuario(passwordUser.id, { contraseña: passwordForm.contraseña });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setMessage(`Contraseña actualizada para ${passwordUser?.nombre_usuario}.`);
      closePasswordModal();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo modificar la contraseña"),
  });

  const openPasswordModal = (usuario: Usuario) => {
    setPasswordUser(usuario);
    setPasswordForm({ contraseña: "", confirmar_contraseña: "" });
    setMessage("");
  };

  const closePasswordModal = () => {
    setPasswordUser(null);
    setPasswordForm({ contraseña: "", confirmar_contraseña: "" });
  };

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
          action: (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-[#7652ed] hover:bg-[#faf9ff]"
                onClick={() => openPasswordModal(u)}
              >
                <KeyIcon className="h-4 w-4" />
                Contraseña
              </button>
              {u.activo && (
                <button
                  className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => disable.mutate(u.id)}
                >
                  Desactivar
                </button>
              )}
            </div>
          ),
        }))}
      />
        </div>
      </div>

      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/90 bg-white p-6 shadow-[0_24px_70px_rgba(18,19,24,.24)]">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#faf9ff] text-[#7652ed]">
                <KeyIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-black tracking-[-0.02em] text-[#17181d]">Modificar contraseña</h2>
                <p className="mt-1 text-sm text-[#8b8e98]">
                  {passwordUser.nombre} · {passwordUser.nombre_usuario}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <FormField label="Nueva contraseña">
                <input
                  autoFocus
                  type="password"
                  minLength={4}
                  maxLength={200}
                  value={passwordForm.contraseña}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, contraseña: event.target.value }))}
                  className={inputClassName}
                />
              </FormField>
              <FormField
                label="Repetir contraseña"
                error={
                  passwordForm.confirmar_contraseña &&
                  passwordForm.contraseña !== passwordForm.confirmar_contraseña
                    ? "No coincide"
                    : undefined
                }
              >
                <input
                  type="password"
                  minLength={4}
                  maxLength={200}
                  value={passwordForm.confirmar_contraseña}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirmar_contraseña: event.target.value }))}
                  className={inputClassName}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") closePasswordModal();
                    if (event.key === "Enter" && passwordForm.contraseña === passwordForm.confirmar_contraseña) {
                      updatePassword.mutate();
                    }
                  }}
                />
              </FormField>
            </div>

            <FormActions>
              <Button variant="ghost" onClick={closePasswordModal}>
                Cancelar
              </Button>
              <Button
                onClick={() => updatePassword.mutate()}
                disabled={
                  updatePassword.isPending ||
                  passwordForm.contraseña.length < 4 ||
                  passwordForm.contraseña !== passwordForm.confirmar_contraseña
                }
              >
                {updatePassword.isPending ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </FormActions>
          </div>
        </div>
      )}
    </div>
  );
}
