import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EllipsisHorizontalIcon, MagnifyingGlassIcon, PlusIcon, StarIcon as StarIconOutline, TagIcon, WalletIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import InputForm from "../components/InputForm";
import MainList from "../components/MainList";
import SideList from "../components/SideList";
import StatsPanel from "../components/StatsPanel";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";
import type { MetodoPago, ModalidadVenta, Oferta, Producto } from "../types/api";
import { createVenta } from "../services/transactionService";
import { getCajaActual } from "../services/cajaService";
import { getProducts } from "../services/productService";
import { getCategorias, getOfertasActivas } from "../services/catalogService";

type CartProduct = Producto & { quantity: number; cartItemId: string };
type CartSession = { id: string; name: string; items: CartProduct[] };
type MixedPaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
type PaymentAmounts = Record<MixedPaymentMethod, string>;
type QuickProductsModal = "frutas-verduras" | "destacados" | "ofertas" | `categoria-${number}`;
type ProductListFilter =
  | { type: "all" }
  | { type: "category"; categoryId: number; categoryName: string }
  | { type: "featured" }
  | { type: "offers" };

const isWeighableProduct = (product: Producto) =>
  product.unidad_venta === "PESO";

const blocksSalesByStock = (product: Producto) =>
  product.modo_inventario === "ESTRICTO";

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const matchesCategory = (product: Producto, categoryName: string) =>
  normalizeText(product.categoria_nombre).includes(categoryName);

const fruitTerms = [
  "manzana",
  "platano",
  "banana",
  "pera",
  "naranja",
  "mandarina",
  "limon",
  "palta",
  "uva",
  "melon",
  "sandia",
  "durazno",
  "frutilla",
  "kiwi",
];
const vegetableTerms = [
  "lechuga",
  "tomate",
  "cebolla",
  "papa",
  "zanahoria",
  "zapallo",
  "pepino",
  "pimenton",
  "brocoli",
  "coliflor",
  "apio",
  "acelga",
  "cilantro",
  "perejil",
];

const matchesAnyTerm = (product: Producto, terms: string[]) => {
  const name = normalizeText(product.nombre);
  return terms.some((term) => name.includes(term));
};

const createCartItemId = (productId: number) => `${productId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const createCartSession = (index: number): CartSession => ({
  id: `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: `Carrito ${index}`,
  items: [],
});

const mixedPaymentOptions: Array<{ label: string; methods: MixedPaymentMethod[] }> = [
  { label: "Efectivo + débito", methods: ["EFECTIVO", "TARJETA"] },
  { label: "Efectivo + transferencia", methods: ["EFECTIVO", "TRANSFERENCIA"] },
  { label: "Débito + transferencia", methods: ["TARJETA", "TRANSFERENCIA"] },
  { label: "Efectivo + débito + transferencia", methods: ["EFECTIVO", "TARJETA", "TRANSFERENCIA"] },
];

const paymentLabels: Record<MixedPaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Débito / tarjeta",
  TRANSFERENCIA: "Transferencia",
};

const paymentMethodLabels: Record<MetodoPago, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Débito / tarjeta",
  TRANSFERENCIA: "Transferencia",
  MIXTO: "Mixto",
};

const cashSuggestionAmounts = [1000, 2000, 5000, 10000, 20000];
const featuredProductsStorageKey = "pos-featured-products";

const toInputAmount = (value: number) => (value > 0 ? String(value) : "");
const toAmount = (value: string) => Number(value) || 0;
const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step;
const formatMoney = (value: number) => `$${value.toLocaleString()}`;
const formatOfferQuantity = (offer: Oferta) =>
  offer.producto_unidad_venta === "PESO"
    ? `${Number((offer.cantidad_oferta * 1000).toFixed(0))} g`
    : `${offer.cantidad_oferta} un.`;

const getCategoryVisual = (name: string) => {
  const normalized = normalizeText(name);
  if (normalized.includes("fruta")) return "🍊";
  if (normalized.includes("verdura")) return "🥦";
  if (normalized.includes("lact")) return "🥛";
  if (normalized.includes("bebida")) return "🧃";
  if (normalized.includes("carne")) return "🥩";
  return name.trim().charAt(0).toUpperCase() || "•";
};

const categoryImageModules = import.meta.glob("../assets/images/categories/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const slugifyAssetName = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const categoryImagesBySlug = Object.entries(categoryImageModules).reduce<Record<string, string>>((acc, [path, src]) => {
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  const matchingCategory = [
    "frutas-y-verduras",
    "congelados",
    "abarrotes",
    "bebidas",
    "consignacion",
  ].find((slug) => filename === slug || filename.startsWith(`${slug}-`));

  if (matchingCategory && !acc[matchingCategory]) {
    acc[matchingCategory] = src;
  }

  return acc;
}, {});

