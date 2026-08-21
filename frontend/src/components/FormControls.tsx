import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface FormFieldProps {
  label: ReactNode;
  children: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  className?: string;
}

interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  fullWidth?: boolean;
}

export const inputClassName =
  "mt-1 block w-full rounded-[14px] border border-[#ececf0] bg-[#f7f7f9] px-3 py-2.5 text-sm text-[#24252a] placeholder:text-[#a3a5ad] focus:border-[#cfc3ff] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#8657ff]/10 disabled:bg-gray-100 disabled:text-gray-500";

export function FormField({ label, children, help, error, className }: FormFieldProps) {
  return (
    <label className={clsx("block text-sm font-semibold text-[#5f626b]", className)}>
      {label}
      {children}
      {help && <p className="mt-1 text-xs font-normal text-[#8b8e98]">{help}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  );
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={clsx("flex flex-wrap items-center justify-end gap-2 pt-4", className)}>
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-[14px] px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45",
        fullWidth && "w-full",
        variant === "primary" && "bg-[#1d1f25] text-white shadow-[0_12px_25px_rgba(26,28,34,.16)] hover:-translate-y-0.5 hover:bg-[#121318]",
        variant === "secondary" && "border border-[#ececf0] bg-white text-[#5f626b] hover:-translate-y-0.5 hover:border-[#d8d1ff] hover:bg-[#faf9ff] hover:text-[#7652ed]",
        variant === "danger" && "bg-red-600 text-white shadow-[0_12px_25px_rgba(220,38,38,.16)] hover:-translate-y-0.5 hover:bg-red-700",
        variant === "ghost" && "text-[#5f626b] hover:bg-[#f7f7f9] disabled:bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
