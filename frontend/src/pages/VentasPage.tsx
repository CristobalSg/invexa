import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanknotesIcon, ChevronDownIcon, FunnelIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { anularVenta, getVenta, getVentas } from "../services/transactionService";
import type { EstadoVenta, MetodoPago } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { FormField, inputClassName } from "../components/FormControls";
import AdminPasswordModal from "../components/AdminPasswordModal";
import TouchSelectField from "../components/TouchSelectField";

const money = (value: number) => `$${value.toLocaleString()}`;
const signedMoney = (value: number) => `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;

export default function VentasPage() {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoVenta | "">("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [fecha, setFecha] = useState("");
  const [message, setMessage] = useState("");
  const [ventaAnularId, setVentaAnularId] = useState<number | null>(null);
  const [expandedVentaId, setExpandedVentaId] = useState<number | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["ventas", estado, metodo, fecha],
    queryFn: () => getVentas({ estado: estado || undefined, metodo_pago: metodo || undefined, fecha_desde: fecha || undefined, fecha_hasta: fecha || undefined }),
  });
  const ventaDetalle = useQuery({
    queryKey: ["venta", expandedVentaId],
    queryFn: () => getVenta(expandedVentaId!),
    enabled: expandedVentaId !== null,
  });
  const anulacion = useMutation({
    mutationFn: ({ id, motivo, password }: { id: number; motivo: string; password: string }) =>
      anularVenta(id, motivo, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      setVentaAnularId(null);
      setMotivoAnulacion("");
      setMessage("Venta anulada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo anular"),
  });

  const handleConfirmAnulacion = (masterPassword: string) => {
    if (!ventaAnularId) return;
    if (motivoAnulacion.trim().length < 3) {
      setMessage("Ingresa un motivo de anulación.");
      return;
    }

    anulacion.mutate({
      id: ventaAnularId,
      motivo: motivoAnulacion.trim(),
      password: masterPassword,
    });
  };

  return (
    <div className="admin-page space-y-6">
      <h1 className="admin-page-title">Ventas</h1>
      <ModuleCard title="Filtros" icon={FunnelIcon} className="overflow-visible" contentClassName="p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FormField label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClassName} />
        </FormField>
        <TouchSelectField
          label="Estado"
          value={estado}
          options={[
            { value: "", label: "Todos los estados" },
            { value: "COMPLETADA", label: "Completada" },
            { value: "ANULADA", label: "Anulada" },
          ]}
          onChange={(value) => setEstado(value as EstadoVenta | "")}
        />
        <TouchSelectField
          label="Método de pago"
          value={metodo}
          options={[
            { value: "", label: "Todos los pagos" },
            { value: "EFECTIVO", label: "Efectivo" },
            { value: "TARJETA", label: "Tarjeta" },
            { value: "TRANSFERENCIA", label: "Transferencia" },
            { value: "MIXTO", label: "Mixto" },
          ]}
          onChange={(value) => setMetodo(value as MetodoPago | "")}
        />
      </div>
      </ModuleCard>
      {message && <p className="admin-message">{message}</p>}
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
          onClick: () => setExpandedVentaId((current) => (current === venta.id ? null : venta.id)),
          meta: [
            new Date(venta.creado_en).toLocaleString(),
            venta.metodo_pago,
            venta.estado,
            ...(venta.metodo_pago === "EFECTIVO"
              ? [
                  `Real ${money(venta.total_sin_redondeo)}`,
                  `Redondeo ${signedMoney(venta.redondeo)}`,
                  ...(venta.monto_recibido !== null ? [`Recibido ${money(venta.monto_recibido)}`] : []),
                  ...(venta.vuelto !== null ? [`Vuelto ${money(venta.vuelto)}`] : []),
                ]
              : []),
          ],
          amount: (
            <div className="flex items-center justify-end gap-2">
              <div>
                <small className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b8e98]">
                  Cobrado
                </small>
                {money(venta.total)}
              </div>
              <ChevronDownIcon className={`h-5 w-5 text-[#8b8e98] transition ${expandedVentaId === venta.id ? "rotate-180" : ""}`} />
            </div>
          ),
          badge: expandedVentaId === venta.id ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-1 text-xs font-bold text-[#047857]">
              Detalle abierto
            </span>
          ) : undefined,
          action: venta.estado === "COMPLETADA" ? (
            <button
              onClick={() => {
                setVentaAnularId(venta.id);
                setMotivoAnulacion("");
              }}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Anular
            </button>
          ) : undefined,
          expandedContent: expandedVentaId === venta.id ? (
            ventaDetalle.isLoading ? (
              <p className="text-sm text-gray-500">Cargando detalle...</p>
            ) : ventaDetalle.data ? (
              <div className="space-y-3">
                <div className="grid gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm md:grid-cols-4">
                  <span><b className="block text-xs uppercase text-gray-500">Subtotal</b>{money(ventaDetalle.data.subtotal)}</span>
                  <span><b className="block text-xs uppercase text-gray-500">Descuento</b>{money(ventaDetalle.data.descuento)}</span>
                  <span><b className="block text-xs uppercase text-gray-500">Método</b>{ventaDetalle.data.metodo_pago}</span>
                  <span><b className="block text-xs uppercase text-gray-500">Modalidad</b>{ventaDetalle.data.modalidad}</span>
                </div>
                {ventaDetalle.data.detalles.map((detalle) => (
                  <div key={detalle.id} className="grid gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto_auto_auto]">
                    <div>
                      <p className="font-semibold text-gray-900">{detalle.producto_nombre}</p>
                      <p className="text-xs text-gray-500">
                        Producto #{detalle.producto_id}
                        {detalle.proveedor_nombre ? ` · ${detalle.proveedor_nombre}` : ""}
                      </p>
                    </div>
                    <span className="text-gray-600">Cantidad {detalle.cantidad}</span>
                    <span className="text-gray-600">Precio {money(detalle.precio_unitario)}</span>
                    <span className="text-gray-600">Desc. {money(detalle.descuento)}</span>
                    <span className="font-semibold text-gray-900">{money(detalle.total_final)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-600">No se pudo cargar el detalle.</p>
            )
          ) : undefined,
        }))}
      />
      {ventaAnularId && (
        <AdminPasswordModal
          title={`Anular venta #${ventaAnularId}`}
          description="Ingresa el motivo y confirma con la contraseña de administrador."
          isPending={anulacion.isPending}
          onClose={() => setVentaAnularId(null)}
          onConfirm={handleConfirmAnulacion}
        >
          <div className="admin-password-extra">
            <FormField label="Motivo" className="mt-4">
              <textarea
                value={motivoAnulacion}
                onChange={(event) => setMotivoAnulacion(event.target.value)}
                className={`${inputClassName} min-h-24`}
              />
            </FormField>
          </div>
        </AdminPasswordModal>
      )}
    </div>
  );
}
