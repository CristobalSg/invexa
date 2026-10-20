import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  DevicePhoneMobileIcon,
  ReceiptRefundIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { anularCompra, createCompra, getCompra, getCompras } from "../services/compraService";
import { authorizeAdmin } from "../services/authService";
import { getCategorias } from "../services/catalogService";
import { getAllProducts } from "../services/productService";
import {
  finalizarCompraMovil,
  getComprasMoviles,
  tomarCompraMovil,
  type CompraMovil,
} from "../services/supabaseService";
import type { Producto } from "../types/api";
import ListPanel from "../components/ListPanel";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";
import AdminPasswordModal from "../components/AdminPasswordModal";

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
type PurchaseToastTone = "success" | "warning" | "error";

interface PurchaseToast {
  readonly title: string;
  readonly description: string;
  readonly tone: PurchaseToastTone;
}

const money = (value: number) => `$${value.toLocaleString()}`;
const toNumber = (value: string) => Number(value) || 0;
const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const slugifyAssetName = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const isWeightProduct = (product: Producto) => product.unidad_venta === "PESO";
const quantityStep = (product: Producto) => (isWeightProduct(product) ? 1 : 1);
const quantityMin = (product: Producto) => (isWeightProduct(product) ? 1 : 1);
const quantityForBackend = (item: CompraItemForm) => {
  const quantity = toNumber(item.cantidad);
  return isWeightProduct(item.producto) ? quantity / 1000 : quantity;
};
const quantityLabel = (product: Producto) => (isWeightProduct(product) ? "Gramos" : "Unidades");
const purchaseItemsStorageKey = "purchase-draft-items";
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

const readPurchaseItems = (): CompraItemForm[] => {
  try {
    const stored = window.sessionStorage.getItem(purchaseItemsStorageKey);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const itemsAreValid = parsed.every((item) =>
      item !== null &&
      typeof item === "object" &&
      "producto" in item &&
      item.producto !== null &&
      typeof item.producto === "object" &&
      "id" in item.producto &&
      typeof item.producto.id === "number" &&
      "cantidad" in item &&
      typeof item.cantidad === "string" &&
      "costo_unitario" in item &&
      typeof item.costo_unitario === "string" &&
      "precio_final" in item &&
      typeof item.precio_final === "string" &&
      "actualizar_precio_venta" in item &&
      typeof item.actualizar_precio_venta === "boolean" &&
      "unlocked" in item &&
      typeof item.unlocked === "boolean",
    );

    return itemsAreValid ? parsed as CompraItemForm[] : [];
  } catch {
    return [];
  }
};

