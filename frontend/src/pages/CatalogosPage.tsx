import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenIcon, TruckIcon } from "@heroicons/react/24/outline";
import {
  createCategoria,
  createProveedor,
  getCategorias,
  getProveedores,
} from "../services/catalogService";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";

export default function CatalogosPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [categoria, setCategoria] = useState({ nombre: "", multiplicador_ganancia: 1.3, variacion_maxima_precio: 0.2 });
  const [proveedor, setProveedor] = useState({ nombre: "", telefono: "", porcentaje_comision: 0 });

  const categorias = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const proveedores = useQuery({ queryKey: ["proveedores"], queryFn: () => getProveedores() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categorias"] });
    queryClient.invalidateQueries({ queryKey: ["proveedores"] });
  };

  const createCat = useMutation({
    mutationFn: () => createCategoria(categoria),
    onSuccess: () => { invalidate(); setCategoria({ nombre: "", multiplicador_ganancia: 1.3, variacion_maxima_precio: 0.2 }); setMessage("Categoría creada."); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });
  const createProv = useMutation({
    mutationFn: () => createProveedor({ ...proveedor, telefono: proveedor.telefono || null }),
    onSuccess: () => { invalidate(); setProveedor({ nombre: "", telefono: "", porcentaje_comision: 0 }); setMessage("Proveedor creado."); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });
  return (
    <div className="admin-page space-y-6">
      <h1 className="admin-page-title">Catálogos</h1>
      {message && <p className="admin-message">{message}</p>}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModuleCard title="Nueva categoría" icon={BookOpenIcon} contentClassName="p-4">
          <div className="space-y-3">
          <FormField label="Nombre">
            <input className={inputClassName} placeholder="Nombre" value={categoria.nombre} onChange={(e) => setCategoria({ ...categoria, nombre: e.target.value })} />
          </FormField>
          <FormField label="Multiplicador de ganancia">
            <input className={inputClassName} type="number" step="0.01" value={categoria.multiplicador_ganancia} onChange={(e) => setCategoria({ ...categoria, multiplicador_ganancia: Number(e.target.value) })} />
          </FormField>
          <FormField label="Variación máxima de precio">
            <input className={inputClassName} type="number" step="0.01" value={categoria.variacion_maxima_precio} onChange={(e) => setCategoria({ ...categoria, variacion_maxima_precio: Number(e.target.value) })} />
          </FormField>
          <Button onClick={() => createCat.mutate()} disabled={createCat.isPending}>{createCat.isPending ? "Creando..." : "Crear"}</Button>
          </div>
        </ModuleCard>
        <ModuleCard title="Nuevo proveedor" icon={TruckIcon} contentClassName="p-4">
          <div className="space-y-3">
          <FormField label="Nombre">
            <input className={inputClassName} placeholder="Nombre" value={proveedor.nombre} onChange={(e) => setProveedor({ ...proveedor, nombre: e.target.value })} />
          </FormField>
          <FormField label="Teléfono">
            <input className={inputClassName} placeholder="Teléfono" value={proveedor.telefono} onChange={(e) => setProveedor({ ...proveedor, telefono: e.target.value })} />
          </FormField>
          <FormField label="Comisión del proveedor (%)">
            <input className={inputClassName} type="number" step="0.01" placeholder="Comisión %" value={proveedor.porcentaje_comision} onChange={(e) => setProveedor({ ...proveedor, porcentaje_comision: Number(e.target.value) })} />
          </FormField>
          <Button onClick={() => createProv.mutate()} disabled={createProv.isPending}>{createProv.isPending ? "Creando..." : "Crear"}</Button>
          </div>
        </ModuleCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <List title="Categorías" rows={categorias.data?.items.map((c) => [`#${c.id}`, c.nombre, `x${c.multiplicador_ganancia}`]) ?? []} />
        <List title="Proveedores" rows={proveedores.data?.items.map((p) => [`#${p.id}`, p.nombre, `${p.porcentaje_comision}%`, p.activo ? "Activo" : "Inactivo"]) ?? []} />
      </section>
    </div>
  );
}

function List({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <ModuleCard title={title} contentClassName="p-4">
      <div className="space-y-2 text-sm">{rows.map((row) => <div key={row.join("-")} className="border rounded p-2">{row.join(" · ")}</div>)}</div>
    </ModuleCard>
  );
}
