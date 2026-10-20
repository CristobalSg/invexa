import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CloudArrowUpIcon,
  PencilIcon,
  PlusIcon,
  QrCodeIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  getProducts,
  getAllProducts,
  deleteProduct,
  generateMissingProductBarcodes,
  generateProductBarcode,
  getProduct,
  reactivateProduct,
} from "../services/productService";
import type { ModoInventarioProducto, MovimientoInventario, Producto, TipoMovimientoInventario } from "../types/api";

import { ProductModal } from "../components/ProductModal";
import ProductFormCreate from "../components/ProductFormCreate";
import { authorizeAdmin, getStoredUser } from "../services/authService";
import { getCategorias, getProveedores } from "../services/catalogService";
import { getMovimientos } from "../services/inventoryService";
import { Button, FormField, inputClassName } from "../components/FormControls";
import ProductTile from "../components/ProductTile";
import TouchSelectField from "../components/TouchSelectField";
import AdminPasswordModal from "../components/AdminPasswordModal";
import { sincronizarProductos, type ResultadoSincronizacionProductos } from "../services/supabaseService";

const modoInventarioLabels: Record<ModoInventarioProducto, string> = {
  SIN_INVENTARIO: "Sin inventario",
  FLEXIBLE: "Inventario flexible",
  ESTRICTO: "Inventario estricto",
};

type EstadoProductoFiltro = "ACTIVOS" | "DESHABILITADOS" | "TODOS";
const productFormId = "inventory-product-form";

const movimientoInventarioLabels: Record<TipoMovimientoInventario, string> = {
  VENTA: "Venta",
  COMPRA: "Compra",
  AJUSTE: "Ajuste",
  MERMA: "Merma",
  DEVOLUCION: "Devolución",
  ANULACION: "Anulación",
};

const money = (value: number | null | undefined) => value === null || value === undefined ? "-" : `$${value.toLocaleString()}`;

