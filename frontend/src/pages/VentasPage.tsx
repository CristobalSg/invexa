import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanknotesIcon, FunnelIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { anularVenta, getVentas } from "../services/transactionService";
import type { EstadoVenta, MetodoPago } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";

const money = (value: number) => `$${value.toLocaleString()}`;

export default function VentasPage() {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoVenta | "">("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [fecha, setFecha] = useState("");
  const [message, setMessage] = useState("");
  const [ventaAnularId, setVentaAnularId] = useState<number | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["ventas", estado, metodo, fecha],
    queryFn: () => getVentas({ estado: estado || undefined, metodo_pago: metodo || undefined, fecha_desde: fecha || undefined, fecha_hasta: fecha || undefined }),
  });
  const anulacion = useMutation({
    mutationFn: ({ id, motivo, password }: { id: number; motivo: string; password: string }) =>
      anularVenta(id, motivo, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      setVentaAnularId(null);
      setMotivoAnulacion("");
      setMasterPassword("");
      setMessage("Venta anulada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo anular"),
  });

  const handleConfirmAnulacion = () => {
    if (!ventaAnularId) return;
    if (motivoAnulacion.trim().length < 3) {
      setMessage("Ingresa un motivo de anulación.");
      return;
    }
    if (!masterPassword) {
      setMessage("Ingresa la clave maestra de administrador.");
      return;
    }

    anulacion.mutate({
      id: ventaAnularId,
      motivo: motivoAnulacion.trim(),
      password: masterPassword,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ventas</h1>
      <ModuleCard title="Filtros" icon={FunnelIcon} contentClassName="p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FormField label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClassName} />
        </FormField>
        <FormField label="Estado">
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoVenta | "")} className={inputClassName}>
          <option value="">Todos los estados</option><option value="COMPLETADA">Completada</option><option value="ANULADA">Anulada</option>
        </select>
        </FormField>
        <FormField label="Método de pago">
        <select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago | "")} className={inputClassName}>
          <option value="">Todos los pagos</option><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="MIXTO">Mixto</option>
        </select>
        </FormField>
      </div>
      </ModuleCard>
      {message && <p className="bg-white rounded border p-3 text-sm">{message}</p>}
      <ListPanel
        title="Ventas registradas"
        icon={ShoppingBagIcon}
        isLoading={isLoading}
        loadingMessage="Cargando ventas..."
        emptyMessage="Sin ventas registradas."
        items={(data?.items ?? []).map((venta) => ({
          id: venta.id,
          icon: BanknotesIcon,
          title: `Venta #${venta.id}`,
          description: venta.usuario_nombre,
          meta: [
            new Date(venta.creado_en).toLocaleString(),
            venta.metodo_pago,
            venta.estado,
          ],
          amount: money(venta.total),
          action: venta.estado === "COMPLETADA" ? (
            <button
              onClick={() => {
                setVentaAnularId(venta.id);
                setMotivoAnulacion("");
                setMasterPassword("");
              }}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Anular
            </button>
          ) : undefined,
        }))}
      />
      {ventaAnularId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Anular venta #{ventaAnularId}</h2>
            <FormField label="Motivo" className="mt-4">
              <textarea
                value={motivoAnulacion}
                onChange={(event) => setMotivoAnulacion(event.target.value)}
                className={`${inputClassName} min-h-24`}
              />
            </FormField>
            <FormField label="Clave admin" className="mt-4">
              <input
                type="password"
                value={masterPassword}
                onChange={(event) => setMasterPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleConfirmAnulacion();
                  if (event.key === "Escape") setVentaAnularId(null);
                }}
                className={inputClassName}
              />
            </FormField>
            <FormActions className="mt-1">
              <Button
                variant="ghost"
                onClick={() => setVentaAnularId(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmAnulacion}
                disabled={anulacion.isPending}
              >
                {anulacion.isPending ? "Anulando..." : "Anular venta"}
              </Button>
            </FormActions>
          </div>
        </div>
      )}
    </div>
  );
}
