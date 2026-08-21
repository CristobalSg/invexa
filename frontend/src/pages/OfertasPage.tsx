import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TagIcon } from "@heroicons/react/24/outline";
import ListPanel from "../components/ListPanel";
import {
  createOferta,
  deactivateOferta,
  getOfertas,
} from "../services/catalogService";
import { getProducts } from "../services/productService";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";

const toIsoDateTime = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const formatOfferDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "Sin término";

const ofertaDisplayQuantity = (cantidad: number, unidad: "UNIDAD" | "PESO") =>
  unidad === "PESO" ? cantidad * 1000 : cantidad;

const initialOferta = {
  producto_id: 0,
  nombre: "",
  cantidad_oferta: 1,
  precio_oferta: 0,
  inicia_en: "",
  termina_en: "",
  activa: true,
  motivo: "",
};

export default function OfertasPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [oferta, setOferta] = useState(initialOferta);

  const ofertas = useQuery({ queryKey: ["ofertas"], queryFn: () => getOfertas() });
  const productos = useQuery({ queryKey: ["products"], queryFn: () => getProducts({ activo: true }) });
  const selectedOfferProduct = productos.data?.items.find((product) => product.id === oferta.producto_id);
  const ofertaCantidadLabel = selectedOfferProduct?.unidad_venta === "PESO" ? "Cantidad de la oferta (gramos)" : "Cantidad de la oferta";
  const ofertaCantidadStep = selectedOfferProduct?.unidad_venta === "PESO" ? 1 : 0.001;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ofertas"] });
  };

  const createOff = useMutation({
    mutationFn: () => createOferta({
      producto_id: oferta.producto_id,
      nombre: oferta.nombre,
      cantidad_oferta: selectedOfferProduct?.unidad_venta === "PESO"
        ? oferta.cantidad_oferta / 1000
        : oferta.cantidad_oferta,
      precio_oferta: oferta.precio_oferta,
      activa: oferta.activa,
      inicia_en: toIsoDateTime(oferta.inicia_en),
      termina_en: toIsoDateTime(oferta.termina_en) ?? null,
      motivo: oferta.motivo || null,
    }),
    onSuccess: () => {
      invalidate();
      setOferta(initialOferta);
      setMessage("Oferta creada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });

  const disableOff = useMutation({
    mutationFn: deactivateOferta,
    onSuccess: invalidate,
  });

  return (
    <div className="admin-page space-y-6">
      <h1 className="admin-page-title">Ofertas</h1>
      {message && <p className="admin-message">{message}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <div className="xl:sticky xl:top-6 xl:self-start">
      <ModuleCard title="Crear oferta" description="Define promociones por cantidad para productos activos." icon={TagIcon} contentClassName="p-5">
        <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Producto">
            <select className={inputClassName} value={oferta.producto_id} onChange={(e) => setOferta({ ...oferta, producto_id: Number(e.target.value) })}>
              <option value={0}>Producto</option>
              {productos.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </FormField>
          <FormField label="Nombre de la oferta">
            <input className={inputClassName} placeholder="Ej: 2 lechugas por $1.000" value={oferta.nombre} onChange={(e) => setOferta({ ...oferta, nombre: e.target.value })} />
          </FormField>
          <FormField label="Precio de oferta">
            <input className={inputClassName} type="number" min={0} step="0.01" value={oferta.precio_oferta} onChange={(e) => setOferta({ ...oferta, precio_oferta: Number(e.target.value) })} />
          </FormField>
          <FormField label={ofertaCantidadLabel}>
            <input className={inputClassName} type="number" min={0.001} step={ofertaCantidadStep} value={oferta.cantidad_oferta} onChange={(e) => setOferta({ ...oferta, cantidad_oferta: Number(e.target.value) })} />
          </FormField>
          <FormField label="Inicio">
            <input className={inputClassName} type="datetime-local" value={oferta.inicia_en} onChange={(e) => setOferta({ ...oferta, inicia_en: e.target.value })} />
          </FormField>
          <FormField label="Término">
            <input className={inputClassName} type="datetime-local" value={oferta.termina_en} onChange={(e) => setOferta({ ...oferta, termina_en: e.target.value })} />
          </FormField>
          <FormField label="Motivo" className="lg:col-span-2">
            <input className={inputClassName} placeholder="Motivo" value={oferta.motivo} onChange={(e) => setOferta({ ...oferta, motivo: e.target.value })} />
          </FormField>
          <div className="flex items-end justify-between gap-3">
            <label className="flex items-center gap-2 pb-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={oferta.activa} onChange={(e) => setOferta({ ...oferta, activa: e.target.checked })} />
              Activa
            </label>
            <Button
              disabled={!oferta.producto_id || createOff.isPending}
              onClick={() => createOff.mutate()}
            >
              {createOff.isPending ? "Creando..." : "Crear"}
            </Button>
          </div>
        </div>
        </div>
      </ModuleCard>
        </div>

        <div>
      <ListPanel
        title="Ofertas registradas"
        icon={TagIcon}
        isLoading={ofertas.isLoading}
        loadingMessage="Cargando ofertas..."
        emptyMessage="Sin ofertas registradas."
        items={(ofertas.data?.items ?? []).map((o) => ({
          id: o.id,
          icon: TagIcon,
          title: o.nombre,
          description: `${ofertaDisplayQuantity(o.cantidad_oferta, o.producto_unidad_venta)} ${o.producto_unidad_venta === "PESO" ? "g" : "un."} ${o.producto_nombre}`,
          meta: [
            o.activa ? "Activa" : "Inactiva",
            o.esta_vigente ? "Vigente" : "No vigente",
            `Hasta ${formatOfferDate(o.termina_en)}`,
            o.motivo ?? "Sin motivo",
          ],
          amount: `$${o.precio_oferta.toLocaleString()}`,
          amountClassName: "text-blue-700",
          action: o.activa ? (
            <button
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              onClick={() => disableOff.mutate(o.id)}
            >
              Desactivar
            </button>
          ) : undefined,
        }))}
      />
        </div>
      </div>
    </div>
  );
}
