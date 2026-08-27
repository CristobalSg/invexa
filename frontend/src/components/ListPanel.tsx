import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface ListPanelItem {
  id: string | number;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconComponent;
  meta?: ReactNode[];
  badge?: ReactNode;
  amount?: ReactNode;
  amountClassName?: string;
  action?: ReactNode;
  onClick?: () => void;
  expandedContent?: ReactNode;
}

interface ListPanelProps {
  title: string;
  items: ListPanelItem[];
  icon?: IconComponent;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  paginated?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

export default function ListPanel({
  title,
  items,
  icon: HeaderIcon,
  emptyMessage = "Sin registros.",
  isLoading = false,
  loadingMessage = "Cargando...",
  paginated = true,
  defaultPageSize = 5,
  pageSizeOptions = [5, 10, 20],
}: ListPanelProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const visibleItems = useMemo(() => {
    if (!paginated) {
      return items;
    }

    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, paginated]);
  const paginationStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const paginationEnd = Math.min(page * pageSize, items.length);

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/90 bg-white shadow-[0_18px_50px_rgba(31,35,48,.08)]">
      <div className="flex items-center gap-3 border-b border-[#efeff2] px-5 py-4">
        {HeaderIcon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f7f7f9] text-[#7652ed]">
            <HeaderIcon className="h-5 w-5" />
          </span>
        )}
        <h2 className="font-bold tracking-[-0.02em] text-[#17181d]">{title}</h2>
      </div>

      {isLoading ? (
        <p className="px-5 py-6 text-sm text-[#8b8e98]">{loadingMessage}</p>
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#8b8e98]">{emptyMessage}</p>
      ) : (
        <>
        <div className="divide-y divide-[#f0f0f2]">
          {visibleItems.map((item) => {
            const ItemIcon = item.icon;

            return (
              <div key={item.id}>
                <div
                  role={item.onClick ? "button" : undefined}
                  tabIndex={item.onClick ? 0 : undefined}
                  onClick={item.onClick}
                  onKeyDown={(event) => {
                    if (!item.onClick || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    item.onClick();
                  }}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[#fbfaf7] ${item.onClick ? "cursor-pointer" : ""}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#faf8f1] text-[#747780]">
                    {ItemIcon && <ItemIcon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-[#17181d]">{item.title}</p>
                      {item.badge}
                    </div>
                    {item.description && <p className="mt-0.5 text-sm text-[#8b8e98]">{item.description}</p>}
                    {item.meta && item.meta.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8b8e98]">
                        {item.meta.map((meta, index) => (
                          <span key={index}>{meta}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.amount && (
                    <div className={`shrink-0 text-right text-sm font-bold ${item.amountClassName ?? "text-[#17181d]"}`}>
                      {item.amount}
                    </div>
                  )}
                  {item.action && (
                    <div
                      className="shrink-0"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {item.action}
                    </div>
                  )}
                </div>
                {item.expandedContent && (
                  <div className="border-t border-[#f0f0f2] bg-[#fbfaf7] px-5 py-3">
                    {item.expandedContent}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {paginated && items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efeff2] px-5 py-3 text-sm text-[#747780]">
            <span>
              {paginationStart}-{paginationEnd} de {items.length}
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <span>Items</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-lg border border-[#ececf0] bg-white px-2 py-1 text-sm"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[#ececf0] bg-white px-2 py-1 font-semibold text-[#5f626b] hover:bg-[#f7f7f9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="min-w-12 text-center">{page}/{totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-[#ececf0] bg-white px-2 py-1 font-semibold text-[#5f626b] hover:bg-[#f7f7f9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </section>
  );
}
