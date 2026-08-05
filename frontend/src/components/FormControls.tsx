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
  "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-blue-400 dark:focus:ring-blue-950 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500";

export function FormField({ label, children, help, error, className }: FormFieldProps) {
  return (
    <label className={clsx("block text-sm font-medium text-gray-700 dark:text-neutral-300", className)}>
      {label}
      {children}
      {help && <p className="mt-1 text-xs font-normal text-gray-500 dark:text-neutral-400">{help}</p>}
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
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400",
        fullWidth && "w-full",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400",
        variant === "secondary" && "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:border-gray-200 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-white/10",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-gray-700 hover:bg-gray-100 disabled:bg-transparent disabled:text-gray-300 dark:text-neutral-200 dark:hover:bg-white/10 dark:disabled:text-neutral-600",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