const calculateOfferLine = (product: Producto, quantity: number, offer?: Oferta) => {
  const normalTotal = product.precio_venta * quantity;

  if (!offer || quantity < offer.cantidad_oferta) {
    return { normalTotal, discount: 0, finalTotal: normalTotal };
  }

  const groups = Math.floor((quantity + Number.EPSILON) / offer.cantidad_oferta);
  const offerQuantity = groups * offer.cantidad_oferta;
  const remainingQuantity = Math.max(0, quantity - offerQuantity);
  const offerTotal = groups * offer.precio_oferta + remainingQuantity * product.precio_venta;
  const discount = Math.max(0, normalTotal - offerTotal);

  return {
    normalTotal,
    discount,
    finalTotal: normalTotal - discount,
  };
};

const aggregateSaleItems = (cart: CartProduct[]) => {
  const itemsByProduct = new Map<number, number>();

  for (const item of cart) {
    itemsByProduct.set(item.id, Number(((itemsByProduct.get(item.id) ?? 0) + item.quantity).toFixed(3)));
  }

  return Array.from(itemsByProduct, ([producto_id, cantidad]) => ({ producto_id, cantidad }));
};
const createMixedAmounts = (methods: MixedPaymentMethod[], total: number): PaymentAmounts => {
  const amounts: PaymentAmounts = {
    EFECTIVO: "",
    TARJETA: "",
    TRANSFERENCIA: "",
  };
  const balanceMethod = methods[methods.length - 1];

  if (balanceMethod) {
    amounts[balanceMethod] = toInputAmount(total);
  }

  return amounts;
};

const createCashSuggestions = (total: number) => {
  const roundedOptions = cashSuggestionAmounts
    .map((amount) => roundUpTo(total, amount))
    .filter((amount) => amount > total);
  const uniqueAmounts = Array.from(new Set([total, ...roundedOptions]));

  return uniqueAmounts;
};