const getStockDelta = (movement: MovimientoInventario) => {
  if (movement.stock_anterior === null || movement.stock_nuevo === null) {
    return movement.cantidad;
  }

  return Number((movement.stock_nuevo - movement.stock_anterior).toFixed(3));
};

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editProductId = Number(searchParams.get("editar") ?? 0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);
  const [productToView, setProductToView] = useState<Producto | null>(null);
  const [productToAudit, setProductToAudit] = useState<Producto | null>(null);
  const [auditTipo, setAuditTipo] = useState("");
  const [auditDesde, setAuditDesde] = useState("");
  const [auditHasta, setAuditHasta] = useState("");
  const [productActionToAuthorize, setProductActionToAuthorize] = useState<{
    type: "delete" | "reactivate" | "generate-barcode";
    product: Producto;
  } | null>(null);
  const [createdProductAlert, setCreatedProductAlert] = useState<Producto | null>(null);
  const [syncProductsOpen, setSyncProductsOpen] = useState(false);
  const [syncProductsError, setSyncProductsError] = useState("");
  const [syncProductsResult, setSyncProductsResult] = useState<ResultadoSincronizacionProductos | null>(null);
  const [bulkBarcodeOpen, setBulkBarcodeOpen] = useState(false);
  const [bulkBarcodeError, setBulkBarcodeError] = useState("");
  const [bulkBarcodeResult, setBulkBarcodeResult] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [estado, setEstado] = useState<EstadoProductoFiltro>("ACTIVOS");
  const [page, setPage] = useState(1);
  const storedUser = getStoredUser();
  const isOwner = storedUser?.rol === "OWNER";
  const canCreateProduct = storedUser?.rol === "OWNER" || storedUser?.rol === "CASHIER";
  const canManageProduct = canCreateProduct;

  const queryClient = useQueryClient();
  const normalizedSearch = search.trim();
  const estadoActivo = estado === "TODOS" ? undefined : estado === "ACTIVOS";

  const { data: products, isLoading, isFetching, error } = useQuery({
    queryKey: ["products", { page, search: normalizedSearch, categoriaId, proveedorId, estado }],
    queryFn: () =>
      getProducts({
        page,
        limit: 100,
        search: normalizedSearch || undefined,
        categoria_id: categoriaId ? Number(categoriaId) : undefined,
        proveedor_id: proveedorId ? Number(proveedorId) : undefined,
        activo: estadoActivo,
      }),
    placeholderData: keepPreviousData,
  });
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const { data: proveedores } = useQuery({ queryKey: ["proveedores"], queryFn: () => getProveedores({ activo: true }) });
  const editProductQuery = useQuery({
    queryKey: ["product", editProductId],
    queryFn: () => getProduct(editProductId),
    enabled: editProductId > 0,
  });
  const movimientosAuditoria = useQuery({
    queryKey: ["inventario-auditoria", productToAudit?.id, auditTipo, auditDesde, auditHasta],
    queryFn: () =>
      getMovimientos({
        page: 1,
        limit: 100,
        producto_id: productToAudit?.id,
        tipo: auditTipo ? (auditTipo as TipoMovimientoInventario) : undefined,
        fecha_desde: auditDesde || undefined,
        fecha_hasta: auditHasta || undefined,
      }),
    enabled: Boolean(productToAudit),
  });

  useEffect(() => {
    setPage(1);
  }, [categoriaId, estado, proveedorId, search]);

  useEffect(() => {
    if (!editProductQuery.data) return;

    setProductToView(null);
    setProductToEdit(editProductQuery.data);
    setIsModalOpen(true);
    setSearchParams({}, { replace: true });
  }, [editProductQuery.data, setSearchParams]);

  useEffect(() => {
    if (!createdProductAlert) return;

    const timer = window.setTimeout(() => setCreatedProductAlert(null), 1750);
    return () => window.clearTimeout(timer);
  }, [createdProductAlert]);

  const productosFiltrados = products?.items ?? [];
  const pagination = products?.pagination;
  const hasActiveFilters = [
    normalizedSearch,
    categoriaId,
    proveedorId,
    estado !== "ACTIVOS" ? estado : "",
  ].filter(Boolean).length > 0;

  const deleteMutation = useMutation({
    mutationFn: ({ id, masterPassword }: { id: string; masterPassword?: string }) => deleteProduct(id, masterPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductActionToAuthorize(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: ({ id, masterPassword }: { id: string; masterPassword?: string }) => reactivateProduct(id, masterPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductActionToAuthorize(null);
    },
  });

  const generateBarcodeMutation = useMutation({
    mutationFn: ({ id, masterPassword }: { id: string; masterPassword?: string }) =>
      generateProductBarcode(id, masterPassword),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductToView(product);
      setProductActionToAuthorize(null);
    },
  });

  const syncProductsMutation = useMutation({
    mutationFn: async (masterPassword: string) => {
      await authorizeAdmin(masterPassword);
      const allProducts = await getAllProducts({});
      return sincronizarProductos(allProducts);
    },
    onSuccess: (result) => {
      setSyncProductsResult(result);
      setSyncProductsError("");
      setSyncProductsOpen(false);
    },
    onError: (syncError) => {
      setSyncProductsError(syncError instanceof Error ? syncError.message : "No se pudieron subir los productos.");
    },
  });

  const bulkBarcodeMutation = useMutation({
    mutationFn: generateMissingProductBarcodes,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setBulkBarcodeResult(result.generados);
      setBulkBarcodeError("");
      setBulkBarcodeOpen(false);
    },
    onError: (bulkError) => {
      setBulkBarcodeError(
        bulkError instanceof Error ? bulkError.message : "No se pudieron generar los códigos de barras.",
      );
    },
  });

  const handleEdit = (product: Producto) => {
    setProductToView(null);
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      if (!isOwner && productToView) {
        setProductActionToAuthorize({ type: "delete", product: productToView });
        return;
      }

      deleteMutation.mutate({ id });
      setProductToView(null);
    }
  };

  const handleReactivate = (id: string) => {
    if (!isOwner && productToView) {
      setProductActionToAuthorize({ type: "reactivate", product: productToView });
      return;
    }

    reactivateMutation.mutate({ id });
    setProductToView(null);
  };

  const handleGenerateBarcode = (product: Producto) => {
    if (!isOwner) {
      setProductActionToAuthorize({ type: "generate-barcode", product });
      return;
    }

    generateBarcodeMutation.mutate({ id: product.id.toString() });
  };

  const handleAuthorizedProductAction = (masterPassword: string) => {
    if (!productActionToAuthorize) return;

    const id = productActionToAuthorize.product.id.toString();
    if (productActionToAuthorize.type === "delete") {
      deleteMutation.mutate({ id, masterPassword });
      setProductToView(null);
      return;
    }

    if (productActionToAuthorize.type === "generate-barcode") {
      generateBarcodeMutation.mutate({ id, masterPassword });
      return;
    }

    reactivateMutation.mutate({ id, masterPassword });
    setProductToView(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
  };

  const openProductAudit = (product: Producto) => {
    setProductToAudit(product);
    setProductToView(null);
  };

  const handleSuccess = (product: Producto, action: "created" | "updated") => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    handleCloseModal();
    if (action === "created") {
      setCreatedProductAlert(product);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategoriaId("");
    setProveedorId("");
    setEstado("ACTIVOS");
  };

  return (
    <div className="admin-page space-y-6">
      <div className="inventory-header">
        <div className="inventory-title-block">
          <h1 className="admin-page-title">Gestión de Inventario</h1>
          <p className="text-sm font-semibold text-gray-500">
            {pagination ? `${pagination.total} productos · Página ${pagination.page} de ${Math.max(1, pagination.totalPages)}` : "Cargando productos..."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[14px] border border-[#ddd6fe] bg-[#faf9ff] px-4 py-2.5 text-sm font-black text-[#7652ed] transition hover:-translate-y-0.5 hover:bg-[#f3f0ff]"
              onClick={() => {
                setSyncProductsError("");
                setSyncProductsOpen(true);
              }}
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              Subir productos a Supabase
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[14px] border border-[#ddd6fe] bg-[#7652ed] px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#6844db]"
              onClick={() => {
                setBulkBarcodeError("");
                setBulkBarcodeOpen(true);
              }}
            >
              <QrCodeIcon className="h-5 w-5" />
              Generar códigos faltantes
            </button>
          </div>
        </div>
        <div className="inventory-filter-bar">
          <div className="inventory-filter-grid">
            <FormField label="Producto">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={inputClassName}
                placeholder="Buscar por nombre o código"
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
              label="Proveedor"
              value={proveedorId}
              options={[
                { value: "", label: "Todos" },
                ...(proveedores?.items ?? []).map((provider) => ({
                  value: String(provider.id),
                  label: provider.nombre,
                })),
              ]}
              onChange={setProveedorId}
              placeholder="Todos"
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
          <button
            type="button"
            className="inventory-filter-clear"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Limpiar
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">Error al cargar productos</p>}
      {syncProductsResult && (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800" role="status">
          Sincronización terminada: {syncProductsResult.insertados} nuevos, {syncProductsResult.actualizados} actualizados, {syncProductsResult.sin_cambios} sin cambios y {syncProductsResult.omitidos} omitidos por no tener código de barras.
        </div>
      )}
      {bulkBarcodeResult !== null && (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800" role="status">
          {bulkBarcodeResult === 0
            ? "Todos los productos ya tenían código de barras."
            : `Se generaron ${bulkBarcodeResult} códigos de barras EAN-13.`}
        </div>
      )}
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
          requireAdminPasswordForUpdate={!isOwner}
          initialData={productToEdit ?? undefined}
          onSuccess={handleSuccess}
        />
      </ProductModal>

      {productActionToAuthorize && (
        <AdminPasswordModal
          title={
            productActionToAuthorize.type === "delete"
              ? "Eliminar producto"
              : productActionToAuthorize.type === "reactivate"
                ? "Reactivar producto"
                : "Crear código de barras"
          }
          description="Confirma esta acción con la contraseña de administrador."
          isPending={deleteMutation.isPending || reactivateMutation.isPending || generateBarcodeMutation.isPending}
          onClose={() => setProductActionToAuthorize(null)}
          onConfirm={handleAuthorizedProductAction}
        />
      )}

      {syncProductsOpen && (
        <AdminPasswordModal
          title="Subir productos a Supabase"
          description="Revisa y autoriza la sincronización del catálogo con la contraseña de administrador. Los productos iguales no se modificarán."
          isPending={syncProductsMutation.isPending}
          onClose={() => {
            if (!syncProductsMutation.isPending) setSyncProductsOpen(false);
          }}
          onConfirm={(password) => syncProductsMutation.mutate(password)}
        >
          <div className="rounded-[16px] border border-[#ececf0] bg-[#f7f7f9] p-4 text-sm text-[#5f626b]">
            Se enviarán código de barras, nombre, tipo de propiedad, proveedor, modo de inventario, estado, costo y precio de venta actual. Los productos sin código de barras serán omitidos.
          </div>
          {syncProductsError && (
            <p className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
              {syncProductsError}
            </p>
          )}
        </AdminPasswordModal>
      )}

      {bulkBarcodeOpen && (
        <AdminPasswordModal
          title="Generar códigos faltantes"
          description="Generará un EAN-13 único para cada producto sin código. Los códigos existentes no se modificarán."
          isPending={bulkBarcodeMutation.isPending}
          onClose={() => {
            if (!bulkBarcodeMutation.isPending) setBulkBarcodeOpen(false);
          }}
          onConfirm={(password) => bulkBarcodeMutation.mutate(password)}
        >
          <div className="rounded-[16px] border border-[#ececf0] bg-[#f7f7f9] p-4 text-sm text-[#5f626b]">
            Cada código incluye la categoría, el ID del producto y su dígito verificador EAN-13.
          </div>
          {bulkBarcodeError && (
            <p className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
              {bulkBarcodeError}
            </p>
          )}
        </AdminPasswordModal>
      )}

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
            onClick={() => setProductToView(product)}
          />
        ))}
        {!isLoading && productosFiltrados.length === 0 && (
          <p className="text-sm text-gray-500">No se encontraron productos.</p>
        )}
      </div>

      {canCreateProduct && (
        <div className="inventory-floating-actions">
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
        </div>
      )}

      {productToView && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProductToView(null);
            }
          }}
        >
          <div className="inventory-detail-modal" role="dialog" aria-modal="true">
            <div className="inventory-detail-head">
              <div className="min-w-0">
                <p>{productToView.categoria_nombre}</p>
                <h2>{productToView.nombre}</h2>
              </div>
              <button
                type="button"
                onClick={() => setProductToView(null)}
                className="inventory-detail-close"
                aria-label="Cerrar detalle"
                title="Cerrar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="inventory-detail-price">
              ${productToView.precio_venta.toLocaleString()}
              {productToView.unidad_venta === "PESO" ? "/kg" : ""}
            </div>

            <div className="inventory-detail-grid">
              <span><b>Código</b>{productToView.codigo_barras ?? "Sin código"}</span>
              <span><b>Stock</b>{productToView.stock} {productToView.unidad_venta === "PESO" ? "kg" : "un."}</span>
              <span><b>Propiedad</b>{productToView.tipo_propiedad}</span>
              <span><b>Proveedor</b>{productToView.proveedor_nombre ?? "Sin proveedor"}</span>
              <span><b>Inventario</b>{modoInventarioLabels[productToView.modo_inventario]}</span>
              <span><b>Estado</b>{productToView.activo ? "Activo" : "Desactivado"}</span>
            </div>

            {canManageProduct && (
              <div className="inventory-detail-actions">
                {!productToView.codigo_barras && (
                  <button
                    type="button"
                    className="inventory-detail-action barcode"
                    onClick={() => handleGenerateBarcode(productToView)}
                    disabled={generateBarcodeMutation.isPending}
                  >
                    <QrCodeIcon className="h-5 w-5" />
                    {generateBarcodeMutation.isPending ? "Creando..." : "Crear código"}
                  </button>
                )}
                <button type="button" className="inventory-detail-action edit" onClick={() => handleEdit(productToView)}>
                  <PencilIcon className="h-5 w-5" />
                  Editar
                </button>
                <button type="button" className="inventory-detail-action audit" onClick={() => openProductAudit(productToView)}>
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                  Auditar
                </button>
                {productToView.activo ? (
                  <button
                    type="button"
                    className="inventory-detail-action delete"
                    onClick={() => handleDelete(productToView.id.toString())}
                  >
                    <TrashIcon className="h-5 w-5" />
                    Eliminar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inventory-detail-action reactivate"
                    onClick={() => handleReactivate(productToView.id.toString())}
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    Reactivar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {productToAudit && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProductToAudit(null);
            }
          }}
        >
          <div className="inventory-audit-modal" role="dialog" aria-modal="true">
            <div className="inventory-detail-head">
              <div className="min-w-0">
                <p>Auditoría de producto</p>
                <h2>{productToAudit.nombre}</h2>
              </div>
              <button
                type="button"
                onClick={() => setProductToAudit(null)}
                className="inventory-detail-close"
                aria-label="Cerrar auditoría"
                title="Cerrar"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="inventory-audit-summary">
              <span><b>Stock actual</b>{productToAudit.stock} {productToAudit.unidad_venta === "PESO" ? "kg" : "un."}</span>
              <span><b>Código</b>{productToAudit.codigo_barras ?? "Sin código"}</span>
              <span><b>Categoría</b>{productToAudit.categoria_nombre}</span>
              <span><b>Proveedor</b>{productToAudit.proveedor_nombre ?? "Sin proveedor"}</span>
            </div>

            <div className="inventory-audit-filters">
              <TouchSelectField
                label="Tipo"
                value={auditTipo}
                options={[
                  { value: "", label: "Todos" },
                  ...Object.entries(movimientoInventarioLabels).map(([value, label]) => ({ value, label })),
                ]}
                onChange={setAuditTipo}
                placeholder="Todos"
              />
              <FormField label="Desde">
                <input type="date" value={auditDesde} onChange={(event) => setAuditDesde(event.target.value)} className={inputClassName} />
              </FormField>
              <FormField label="Hasta">
                <input type="date" value={auditHasta} onChange={(event) => setAuditHasta(event.target.value)} className={inputClassName} />
              </FormField>
              <button
                type="button"
                className="inventory-filter-clear"
                onClick={() => {
                  setAuditTipo("");
                  setAuditDesde("");
                  setAuditHasta("");
                }}
                disabled={!auditTipo && !auditDesde && !auditHasta}
              >
                Limpiar
              </button>
            </div>

            <div className="inventory-audit-timeline">
              {movimientosAuditoria.isLoading && <p className="inventory-audit-empty">Cargando historial...</p>}
              {!movimientosAuditoria.isLoading && (movimientosAuditoria.data?.items ?? []).length === 0 && (
                <p className="inventory-audit-empty">Sin movimientos para este producto.</p>
              )}
              {(movimientosAuditoria.data?.items ?? []).map((movement) => {
                const delta = getStockDelta(movement);
                const unit = productToAudit.unidad_venta === "PESO" ? "kg" : "un.";
                const detail =
                  movement.venta_id !== null
                    ? `Venta #${movement.venta_id} · ${movement.venta_metodo_pago ?? "Sin método"} · ${money(movement.venta_total_final)}`
                    : movement.compra_id !== null
                      ? `Compra #${movement.compra_id} · Costo ${money(movement.compra_costo_unitario)} · Subtotal ${money(movement.compra_subtotal_costo)}`
                      : movement.motivo ?? "Movimiento manual";

                return (
                  <article key={movement.id} className={`inventory-audit-item ${delta < 0 ? "negative" : "positive"}`}>
                    <div className="inventory-audit-item-main">
                      <span>{movimientoInventarioLabels[movement.tipo]}</span>
                      <strong>{delta > 0 ? "+" : ""}{delta} {unit}</strong>
                    </div>
                    <p>{detail}</p>
                    <div className="inventory-audit-meta">
                      <span>{new Date(movement.creado_en).toLocaleString()}</span>
                      <span>{movement.usuario_nombre ?? "Sin usuario"}</span>
                      <span>Stock {movement.stock_anterior ?? "-"} -&gt; {movement.stock_nuevo ?? "-"}</span>
                      {movement.venta_sesion_caja_id && <span>Caja #{movement.venta_sesion_caja_id}</span>}
                      {movement.compra_precio_anterior !== null && <span>Precio {money(movement.compra_precio_anterior)} -&gt; {money(movement.compra_precio_final)}</span>}
                      {movement.motivo && <span>{movement.motivo}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
