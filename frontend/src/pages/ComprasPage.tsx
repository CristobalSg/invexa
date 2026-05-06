import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCompra, getCompras } from "../services/compraService";
import { getProducts } from "../services/productService";

const money = (value: number) => `$${value.toLocaleString()}`;

export default function ComprasPage() {
  const queryClient = useQueryClient();
  const { data: productos } = useQuery({ queryKey: ["products"], queryFn: () => getProducts({ activo: true }) });
  const { data: compras } = useQuery({ queryKey: ["compras"], queryFn: () => getCompras() });
  const [productoId, setProductoId] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [costo, setCosto] = useState(0);
  const [precioFinal, setPrecioFinal] = useState(0);
  const [actualizarPrecio, setActualizarPrecio] = useState(true);
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => createCompra({ items: [{ producto_id: productoId, cantidad, costo_unitario: costo, precio_final: precioFinal || undefined, actualizar_precio_venta: actualizarPrecio }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setMessage("Compra registrada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo registrar compra"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compras</h1>
      <section className="bg-white rounded-lg border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Registrar compra</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={productoId} onChange={(e) => setProductoId(Number(e.target.value))} className="border rounded px-3 py-2">
            <option value={0}>Producto</option>
            {productos?.items.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input type="number" min={0.01} step="0.01" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="border rounded px-3 py-2" placeholder="Cantidad" />
          <input type="number" min={0} value={costo} onChange={(e) => setCosto(Number(e.target.value))} className="border rounded px-3 py-2" placeholder="Costo" />
          <input type="number" min={0} value={precioFinal} onChange={(e) => setPrecioFinal(Number(e.target.value))} className="border rounded px-3 py-2" placeholder="Precio final" />
          <button disabled={!productoId} onClick={() => mutation.mutate()} className="bg-blue-600 disabled:bg-gray-300 text-white rounded px-4 py-2">Registrar</button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={actualizarPrecio} onChange={(e) => setActualizarPrecio(e.target.checked)} />Actualizar precio de venta</label>
        {message && <p className="text-sm">{message}</p>}
      </section>
      <section className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500"><tr><th className="p-3">ID</th><th>Usuario</th><th>Total costo</th><th>Fecha</th></tr></thead>
          <tbody>{compras?.items.map((c) => <tr key={c.id} className="border-t"><td className="p-3">#{c.id}</td><td>{c.usuario_nombre}</td><td>{money(c.total_costo)}</td><td>{new Date(c.creado_en).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
