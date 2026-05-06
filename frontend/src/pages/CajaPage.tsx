import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { abrirCaja, cerrarCaja, getCajaActual, getCajaSesiones } from "../services/cajaService";

const money = (value: number) => `$${value.toLocaleString()}`;

export default function CajaPage() {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState(0);
  const [message, setMessage] = useState("");
  const { data: actual, isLoading } = useQuery({ queryKey: ["caja-actual"], queryFn: getCajaActual });
  const { data: sesiones } = useQuery({ queryKey: ["caja-sesiones"], queryFn: () => getCajaSesiones() });

  const abrir = useMutation({
    mutationFn: () => abrirCaja(monto),
    onSuccess: () => {
      setMessage("Caja abierta correctamente.");
      queryClient.invalidateQueries({ queryKey: ["caja-actual"] });
      queryClient.invalidateQueries({ queryKey: ["caja-sesiones"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo abrir caja"),
  });

  const cerrar = useMutation({
    mutationFn: cerrarCaja,
    onSuccess: () => {
      setMessage("Caja cerrada correctamente.");
      queryClient.invalidateQueries({ queryKey: ["caja-actual"] });
      queryClient.invalidateQueries({ queryKey: ["caja-sesiones"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo cerrar caja"),
  });

  if (isLoading) return <p>Cargando caja...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Caja</h1>
      <section className="bg-white rounded-lg border p-5">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Caja actual</h2>
            {actual ? (
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <p>Sesión #{actual.id} · {actual.abierta ? "Abierta" : "Cerrada"}</p>
                <p>Apertura: {money(actual.monto_apertura)}</p>
                <p>Ventas: {actual.resumen.cantidad_ventas} · Total: {money(actual.resumen.total_ventas)}</p>
                <p>Esperado cierre: {money(actual.resumen.monto_esperado_cierre)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No hay caja abierta.</p>
            )}
          </div>
          <div className="flex items-end gap-3">
            {!actual?.abierta && (
              <>
                <input type="number" min={0} value={monto} onChange={(e) => setMonto(Number(e.target.value))} className="border rounded px-3 py-2" />
                <button onClick={() => abrir.mutate()} className="bg-blue-600 text-white rounded px-4 py-2">Abrir</button>
              </>
            )}
            {actual?.abierta && <button onClick={() => cerrar.mutate()} className="bg-red-600 text-white rounded px-4 py-2">Cerrar caja</button>}
          </div>
        </div>
        {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
      </section>

      <section className="bg-white rounded-lg border p-5">
        <h2 className="text-lg font-semibold mb-3">Sesiones recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500"><tr><th>ID</th><th>Usuario</th><th>Apertura</th><th>Cierre</th><th>Total ventas</th><th>Estado</th></tr></thead>
            <tbody>
              {sesiones?.items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2">#{s.id}</td>
                  <td>{s.usuario_nombre}</td>
                  <td>{money(s.monto_apertura)}</td>
                  <td>{s.monto_cierre === null ? "-" : money(s.monto_cierre)}</td>
                  <td>{money(s.resumen.total_ventas)}</td>
                  <td>{s.abierta ? "Abierta" : "Cerrada"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
