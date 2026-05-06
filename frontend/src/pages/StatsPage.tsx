import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getBajoStock,
  getConsignacion,
  getProductosTop,
  getReporteInventario,
  getVentasMensual,
  getVentasResumen,
} from "../services/reporteService";

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
          className="border px-3 py-1 rounded"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric title="Ventas del día" value={String(resumen.data?.cantidad_ventas ?? 0)} />
        <Metric title="Total vendido" value={money(resumen.data?.total ?? 0)} />
        <Metric title="Ticket promedio" value={money(resumen.data?.ticket_promedio ?? 0)} />
        <Metric title="Bajo stock" value={String(bajoStock.data?.pagination.total ?? 0)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Ventas mensuales</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mensual.data ?? []}>
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>
        <section className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Productos más vendidos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top.data?.items ?? []}>
              <XAxis dataKey="producto_nombre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad_vendida" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Inventario valorizado</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th>Producto</th><th>Stock</th><th>Valor venta</th><th>Estado</th></tr></thead>
            <tbody>{inventario.data?.items.map((item) => <tr key={item.producto_id} className="border-t"><td className="py-2">{item.producto_nombre}</td><td>{item.stock}</td><td>{money(item.valor_venta)}</td><td>{item.activo ? "Activo" : "Inactivo"}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportList title="Bajo stock" rows={bajoStock.data?.items.map((i) => `${i.producto_nombre} · ${i.stock} unidades`) ?? []} />
        <ReportList title="Consignación" rows={consignacion.data?.items.map((i) => `${i.proveedor_nombre} · ${i.productos} productos · comisión ${money(i.comision_estimada)}`) ?? []} />
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="bg-white rounded-lg border p-5"><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold mt-1">{value}</p></div>;
}

function ReportList({ title, rows }: { title: string; rows: string[] }) {
  return <section className="bg-white rounded-lg border p-5"><h2 className="font-semibold mb-3">{title}</h2><div className="space-y-2 text-sm">{rows.map((row) => <div className="border rounded p-2" key={row}>{row}</div>)}</div></section>;
}
