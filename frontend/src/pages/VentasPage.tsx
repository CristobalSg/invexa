import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anularVenta, getVentas } from "../services/transactionService";
import { getStoredUser } from "../services/authService";
import type { EstadoVenta, MetodoPago } from "../types/api";

const money = (value: number) => `$${value.toLocaleString()}`;

export default function VentasPage() {
  const queryClient = useQueryClient();
  const isOwner = getStoredUser()?.rol === "OWNER";
  const [estado, setEstado] = useState<EstadoVenta | "">("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [fecha, setFecha] = useState("");
  const [message, setMessage] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["ventas", estado, metodo, fecha],
    queryFn: () => getVentas({ estado: estado || undefined, metodo_pago: metodo || undefined, fecha_desde: fecha || undefined, fecha_hasta: fecha || undefined }),
  });
  const anulacion = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => anularVenta(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      setMessage("Venta anulada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo anular"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ventas</h1>
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="border rounded px-3 py-2" />
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoVenta | "")} className="border rounded px-3 py-2">
          <option value="">Todos los estados</option><option value="COMPLETADA">Completada</option><option value="ANULADA">Anulada</option>
        </select>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago | "")} className="border rounded px-3 py-2">
          <option value="">Todos los pagos</option><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="MIXTO">Mixto</option>
        </select>
      </div>
      {message && <p className="bg-white rounded border p-3 text-sm">{message}</p>}
      <div className="bg-white rounded-lg border overflow-x-auto">
        {isLoading ? <p className="p-4">Cargando ventas...</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th className="p-3">ID</th><th>Fecha</th><th>Usuario</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {data?.items.map((venta) => (
                <tr key={venta.id} className="border-t">
                  <td className="p-3">#{venta.id}</td>
                  <td>{new Date(venta.creado_en).toLocaleString()}</td>
                  <td>{venta.usuario_nombre}</td>
                  <td>{venta.metodo_pago}</td>
                  <td>{money(venta.total)}</td>
                  <td>{venta.estado}</td>
                  <td>{isOwner && venta.estado === "COMPLETADA" && <button onClick={() => {
                    const motivo = window.prompt("Motivo de anulación");
                    if (motivo) anulacion.mutate({ id: venta.id, motivo });
                  }} className="text-red-600 font-semibold">Anular</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
