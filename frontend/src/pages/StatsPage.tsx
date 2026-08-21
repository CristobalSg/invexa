import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ShoppingBagIcon,
  TruckIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getBajoStock,
  getCierreCajaDiario,
  getConsignacion,
  getProductosTop,
  getReporteInventario,
  getVentasMensual,
  getVentasResumen,
} from "../services/reporteService";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, inputClassName } from "../components/FormControls";
import type { CierreCajaDiario } from "../types/api";

const money = (value: number) => `$${value.toLocaleString()}`;
const number = (value: number) => value.toLocaleString("es-CL", { maximumFractionDigits: 2 });

export default function StatsPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const resumen = useQuery({ queryKey: ["reportes", "resumen", selectedDate], queryFn: () => getVentasResumen({ fecha_desde: selectedDate, fecha_hasta: selectedDate }) });
  const cierreDiario = useQuery({ queryKey: ["reportes", "cierre-caja-diario", selectedDate], queryFn: () => getCierreCajaDiario({ fecha_desde: selectedDate }) });
  const mensual = useQuery({ queryKey: ["reportes", "mensual"], queryFn: () => getVentasMensual() });
  const top = useQuery({ queryKey: ["reportes", "top"], queryFn: () => getProductosTop() });
  const inventario = useQuery({ queryKey: ["reportes", "inventario"], queryFn: () => getReporteInventario() });
  const bajoStock = useQuery({ queryKey: ["reportes", "bajo-stock"], queryFn: () => getBajoStock() });
  const consignacion = useQuery({ queryKey: ["reportes", "consignacion"], queryFn: () => getConsignacion() });
  const topItems = top.data?.items ?? [];
  const consignacionItems = consignacion.data?.items ?? [];
  const topProduct = topItems[0];
  const inventoryValue = inventario.data?.resumen.valor_venta_total ?? 0;
  const inventoryCost = inventario.data?.resumen.valor_costo_total ?? 0;
  const consignationCommission = consignacionItems.reduce((total, item) => total + item.comision_estimada, 0);
  const paymentTotal =
    (resumen.data?.efectivo ?? 0) +
    (resumen.data?.tarjeta ?? 0) +
    (resumen.data?.transferencia ?? 0) +
    (resumen.data?.mixto ?? 0);

  return (
    <div className="admin-page space-y-6">
      <div className="reports-hero">
        <div>
          <p className="reports-kicker">Panel administrativo</p>
          <h1 className="admin-page-title">Reportes</h1>
        </div>
        <label className="reports-date-control">
          <CalendarDaysIcon className="h-5 w-5" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={inputClassName}
          />
        </label>
      </div>

      <div className="reports-metric-grid">
        <Metric icon={ShoppingBagIcon} title="Ventas del día" value={String(resumen.data?.cantidad_ventas ?? 0)} />
        <Metric icon={BanknotesIcon} title="Total vendido" value={money(resumen.data?.total ?? 0)} />
        <Metric icon={WalletIcon} title="Ticket promedio" value={money(resumen.data?.ticket_promedio ?? 0)} />
        <Metric icon={ExclamationTriangleIcon} title="Bajo stock" value={String(bajoStock.data?.pagination.total ?? 0)} tone="warning" />
        <Metric icon={CubeIcon} title="Inventario venta" value={money(inventoryValue)} />
        <Metric icon={ArchiveBoxIcon} title="Costo inventario" value={money(inventoryCost)} />
        <Metric icon={TruckIcon} title="Comisión estimada" value={money(consignationCommission)} />
        <Metric icon={ChartBarIcon} title="Producto líder" value={topProduct ? topProduct.producto_nombre : "-"} compact />
      </div>

      <section className="reports-split">
        <ModuleCard title="Medios de pago" icon={WalletIcon} contentClassName="p-5">
          <div className="payment-stat-list">
            <PaymentStat label="Efectivo" value={resumen.data?.efectivo ?? 0} total={paymentTotal} />
            <PaymentStat label="Tarjeta" value={resumen.data?.tarjeta ?? 0} total={paymentTotal} />
            <PaymentStat label="Transferencia" value={resumen.data?.transferencia ?? 0} total={paymentTotal} />
            <PaymentStat label="Mixto" value={resumen.data?.mixto ?? 0} total={paymentTotal} />
          </div>
        </ModuleCard>

        <ModuleCard title="Top productos" icon={ChartBarIcon} contentClassName="p-5">
          <div className="top-product-list">
            {topItems.slice(0, 5).map((product, index) => (
              <div key={product.producto_id} className="top-product-row">
                <span className="top-product-rank">{index + 1}</span>
                <div className="min-w-0">
                  <h3>{product.producto_nombre}</h3>
                  <p>{number(product.cantidad_vendida)} vendidos</p>
                </div>
                <strong>{money(product.total_vendido)}</strong>
              </div>
            ))}
            {topItems.length === 0 && <p className="reports-empty">Sin ventas de productos todavía.</p>}
          </div>
        </ModuleCard>
      </section>

      <ModuleCard
        title={selectedDate === format(new Date(), "yyyy-MM-dd") ? "Cierre de hoy" : "Cierre diario"}
        description="Cajas cerradas, venta por caja y total del día."
        icon={WalletIcon}
        action={(
          <Button
            variant="secondary"
            onClick={() => cierreDiario.data && printDailyClose(cierreDiario.data)}
            disabled={!cierreDiario.data || cierreDiario.data.sesiones.length === 0}
          >
            <PrinterIcon className="mr-2 h-5 w-5" />
            Imprimir
          </Button>
        )}
      >
        {cierreDiario.isLoading && <p className="text-sm text-gray-500">Cargando cierre...</p>}
        {!cierreDiario.isLoading && cierreDiario.data && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <SummaryBox label="Cajas cerradas" value={String(cierreDiario.data.cajas_cerradas)} />
              <SummaryBox label="Total vendido" value={money(cierreDiario.data.total_vendido)} />
              <SummaryBox label="Efectivo" value={money(cierreDiario.data.efectivo)} />
              <SummaryBox label="Tarjeta/Transferencia" value={money(cierreDiario.data.tarjeta + cierreDiario.data.transferencia)} />
              <SummaryBox label="Diferencia" value={money(cierreDiario.data.diferencia_total)} tone={cierreDiario.data.diferencia_total === 0 ? "neutral" : "warning"} />
            </div>

            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th className="p-3">Caja</th>
                    <th>Usuario</th>
                    <th>Cierre</th>
                    <th>Ventas</th>
                    <th>Efectivo</th>
                    <th>Otros pagos</th>
                    <th>Total vendido</th>
                    <th>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {cierreDiario.data.sesiones.map((session) => (
                    <tr key={session.sesion_caja_id}>
                      <td className="font-semibold">#{session.sesion_caja_id}</td>
                      <td>
                        <p className="font-medium text-gray-900">{session.usuario_nombre}</p>
                        <p className="text-xs text-gray-500">{session.dispositivo_nombre ?? "Sin dispositivo"}</p>
                      </td>
                      <td>{new Date(session.cerrada_en).toLocaleTimeString()}</td>
                      <td>{session.cantidad_ventas}</td>
                      <td>{money(session.efectivo)}</td>
                      <td>{money(session.tarjeta + session.transferencia + session.mixto)}</td>
                      <td className="font-semibold">{money(session.total_vendido)}</td>
                      <td className={session.diferencia_cierre === 0 ? "text-gray-700" : "font-semibold text-amber-700"}>
                        {money(session.diferencia_cierre ?? 0)}
                      </td>
                    </tr>
                  ))}
                  {cierreDiario.data.sesiones.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        No hay cajas cerradas para esta fecha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ModuleCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ModuleCard title="Ventas mensuales" icon={ChartBarIcon}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mensual.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efeff2" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#7652ed" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ModuleCard>
        <ModuleCard title="Productos más vendidos" icon={ShoppingBagIcon}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top.data?.items ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efeff2" />
              <XAxis dataKey="producto_nombre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad_vendida" fill="#28b486" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ModuleCard>
      </div>

      <ListPanel
        title={`Inventario valorizado · Total ${money(inventoryValue)}`}
        icon={ArchiveBoxIcon}
        emptyMessage="Sin productos en inventario."
        items={(inventario.data?.items ?? []).map((item) => ({
          id: item.producto_id,
          icon: CubeIcon,
          title: item.producto_nombre,
          description: item.categoria_nombre,
          meta: [`Stock ${item.stock}`, `Costo ${money(item.valor_costo)}`, item.activo ? "Activo" : "Inactivo"],
          amount: money(item.valor_venta),
        }))}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ListPanel
          title="Bajo stock"
          icon={ExclamationTriangleIcon}
          emptyMessage="Sin productos bajo stock."
          items={(bajoStock.data?.items ?? []).map((item) => ({
            id: item.producto_id,
            icon: ExclamationTriangleIcon,
            title: item.producto_nombre,
            description: item.categoria_nombre,
            meta: [`Stock ${item.stock}`, item.activo ? "Activo" : "Inactivo"],
            amount: money(item.valor_venta),
            amountClassName: "text-amber-700",
          }))}
        />
        <ListPanel
          title="Consignación"
          icon={TruckIcon}
          emptyMessage="Sin proveedores en consignación."
          items={(consignacion.data?.items ?? []).map((item) => ({
            id: item.proveedor_id,
            icon: TruckIcon,
            title: item.proveedor_nombre,
            description: `${item.productos} productos`,
            meta: [`Stock ${item.stock_total}`, `Venta ${money(item.valor_venta)}`],
            amount: money(item.comision_estimada),
          }))}
        />
      </div>
    </div>
  );
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function Metric({
  icon: Icon,
  title,
  value,
  tone = "neutral",
  compact = false,
}: {
  icon: IconComponent;
  title: string;
  value: string;
  tone?: "neutral" | "warning";
  compact?: boolean;
}) {
  return (
    <div className={`report-metric-card ${tone === "warning" ? "warning" : ""}`}>
      <span className="report-metric-icon">
        <Icon className="h-5 w-5" />
      </span>
      <p>{title}</p>
      <strong className={compact ? "compact" : ""}>{value}</strong>
    </div>
  );
}

function PaymentStat({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="payment-stat-row">
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <strong>{money(value)}</strong>
      </div>
      <div className="payment-stat-track">
        <i style={{ width: `${percent}%` }} />
      </div>
      <small>{percent}% del total</small>
    </div>
  );
}

function SummaryBox({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" }) {
  return (
    <div className={`reports-summary-box ${tone === "warning" ? "warning" : ""}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function printDailyClose(report: CierreCajaDiario) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const rows = report.sesiones.map((session) => `
    <tr>
      <td>#${session.sesion_caja_id}</td>
      <td>${escapeHtml(session.usuario_nombre)}</td>
      <td>${escapeHtml(session.dispositivo_nombre ?? "Sin dispositivo")}</td>
      <td>${new Date(session.abierta_en).toLocaleString()}</td>
      <td>${new Date(session.cerrada_en).toLocaleString()}</td>
      <td class="num">${session.cantidad_ventas}</td>
      <td class="num">${money(session.efectivo)}</td>
      <td class="num">${money(session.tarjeta)}</td>
      <td class="num">${money(session.transferencia)}</td>
      <td class="num">${money(session.mixto)}</td>
      <td class="num">${money(session.total_vendido)}</td>
      <td class="num">${money(session.monto_apertura)}</td>
      <td class="num">${money(session.monto_cierre ?? 0)}</td>
      <td class="num">${money(session.diferencia_cierre ?? 0)}</td>
    </tr>
  `).join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Cierre diario ${report.fecha}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { margin: 0; font-size: 24px; }
          .muted { color: #6b7280; font-size: 12px; margin-top: 4px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
          .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; }
          .label { color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: bold; }
          .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; }
          th { background: #f3f4f6; }
          .num { text-align: right; white-space: nowrap; }
          @media print { body { margin: 12mm; } }
        </style>
      </head>
      <body>
        <h1>Cierre diario de caja</h1>
        <p class="muted">Fecha: ${report.fecha} · Impreso: ${new Date().toLocaleString()}</p>
        <div class="summary">
          <div class="box"><div class="label">Cajas cerradas</div><div class="value">${report.cajas_cerradas}</div></div>
          <div class="box"><div class="label">Total vendido</div><div class="value">${money(report.total_vendido)}</div></div>
          <div class="box"><div class="label">Efectivo</div><div class="value">${money(report.efectivo)}</div></div>
          <div class="box"><div class="label">Diferencia total</div><div class="value">${money(report.diferencia_total)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Caja</th>
              <th>Usuario</th>
              <th>Dispositivo</th>
              <th>Apertura</th>
              <th>Cierre</th>
              <th>Ventas</th>
              <th>Efectivo</th>
              <th>Tarjeta</th>
              <th>Transferencia</th>
              <th>Mixto</th>
              <th>Total vendido</th>
              <th>Apertura $</th>
              <th>Cierre $</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="14">Sin cajas cerradas.</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char] ?? char);
}
