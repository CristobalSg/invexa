import { useMemo, useState, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleIcon,
  ComputerDesktopIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

import { Button, FormActions, FormField, inputClassName } from "../../components/FormControls";
import { setupInitialAdmin } from "../../services/authService";

export default function SetupAdminPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre_usuario: "admin",
    nombre: "",
    email: "",
    contraseña: "",
    confirmar_contraseña: "",
    nombre_dispositivo: "Caja POS",
  });
  const [message, setMessage] = useState("");

  const passwordsMatch = useMemo(
    () => form.contraseña.length > 0 && form.contraseña === form.confirmar_contraseña,
    [form.contraseña, form.confirmar_contraseña],
  );

  const setup = useMutation({
    mutationFn: () => {
      if (!passwordsMatch) {
        throw new Error("Las contraseñas no coinciden");
      }

      return setupInitialAdmin({
        nombre_usuario: form.nombre_usuario.trim(),
        nombre: form.nombre.trim(),
        email: form.email.trim() || null,
        contraseña: form.contraseña,
        confirmar_contraseña: form.confirmar_contraseña,
        nombre_dispositivo: form.nombre_dispositivo.trim() || "Caja POS",
      });
    },
    onSuccess: () => {
      setMessage("");
      navigate("/", { replace: true });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el administrador");
    },
  });

  const updateField =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setMessage("");
    };

  return (
    <div className="setup-screen">
      <section className="setup-panel" aria-labelledby="setup-title">
        <div className="setup-copy">
          <div className="setup-logo">
            <ShieldCheckIcon className="h-8 w-8" />
          </div>
          <p className="setup-kicker">Invexa POS</p>
          <h1 id="setup-title">Crear administrador</h1>
          <p>
            Esta es la primera configuración del sistema. Define la cuenta dueña y su contraseña real antes de operar la caja.
          </p>

          <div className="setup-steps">
            <span>
              <UserPlusIcon className="h-5 w-5" />
              Cuenta owner
            </span>
            <span>
              <KeyIcon className="h-5 w-5" />
              Clave confirmada
            </span>
            <span>
              <ComputerDesktopIcon className="h-5 w-5" />
              Equipo autorizado
            </span>
          </div>
        </div>

        <form
          className="setup-form"
          onSubmit={(event) => {
            event.preventDefault();
            setup.mutate();
          }}
        >
          <div className="setup-form-header">
            <CheckCircleIcon className="h-7 w-7" />
            <div>
              <h2>Primer ingreso</h2>
              <p>La contraseña se guarda encriptada y será la misma para autorizar acciones de administrador.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Usuario admin">
              <input
                autoFocus
                className={inputClassName}
                value={form.nombre_usuario}
                onChange={updateField("nombre_usuario")}
                minLength={3}
                maxLength={100}
                required
              />
            </FormField>
            <FormField label="Nombre">
              <input
                className={inputClassName}
                value={form.nombre}
                onChange={updateField("nombre")}
                minLength={1}
                maxLength={150}
                required
              />
            </FormField>
          </div>

          <FormField label="Email">
            <input
              className={inputClassName}
              type="email"
              value={form.email}
              onChange={updateField("email")}
              maxLength={150}
              placeholder="Opcional"
            />
          </FormField>

          <FormField label="Nombre del equipo">
            <input
              className={inputClassName}
              value={form.nombre_dispositivo}
              onChange={updateField("nombre_dispositivo")}
              minLength={1}
              maxLength={150}
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contraseña">
              <input
                className={inputClassName}
                type="password"
                value={form.contraseña}
                onChange={updateField("contraseña")}
                minLength={4}
                maxLength={200}
                required
              />
            </FormField>
            <FormField
              label="Repetir contraseña"
              error={form.confirmar_contraseña && !passwordsMatch ? "No coincide" : undefined}
            >
              <input
                className={inputClassName}
                type="password"
                value={form.confirmar_contraseña}
                onChange={updateField("confirmar_contraseña")}
                minLength={4}
                maxLength={200}
                required
              />
            </FormField>
          </div>

          {message && <p className="setup-error">{message}</p>}

          <FormActions>
            <Button
              type="submit"
              disabled={
                setup.isPending ||
                !form.nombre_usuario.trim() ||
                !form.nombre.trim() ||
                !form.contraseña ||
                !form.confirmar_contraseña ||
                !passwordsMatch
              }
              fullWidth
            >
              {setup.isPending ? "Creando..." : "Crear administrador"}
            </Button>
          </FormActions>
        </form>
      </section>
    </div>
  );
}