export default function ComprasPage() {
  const queryClient = useQueryClient();
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const selectedProductRef = useRef<HTMLButtonElement>(null);
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });
  const { data: compras } = useQuery({ queryKey: ["compras"], queryFn: () => getCompras() });

  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [items, setItems] = useState<CompraItemForm[]>(readPurchaseItems);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<PurchaseToast | null>(null);
  const [masterAction, setMasterAction] = useState<MasterAction | null>(null);
  const [expandedCompraId, setExpandedCompraId] = useState<number | null>(null);
  const [mobilePurchasesOpen, setMobilePurchasesOpen] = useState(false);
  const [purchaseItemsOpen, setPurchaseItemsOpen] = useState(() => items.length > 0);
  const [recentPurchasesOpen, setRecentPurchasesOpen] = useState(() => items.length === 0);
  const [purchaseItemDraft, setPurchaseItemDraft] = useState<CompraItemDraft | null>(null);

  const compraDetalle = useQuery({
    queryKey: ["compra", expandedCompraId],
    queryFn: () => getCompra(expandedCompraId as number),
    enabled: expandedCompraId !== null,
  });

  const normalizedProductSearch = normalizeText(productSearch.trim());
  const { data: productos, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "purchase-selector", "all-active"],
    queryFn: () => getAllProducts({ activo: true }),
  });
  const mobilePurchasesQuery = useQuery({
    queryKey: ["mobile-purchases"],
    queryFn: getComprasMoviles,
    enabled: mobilePurchasesOpen,
    refetchInterval: mobilePurchasesOpen ? 10_000 : false,
  });
  const productosFiltrados = useMemo(() => {
    const productItems = productos ?? [];
    if (!normalizedProductSearch) return productItems;

    return productItems.filter((product) =>
      normalizeText(product.nombre).includes(normalizedProductSearch) ||
      normalizeText(product.categoria_nombre).includes(normalizedProductSearch) ||
      (product.codigo_barras ?? "").includes(productSearch.trim()),
    );
  }, [normalizedProductSearch, productSearch, productos]);
  const isProductSearchFocusBlocked = Boolean(
    purchaseItemDraft || masterAction || expandedCompraId !== null || mobilePurchasesOpen,
  );

  const focusProductSearch = () => {
    window.setTimeout(() => productSearchInputRef.current?.focus(), 0);
  };

  useEffect(() => {
    setSelectedProductIndex(0);
  }, [normalizedProductSearch]);

  useEffect(() => {
    setSelectedProductIndex((current) => Math.min(current, Math.max(0, productosFiltrados.length - 1)));
  }, [productosFiltrados.length]);

  useEffect(() => {
    if (isProductSearchFocusBlocked) return;
    const focusTimer = window.setTimeout(() => productSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isProductSearchFocusBlocked]);

  useEffect(() => {
    if (isProductSearchFocusBlocked) return;
    selectedProductRef.current?.scrollIntoView({ block: "nearest" });
  }, [isProductSearchFocusBlocked, normalizedProductSearch, productosFiltrados.length, selectedProductIndex]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    window.sessionStorage.setItem(purchaseItemsStorageKey, JSON.stringify(items));
  }, [items]);

  const totalCompra = items.reduce(
    (total, item) => total + quantityForBackend(item) * toNumber(item.costo_unitario),
    0,
  );

  const notify = (toastMessage: PurchaseToast) => {
    setToast(toastMessage);
    setMessage(toastMessage.description);
  };

  const openProductDraft = (product: Producto) => {
    setMessage("");
    const existingItem = items.find((item) => item.producto.id === product.id);

    setPurchaseItemDraft({
      producto: product,
      cantidad: existingItem?.cantidad ?? "",
      costo_unitario: existingItem?.costo_unitario ?? (product.costo_actual === null ? "" : String(product.costo_actual)),
      precio_final: existingItem?.precio_final ?? String(product.precio_venta),
      actualizar_precio_venta: false,
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
      notify({
        title: "Falta información",
        description: validationMessage,
        tone: "warning",
      });
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

  const handleProductSelect = (product: Producto, index = selectedProductIndex) => {
    setSelectedProductIndex(index);
    setProductSearch("");
    openProductDraft(product);
  };

  const handleProductSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (productosFiltrados.length === 0) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setSelectedProductIndex((current) =>
        (current + direction + productosFiltrados.length) % productosFiltrados.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const exactBarcodeProduct = productSearch.trim()
        ? productosFiltrados.find((product) => product.codigo_barras === productSearch.trim())
        : undefined;
      const selectedProduct = exactBarcodeProduct ?? productosFiltrados[selectedProductIndex];
      if (selectedProduct) {
        handleProductSelect(selectedProduct, productosFiltrados.indexOf(selectedProduct));
      } else {
        notify({
          title: "Producto no encontrado",
          description: "No hay un producto seleccionado para agregar.",
          tone: "warning",
        });
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setProductSearch("");
      setSelectedProductIndex(0);
    }
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
      notify({
        title: "Compra registrada",
        description: "La compra quedó guardada y el inventario fue actualizado.",
        tone: "success",
      });
      focusProductSearch();
    },
    onError: (error) => notify({
      title: "No se pudo registrar compra",
      description: error instanceof Error ? error.message : "No se pudo registrar compra",
      tone: "error",
    }),
  });

  const mobileApprovalMutation = useMutation({
    mutationFn: async (mobilePurchase: CompraMovil) => {
      const productsByBarcode = new Map(
        (productos ?? [])
          .filter((product) => product.codigo_barras)
          .map((product) => [product.codigo_barras as string, product]),
      );
      const usedProductIds = new Set<number>();
      const purchaseItems = mobilePurchase.items.map((item) => {
        if (!item.producto?.codigo_barras) {
          throw new Error(`El producto móvil #${item.producto_id} no tiene código de barras asociado.`);
        }

        const localProduct = productsByBarcode.get(item.producto.codigo_barras);
        if (!localProduct) {
          throw new Error(`${item.producto.nombre} no existe o está inactivo en este POS.`);
        }

        if (usedProductIds.has(localProduct.id)) {
          throw new Error(`${localProduct.nombre} está repetido en la compra móvil.`);
        }
        usedProductIds.add(localProduct.id);

        const backendQuantity = isWeightProduct(localProduct) ? item.cantidad / 1000 : item.cantidad;
        if (!Number.isFinite(backendQuantity) || backendQuantity <= 0) {
          throw new Error(`${localProduct.nombre} tiene una cantidad inválida.`);
        }
        if (!Number.isFinite(item.costo_unitario) || item.costo_unitario <= 0) {
          throw new Error(`${localProduct.nombre} tiene un costo inválido.`);
        }
        if (item.actualizar_precio_venta && (!item.precio_final || item.precio_final <= 0)) {
          throw new Error(`${localProduct.nombre} debe incluir un precio de venta válido.`);
        }

        return {
          producto_id: localProduct.id,
          cantidad: backendQuantity,
          costo_unitario: item.costo_unitario,
          precio_final: item.actualizar_precio_venta ? item.precio_final ?? undefined : undefined,
          actualizar_precio_venta: item.actualizar_precio_venta,
        };
      });

      if (purchaseItems.length === 0) {
        throw new Error("La compra móvil no contiene productos.");
      }

      const claimed = await tomarCompraMovil(mobilePurchase.id);
      if (!claimed) {
        throw new Error("Esta compra ya fue aprobada o dejó de estar disponible.");
      }

      try {
        const localPurchase = await createCompra({
          origen_externo: mobilePurchase.id,
          items: purchaseItems,
        });
        await finalizarCompraMovil({
          compraId: mobilePurchase.id,
          estado: "APROBADA",
          compraLocalId: localPurchase.id,
        });
        return localPurchase;
      } catch (approvalError) {
        const errorMessage = approvalError instanceof Error ? approvalError.message : "Error desconocido al aprobar";
        try {
          await finalizarCompraMovil({
            compraId: mobilePurchase.id,
            estado: "ERROR",
            errorMensaje: errorMessage,
          });
        } catch (statusError) {
          const statusMessage = statusError instanceof Error ? statusError.message : "no se pudo actualizar el estado";
          throw new Error(`${errorMessage} Además, Supabase no pudo guardar el fallo: ${statusMessage}`);
        }
        throw approvalError;
      }
    },
    onSuccess: (localPurchase) => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify({
        title: "Compra móvil aprobada",
        description: `Se registró como compra local #${localPurchase.id} y se actualizó el inventario.`,
        tone: "success",
      });
    },
    onError: (approvalError) => notify({
      title: "No se pudo aprobar",
      description: approvalError instanceof Error ? approvalError.message : "No se pudo aprobar la compra móvil.",
      tone: "error",
    }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-purchases"] });
    },
  });

  const anulacion = useMutation({
    mutationFn: ({ id, motivo, password }: { id: number; motivo: string; password: string }) => anularCompra(id, motivo, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeMasterModal();
      notify({
        title: "Compra anulada",
        description: "La anulación quedó guardada y el inventario fue actualizado.",
        tone: "success",
      });
    },
    onError: (error) => notify({
      title: "No se pudo anular compra",
      description: error instanceof Error ? error.message : "No se pudo anular compra",
      tone: "error",
    }),
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
      notify({
        title: "No se pudo autorizar",
        description: error instanceof Error ? error.message : "No se pudo autorizar",
        tone: "error",
      });
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
      notify({
        title: "Compra incompleta",
        description: "Agrega al menos un producto a la compra.",
        tone: "warning",
      });
      return;
    }

    const validationMessage = items.map(createItemValidationMessage).find(Boolean);
    if (validationMessage) {
      notify({
        title: "Falta información",
        description: validationMessage,
        tone: "warning",
      });
      return;
    }

    mutation.mutate();
  };

  return (
    <div
      className="admin-page space-y-6"
      onPointerDown={(event) => {
        if (isProductSearchFocusBlocked) return;
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("button, a, input, textarea, select, [contenteditable='true'], .flow-modal-backdrop")) return;
        focusProductSearch();
      }}
    >
      {toast && (
        <div className={`cash-close-toast ${toast.tone}`} role="status" aria-live="polite">
          <CheckCircleIcon className="h-7 w-7" />
          <div>
            <h2>{toast.title}</h2>
            <p>{toast.description}</p>
          </div>
        </div>
      )}
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

        <div className="purchase-add-panel purchase-keyboard-search-panel">
          <FormField label="Código de barra o nombre del producto">
            <input
              ref={productSearchInputRef}
              autoFocus
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              onKeyDown={handleProductSearchKeyDown}
              className={`${inputClassName} purchase-product-main-search`}
              placeholder="Escanea un código o escribe el nombre"
              autoComplete="off"
            />
          </FormField>
          <div className="purchase-keyboard-help">
            <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
            <span><kbd>Enter</kbd> seleccionar</span>
            <span><kbd>Esc</kbd> limpiar</span>
          </div>
        </div>

        <div className="purchase-product-results-head" aria-live="polite">
          <span>{productSearch ? <>Resultados para <strong>“{productSearch}”</strong></> : "Todos los productos activos"}</span>
          <strong>{isLoadingProducts ? "Cargando..." : `${productosFiltrados.length} productos`}</strong>
        </div>

        <div className="purchase-product-search-list" role="listbox" aria-label="Productos para agregar a la compra">
          {productosFiltrados.map((product, index) => {
            const productImage = productImagesBySlug[slugifyAssetName(product.nombre)];
            const selected = index === selectedProductIndex;

            return (
              <button
                key={product.id}
                ref={selected ? selectedProductRef : undefined}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setSelectedProductIndex(index)}
                onClick={() => handleProductSelect(product, index)}
                className={`purchase-product-search-card ${selected ? "selected" : ""}`}
              >
                <span className="purchase-product-search-image">
                  {productImage ? <img src={productImage} alt="" /> : productFallbackVisual(product)}
                </span>
                <span className="purchase-product-search-copy">
                  <strong className="purchase-product-search-name">{product.nombre}</strong>
                  <small>{product.codigo_barras ?? "Sin código"} · {product.categoria_nombre}</small>
                </span>
                <span className="purchase-product-search-price">{money(product.precio_venta)}</span>
              </button>
            );
          })}
          {!isLoadingProducts && productosFiltrados.length === 0 && (
            <p className="purchase-product-search-empty">No se encontraron productos para agregar.</p>
          )}
        </div>

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
                    disabled={mutation.isPending}
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
                    onClick: () => setExpandedCompraId(compra.id),
                    meta: [new Date(compra.creado_en).toLocaleString(), compra.estado],
                    amount: money(compra.total_costo),
                    action: compra.estado === "COMPLETADA" ? (
                      <div className="flex gap-2">
                        <button className="rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => {
                          const motivo = window.prompt("Motivo de anulación de compra");
                          if (motivo) setMasterAction({ type: "cancel-purchase", compraId: compra.id, motivo });
                        }}>
                          Anular
                        </button>
                      </div>
                    ) : undefined,
                  }))}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {expandedCompraId !== null && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExpandedCompraId(null);
          }}
        >
          <div className="cash-close-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-detail-title">
            <div className="cash-close-head">
              <div>
                <p>Detalle de compra</p>
                <h2 id="purchase-detail-title">Compra #{expandedCompraId}</h2>
              </div>
              <div className="cash-close-head-actions">
                {compraDetalle.data && (
                  <span className={`cash-session-state ${compraDetalle.data.estado === "COMPLETADA" ? "open" : "closed"}`}>
                    {compraDetalle.data.estado}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedCompraId(null)}
                  className="cash-close-x"
                  aria-label="Cerrar detalle de compra"
                  title="Cerrar"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {compraDetalle.isLoading ? (
              <p className="p-8 text-center text-sm font-semibold text-[#8b8e98]">Cargando detalle...</p>
            ) : compraDetalle.data ? (
              <div className="cash-close-grid purchase-detail-grid">
                <section className="cash-close-card highlight">
                  <div className="cash-close-card-title">
                    <ReceiptRefundIcon className="h-6 w-6" />
                    <span>Total de la compra</span>
                  </div>
                  <strong>{money(compraDetalle.data.total_costo)}</strong>
                  <div className="cash-close-lines">
                    <span><b>Productos</b>{compraDetalle.data.detalles.length}</span>
                    <span><b>Responsable</b>{compraDetalle.data.usuario_nombre}</span>
                    <span><b>Fecha</b>{new Date(compraDetalle.data.creado_en).toLocaleString()}</span>
                    <span><b>Estado</b>{compraDetalle.data.estado}</span>
                  </div>
                </section>

                <section className="cash-close-card cash-detail-items purchase-detail-items">
                  <div className="cash-close-card-title">
                    <ClipboardDocumentListIcon className="h-6 w-6" />
                    <span>Productos comprados</span>
                  </div>
                  <div className="cash-close-lines">
                    {compraDetalle.data.detalles.map((detalle) => (
                      <span key={detalle.id}>
                        <b>
                          {detalle.producto_nombre}
                          <small>
                            Cantidad {detalle.cantidad} · Costo unitario {money(detalle.costo_unitario)} · Precio final {money(detalle.precio_final)}
                          </small>
                        </b>
                        <strong className={detalle.tiene_alerta_precio ? "cash-session-negative" : ""}>
                          {money(detalle.subtotal_costo)}
                        </strong>
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <p className="p-8 text-center text-sm font-semibold text-red-600">No se pudo cargar el detalle.</p>
            )}
          </div>
        </div>
      )}

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => mobilePurchasesQuery.refetch()}
                  disabled={mobilePurchasesQuery.isFetching}
                  className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#ececf0] bg-white text-[#5f626b] transition hover:border-[#d8d1ff] hover:bg-[#faf9ff] hover:text-[#7652ed] disabled:opacity-50"
                  aria-label="Actualizar compras"
                  title="Actualizar compras"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${mobilePurchasesQuery.isFetching ? "animate-spin" : ""}`} />
                </button>
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
            </div>
            <div className="max-h-[76vh] min-h-[320px] overflow-y-auto p-6">
              {mobilePurchasesQuery.isLoading && (
                <p className="py-16 text-center text-sm font-semibold text-[#8b8e98]">Cargando compras del celular...</p>
              )}

              {mobilePurchasesQuery.error && (
                <div className="rounded-[18px] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700" role="alert">
                  {mobilePurchasesQuery.error instanceof Error
                    ? mobilePurchasesQuery.error.message
                    : "No se pudieron consultar las compras de Supabase."}
                </div>
              )}

              {!mobilePurchasesQuery.isLoading && !mobilePurchasesQuery.error && (mobilePurchasesQuery.data?.length ?? 0) === 0 && (
                <div className="rounded-[20px] border border-dashed border-[#dddde3] py-16 text-center text-sm font-semibold text-[#8b8e98]">
                  No hay compras enviadas desde el celular.
                </div>
              )}

              <div className="space-y-4">
                {(mobilePurchasesQuery.data ?? []).map((mobilePurchase) => {
                  const localProductsByBarcode = new Map(
                    (productos ?? [])
                      .filter((product) => product.codigo_barras)
                      .map((product) => [product.codigo_barras as string, product]),
                  );
                  const total = mobilePurchase.items.reduce((sum, item) => {
                    const localProduct = item.producto?.codigo_barras
                      ? localProductsByBarcode.get(item.producto.codigo_barras)
                      : undefined;
                    const quantity = localProduct && isWeightProduct(localProduct)
                      ? item.cantidad / 1000
                      : item.cantidad;
                    return sum + quantity * item.costo_unitario;
                  }, 0);
                  const isApproving = mobileApprovalMutation.isPending && mobileApprovalMutation.variables?.id === mobilePurchase.id;
                  const canApprove = mobilePurchase.estado !== "APROBADA";
                  const stateClass = mobilePurchase.estado === "APROBADA"
                    ? "bg-emerald-100 text-emerald-700"
                    : mobilePurchase.estado === "ERROR"
                      ? "bg-red-100 text-red-700"
                      : mobilePurchase.estado === "PROCESANDO"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-violet-100 text-violet-700";

                  return (
                    <article key={mobilePurchase.id} className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_8px_24px_rgba(33,35,48,.05)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-[#24252a]">Compra {mobilePurchase.id.slice(0, 8)}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${stateClass}`}>
                              {mobilePurchase.estado}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-[#8b8e98]">
                            {new Date(mobilePurchase.creada_en).toLocaleString()}
                            {mobilePurchase.dispositivo ? ` · ${mobilePurchase.dispositivo}` : ""}
                          </p>
                        </div>
                        <strong className="text-lg font-black text-[#24252a]">{money(total)}</strong>
                      </div>

                      {mobilePurchase.nota && (
                        <p className="mt-3 rounded-[14px] bg-[#f7f7f9] px-4 py-3 text-sm text-[#5f626b]">{mobilePurchase.nota}</p>
                      )}

                      <div className="mt-4 divide-y divide-[#efeff2] rounded-[16px] border border-[#efeff2]">
                        {mobilePurchase.items.map((item) => {
                          const localProduct = item.producto?.codigo_barras
                            ? localProductsByBarcode.get(item.producto.codigo_barras)
                            : undefined;
                          const quantityText = localProduct && isWeightProduct(localProduct)
                            ? `${item.cantidad.toLocaleString()} g (${(item.cantidad / 1000).toLocaleString()} kg)`
                            : `${item.cantidad.toLocaleString()} un.`;

                          return (
                            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                              <div className="min-w-0">
                                <strong className="block truncate text-[#24252a]">{item.producto?.nombre ?? `Producto #${item.producto_id}`}</strong>
                                <span className="text-xs font-semibold text-[#8b8e98]">
                                  {item.producto?.codigo_barras ?? "Sin código"} · {quantityText}
                                </span>
                              </div>
                              <div className="text-right">
                                <strong className="block text-[#24252a]">Costo {money(item.costo_unitario)}</strong>
                                <span className="text-xs font-semibold text-[#8b8e98]">
                                  {item.actualizar_precio_venta ? `Venta ${money(item.precio_final ?? 0)}` : "No cambia precio"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {mobilePurchase.error_mensaje && (
                        <p className="mt-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          {mobilePurchase.error_mensaje}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-[#8b8e98]">
                          {mobilePurchase.estado === "APROBADA" && mobilePurchase.compra_local_id
                            ? `Registrada como compra local #${mobilePurchase.compra_local_id}`
                            : "Revisa productos, cantidades, costos y precios antes de aprobar."}
                        </p>
                        {canApprove && (
                          <Button
                            onClick={() => mobileApprovalMutation.mutate(mobilePurchase)}
                            disabled={mobileApprovalMutation.isPending || isLoadingProducts}
                          >
                            {isApproving
                              ? "Aprobando..."
                              : mobilePurchase.estado === "PENDIENTE"
                                ? "Revisé y aprobar"
                                : "Reintentar aprobación"}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
