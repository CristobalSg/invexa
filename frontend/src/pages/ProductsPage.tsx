import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  getProducts,
  deleteProduct,
  getProduct,
  reactivateProduct,
} from "../services/productService";
import type { ModoInventarioProducto, MovimientoInventario, Producto, TipoMovimientoInventario } from "../types/api";

import { ProductModal } from "../components/ProductModal";
import ProductFormCreate from "../components/ProductFormCreate";
import { getStoredUser } from "../services/authService";
import { getCategorias, getProveedores } from "../services/catalogService";
import { getMovimientos } from "../services/inventoryService";
import { Button, FormField, inputClassName } from "../components/FormControls";
import ProductTile from "../components/ProductTile";
import TouchSelectField from "../components/TouchSelectField";
import AdminPasswordModal from "../components/AdminPasswordModal";

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
    type: "delete" | "reactivate";
    product: Producto;
  } | null>(null);
  const [createdProductAlert, setCreatedProductAlert] = useState<Producto | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [estado, setEstado] = useState<EstadoProductoFiltro>("ACTIVOS");
  const [page, setPage] = useState(1);
  const storedUser = getStoredUser();
  const isOwner = storedUser?.rol === "OWNER";
  const canCreateProduct = storedUser?.rol === "OWNER" || storedUser?.rol === "CASHIER";
  const canManageProduct = canCreateProduct;

  const queryClient = useQueryClient();
  const normalizedCodigo = codigo.trim();
  const normalizedNombre = nombre.trim();
  const estadoActivo = estado === "TODOS" ? undefined : estado === "ACTIVOS";

  const { data: products, isLoading, isFetching, error } = useQuery({
    queryKey: ["products", { page, codigo: normalizedCodigo, nombre: normalizedNombre, categoriaId, proveedorId, estado }],
    queryFn: () =>
      getProducts({
        page,
        limit: 100,
        codigo: normalizedCodigo || undefined,
        nombre: normalizedNombre || undefined,
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
  }, [categoriaId, codigo, estado, nombre, proveedorId]);

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
    normalizedCodigo,
    normalizedNombre,
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

  const handleAuthorizedProductAction = (masterPassword: string) => {
    if (!productActionToAuthorize) return;

    const id = productActionToAuthorize.product.id.toString();
    if (productActionToAuthorize.type === "delete") {
      deleteMutation.mutate({ id, masterPassword });
      setProductToView(null);
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
    setCodigo("");
    setNombre("");
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
        </div>
        <div className="inventory-filter-bar">
          <div className="inventory-filter-grid">
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
          title={productActionToAuthorize.type === "delete" ? "Eliminar producto" : "Reactivar producto"}
          description="Confirma esta acción con la contraseña de administrador."
          isPending={deleteMutation.isPending || reactivateMutation.isPending}
          onClose={() => setProductActionToAuthorize(null)}
          onConfirm={handleAuthorizedProductAction}
        />
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
