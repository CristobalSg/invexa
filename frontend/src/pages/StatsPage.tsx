import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArchiveBoxIcon, CubeIcon, ExclamationTriangleIcon, TruckIcon } from "@heroicons/react/24/outline";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getBajoStock,
  getConsignacion,
  getProductosTop,
  getReporteInventario,
  getVentasMensual,
  getVentasResumen,
} from "../services/reporteService";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { inputClassName } from "../components/FormControls";

const money = (value: number) => `$${value.toLocaleString()}`;

export default function StatsPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const resumen = useQuery({ queryKey: ["reportes", "resumen", selectedDate], queryFn: () => getVentasResumen({ fecha_desde: selectedDate, fecha_hasta: selectedDate }) });
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
