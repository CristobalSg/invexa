import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EllipsisHorizontalIcon, FunnelIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  getProducts,
  deleteProduct,
  reactivateProduct,
  resetProduceProducts,
  type ResetProduceProductInput,
} from "../services/productService";
import type { ModoInventarioProducto, Producto } from "../types/api";

import { ProductModal } from "../components/ProductModal";
import ProductFormCreate from "../components/ProductFormCreate";
import AdminPasswordModal from "../components/AdminPasswordModal";
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

const produceImageModules = import.meta.glob("../assets/images/products/{frutas,verduras}/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const produceNameWords: Record<string, string> = {
  aji: "Ají",
  brocoli: "Brócoli",
  pimenton: "Pimentón",
  pina: "Piña",
  rabano: "Rábano",
};

const formatProduceName = (path: string) => {
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/^\d+[_-]+/, "") ?? "";
  return filename
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => produceNameWords[word] ?? word.charAt(0).toLocaleUpperCase("es-CL") + word.slice(1))
    .join(" ");
};

const produceProductsFromImages: ResetProduceProductInput[] = Object.keys(produceImageModules)
  .map((path) => ({
    nombre: formatProduceName(path),
    tipo: (path.includes("/verduras/") ? "VERDURA" : "FRUTA") as ResetProduceProductInput["tipo"],
  }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CL"));

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
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

  const resetProduceMutation = useMutation({
    mutationFn: (masterPassword: string) =>
      resetProduceProducts({
        master_password: masterPassword,
        productos: produceProductsFromImages,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setIsResetPasswordOpen(false);
      setFeedbackMessage(
        `Frutas y verduras actualizadas: ${result.desactivados} desactivados y ${result.creados} creados.`,
      );
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

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    handleCloseModal();
  };

  return (
    <div className="admin-page space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="admin-page-title">Gestión de Inventario</h1>
        {isOwner && (
          <button
            type="button"
            onClick={() => setIsOptionsOpen(true)}
            className="pos-options-btn"
            aria-label="Opciones de inventario"
            title="Opciones de inventario"
          >
            <EllipsisHorizontalIcon className="h-5 w-5" />
            <span>Opciones</span>
          </button>
        )}
      </div>
      {feedbackMessage && (
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {feedbackMessage}
        </p>
      )}
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

      {isOptionsOpen && (
        <div
          className="flow-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOptionsOpen(false);
          }}
        >
          <div className="flow-modal max-w-md p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#25262c]">Opciones de inventario</h2>
                <p className="mt-1 text-sm font-medium text-[#7b7d86]">
                  Acciones especiales para cargar productos masivos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOptionsOpen(false)}
                className="rounded-xl border border-[#ececf0] bg-white px-3 py-2 text-sm font-bold text-[#6b6d76]"
              >
                X
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOptionsOpen(false);
                setIsResetPasswordOpen(true);
              }}
              disabled={produceProductsFromImages.length === 0}
              className="mt-5 w-full rounded-2xl bg-[#25262c] px-4 py-4 text-left text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(31,35,48,.20)] disabled:opacity-50"
            >
              Recrear frutas y verduras
              <span className="mt-1 block text-xs font-semibold text-white/70">
                Desactiva los actuales y crea {produceProductsFromImages.length} desde las carpetas de imágenes.
              </span>
            </button>
          </div>
        </div>
      )}

      {isResetPasswordOpen && (
        <AdminPasswordModal
          title="Contraseña de administrador"
          description={`Se desactivarán los productos actuales de frutas y verduras, y se crearán ${produceProductsFromImages.length} productos nuevos desde las imágenes.`}
          isPending={resetProduceMutation.isPending}
          onClose={() => setIsResetPasswordOpen(false)}
          onConfirm={(password) => resetProduceMutation.mutate(password)}
        >
          {resetProduceMutation.isError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
              No se pudo recrear frutas y verduras. Revisa la contraseña e intenta nuevamente.
            </p>
          )}
        </AdminPasswordModal>
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
