import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArchiveBoxIcon, CubeIcon, ExclamationTriangleIcon, PrinterIcon, TruckIcon, WalletIcon } from "@heroicons/react/24/outline";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

export default function StatsPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const resumen = useQuery({ queryKey: ["reportes", "resumen", selectedDate], queryFn: () => getVentasResumen({ fecha_desde: selectedDate, fecha_hasta: selectedDate }) });
  const cierreDiario = useQuery({ queryKey: ["reportes", "cierre-caja-diario", selectedDate], queryFn: () => getCierreCajaDiario({ fecha_desde: selectedDate }) });
  const mensual = useQuery({ queryKey: ["reportes", "mensual"], queryFn: () => getVentasMensual() });
  const top = useQuery({ queryKey: ["reportes", "top"], queryFn: () => getProductosTop() });
  const inventario = useQuery({ queryKey: ["reportes", "inventario"], queryFn: () => getReporteInventario() });
  const bajoStock = useQuery({ queryKey: ["reportes", "bajo-stock"], queryFn: () => getBajoStock() });
  const consignacion = useQuery({ queryKey: ["reportes", "consignacion"], queryFn: () => getConsignacion() });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={`${inputClassName} max-w-44`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric title="Ventas del día" value={String(resumen.data?.cantidad_ventas ?? 0)} />
        <Metric title="Total vendido" value={money(resumen.data?.total ?? 0)} />
        <Metric title="Ticket promedio" value={money(resumen.data?.ticket_promedio ?? 0)} />
        <Metric title="Bajo stock" value={String(bajoStock.data?.pagination.total ?? 0)} />
      </div>

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

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
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
                    <tr key={session.sesion_caja_id} className="border-t">
                      <td className="p-3 font-semibold">#{session.sesion_caja_id}</td>
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
        <ModuleCard title="Ventas mensuales">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mensual.data ?? []}>
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ModuleCard>
        <ModuleCard title="Productos más vendidos">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top.data?.items ?? []}>
              <XAxis dataKey="producto_nombre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad_vendida" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </ModuleCard>
      </div>

      <ListPanel
        title="Inventario valorizado"
        icon={ArchiveBoxIcon}
        emptyMessage="Sin productos en inventario."
        items={(inventario.data?.items ?? []).map((item) => ({
          id: item.producto_id,
          icon: CubeIcon,
          title: item.producto_nombre,
          description: item.categoria_nombre,
          meta: [`Stock ${item.stock}`, item.activo ? "Activo" : "Inactivo"],
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

function Metric({ title, value }: { title: string; value: string }) {
  return <ModuleCard contentClassName="p-5"><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold mt-1">{value}</p></ModuleCard>;
}

function SummaryBox({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" }) {
  return (
    <div className={tone === "warning" ? "rounded-lg border border-amber-200 bg-amber-50 p-4" : "rounded-lg border border-gray-200 bg-gray-50 p-4"}>
      <p className={tone === "warning" ? "text-xs font-semibold uppercase text-amber-700" : "text-xs font-semibold uppercase text-gray-500"}>{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
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
