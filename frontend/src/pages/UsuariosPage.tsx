import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CircleStackIcon,
  KeyIcon,
  TrashIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { createUsuario, deactivateUsuario, getUsuarios, updateUsuario } from "../services/catalogService";
import { createBackup, deleteBackup, downloadBackup, getBackups, restoreBackup } from "../services/backupService";
import type { Usuario, UserRole } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";

const formatBackupDate = (value: string) =>
  new Date(value).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });

const formatBackupSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nombre_usuario: "", contraseña: "", nombre: "", email: "", rol: "CASHIER" as UserRole });
  const [passwordUser, setPasswordUser] = useState<Usuario | null>(null);
  const [passwordForm, setPasswordForm] = useState({ contraseña: "", confirmar_contraseña: "", master_password: "" });
  const [message, setMessage] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["usuarios"], queryFn: getUsuarios });
  const { data: backups, isLoading: isLoadingBackups } = useQuery({ queryKey: ["backups"], queryFn: getBackups });
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

      return updateUsuario(passwordUser.id, {
        contraseña: passwordForm.contraseña,
        master_password: passwordForm.master_password,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setMessage(`Contraseña actualizada para ${passwordUser?.nombre_usuario}.`);
      closePasswordModal();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo modificar la contraseña"),
  });
  const createBackupMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["backups"] });
      setMessage("Backup creado correctamente.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo crear el backup"),
  });
  const deleteBackupMutation = useMutation({
    mutationFn: deleteBackup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["backups"] });
      setMessage("Backup eliminado.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo eliminar el backup"),
  });
  const restoreBackupMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      setMessage("Backup restaurado correctamente. Si ves datos antiguos, recarga la pagina.");
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo restaurar el backup"),
  });

  const openPasswordModal = (usuario: Usuario) => {
    setPasswordUser(usuario);
    setPasswordForm({ contraseña: "", confirmar_contraseña: "", master_password: "" });
    setMessage("");
  };

  const closePasswordModal = () => {
    setPasswordUser(null);
    setPasswordForm({ contraseña: "", confirmar_contraseña: "", master_password: "" });
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const blob = await downloadBackup(filename);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar el backup");
    }
  };

  const handleRestoreFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.endsWith(".dump")) {
      setMessage("Selecciona un archivo .dump");
      return;
    }

    const confirmed = window.confirm(
      "Restaurar este backup reemplazara la base de datos actual. Esta accion no se puede deshacer desde el sistema. ¿Quieres continuar?",
    );

    if (!confirmed) {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
      return;
    }

    restoreBackupMutation.mutate(file);
  };

  return (
    <div className="admin-page space-y-6">
      <h1 className="admin-page-title">Configuración / Administración</h1>
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

      <ModuleCard title="Backups de PostgreSQL" icon={CircleStackIcon} contentClassName="p-5">
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <Button
              fullWidth
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
            >
              {createBackupMutation.isPending ? "Creando backup..." : "Crear backup manual"}
            </Button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".dump,application/octet-stream"
              className="hidden"
              onChange={(event) => handleRestoreFile(event.target.files?.[0])}
            />
            <Button
              fullWidth
              variant="secondary"
              onClick={() => restoreInputRef.current?.click()}
              disabled={restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending ? "Restaurando..." : "Importar/restaurar .dump"}
            </Button>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              Restaurar un backup reemplaza la base de datos actual.
            </p>
          </div>

          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Fecha y hora</th>
                  <th>Tamaño</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingBackups && (
                  <tr>
                    <td colSpan={4}>Cargando backups...</td>
                  </tr>
                )}
                {!isLoadingBackups && (backups ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4}>No hay backups generados.</td>
                  </tr>
                )}
                {(backups ?? []).map((backup) => (
                  <tr key={backup.filename}>
                    <td className="font-semibold">{backup.filename}</td>
                    <td>{formatBackupDate(backup.created_at)}</td>
                    <td>{formatBackupSize(backup.size_bytes)}</td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadBackup(backup.filename)}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-[#7652ed] hover:bg-[#faf9ff]"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Descargar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar ${backup.filename}?`)) {
                              deleteBackupMutation.mutate(backup.filename);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-[#8b8e98]">
          <ArrowPathIcon className="h-4 w-4" />
          <span>Los backups se guardan como archivos .dump en la carpeta persistente configurada del servidor.</span>
        </div>
      </ModuleCard>

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
              <FormField label="Contraseña administrador">
                <input
                  autoFocus
                  type="password"
                  maxLength={200}
                  value={passwordForm.master_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, master_password: event.target.value }))}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Nueva contraseña">
                <input
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
                    if (
                      event.key === "Enter" &&
                      passwordForm.master_password &&
                      passwordForm.contraseña === passwordForm.confirmar_contraseña
                    ) {
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
                  !passwordForm.master_password ||
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
