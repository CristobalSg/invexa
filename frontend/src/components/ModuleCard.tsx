import type { ComponentType, ReactNode, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface ModuleCardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: IconComponent;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function ModuleCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = "",
  contentClassName = "p-5",
}: ModuleCardProps) {
  const hasHeader = title || description || Icon || action;

  return (
    <section className={`overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-neutral-900 ${className}`}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-semibold text-gray-900 dark:text-neutral-100">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
