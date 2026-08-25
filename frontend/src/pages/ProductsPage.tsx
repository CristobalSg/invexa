import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircleIcon, FunnelIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  getProducts,
  deleteProduct,
  reactivateProduct,
} from "../services/productService";
import type { ModoInventarioProducto, Producto } from "../types/api";

import { ProductModal } from "../components/ProductModal";
import ProductFormCreate from "../components/ProductFormCreate";
import { getStoredUser } from "../services/authService";
import { getCategorias } from "../services/catalogService";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";
import ProductTile from "../components/ProductTile";
import TouchSelectField from "../components/TouchSelectField";

const modoInventarioLabels: Record<ModoInventarioProducto, string> = {
  SIN_INVENTARIO: "Sin inventario",
  FLEXIBLE: "Inventario flexible",
  ESTRICTO: "Inventario estricto",
};

type EstadoProductoFiltro = "ACTIVOS" | "DESHABILITADOS" | "TODOS";
const productFormId = "inventory-product-form";

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);
  const [createdProductAlert, setCreatedProductAlert] = useState<Producto | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [estado, setEstado] = useState<EstadoProductoFiltro>("ACTIVOS");
  const [page, setPage] = useState(1);
  const storedUser = getStoredUser();
  const isOwner = storedUser?.rol === "OWNER";
  const canCreateProduct = storedUser?.rol === "OWNER" || storedUser?.rol === "CASHIER";

  const queryClient = useQueryClient();
  const normalizedCodigo = codigo.trim();
  const normalizedNombre = nombre.trim();
  const estadoActivo = estado === "TODOS" ? undefined : estado === "ACTIVOS";

  const { data: products, isLoading, isFetching, error } = useQuery({
    queryKey: ["products", { page, codigo: normalizedCodigo, nombre: normalizedNombre, categoriaId, estado }],
    queryFn: () =>
      getProducts({
        page,
        limit: 100,
        codigo: normalizedCodigo || undefined,
        nombre: normalizedNombre || undefined,
        categoria_id: categoriaId ? Number(categoriaId) : undefined,
        activo: estadoActivo,
      }),
    placeholderData: keepPreviousData,
  });
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });

  useEffect(() => {
    setPage(1);
  }, [categoriaId, codigo, estado, nombre]);

  useEffect(() => {
    if (!createdProductAlert) return;

    const timer = window.setTimeout(() => setCreatedProductAlert(null), 1750);
    return () => window.clearTimeout(timer);
  }, [createdProductAlert]);

  const productosFiltrados = products?.items ?? [];
  const pagination = products?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleEdit = (product: Producto) => {
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleReactivate = (id: string) => {
    reactivateMutation.mutate(id);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
  };

  const handleSuccess = (product: Producto, action: "created" | "updated") => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    handleCloseModal();
    if (action === "created") {
      setCreatedProductAlert(product);
    }
  };

  return (
    <div className="admin-page space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="admin-page-title">Gestión de Inventario</h1>
      </div>
      <ModuleCard title="Filtros" icon={FunnelIcon} className="overflow-visible" contentClassName="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <FormField label="Código de barra">
            <input
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              className={inputClassName}
              placeholder="Buscar por código"
            />
          </FormField>
          <FormField label="Nombre">
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={inputClassName}
              placeholder="Buscar por nombre"
            />
          </FormField>
          <TouchSelectField
            label="Categoría"
            value={categoriaId}
            options={[
              { value: "", label: "Todas" },
              ...(categorias?.items ?? []).map((category) => ({
                value: String(category.id),
                label: category.nombre,
              })),
            ]}
            onChange={setCategoriaId}
            placeholder="Todas"
          />
          <TouchSelectField
            label="Estado"
            value={estado}
            options={[
              { value: "ACTIVOS", label: "Activos" },
              { value: "DESHABILITADOS", label: "Deshabilitados" },
              { value: "TODOS", label: "Todos" },
            ]}
            onChange={(value) => setEstado(value as EstadoProductoFiltro)}
          />
        </div>
      </ModuleCard>
      {error && <p className="text-sm text-red-500">Error al cargar productos</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-500">
          {pagination ? `${pagination.total} productos · Página ${pagination.page} de ${Math.max(1, pagination.totalPages)}` : "Cargando productos..."}
        </p>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1}
              className="rounded-xl border border-[#ececf0] bg-white px-4 py-2 text-sm font-bold text-[#5f626b] disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-xl border border-[#ececf0] bg-white px-4 py-2 text-sm font-bold text-[#5f626b] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
      {isFetching && <p className="text-sm text-gray-500">Actualizando productos...</p>}

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={productToEdit ? "Editar producto" : "Agregar producto"}
        action={
          <Button type="submit" form={productFormId} className="product-modal-submit">
            {productToEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        }
      >
        <ProductFormCreate
          formId={productFormId}
          hideActions
          requireAdminPasswordForCreate={!isOwner}
          initialData={productToEdit ?? undefined}
          onSuccess={handleSuccess}
        />
      </ProductModal>

      {createdProductAlert && (
        <div className="flow-modal-backdrop product-created-alert-backdrop" role="presentation">
          <div className="product-created-alert" role="status" aria-live="polite">
            <span className="product-created-alert-icon">
              <CheckCircleIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p>Producto creado</p>
              <h2>{createdProductAlert.nombre}</h2>
              <div className="product-created-alert-details">
                <span>{createdProductAlert.codigo_barras ?? "Sin código"}</span>
                <span>${createdProductAlert.precio_venta.toLocaleString()}</span>
                <span>
                  Stock {createdProductAlert.stock} {createdProductAlert.unidad_venta === "PESO" ? "kg" : "un."}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pos-product-grid inventory-product-grid">
        {isLoading && <p>Cargando productos...</p>}
        {productosFiltrados.map((product) => (
          <ProductTile
            key={product.id}
            product={product}
            mode="inventory"
            inventoryModeLabel={modoInventarioLabels[product.modo_inventario]}
            onEdit={isOwner ? () => handleEdit(product) : undefined}
            onDelete={isOwner && product.activo ? () => handleDelete(product.id.toString()) : undefined}
            onReactivate={isOwner && !product.activo ? () => handleReactivate(product.id.toString()) : undefined}
          />
        ))}
        {!isLoading && productosFiltrados.length === 0 && (
          <p className="text-sm text-gray-500">No se encontraron productos.</p>
        )}
      </div>

      {canCreateProduct && (
        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setProductToEdit(null);
          }}
          className="inventory-fab"
          aria-label="Agregar producto"
          title="Agregar producto"
        >
          <PlusIcon className="h-8 w-8" />
        </button>
      )}
    </div>
  );
}
