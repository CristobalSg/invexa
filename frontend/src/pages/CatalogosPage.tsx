import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PencilIcon, XMarkIcon, BookOpenIcon, TruckIcon } from "@heroicons/react/24/outline";
import {
  createCategoria,
  createProveedor,
  getCategorias,
  getProveedores,
  updateCategoria,
  updateProveedor,
} from "../services/catalogService";
import type { Categoria, Proveedor } from "../types/api";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";

export default function CatalogosPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [categoria, setCategoria] = useState({ nombre: "", multiplicador_ganancia: 1.3, variacion_maxima_precio: 0.2 });
  const [proveedor, setProveedor] = useState({ nombre: "", telefono: "", porcentaje_comision: 0 });
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState({ nombre: "", multiplicador_ganancia: 1.3, variacion_maxima_precio: 0.2 });
  const [providerDraft, setProviderDraft] = useState({ nombre: "", telefono: "", porcentaje_comision: 0, activo: true });

  const categorias = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const proveedores = useQuery({ queryKey: ["proveedores"], queryFn: () => getProveedores() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categorias"] });
    queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
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

  const updateCat = useMutation({
    mutationFn: () => {
      if (!editingCategoryId) throw new Error("Selecciona una categoría para editar.");
      return updateCategoria(editingCategoryId, categoryDraft);
    },
    onSuccess: () => {
      invalidate();
      setEditingCategoryId(null);
      setMessage("Categoría actualizada. Los productos relacionados mantienen su categoría por ID.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });

  const updateProv = useMutation({
    mutationFn: () => {
      if (!editingProviderId) throw new Error("Selecciona un proveedor para editar.");
      return updateProveedor(editingProviderId, {
        ...providerDraft,
        telefono: providerDraft.telefono.trim() || null,
      });
    },
    onSuccess: () => {
      invalidate();
      setEditingProviderId(null);
      setMessage("Proveedor actualizado. Los productos relacionados mantienen su proveedor por ID.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Error"),
  });

  const startCategoryEdit = (category: Categoria) => {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      nombre: category.nombre,
      multiplicador_ganancia: Number(category.multiplicador_ganancia),
      variacion_maxima_precio: Number(category.variacion_maxima_precio),
    });
  };

  const startProviderEdit = (provider: Proveedor) => {
    setEditingProviderId(provider.id);
    setProviderDraft({
      nombre: provider.nombre,
      telefono: provider.telefono ?? "",
      porcentaje_comision: Number(provider.porcentaje_comision),
      activo: provider.activo,
    });
  };

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
        <CategoryList
          items={categorias.data?.items ?? []}
          editingId={editingCategoryId}
          draft={categoryDraft}
          isSaving={updateCat.isPending}
          onChange={setCategoryDraft}
          onEdit={startCategoryEdit}
          onCancel={() => setEditingCategoryId(null)}
          onSave={() => updateCat.mutate()}
        />
        <ProviderList
          items={proveedores.data?.items ?? []}
          editingId={editingProviderId}
          draft={providerDraft}
          isSaving={updateProv.isPending}
          onChange={setProviderDraft}
          onEdit={startProviderEdit}
          onCancel={() => setEditingProviderId(null)}
          onSave={() => updateProv.mutate()}
        />
      </section>
    </div>
  );
}

function CategoryList({
  items,
  editingId,
  draft,
  isSaving,
  onChange,
  onEdit,
  onCancel,
  onSave,
}: {
  items: Categoria[];
  editingId: number | null;
  draft: { nombre: string; multiplicador_ganancia: number; variacion_maxima_precio: number };
  isSaving: boolean;
  onChange: (draft: { nombre: string; multiplicador_ganancia: number; variacion_maxima_precio: number }) => void;
  onEdit: (category: Categoria) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <ModuleCard title="Categorías" icon={BookOpenIcon} contentClassName="p-4">
      {items.length === 0 ? (
        <p className="catalog-list-empty">Sin categorías registradas.</p>
      ) : (
        <div className="catalog-card-list">
          {items.map((category) => (
            <article key={category.id} className="catalog-item-card">
              {editingId === category.id ? (
                <div className="catalog-edit-grid">
                  <FormField label="Nombre">
                    <input className={inputClassName} value={draft.nombre} onChange={(e) => onChange({ ...draft, nombre: e.target.value })} />
                  </FormField>
                  <FormField label="Ganancia">
                    <input className={inputClassName} type="number" step="0.01" value={draft.multiplicador_ganancia} onChange={(e) => onChange({ ...draft, multiplicador_ganancia: Number(e.target.value) })} />
                  </FormField>
                  <FormField label="Variación">
                    <input className={inputClassName} type="number" step="0.01" value={draft.variacion_maxima_precio} onChange={(e) => onChange({ ...draft, variacion_maxima_precio: Number(e.target.value) })} />
                  </FormField>
                  <div className="catalog-edit-actions">
                    <button type="button" className="catalog-icon-button save" onClick={onSave} disabled={isSaving} title="Guardar categoría" aria-label="Guardar categoría">
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button type="button" className="catalog-icon-button" onClick={onCancel} disabled={isSaving} title="Cancelar edición" aria-label="Cancelar edición">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                    <button type="button" className="catalog-icon-button" onClick={() => onEdit(category)} title="Editar categoría" aria-label={`Editar ${category.nombre}`}>
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </ModuleCard>
  );
}

function ProviderList({
  items,
  editingId,
  draft,
  isSaving,
  onChange,
  onEdit,
  onCancel,
  onSave,
}: {
  items: Proveedor[];
  editingId: number | null;
  draft: { nombre: string; telefono: string; porcentaje_comision: number; activo: boolean };
  isSaving: boolean;
  onChange: (draft: { nombre: string; telefono: string; porcentaje_comision: number; activo: boolean }) => void;
  onEdit: (provider: Proveedor) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <ModuleCard title="Proveedores" icon={TruckIcon} contentClassName="p-4">
      {items.length === 0 ? (
        <p className="catalog-list-empty">Sin proveedores registrados.</p>
      ) : (
        <div className="catalog-card-list">
          {items.map((provider) => (
            <article key={provider.id} className="catalog-item-card">
              {editingId === provider.id ? (
                <div className="catalog-edit-grid provider">
                  <FormField label="Nombre">
                    <input className={inputClassName} value={draft.nombre} onChange={(e) => onChange({ ...draft, nombre: e.target.value })} />
                  </FormField>
                  <FormField label="Teléfono">
                    <input className={inputClassName} value={draft.telefono} onChange={(e) => onChange({ ...draft, telefono: e.target.value })} />
                  </FormField>
                  <FormField label="Comisión (%)">
                    <input className={inputClassName} type="number" step="0.01" value={draft.porcentaje_comision} onChange={(e) => onChange({ ...draft, porcentaje_comision: Number(e.target.value) })} />
                  </FormField>
                  <label className="catalog-status-toggle">
                    <input type="checkbox" checked={draft.activo} onChange={(e) => onChange({ ...draft, activo: e.target.checked })} />
                    Activo
                  </label>
                  <div className="catalog-edit-actions">
                    <button type="button" className="catalog-icon-button save" onClick={onSave} disabled={isSaving} title="Guardar proveedor" aria-label="Guardar proveedor">
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button type="button" className="catalog-icon-button" onClick={onCancel} disabled={isSaving} title="Cancelar edición" aria-label="Cancelar edición">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                    <button type="button" className="catalog-icon-button" onClick={() => onEdit(provider)} title="Editar proveedor" aria-label={`Editar ${provider.nombre}`}>
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </ModuleCard>
  );
}
