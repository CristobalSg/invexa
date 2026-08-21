import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenIcon, TruckIcon } from "@heroicons/react/24/outline";
import {
  createCategoria,
  createProveedor,
  getCategorias,
  getProveedores,
} from "../services/catalogService";
import type { Categoria, Proveedor } from "../types/api";
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
        <CategoryList items={categorias.data?.items ?? []} />
        <ProviderList items={proveedores.data?.items ?? []} />
      </section>
    </div>
  );
}

function CategoryList({ items }: { items: Categoria[] }) {
  return (
    <ModuleCard title="Categorías" icon={BookOpenIcon} contentClassName="p-4">
      {items.length === 0 ? (
        <p className="catalog-list-empty">Sin categorías registradas.</p>
      ) : (
        <div className="catalog-card-list">
          {items.map((category) => (
            <article key={category.id} className="catalog-item-card">
              <div className="catalog-item-main">
                <span className="catalog-item-avatar">{category.nombre.trim().charAt(0).toUpperCase() || "C"}</span>
                <div className="min-w-0">
                  <h3>{category.nombre}</h3>
                  <p>Categoria #{category.id}</p>
                </div>
              </div>
              <div className="catalog-item-stats">
                <span>
                  <small>Ganancia</small>
                  x{Number(category.multiplicador_ganancia).toFixed(2)}
                </span>
                <span>
                  <small>Variación</small>
                  {(Number(category.variacion_maxima_precio) * 100).toFixed(0)}%
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </ModuleCard>
  );
}

function ProviderList({ items }: { items: Proveedor[] }) {
  return (
    <ModuleCard title="Proveedores" icon={TruckIcon} contentClassName="p-4">
      {items.length === 0 ? (
        <p className="catalog-list-empty">Sin proveedores registrados.</p>
      ) : (
        <div className="catalog-card-list">
          {items.map((provider) => (
            <article key={provider.id} className="catalog-item-card">
              <div className="catalog-item-main">
                <span className="catalog-item-avatar provider">{provider.nombre.trim().charAt(0).toUpperCase() || "P"}</span>
                <div className="min-w-0">
                  <h3>{provider.nombre}</h3>
                  <p>{provider.telefono ?? "Sin teléfono"} · Proveedor #{provider.id}</p>
                </div>
              </div>
              <div className="catalog-item-stats">
                <span>
                  <small>Comisión</small>
                  {Number(provider.porcentaje_comision).toFixed(2)}%
                </span>
                <span className={provider.activo ? "is-active" : "is-inactive"}>
                  <small>Estado</small>
                  {provider.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </ModuleCard>
  );
}
