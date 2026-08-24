import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardDocumentListIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ReceiptRefundIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { anularCompra, createCompra, getCompra, getCompras } from "../services/compraService";
import { authorizeAdmin } from "../services/authService";
import { getCategorias } from "../services/catalogService";
import { getProductByBarcode, getProducts } from "../services/productService";
import type { Producto } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";
import AdminPasswordModal from "../components/AdminPasswordModal";
import TouchSelectField from "../components/TouchSelectField";

type CompraItemForm = {
  producto: Producto;
  cantidad: string;
  costo_unitario: string;
  precio_final: string;
  actualizar_precio_venta: boolean;
  unlocked: boolean;
};

type CompraItemDraft = {
  producto: Producto;
  cantidad: string;
  costo_unitario: string;
  precio_final: string;
  actualizar_precio_venta: boolean;
  editingProductId?: number;
};

type MasterAction =
  | { type: "unlock-item"; productId: number }
  | { type: "remove-item"; productId: number }
  | { type: "clear-items" }
  | { type: "cancel-purchase"; compraId: number; motivo: string };
type PurchaseAddMode = "codigo" | "buscar";

const money = (value: number) => `$${value.toLocaleString()}`;
const toNumber = (value: string) => Number(value) || 0;
const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const slugifyAssetName = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const isWeightProduct = (product: Producto) => product.unidad_venta === "PESO";
const initialQuantity = (product: Producto) => (isWeightProduct(product) ? "1000" : "1");
const quantityStep = (product: Producto) => (isWeightProduct(product) ? 1 : 1);
const quantityMin = (product: Producto) => (isWeightProduct(product) ? 1 : 1);
const quantityForBackend = (item: CompraItemForm) => {
  const quantity = toNumber(item.cantidad);
  return isWeightProduct(item.producto) ? quantity / 1000 : quantity;
};
const quantityLabel = (product: Producto) => (isWeightProduct(product) ? "Gramos" : "Unidades");
const purchaseProductPageSize = 12;
const purchaseAddModes: Array<{ value: PurchaseAddMode; label: string; icon: typeof QrCodeIcon }> = [
  { value: "codigo", label: "Por código", icon: QrCodeIcon },
  { value: "buscar", label: "Buscar", icon: MagnifyingGlassIcon },
];
const productImageModules = import.meta.glob("../assets/images/products/**/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const productImagesBySlug = Object.entries(productImageModules).reduce<Record<string, string>>((acc, [path, src]) => {
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/^\d+[_-]+/, "") ?? "";
  acc[slugifyAssetName(filename)] = src;
  return acc;
}, {});
const productFallbackVisual = (product: Producto) => product.nombre.trim().charAt(0).toUpperCase() || "P";
const createItemValidationMessage = (item: CompraItemForm) => {
  if (quantityForBackend(item) <= 0) {
    return `${item.producto.nombre}: ingresa una cantidad mayor a 0.`;
  }

  if (toNumber(item.costo_unitario) <= 0) {
    return `${item.producto.nombre}: ingresa el costo unitario.`;
  }

  if (item.actualizar_precio_venta && toNumber(item.precio_final) <= 0) {
    return `${item.producto.nombre}: ingresa el precio de venta o desmarca actualizar precio.`;
  }

  return null;
};

