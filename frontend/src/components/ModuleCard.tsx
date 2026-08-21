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
    <section className={`overflow-hidden rounded-[28px] border border-white/90 bg-white shadow-[0_18px_50px_rgba(31,35,48,.08)] ${className}`}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-[#efeff2] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#f7f7f9] text-[#7652ed] shadow-[0_7px_15px_rgba(89,77,49,.06)]">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-bold tracking-[-0.02em] text-[#17181d]">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-[#8b8e98]">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
