import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface FlowActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  size?: "default" | "cash";
  variant?: "primary" | "danger";
}

export default function FlowActionButton({
  children,
  icon = "→",
  size = "default",
  variant = "primary",
  className,
  ...props
}: FlowActionButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "flow-action-button",
        size === "cash" && "cash-size",
        variant === "danger" && "danger",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <span className="flow-action-button-icon">{icon}</span>
    </button>
  );
}