export default function ComprasPage() {
  const queryClient = useQueryClient();
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const { data: compras } = useQuery({ queryKey: ["compras"], queryFn: () => getCompras() });

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [addMode, setAddMode] = useState<PurchaseAddMode>("codigo");
  const [productPage, setProductPage] = useState(1);
  const [items, setItems] = useState<CompraItemForm[]>([]);
  const [message, setMessage] = useState("");
  const [masterAction, setMasterAction] = useState<MasterAction | null>(null);
  const [expandedCompraId, setExpandedCompraId] = useState<number | null>(null);
  const [mobilePurchasesOpen, setMobilePurchasesOpen] = useState(false);
  const [purchaseItemsOpen, setPurchaseItemsOpen] = useState(false);
  const [recentPurchasesOpen, setRecentPurchasesOpen] = useState(true);
  const [purchaseItemDraft, setPurchaseItemDraft] = useState<CompraItemDraft | null>(null);

  const compraDetalle = useQuery({
    queryKey: ["compra", expandedCompraId],
    queryFn: () => getCompra(expandedCompraId as number),
    enabled: expandedCompraId !== null,
  });

  const normalizedName = nombre.trim();
  const productsListEnabled = addMode === "buscar";
  const { data: productos, isFetching: isFetchingProducts } = useQuery({
    queryKey: ["products", "purchase-selector", { addMode, nombre: normalizedName, categoriaId, productPage }],
    queryFn: () =>
      getProducts({
        activo: true,
        search: normalizedName ? normalizedName : undefined,
        categoria_id: categoriaId ? Number(categoriaId) : undefined,
        page: productPage,
        limit: purchaseProductPageSize,
      }),
    enabled: productsListEnabled,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setProductPage(1);
  }, [addMode, categoriaId, normalizedName]);

  const productosFiltrados = productsListEnabled ? productos?.items ?? [] : [];
  const productPagination = productsListEnabled ? productos?.pagination : undefined;

  const totalCompra = items.reduce(
    (total, item) => total + quantityForBackend(item) * toNumber(item.costo_unitario),
    0,
  );

  const openProductDraft = (product: Producto) => {
    setMessage("");
    const existingItem = items.find((item) => item.producto.id === product.id);

    setPurchaseItemDraft({
      producto: product,
      cantidad: existingItem
        ? String(toNumber(existingItem.cantidad) + toNumber(initialQuantity(product)))
        : initialQuantity(product),
      costo_unitario: existingItem?.costo_unitario ?? (product.costo_actual === null ? "" : String(product.costo_actual)),
      precio_final: existingItem?.precio_final ?? String(product.precio_venta),
      actualizar_precio_venta: existingItem?.actualizar_precio_venta ?? true,
      editingProductId: existingItem?.producto.id,
    });
  };

  const openExistingProductDraft = (productId: number) => {
    const item = items.find((currentItem) => currentItem.producto.id === productId);
    if (!item) return;

    setPurchaseItemDraft({
      producto: item.producto,
      cantidad: item.cantidad,
      costo_unitario: item.costo_unitario,
      precio_final: item.precio_final,
      actualizar_precio_venta: item.actualizar_precio_venta,
      editingProductId: item.producto.id,
    });
  };

  const handleConfirmProductDraft = () => {
    if (!purchaseItemDraft) return;

    const draftItem: CompraItemForm = {
      producto: purchaseItemDraft.producto,
      cantidad: purchaseItemDraft.cantidad,
      costo_unitario: purchaseItemDraft.costo_unitario,
      precio_final: purchaseItemDraft.precio_final,
      actualizar_precio_venta: purchaseItemDraft.actualizar_precio_venta,
      unlocked: false,
    };
    const validationMessage = createItemValidationMessage(draftItem);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setItems((prev) => {
      const index = prev.findIndex((item) => item.producto.id === purchaseItemDraft.producto.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = draftItem;
        return updated;
      }

      return [...prev, draftItem];
    });
    setPurchaseItemDraft(null);
    setPurchaseItemsOpen(true);
    setRecentPurchasesOpen(false);
  };

  const handleBarcodeAdd = async () => {
    const barcode = codigo.trim();
    if (!barcode) return;

    const product = await getProductByBarcode(barcode);
    if (!product) {
      setMessage("No se encontró un producto con ese código. Puedes buscarlo por nombre o categoría.");
      return;
    }

    openProductDraft(product);
    setCodigo("");
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.producto.id !== productId));
  };

  const closeMasterModal = () => {
    setMasterAction(null);
  };

  const mutation = useMutation({
    mutationFn: () =>
      createCompra({
        items: items.map((item) => ({
          producto_id: item.producto.id,
          cantidad: quantityForBackend(item),
          costo_unitario: toNumber(item.costo_unitario),
          precio_final: item.actualizar_precio_venta && item.precio_final !== "" ? toNumber(item.precio_final) : undefined,
          actualizar_precio_venta: item.actualizar_precio_venta,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setItems([]);
      setPurchaseItemsOpen(false);
      setRecentPurchasesOpen(true);
      closeMasterModal();
      setMessage("Compra registrada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo registrar compra"),
  });

  const anulacion = useMutation({
    mutationFn: ({ id, motivo, password }: { id: number; motivo: string; password: string }) => anularCompra(id, motivo, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeMasterModal();
      setMessage("Compra anulada.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo anular compra"),
  });

  const canSubmit =
    items.length > 0 &&
    items.every((item) => createItemValidationMessage(item) === null);
  const draftAsItem = purchaseItemDraft
    ? {
        producto: purchaseItemDraft.producto,
        cantidad: purchaseItemDraft.cantidad,
        costo_unitario: purchaseItemDraft.costo_unitario,
        precio_final: purchaseItemDraft.precio_final,
        actualizar_precio_venta: purchaseItemDraft.actualizar_precio_venta,
        unlocked: true,
      }
    : null;
  const draftSubtotal = draftAsItem ? quantityForBackend(draftAsItem) * toNumber(draftAsItem.costo_unitario) : 0;
  const draftCategory = purchaseItemDraft
    ? categorias?.items.find((category) => category.id === purchaseItemDraft.producto.categoria_id)
    : undefined;
  const draftMultiplier = Number(draftCategory?.multiplicador_ganancia ?? 1);
  const draftSuggestedSalePrice = purchaseItemDraft
    ? Math.round(toNumber(purchaseItemDraft.costo_unitario) * draftMultiplier)
    : 0;
  const draftPriceBelowSuggested = Boolean(
    purchaseItemDraft?.actualizar_precio_venta &&
    toNumber(purchaseItemDraft.precio_final) > 0 &&
    toNumber(purchaseItemDraft.precio_final) < draftSuggestedSalePrice,
  );
  const draftProductImage = purchaseItemDraft
    ? productImagesBySlug[slugifyAssetName(purchaseItemDraft.producto.nombre)]
    : undefined;

  const confirmMasterAction = async (masterPassword: string) => {
    if (!masterAction || !masterPassword) return;

    try {
      await authorizeAdmin(masterPassword);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo autorizar");
      return;
    }

    if (masterAction.type === "unlock-item") {
      openExistingProductDraft(masterAction.productId);
      closeMasterModal();
      return;
    }

    if (masterAction.type === "remove-item") {
      removeItem(masterAction.productId);
      closeMasterModal();
      return;
    }

    if (masterAction.type === "clear-items") {
      setItems([]);
      closeMasterModal();
      return;
    }

    anulacion.mutate({ id: masterAction.compraId, motivo: masterAction.motivo, password: masterPassword });
  };

  const handleSubmitCompra = () => {
    if (items.length === 0) {
      setMessage("Agrega al menos un producto a la compra.");
      return;
    }

    const validationMessage = items.map(createItemValidationMessage).find(Boolean);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="admin-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="admin-page-title">Compras</h1>
        <button
          type="button"
          onClick={() => setMobilePurchasesOpen(true)}
          className="inline-flex h-12 items-center gap-2 rounded-[16px] border border-[#ececf0] bg-white px-4 text-sm font-black text-[#5f626b] shadow-[0_8px_20px_rgba(33,35,48,.04)] transition hover:border-[#d8d1ff] hover:bg-[#faf9ff] hover:text-[#7652ed]"
          aria-label="Compras hechas con celular"
          title="Compras hechas con celular"
        >
          <DevicePhoneMobileIcon className="h-6 w-6" />
          <span>Compras celular</span>
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="xl:sticky xl:top-6 xl:self-start">
      <ModuleCard
        title="Registrar compra"
        className="overflow-visible"
        contentClassName="p-5"
      >
        <div className="space-y-5">

        <div className="purchase-add-modes">
          {purchaseAddModes.map((mode) => {
            const Icon = mode.icon;

            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setAddMode(mode.value)}
                className={`purchase-add-mode ${addMode === mode.value ? "active" : ""}`}
              >
                <Icon className="h-6 w-6" />
                <span>
                  <strong>{mode.label}</strong>
                </span>
              </button>
            );
          })}
        </div>

        {addMode === "codigo" && (
          <div className="purchase-add-panel">
            <FormField label="Código de barra">
              <input
                autoFocus
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleBarcodeAdd();
                }}
                className={inputClassName}
                placeholder="Escanear o escribir código"
              />
            </FormField>
            <Button onClick={handleBarcodeAdd} className="purchase-add-submit">
              Agregar producto
            </Button>
          </div>
        )}

        {addMode === "buscar" && (
          <div className="purchase-add-panel">
            <FormField label="Buscar producto">
              <input
                autoFocus
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className={inputClassName}
                placeholder="Nombre o código de barra"
              />
            </FormField>
            <TouchSelectField
              label="Categoría"
              value={categoriaId}
              options={[
                { value: "", label: "Todas las categorías" },
                ...(categorias?.items.map((category) => ({
                  value: String(category.id),
                  label: category.nombre,
                })) ?? []),
              ]}
              onChange={(value) => setCategoriaId(value)}
            />
          </div>
        )}

        {addMode !== "codigo" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#7b7d86]">
                {productPagination
                    ? `${productPagination.total} productos · Página ${productPagination.page} de ${Math.max(1, productPagination.totalPages)}`
                    : "Cargando productos..."}
              </p>
              {isFetchingProducts && <span className="text-xs font-bold text-[#9a9ca4]">Actualizando...</span>}
            </div>

            <div className="purchase-product-search-grid">
              {productosFiltrados.map((product) => {
                const productImage = productImagesBySlug[slugifyAssetName(product.nombre)];

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProductDraft(product)}
                    className="purchase-product-search-card"
                  >
                    <span className="purchase-product-search-image">
                      {productImage ? <img src={productImage} alt="" /> : productFallbackVisual(product)}
                    </span>
                    <span className="purchase-product-search-name">{product.nombre}</span>
                  </button>
                );
              })}
              {productsListEnabled && !isFetchingProducts && productosFiltrados.length === 0 && (
                <p className="col-span-full rounded-2xl border border-[#ececf0] bg-[#fafafa] p-5 text-center text-sm font-bold text-[#8b8e98]">
                  No se encontraron productos para agregar.
                </p>
              )}
            </div>

            {productPagination && productPagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductPage((current) => Math.max(1, current - 1))}
                  disabled={productPagination.page <= 1}
                  className="min-h-11 rounded-xl border border-[#ececf0] bg-white px-4 text-sm font-black text-[#5f626b] disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setProductPage((current) => Math.min(productPagination.totalPages, current + 1))}
                  disabled={productPagination.page >= productPagination.totalPages}
                  className="min-h-11 rounded-xl border border-[#ececf0] bg-white px-4 text-sm font-black text-[#5f626b] disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}

        {message && <p className="text-sm">{message}</p>}
        </div>
      </ModuleCard>
        </div>

        <div className="space-y-4">
          <section className="purchase-items-panel">
            <button
              type="button"
              className="purchase-accordion-head"
              onClick={() => setPurchaseItemsOpen((current) => !current)}
            >
              <div>
                <p className="purchase-items-kicker">Productos comprados</p>
                <h3>{items.length} producto{items.length === 1 ? "" : "s"} en esta compra</h3>
              </div>
              <span>
                <strong>{money(totalCompra)}</strong>
                <small>{purchaseItemsOpen ? "Cerrar" : "Abrir"}</small>
              </span>
            </button>

            {purchaseItemsOpen && (
              <div className="purchase-accordion-body">
                {items.length === 0 ? (
                  <div className="purchase-items-empty">Agrega productos a la compra.</div>
                ) : (
                  <div className="purchase-items-list">
                    {items.map((item) => {
                      const subtotal = quantityForBackend(item) * toNumber(item.costo_unitario);
                      const productImage = productImagesBySlug[slugifyAssetName(item.producto.nombre)];

                      return (
                        <article key={item.producto.id} className="purchase-item-row">
                          <div className="purchase-item-main">
                            <div className="purchase-item-avatar">
                              {productImage ? <img src={productImage} alt="" /> : productFallbackVisual(item.producto)}
                            </div>
                            <div className="min-w-0">
                              <h4>{item.producto.nombre}</h4>
                              <div className="purchase-item-meta">
                                <span>{item.cantidad} {isWeightProduct(item.producto) ? "g" : "un."}</span>
                                <span>Costo {money(toNumber(item.costo_unitario))}</span>
                                <span>Venta {item.actualizar_precio_venta ? money(toNumber(item.precio_final)) : "Sin actualizar"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="purchase-item-side">
                            <div className="purchase-item-subtotal">
                              <span>Subtotal</span>
                              <strong>{money(subtotal)}</strong>
                            </div>
                            <div className="purchase-item-actions">
                              <button
                                type="button"
                                onClick={() => setMasterAction({ type: "unlock-item", productId: item.producto.id })}
                                className="purchase-action-primary"
                              >
                                Modificar
                              </button>
                              <button
                                type="button"
                                onClick={() => setMasterAction({ type: "remove-item", productId: item.producto.id })}
                                className="purchase-action-danger"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setMasterAction({ type: "clear-items" })}
                    disabled={items.length === 0}
                  >
                    Limpiar
                  </Button>
                  <Button
                    disabled={items.length === 0 || mutation.isPending}
                    onClick={handleSubmitCompra}
                  >
                    {mutation.isPending ? "Registrando..." : "Registrar compra"}
                  </Button>
                </div>

                {items.length > 0 && !canSubmit && (
                  <p className="mt-3 text-sm text-amber-700">
                    Completa cantidad, costo unitario y precio de venta en los productos que actualizarán precio.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="purchase-history-accordion">
            <button
              type="button"
              className="purchase-accordion-head"
              onClick={() => setRecentPurchasesOpen((current) => !current)}
            >
              <div>
                <p className="purchase-items-kicker">Historial</p>
                <h3>Compras recientes</h3>
              </div>
              <span>
                <strong>{compras?.items.length ?? 0}</strong>
                <small>{recentPurchasesOpen ? "Cerrar" : "Abrir"}</small>
              </span>
            </button>

            {recentPurchasesOpen && (
              <div className="purchase-accordion-body history">
                <ListPanel
                  title="Compras recientes"
                  icon={ClipboardDocumentListIcon}
                  emptyMessage="Sin compras registradas."
                  items={(compras?.items ?? []).map((compra) => ({
                    id: compra.id,
                    icon: ReceiptRefundIcon,
                    title: `Compra #${compra.id}`,
                    description: compra.usuario_nombre,
                    meta: [new Date(compra.creado_en).toLocaleString(), compra.estado],
                    amount: money(compra.total_costo),
                    action: (
                      <div className="flex gap-2">
                        <button
                          className="rounded-md px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          onClick={() => setExpandedCompraId((current) => (current === compra.id ? null : compra.id))}
                        >
                          {expandedCompraId === compra.id ? "Ocultar" : "Ver detalle"}
                        </button>
                        {compra.estado === "COMPLETADA" && (
                          <button className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => {
                            const motivo = window.prompt("Motivo de anulación de compra");
                            if (motivo) setMasterAction({ type: "cancel-purchase", compraId: compra.id, motivo });
                          }}>
                            Anular
                          </button>
                        )}
                      </div>
                    ),
                    expandedContent: expandedCompraId === compra.id ? (
                      compraDetalle.isLoading ? (
                        <p className="text-sm text-gray-500">Cargando detalle...</p>
                      ) : compraDetalle.data ? (
                        <div className="space-y-2">
                          {compraDetalle.data.detalles.map((detalle) => (
                            <div key={detalle.id} className="grid gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto_auto]">
                              <div>
                                <p className="font-semibold text-gray-900">{detalle.producto_nombre}</p>
                                <p className="text-xs text-gray-500">Producto #{detalle.producto_id}</p>
                              </div>
                              <span className="text-gray-600">Cantidad {detalle.cantidad}</span>
                              <span className="text-gray-600">Costo {money(detalle.costo_unitario)}</span>
                              <span className="font-semibold text-gray-900">{money(detalle.subtotal_costo)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">No se pudo cargar el detalle.</p>
                      )
                    ) : undefined,
                  }))}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {purchaseItemDraft && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPurchaseItemDraft(null);
            }
          }}
        >
          <div className="cash-close-modal purchase-draft-modal" role="dialog" aria-modal="true">
            <div className="cash-close-head">
              <div>
                <p>Producto comprado</p>
                <h2>{purchaseItemDraft.producto.nombre}</h2>
              </div>
              <div className="cash-close-head-actions">
                <button
                  type="button"
                  onClick={handleConfirmProductDraft}
                  className="cash-close-submit"
                >
                  Agregar a compra
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseItemDraft(null)}
                  className="cash-close-x"
                  aria-label="Cerrar modal"
                  title="Cerrar"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="purchase-draft-grid">
              <section className="cash-close-card highlight">
                <div className="purchase-draft-product">
                  <span className="purchase-draft-image">
                    {draftProductImage ? <img src={draftProductImage} alt="" /> : productFallbackVisual(purchaseItemDraft.producto)}
                  </span>
                  <div>
                    <p>{purchaseItemDraft.producto.codigo_barras ?? "Sin código"}</p>
                    <strong>{purchaseItemDraft.producto.nombre}</strong>
                    <span>{purchaseItemDraft.producto.categoria_nombre}</span>
                  </div>
                </div>
                <div className="cash-close-lines">
                  <span><b>Precio actual</b>{money(purchaseItemDraft.producto.precio_venta)}</span>
                  <span><b>Costo actual</b>{purchaseItemDraft.producto.costo_actual === null ? "-" : money(purchaseItemDraft.producto.costo_actual)}</span>
                  <span><b>Stock</b>{purchaseItemDraft.producto.stock} {isWeightProduct(purchaseItemDraft.producto) ? "kg" : "un."}</span>
                </div>
              </section>

              <section className="cash-close-card">
                <div className="cash-close-card-title">
                  <ClipboardDocumentListIcon className="h-6 w-6" />
                  <span>Datos de compra</span>
                </div>
                <div className="purchase-draft-fields">
                  <FormField label={quantityLabel(purchaseItemDraft.producto)}>
                    <input
                      autoFocus
                      type="number"
                      min={quantityMin(purchaseItemDraft.producto)}
                      step={quantityStep(purchaseItemDraft.producto)}
                      value={purchaseItemDraft.cantidad}
                      onChange={(event) => setPurchaseItemDraft((current) => current ? { ...current, cantidad: event.target.value } : current)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleConfirmProductDraft();
                      }}
                      className={`${inputClassName} text-lg`}
                    />
                  </FormField>
                  <FormField label="Costo unitario">
                    <input
                      type="number"
                      min={0}
                      value={purchaseItemDraft.costo_unitario}
                      onChange={(event) => setPurchaseItemDraft((current) => current ? { ...current, costo_unitario: event.target.value } : current)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleConfirmProductDraft();
                      }}
                      className={`${inputClassName} text-lg`}
                    />
                  </FormField>
                  <FormField label="Precio venta">
                    <input
                      type="number"
                      min={0}
                      value={purchaseItemDraft.precio_final}
                      onChange={(event) => setPurchaseItemDraft((current) => current ? { ...current, precio_final: event.target.value } : current)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleConfirmProductDraft();
                      }}
                      className={`${inputClassName} text-lg ${draftPriceBelowSuggested ? "purchase-draft-input-warning" : ""}`}
                      disabled={!purchaseItemDraft.actualizar_precio_venta}
                    />
                  </FormField>
                </div>
                <label className="purchase-draft-toggle">
                  <input
                    type="checkbox"
                    checked={purchaseItemDraft.actualizar_precio_venta}
                    onChange={(event) => setPurchaseItemDraft((current) => current ? { ...current, actualizar_precio_venta: event.target.checked } : current)}
                  />
                  <span>Actualizar precio de venta</span>
                </label>
              </section>

              <section className="cash-close-card">
                <div className="cash-close-card-title">
                  <ReceiptRefundIcon className="h-6 w-6" />
                  <span>Resumen</span>
                </div>
                <div className="cash-close-split">
                  <span>
                    <small>Subtotal costo</small>
                    {money(draftSubtotal)}
                  </span>
                  <span>
                    <small>Sugerido x{draftMultiplier.toFixed(2)}</small>
                    {money(draftSuggestedSalePrice)}
                  </span>
                  <span className={draftPriceBelowSuggested ? "purchase-draft-summary-warning" : ""}>
                    <small>Precio final</small>
                    {purchaseItemDraft.actualizar_precio_venta ? money(toNumber(purchaseItemDraft.precio_final)) : "Sin cambio"}
                  </span>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {masterAction && (
        <AdminPasswordModal
          title="Autorización requerida"
          description="Ingresa la contraseña de administrador para continuar."
          isPending={anulacion.isPending}
          onClose={closeMasterModal}
          onConfirm={confirmMasterAction}
        />
      )}

      {mobilePurchasesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMobilePurchasesOpen(false);
            }
          }}
        >
          <div className="w-full max-w-3xl rounded-[28px] border border-white/90 bg-white shadow-[0_24px_70px_rgba(18,19,24,.24)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#efeff2] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#faf9ff] text-[#7652ed]">
                  <DevicePhoneMobileIcon className="h-6 w-6" />
                </span>
                <h2 className="text-xl font-black tracking-[-0.02em] text-[#17181d]">Compras celular</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobilePurchasesOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#ececf0] bg-white text-[#5f626b] transition hover:border-[#d8d1ff] hover:bg-[#faf9ff] hover:text-[#7652ed]"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-[320px] p-6" />
          </div>
        </div>
      )}
    </div>
  );
}