const readFeaturedProductIds = () => {
  try {
    const stored = window.sessionStorage.getItem(featuredProductsStorageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
};

export default function Home() {
  const queryClient = useQueryClient();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [barcodeClearSignal, setBarcodeClearSignal] = useState(0);
  const [productListFilter, setProductListFilter] = useState<ProductListFilter>({ type: "all" });
  const [carts, setCarts] = useState<CartSession[]>(() => [createCartSession(1)]);
  const [activeCartId] = useState(() => "");
  const [message, setMessage] = useState("");
  const [centerAlert, setCenterAlert] = useState("");
  const [weighableProduct, setWeighableProduct] = useState<Producto | null>(null);
  const [grams, setGrams] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [quickProductsModal, setQuickProductsModal] = useState<QuickProductsModal | null>(null);
  const [featuredProductIds, setFeaturedProductIds] = useState<number[]>(readFeaturedProductIds);
  const [modalidadVenta, setModalidadVenta] = useState<ModalidadVenta>("NORMAL");
  const [masterPassword, setMasterPassword] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [cashReceived, setCashReceived] = useState("");
  const [mixedMethods, setMixedMethods] = useState<MixedPaymentMethod[]>(["EFECTIVO", "TARJETA"]);
  const [mixedAmounts, setMixedAmounts] = useState<PaymentAmounts>({
    EFECTIVO: "",
    TARJETA: "",
    TRANSFERENCIA: "",
  });

  const { data: cajaActual } = useQuery({
    queryKey: ["caja-actual"],
    queryFn: getCajaActual,
  });
  const { data: productos } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts({ activo: true }),
  });
  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => getCategorias(),
  });
  const { data: ofertasActivas } = useQuery({
    queryKey: ["ofertas", "activas"],
    queryFn: () => getOfertasActivas(),
  });

  const activeOffers = ofertasActivas?.items ?? [];
  const activeOffersByProductId = new Map(activeOffers.map((offer) => [offer.producto_id, offer]));
  const allCategoryButtons = (categorias?.items ?? [])
    .map((category) => ({ id: category.id, name: category.nombre }));
  const categoryButtons = allCategoryButtons.slice(0, 4);
  const extraCategoryButtons = allCategoryButtons.slice(4);
  const quickCategoryId = quickProductsModal?.startsWith("categoria-")
    ? Number(quickProductsModal.replace("categoria-", ""))
    : null;
  const quickCategoryName = allCategoryButtons.find((category) => category.id === quickCategoryId)?.name;

  const produceProducts = (productos?.items ?? []).filter(
    (product) =>
      matchesCategory(product, "frutas") ||
      matchesCategory(product, "verduras") ||
      matchesAnyTerm(product, fruitTerms) ||
      matchesAnyTerm(product, vegetableTerms),
  );
  const featuredProducts = (productos?.items ?? []).filter((product) => featuredProductIds.includes(product.id));
  const offerProducts = (productos?.items ?? []).filter((product) => activeOffersByProductId.has(product.id));
  const listedProducts =
    productListFilter.type === "category"
      ? (productos?.items ?? []).filter((product) => product.categoria_id === productListFilter.categoryId)
      : productListFilter.type === "featured"
        ? featuredProducts
        : productListFilter.type === "offers"
          ? offerProducts
          : productos?.items ?? [];
  const listedProductsTitle =
    productListFilter.type === "category"
      ? productListFilter.categoryName
      : productListFilter.type === "featured"
        ? "Favoritos"
        : productListFilter.type === "offers"
          ? "Ofertas"
          : "Productos";
  const categoryProducts = quickCategoryId
    ? (productos?.items ?? []).filter((product) => product.categoria_id === quickCategoryId)
    : [];
  const quickProducts =
    quickProductsModal === "destacados"
      ? featuredProducts
      : quickProductsModal === "ofertas"
        ? offerProducts
        : quickCategoryId
          ? categoryProducts
          : produceProducts;
  const quickProductsTitle =
    quickProductsModal === "destacados"
      ? "Productos destacados"
      : quickProductsModal === "ofertas"
        ? "Productos en oferta"
        : quickCategoryName ?? "Frutas y verduras";
  const resolvedActiveCartId = activeCartId || carts[0]?.id || "";
  const activeCart = carts.find((cartSession) => cartSession.id === resolvedActiveCartId) ?? carts[0];
  const cart = activeCart?.items ?? [];

  const focusBarcodeInput = () => {
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  useEffect(() => {
    focusBarcodeInput();
  }, []);

  useEffect(() => {
    if (isProductSearchOpen) {
      window.setTimeout(() => productSearchInputRef.current?.focus(), 0);
    }
  }, [isProductSearchOpen]);

  useEffect(() => {
    window.sessionStorage.setItem(featuredProductsStorageKey, JSON.stringify(featuredProductIds));
  }, [featuredProductIds]);

  const toggleFeaturedProduct = (productId: number) => {
    setFeaturedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const setCart = (updater: CartProduct[] | ((items: CartProduct[]) => CartProduct[])) => {
    setCarts((prev) =>
      prev.map((cartSession) => {
        if (cartSession.id !== resolvedActiveCartId) return cartSession;
        const nextItems = typeof updater === "function" ? updater(cartSession.items) : updater;
        return { ...cartSession, items: nextItems };
      }),
    );
  };

  const total = cart.reduce((acc, p) => {
    const quantity = p.quantity ?? 0;
    return acc + p.precio_venta * quantity;
  }, 0);
  const descuentoOfertas = cart.reduce((acc, p) => {
    if (modalidadVenta !== "NORMAL") return acc;
    const quantity = p.quantity ?? 0;
    const offer = activeOffersByProductId.get(p.id);
    return acc + calculateOfferLine(p, quantity, offer).discount;
  }, 0);
  const totalCosto = cart.reduce((acc, p) => {
    const quantity = p.quantity ?? 0;
    return acc + (p.costo_actual ?? p.precio_venta) * quantity;
  }, 0);
  const totalFinal =
    modalidadVenta === "RETIRO_DUENO"
      ? 0
      : modalidadVenta === "PRECIO_COSTO"
        ? totalCosto
        : total - descuentoOfertas;
  const cashReceivedAmount = toAmount(cashReceived);
  const mixedTotal = mixedMethods.reduce((sum, method) => sum + toAmount(mixedAmounts[method]), 0);
  const cashSuggestions = createCashSuggestions(totalFinal);
  const canConfirmSale =
    modalidadVenta !== "NORMAL" && !masterPassword
      ? false
      : modalidadVenta === "RETIRO_DUENO"
        ? true
        : metodoPago === "EFECTIVO"
          ? cashReceivedAmount >= totalFinal
          : metodoPago === "MIXTO"
            ? mixedTotal >= totalFinal
            : true;

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (!cajaActual?.abierta) {
      setCenterAlert("Abre una caja antes de registrar ventas.");
      return;
    }
    setMetodoPago("EFECTIVO");
    setModalidadVenta("NORMAL");
    setMasterPassword("");
    setCashReceived(toInputAmount(totalFinal));
    setMixedMethods(["EFECTIVO", "TARJETA"]);
    setMixedAmounts(createMixedAmounts(["EFECTIVO", "TARJETA"], totalFinal));
    setPaymentModalOpen(true);
  };

  const handlePaymentMethodChange = (method: MetodoPago) => {
    setMetodoPago(method);
    if (method === "EFECTIVO") {
      setCashReceived(toInputAmount(totalFinal));
    }
    if (method === "MIXTO") {
      const methods: MixedPaymentMethod[] = ["EFECTIVO", "TARJETA"];
      setMixedMethods(methods);
      setMixedAmounts(createMixedAmounts(methods, totalFinal));
    }
  };

  const handleMixedOptionChange = (methods: MixedPaymentMethod[]) => {
    setMixedMethods(methods);
    setMixedAmounts(createMixedAmounts(methods, totalFinal));
  };

  const handleMixedAmountChange = (method: MixedPaymentMethod, value: string) => {
    if (value !== "" && !Number.isFinite(Number(value))) return;

    setMixedAmounts((prev) => {
      const next = { ...prev, [method]: value };
      const balanceMethod = mixedMethods.find((item) => item !== method);

      if (balanceMethod) {
        const fixedTotal = mixedMethods
          .filter((item) => item !== balanceMethod)
          .reduce((sum, item) => sum + toAmount(next[item]), 0);
        next[balanceMethod] = toInputAmount(Math.max(0, totalFinal - fixedTotal));
      }

      return next;
    });
  };

  const handleFinishSale = async () => {
    if (metodoPago === "EFECTIVO" && cashReceivedAmount < totalFinal) {
      setMessage("El monto recibido no alcanza para pagar la venta.");
      return;
    }
    if (metodoPago === "MIXTO" && mixedTotal < totalFinal) {
      setMessage("La combinación de pagos no alcanza para pagar la venta.");
      return;
    }

    try {
      await createVenta({
        metodo_pago: metodoPago,
        modalidad: modalidadVenta,
        master_password: modalidadVenta === "NORMAL" ? undefined : masterPassword,
        items: aggregateSaleItems(cart),
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["caja-actual"] });
      queryClient.invalidateQueries({ queryKey: ["reportes"] });
      setCart([]);
      setPaymentModalOpen(false);
      setCashReceived("");
      setMasterPassword("");
      setModalidadVenta("NORMAL");
      setMixedAmounts({ EFECTIVO: "", TARJETA: "", TRANSFERENCIA: "" });
      setMessage("Venta registrada correctamente.");
      focusBarcodeInput();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hubo un error al registrar la venta");
    }
  };

  const addProductToCart = (product: Producto, quantity: number) => {
    setMessage("");
    setCart((prev) => {
      const limitsByStock = blocksSalesByStock(product);
      const currentProductQuantity = prev
        .filter((item) => String(item.id) === String(product.id))
        .reduce((sum, item) => sum + item.quantity, 0);
      const requestedQuantity = Number(quantity.toFixed(3));
      const availableQuantity = limitsByStock
        ? Math.max(0, product.stock - currentProductQuantity)
        : requestedQuantity;
      const quantityToAdd = limitsByStock
        ? Math.min(requestedQuantity, availableQuantity)
        : requestedQuantity;

      if (quantityToAdd <= 0) return prev;

      if (isWeighableProduct(product)) {
        return [...prev, { ...product, quantity: quantityToAdd, cartItemId: createCartItemId(product.id) }];
      }

      const idx = prev.findIndex((p) => String(p.id) === String(product.id));

      if (idx !== -1) {
        const updated = [...prev];
        const nextQuantity = Number((updated[idx].quantity + quantityToAdd).toFixed(3));
        updated[idx] = {
          ...updated[idx],
          quantity: limitsByStock ? Math.min(nextQuantity, product.stock) : nextQuantity,
        };
        return updated;
      }

      return [...prev, { ...product, quantity: quantityToAdd, cartItemId: createCartItemId(product.id) }];
    });
  };

  const handleProductFound = (product: Producto) => {
    if (isWeighableProduct(product)) {
      setWeighableProduct(product);
      setGrams("");
      return;
    }

    addProductToCart(product, 1);
    focusBarcodeInput();
  };

  const handleConfirmWeight = () => {
    if (!weighableProduct) return;
    const gramsAmount = Number(grams);
    const quantityKg = Number((gramsAmount / 1000).toFixed(3));
    if (quantityKg <= 0) {
      setMessage("Ingresa un peso mayor a 0 gramos.");
      return;
    }
    addProductToCart(weighableProduct, quantityKg);
    setWeighableProduct(null);
    focusBarcodeInput();
  };

  const handleWeightKeypadPress = (key: string) => {
    setGrams((current) => {
      if (key === "clear") return "";
      if (key === "backspace") return current.slice(0, -1);
      if (/^\d$/.test(key)) return `${current}${key}`.replace(/^0+(?=\d)/, "");
      return current;
    });
  };


  const handleDecreaseQuantity = (cartItemId: string) => {
    setCart((prev) =>
      prev.flatMap((p) => {
        if (p.cartItemId === cartItemId) {
          if (isWeighableProduct(p)) return [p];
          if (p.quantity > 1) {
            return [{ ...p, quantity: p.quantity - 1 }];
          }
          return [];
        }
        return [p];
      })
    );
  };

  const handleIncreaseQuantity = (cartItemId: string) => {
    setCart((prev) =>
      prev.map((product) => {
        if (product.cartItemId !== cartItemId) return product;
        if (isWeighableProduct(product)) return product;
        return {
          ...product,
          quantity: blocksSalesByStock(product)
            ? Math.min(product.quantity + 1, product.stock)
            : product.quantity + 1,
        };
      }),
    );
  };

  const handleRemoveProduct = (cartItemId: string) => {
    setCart((prev) => prev.filter((p) => p.cartItemId !== cartItemId));
  };

  const handleCloseProductSearch = () => {
    setIsProductSearchOpen(false);
    setSearchTerm("");
    focusBarcodeInput();
  };

  const handleProductSearchBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget as HTMLElement | null;
    if (nextTarget?.getAttribute("aria-label") === "Borrar código") return;

    window.setTimeout(handleCloseProductSearch, 120);
  };

  const handleClearBarcodeInput = () => {
    setBarcodeClearSignal((current) => current + 1);
  };

  const handleModalidadChange = (modalidad: ModalidadVenta) => {
    const nextTotal =
      modalidad === "RETIRO_DUENO"
        ? 0
        : modalidad === "PRECIO_COSTO"
          ? totalCosto
          : total - descuentoOfertas;
    setModalidadVenta(modalidad);
    setMasterPassword("");
    setCashReceived(toInputAmount(nextTotal));
    setMixedAmounts(createMixedAmounts(mixedMethods, nextTotal));
  };

  return (
    <div className="pos-main-content">
      <section className="pos-catalog-panel">
        <header className="pos-header-row">
          <div>
            <p className="pos-kicker">Venta actual</p>
            <h1 className="pos-title">Punto de venta</h1>
          </div>
          <div className="pos-status-pill">
            <span className="pos-status-dot" />
            {cajaActual?.abierta ? "Caja abierta" : "Caja cerrada"}
          </div>
        </header>

        <div className="pos-barcode-row">
          <InputForm
            ref={barcodeInputRef}
            title="Escanear o ingresar código de barra"
            onProductFound={handleProductFound}
            clearSignal={barcodeClearSignal}
            showClearButton={false}
            size="large"
          />
          <button
            type="button"
            onClick={() => setIsProductSearchOpen(true)}
            className="pos-tool-btn"
            aria-label="Buscar producto"
            title="Buscar producto"
          >
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="pos-tool-btn"
            aria-label="Agregar"
            title="Agregar"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={handleClearBarcodeInput}
            className="pos-tool-btn"
            aria-label="Borrar código"
            title="Borrar código"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <section className="pos-category-block">
          <div className="pos-section-row">
            <div>
              <span className="pos-kicker">Categorías</span>
              <h2 className="pos-subtitle">Explora productos</h2>
            </div>
            <span className="pos-category-count">{allCategoryButtons.length} categorías</span>
          </div>

          <div className="pos-category-strip">
            {categoryButtons.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setProductListFilter({ type: "category", categoryId: category.id, categoryName: category.name })}
                className={`pos-category-card ${productListFilter.type === "category" && productListFilter.categoryId === category.id ? "active" : ""}`}
              >
                <span className="pos-category-visual">
                  {categoryImagesBySlug[slugifyAssetName(category.name)] ? (
                    <img src={categoryImagesBySlug[slugifyAssetName(category.name)]} alt="" />
                  ) : (
                    getCategoryVisual(category.name)
                  )}
                </span>
                <span className="pos-category-label">{category.name}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="pos-category-card"
              aria-label="Ver más categorías"
              title="Ver más categorías"
            >
              <span className="pos-category-visual">
                <EllipsisHorizontalIcon className="h-8 w-8 text-[#6fab89]" />
              </span>
              <span className="pos-category-label">Más</span>
            </button>
            <button
              type="button"
              onClick={() => setProductListFilter({ type: "featured" })}
              className={`pos-category-card ${productListFilter.type === "featured" ? "active" : ""}`}
              aria-label="Productos destacados"
              title="Productos destacados"
            >
              <span className="pos-category-visual"><StarIconSolid className="h-7 w-7 text-amber-500" /></span>
              <span className="pos-category-label">Favoritos</span>
            </button>
            <button
              type="button"
              onClick={() => setProductListFilter({ type: "offers" })}
              className={`pos-category-card ${productListFilter.type === "offers" ? "active" : ""}`}
              aria-label="Productos en oferta"
              title="Productos en oferta"
            >
              <span className="pos-category-visual"><TagIcon className="h-7 w-7 text-sky-600" /></span>
              <span className="pos-category-label">Ofertas</span>
            </button>
          </div>
        </section>

        {isProductSearchOpen && (
          <div className="pos-search-wrap">
            <InputForm
              ref={productSearchInputRef}
              title="Buscar producto"
              onSearchChange={setSearchTerm}
              onBlur={handleProductSearchBlur}
            />
          </div>
        )}

        <SideList
          searchTerm={searchTerm}
          onProductClick={handleProductFound}
          featuredProductIds={featuredProductIds}
          onToggleFeatured={toggleFeaturedProduct}
          productsOverride={listedProducts}
          isLoadingOverride={!productos}
          title={listedProductsTitle}
        />
      </section>

      <aside className="pos-checkout-panel">
        <div className="pos-cart-head">
          <div>
            <span className="pos-kicker">Pedido</span>
            <h2 className="pos-subtitle">Carrito de compras</h2>
          </div>
          <button type="button" onClick={() => setCart([])} className="border-0 bg-transparent px-2 py-1 text-xs text-[#8b8e97] hover:text-[#494b53]">
            Vaciar
          </button>
        </div>
        <MainList
          products={cart}
          onDecrease={handleDecreaseQuantity}
          onIncrease={handleIncreaseQuantity}
          onRemove={handleRemoveProduct}
        />
        {!cajaActual?.abierta && (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <WalletIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-semibold">Sin turno de caja abierto</p>
                <p className="mt-1 text-amber-800">
                  Puedes revisar módulos administrativos, pero no finalizar ventas ni movimientos de caja.
                </p>
                <Link to="/caja" className="mt-3 inline-flex font-semibold text-amber-950 hover:underline">
                  Ir a Caja
                </Link>
              </div>
            </div>
          </div>
        )}
        {message && <p className="mb-3 rounded-xl border border-[#ececf0] bg-white p-3 text-sm">{message}</p>}
        <StatsPanel total={totalFinal} onFinish={handleOpenPayment} disabled={cart.length === 0 || !cajaActual?.abierta} />
      </aside>
      {centerAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Atención</h2>
            <p className="mt-3 text-sm text-gray-600">{centerAlert}</p>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setCenterAlert("");
                focusBarcodeInput();
              }}
              className="mt-5 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      {weighableProduct && (
        <div className="flow-modal-backdrop">
          <div className="flow-modal weight-modal max-w-md p-0">
            <div className="p-6 pb-4">
              <span className="pos-kicker">Producto por peso</span>
              <h2 className="flow-modal-title">{weighableProduct.nombre}</h2>
              <p className="mt-2 text-sm text-[#8b8e98]">
                ${weighableProduct.precio_venta.toLocaleString()}/kg · Stock {weighableProduct.stock} kg
              </p>
              <FormField label="Peso en gramos" className="mt-5">
                <input
                  autoFocus
                  inputMode="numeric"
                  type="text"
                  value={grams}
                  onChange={(event) => setGrams(event.target.value.replace(/\D/g, ""))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleConfirmWeight();
                    if (event.key === "Escape") {
                      setWeighableProduct(null);
                      focusBarcodeInput();
                    }
                  }}
                  className={`${inputClassName} text-center text-3xl font-bold`}
                  placeholder="0"
                />
              </FormField>
              <div className="mt-3 flow-total-card text-sm text-[#5f626b]">
                <div className="flex justify-between">
                  <span>Peso</span>
                  <strong>{(Number(grams) / 1000).toFixed(3)} kg</strong>
                </div>
                <div className="pos-grand-total">
                  <span>Total</span>
                  <strong>${Math.max(0, (Number(grams) / 1000) * weighableProduct.precio_venta).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="weight-keypad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
                <button key={key} type="button" onClick={() => handleWeightKeypadPress(key)}>
                  {key}
                </button>
              ))}
              <button type="button" onClick={() => handleWeightKeypadPress("clear")}>C</button>
              <button type="button" onClick={() => handleWeightKeypadPress("0")}>0</button>
              <button type="button" onClick={() => handleWeightKeypadPress("backspace")}>⌫</button>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[#ececf0] bg-white p-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setWeighableProduct(null);
                  focusBarcodeInput();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmWeight}>
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}
      {quickProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{quickProductsTitle}</h2>
                <p className="mt-1 text-sm text-gray-500">{quickProducts.length} productos disponibles</p>
              </div>
              <button onClick={() => setQuickProductsModal(null)} className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100">
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid max-h-[70vh] grid-cols-1 gap-3 overflow-auto md:grid-cols-2 lg:grid-cols-3">
              {quickProducts.map((product) => {
                const isFeatured = featuredProductIds.includes(product.id);
                const offer = activeOffersByProductId.get(product.id);

                return (
                <div
                  key={product.id}
                  className="rounded-lg border border-gray-200 px-4 py-3 hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleProductFound(product);
                        setQuickProductsModal(null);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-semibold text-gray-900">{product.nombre}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Stock {product.stock}{isWeighableProduct(product) ? " kg" : " unidades"}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        ${product.precio_venta.toLocaleString()}{isWeighableProduct(product) ? "/kg" : ""}
                      </p>
                      {offer && (
                        <p className="mt-1 text-sm font-semibold text-sky-700">
                          Oferta: {formatOfferQuantity(offer)} por ${offer.precio_oferta.toLocaleString()}
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFeaturedProduct(product.id)}
                      className={`rounded-md p-2 ${
                        isFeatured
                          ? "text-amber-500 hover:bg-amber-50"
                          : "text-gray-300 hover:bg-gray-100 hover:text-amber-500"
                      }`}
                      aria-label={isFeatured ? "Quitar de destacados" : "Destacar producto"}
                      title={isFeatured ? "Quitar de destacados" : "Destacar producto"}
                    >
                      {isFeatured ? <StarIconSolid className="h-5 w-5" /> : <StarIconOutline className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                );
              })}
              {quickProducts.length === 0 && (
                <div className="col-span-full py-10 text-center text-sm text-gray-500">
                  {quickProductsModal === "destacados"
                    ? "Marca productos con la estrella para verlos aquí."
                    : quickProductsModal === "ofertas"
                      ? "No hay ofertas activas vigentes."
                    : "No hay productos en esta categoría."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {categoryModalOpen && (
        <div className="flow-modal-backdrop">
          <div className="flow-modal max-w-3xl">
            <div className="pos-section-row">
              <div>
                <span className="pos-kicker">Categorías</span>
                <h2 className="flow-modal-title">Más categorías</h2>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="rounded-xl border border-[#ececf0] bg-white px-3 py-2 text-sm font-bold text-[#5f626b] hover:bg-[#f7f7f9]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {extraCategoryButtons.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setProductListFilter({ type: "category", categoryId: category.id, categoryName: category.name });
                    setCategoryModalOpen(false);
                  }}
                  className={`pos-category-card ${productListFilter.type === "category" && productListFilter.categoryId === category.id ? "active" : ""}`}
                >
                  <span className="pos-category-visual">
                    {categoryImagesBySlug[slugifyAssetName(category.name)] ? (
                      <img src={categoryImagesBySlug[slugifyAssetName(category.name)]} alt="" />
                    ) : (
                      getCategoryVisual(category.name)
                    )}
                  </span>
                  <span className="pos-category-label">{category.name}</span>
                </button>
              ))}
              {extraCategoryButtons.length === 0 && (
                <p className="col-span-full rounded-2xl border border-[#ececf0] bg-[#fafafa] p-6 text-center text-sm text-[#8b8e98]">
                  No hay más categorías disponibles.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {paymentModalOpen && (
        <div className="flow-modal-backdrop">
          <div className="flow-modal max-w-4xl">
            <div className="pos-section-row">
              <div>
                <span className="pos-kicker">Pago</span>
                <h2 className="flow-modal-title">Finalizar venta</h2>
              </div>
              <div className="pos-status-pill">
                <span className="pos-status-dot" />
                {cart.length} productos
              </div>
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="flow-total-card">
                  <div className="flex justify-between text-sm text-[#84868e]">
                    <span>Subtotal</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                  {modalidadVenta === "NORMAL" && descuentoOfertas > 0 && (
                    <div className="mt-1 flex justify-between text-sm text-sky-700">
                      <span>Descuento ofertas</span>
                      <span>-{formatMoney(descuentoOfertas)}</span>
                    </div>
                  )}
                  {modalidadVenta === "PRECIO_COSTO" && (
                    <div className="mt-1 flex justify-between text-sm text-[#84868e]">
                      <span>Venta precio costo</span>
                      <span>{formatMoney(totalCosto)}</span>
                    </div>
                  )}
                  {modalidadVenta === "RETIRO_DUENO" && (
                    <div className="mt-1 flex justify-between text-sm text-[#84868e]">
                      <span>Retiro dueño</span>
                      <span>Costo ref. {formatMoney(totalCosto)}</span>
                    </div>
                  )}
                  <div className="pos-grand-total">
                    <span>Total a pagar</span>
                    <strong>${totalFinal.toLocaleString()}</strong>
                  </div>
                </div>

                <label className="mt-5 block text-sm font-bold text-[#5f626b]">Método de pago</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"] as MetodoPago[]).map((method) => {
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => handlePaymentMethodChange(method)}
                        className={`flow-payment-option ${metodoPago === method ? "active" : ""}`}
                      >
                        {paymentMethodLabels[method]}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <p className="text-sm font-bold text-[#5f626b]">Administrador</p>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleModalidadChange(modalidadVenta === "RETIRO_DUENO" ? "NORMAL" : "RETIRO_DUENO")}
                      className={`flow-payment-option ${
                        modalidadVenta === "RETIRO_DUENO"
                          ? "active"
                          : ""
                      }`}
                    >
                      Retiro de dueño
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModalidadChange(modalidadVenta === "PRECIO_COSTO" ? "NORMAL" : "PRECIO_COSTO")}
                      className={`flow-payment-option ${
                        modalidadVenta === "PRECIO_COSTO"
                          ? "active"
                          : ""
                      }`}
                    >
                      Vender a precio costo
                    </button>
                  </div>
                  {modalidadVenta !== "NORMAL" && (
                    <FormField label="Clave admin" className="mt-3">
                      <input
                        type="password"
                        value={masterPassword}
                        onChange={(event) => setMasterPassword(event.target.value)}
                        className={inputClassName}
                      />
                    </FormField>
                  )}
                </div>
              </div>

              <div>
                {modalidadVenta !== "RETIRO_DUENO" && metodoPago === "EFECTIVO" && (
                  <>
                    <FormField label="Monto recibido">
                    <input
                      autoFocus
                      type="number"
                      min={0}
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleFinishSale();
                        if (event.key === "Escape") {
                          setPaymentModalOpen(false);
                          focusBarcodeInput();
                        }
                      }}
                      className={`${inputClassName} text-lg`}
                    />
                    </FormField>
                    <div className="mt-3 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="text-sm font-semibold uppercase text-emerald-700">Vuelto</p>
                      <p className="mt-1 text-4xl font-bold leading-tight text-emerald-800">
                        ${Math.max(0, cashReceivedAmount - totalFinal).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-bold text-[#5f626b]">Sugeridos</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {cashSuggestions.map((amount, index) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setCashReceived(toInputAmount(amount))}
                            className="flow-payment-option"
                          >
                            {index === 0 ? "Pago justo" : formatMoney(amount)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {modalidadVenta !== "RETIRO_DUENO" && metodoPago === "MIXTO" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-bold text-[#5f626b]">Combinación de pagos</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {mixedPaymentOptions.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => handleMixedOptionChange(option.methods)}
                            className={`flow-payment-option ${
                              option.methods.join("-") === mixedMethods.join("-")
                                ? "active"
                                : ""
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {mixedMethods.map((method) => (
                        <FormField key={method} label={paymentLabels[method]}>
                          <input
                            type="number"
                            min={0}
                            value={mixedAmounts[method]}
                            onChange={(event) => handleMixedAmountChange(method, event.target.value)}
                            className={inputClassName}
                          />
                        </FormField>
                      ))}
                    </div>

                    <div className="rounded-[16px] border border-[#ececf0] bg-[#fafafa] p-3 text-sm text-[#5f626b]">
                      Pagado: ${mixedTotal.toLocaleString()} · Falta: ${Math.max(0, totalFinal - mixedTotal).toLocaleString()}
                    </div>
                  </div>
                )}
                {modalidadVenta === "RETIRO_DUENO" && (
                  <div className="rounded-[20px] border border-[#ececf0] bg-[#fafafa] p-4 text-sm text-[#5f626b]">
                    Este registro descontará stock y quedará marcado como retiro de dueño. No suma efectivo al cierre de caja.
                  </div>
                )}
              </div>
            </div>

            <FormActions className="mt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setPaymentModalOpen(false);
                  focusBarcodeInput();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFinishSale}
                disabled={!canConfirmSale}
              >
                {modalidadVenta === "RETIRO_DUENO" ? "Registrar retiro" : "Confirmar venta"}
              </Button>
            </FormActions>
          </div>
        </div>
      )}
    </div>
  );
}
