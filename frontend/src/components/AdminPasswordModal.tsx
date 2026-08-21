import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { KeyIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { inputClassName } from "./FormControls";

interface AdminPasswordModalProps {
  title?: string;
  description?: ReactNode;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  children?: ReactNode;
}

export default function AdminPasswordModal({
  title = "Autorización requerida",
  description = "Ingresa la contraseña de administrador para continuar.",
  isPending = false,
  onClose,
  onConfirm,
  children,
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Enter") return;
    event.preventDefault();

    if (password.trim()) {
      onConfirm(password);
    }
  };

  return (
    <div
      className="admin-password-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="admin-password-modal" role="dialog" aria-modal="true">
        <div className="admin-password-head">
          <span className="admin-password-icon">
            <KeyIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {children}

        <label className="admin-password-field">
          <span>Contraseña admin</span>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleKeyDown}
            className={inputClassName}
            disabled={isPending}
            autoComplete="current-password"
          />
        </label>
      </div>
    </div>
  );
}
