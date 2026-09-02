import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import InputForm from "../components/InputForm";
import MainList from "../components/MainList";
import SideList from "../components/SideList";
import StatsPanel from "../components/StatsPanel";
import ProductTile from "../components/ProductTile";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";
import AdminPasswordModal from "../components/AdminPasswordModal";
import type { MetodoPago, ModalidadVenta, Oferta, Producto } from "../types/api";
import { createVenta } from "../services/transactionService";
import { getCajaActual } from "../services/cajaService";
import { getAllProducts, getProductByBarcode, getProducts } from "../services/productService";
import { getAllOfertasActivas, getCategorias } from "../services/catalogService";

type CartProduct = Producto & { quantity: number; cartItemId: string };
type CartSession = { id: string; name: string; items: CartProduct[] };
type MixedPaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
type PaymentAmounts = Record<MixedPaymentMethod, string>;
type QuickProductsModal = `categoria-${number}`;
type ProductShelfFilter = "featured" | "offers";
type CategoryButton = { id: number; name: string; index: number };

const isWeighableProduct = (product: Producto) =>
  product.unidad_venta === "PESO";

const blocksSalesByStock = (product: Producto) =>
  product.modo_inventario === "ESTRICTO";

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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

const paymentMethodHints: Record<MetodoPago, string> = {
  EFECTIVO: "Pago en billetes",
  TARJETA: "POS / débito",
  TRANSFERENCIA: "Banco",
  MIXTO: "Combinar",
};

const paymentMethodIcons = {
  EFECTIVO: BanknotesIcon,
  TARJETA: CreditCardIcon,
  TRANSFERENCIA: ArrowsRightLeftIcon,
  MIXTO: WalletIcon,
} satisfies Record<MetodoPago, typeof BanknotesIcon>;

const cashSuggestionAmounts = [1000, 2000, 5000, 10000, 20000];
const saleCartsStorageKey = "pos-sale-carts";
const featuredProductsStorageKey = "pos-featured-products";
const featuredCategoriesStorageKey = "pos-featured-categories";
const productModalPageSize = 30;
const categoryFavoriteSlots = 6;

const toInputAmount = (value: number) => (value > 0 ? String(value) : "");
const toAmount = (value: string) => Number(value) || 0;
const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step;
const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundToNearestTen = (value: number) => Math.round(value / 10) * 10;
const formatMoney = (value: number) => `$${value.toLocaleString()}`;
const formatSignedMoney = (value: number) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString()}`;

const getCategoryVisual = (name: string) => {
  const normalized = normalizeText(name);
  if (normalized.includes("fruta")) return "🍊";
  if (normalized.includes("verdura")) return "🥦";
  if (normalized.includes("lact")) return "🥛";
  if (normalized.includes("bebida")) return "🧃";
  if (normalized.includes("carne")) return "🥩";
  return name.trim().charAt(0).toUpperCase() || "•";
};

const getCategorySortPriority = (name: string) => {
  const normalized = normalizeText(name);

  if (normalized.includes("fruta") && normalized.includes("verdura")) return 0;
  if (normalized.includes("abarrote")) return 1;

  return 2;
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

const readSaleCarts = (): CartSession[] => {
  try {
    const stored = window.sessionStorage.getItem(saleCartsStorageKey);
    if (!stored) return [createCartSession(1)];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createCartSession(1)];

    const cartsAreValid = parsed.every((cartSession) =>
      cartSession !== null &&
      typeof cartSession === "object" &&
      typeof cartSession.id === "string" &&
      typeof cartSession.name === "string" &&
      Array.isArray(cartSession.items) &&
      cartSession.items.every((item: unknown) =>
        item !== null &&
        typeof item === "object" &&
        "id" in item &&
        typeof item.id === "number" &&
        "quantity" in item &&
        typeof item.quantity === "number" &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        "cartItemId" in item &&
        typeof item.cartItemId === "string",
      ),
    );

    return cartsAreValid ? parsed as CartSession[] : [createCartSession(1)];
  } catch {
    return [createCartSession(1)];
  }
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

const readFeaturedCategoryIds = () => {
  try {
    const stored = window.sessionStorage.getItem(featuredCategoriesStorageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => Number.isInteger(id) && id > 0).slice(0, categoryFavoriteSlots);
  } catch {
    return [];
  }
};

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const priceLookupInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isPriceLookupOpen, setIsPriceLookupOpen] = useState(false);
  const [priceLookupCode, setPriceLookupCode] = useState("");
  const [priceLookupProduct, setPriceLookupProduct] = useState<Producto | null>(null);
  const [priceLookupMessage, setPriceLookupMessage] = useState("");
  const [isPriceLookupLoading, setIsPriceLookupLoading] = useState(false);
  const [barcodeClearSignal, setBarcodeClearSignal] = useState(0);
  const [productShelfFilter, setProductShelfFilter] = useState<ProductShelfFilter>("featured");
  const [carts, setCarts] = useState<CartSession[]>(readSaleCarts);
  const [activeCartId] = useState(() => "");
  const [message, setMessage] = useState("");
  const [centerAlert, setCenterAlert] = useState("");
  const [weighableProduct, setWeighableProduct] = useState<Producto | null>(null);
  const [grams, setGrams] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [quickProductsModal, setQuickProductsModal] = useState<QuickProductsModal | null>(null);
  const [quickProductsPage, setQuickProductsPage] = useState(1);
  const [featuredProductIds, setFeaturedProductIds] = useState<number[]>(readFeaturedProductIds);
  const [featuredCategoryIds, setFeaturedCategoryIds] = useState<number[]>(readFeaturedCategoryIds);
  const [modalidadVenta, setModalidadVenta] = useState<ModalidadVenta>("NORMAL");
  const [salePasswordOpen, setSalePasswordOpen] = useState(false);
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
    queryKey: ["products", "all-active"],
    queryFn: () => getAllProducts({ activo: true }),
  });
  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: () => getCategorias(),
  });
  const { data: ofertasActivas, isLoading: isLoadingOffers } = useQuery({
    queryKey: ["ofertas", "activas"],
    queryFn: () => getAllOfertasActivas(),
  });
  const normalizedSearchTerm = searchTerm.trim();
  const { data: searchProducts, isFetching: isSearchFetching } = useQuery({
    queryKey: ["products", "pos-search", { search: normalizedSearchTerm, page: searchPage }],
    queryFn: () =>
      getProducts({
        activo: true,
        search: normalizedSearchTerm,
        page: searchPage,
        limit: productModalPageSize,
      }),
    enabled: isProductSearchOpen && normalizedSearchTerm.length > 0,
    placeholderData: keepPreviousData,
  });

  const activeOffers = ofertasActivas ?? [];
  const activeOffersByProductId = new Map(activeOffers.map((offer) => [offer.producto_id, offer]));
  const allCategoryButtons = (categorias?.items ?? [])
    .map((category, index) => ({ id: category.id, name: category.nombre, index }))
    .sort((first, second) => {
      const priorityDiff = getCategorySortPriority(first.name) - getCategorySortPriority(second.name);
      return priorityDiff === 0 ? first.index - second.index : priorityDiff;
    });
  const featuredCategoryButtons = featuredCategoryIds.reduce<CategoryButton[]>((acc, categoryId) => {
    const category = allCategoryButtons.find((item) => item.id === categoryId);
    if (category) acc.push(category);
    return acc;
  }, []);
  const selectedFeaturedCategoryIds = featuredCategoryButtons.map((category) => category.id);
  const categorySlots = Array.from({ length: categoryFavoriteSlots }, (_, index) => featuredCategoryButtons[index] ?? null);
  const quickCategoryId = quickProductsModal?.startsWith("categoria-")
    ? Number(quickProductsModal.replace("categoria-", ""))
    : null;
  const quickCategoryName = allCategoryButtons.find((category) => category.id === quickCategoryId)?.name;
  const { data: categoryProductsPage, isFetching: isCategoryProductsFetching } = useQuery({
    queryKey: ["products", "pos-category", { categoryId: quickCategoryId, page: quickProductsPage }],
    queryFn: () =>
      getProducts({
        activo: true,
        categoria_id: quickCategoryId ?? undefined,
        page: quickProductsPage,
        limit: productModalPageSize,
      }),
    enabled: quickCategoryId !== null,
    placeholderData: keepPreviousData,
  });

  const featuredProducts = (productos ?? []).filter((product) => featuredProductIds.includes(product.id));
  const offerProducts = (productos ?? []).filter((product) => activeOffersByProductId.has(product.id));
  const listedProducts = productShelfFilter === "featured" ? featuredProducts : offerProducts;
  const listedProductsTitle = productShelfFilter === "featured" ? "Favoritos" : "Ofertas";
  const quickProducts = categoryProductsPage?.items ?? [];
  const quickProductsPagination = categoryProductsPage?.pagination;
  const searchProductsItems = searchProducts?.items ?? [];
  const searchProductsPagination = searchProducts?.pagination;
  const quickProductsTitle = quickCategoryName ?? "Categoría";
  const resolvedActiveCartId = activeCartId || carts[0]?.id || "";
  const activeCart = carts.find((cartSession) => cartSession.id === resolvedActiveCartId) ?? carts[0];
  const cart = activeCart?.items ?? [];
  const isBarcodeFocusBlocked = Boolean(
    isProductSearchOpen ||
    isPriceLookupOpen ||
    categoryModalOpen ||
    quickProductsModal ||
    paymentModalOpen ||
    salePasswordOpen ||
    weighableProduct ||
    centerAlert,
  );

  const focusBarcodeInput = (force = false) => {
    window.setTimeout(() => {
      if (force || !isBarcodeFocusBlocked) {
        barcodeInputRef.current?.focus();
      }
    }, 0);
  };

  useEffect(() => {
    if (isBarcodeFocusBlocked) return;

    const focusTimer = window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isBarcodeFocusBlocked]);

  useEffect(() => {
    if (isProductSearchOpen) {
      window.setTimeout(() => productSearchInputRef.current?.focus(), 0);
    }
  }, [isProductSearchOpen]);

  useEffect(() => {
    if (isPriceLookupOpen) {
      window.setTimeout(() => priceLookupInputRef.current?.focus(), 0);
    }
  }, [isPriceLookupOpen]);

  useEffect(() => {
    setSearchPage(1);
  }, [normalizedSearchTerm]);

  useEffect(() => {
    setQuickProductsPage(1);
  }, [quickCategoryId]);

  useEffect(() => {
    window.sessionStorage.setItem(featuredProductsStorageKey, JSON.stringify(featuredProductIds));
  }, [featuredProductIds]);

  useEffect(() => {
    window.sessionStorage.setItem(saleCartsStorageKey, JSON.stringify(carts));
  }, [carts]);

  useEffect(() => {
    window.sessionStorage.setItem(featuredCategoriesStorageKey, JSON.stringify(featuredCategoryIds));
  }, [featuredCategoryIds]);

  const toggleFeaturedProduct = (productId: number) => {
    setFeaturedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
    focusBarcodeInput();
  };

  const toggleFeaturedCategory = (categoryId: number) => {
    setFeaturedCategoryIds((prev) => {
      const validIds = new Set(allCategoryButtons.map((category) => category.id));
      const current = prev.filter((id) => validIds.has(id));

      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      }

      if (current.length >= categoryFavoriteSlots) {
        return current;
      }

      return [...current, categoryId];
    });
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
  const ownerWithdrawalCostBlockers = Array.from(
    new Map(
      cart
        .filter((product) => product.costo_actual === null || product.costo_actual <= 0)
        .map((product) => [product.id, product]),
    ).values(),
  );
  const totalFinal =
    modalidadVenta === "RETIRO_DUENO"
      ? 0
      : modalidadVenta === "PRECIO_COSTO"
        ? totalCosto
        : total - descuentoOfertas;
  const redondeoVenta =
    metodoPago === "EFECTIVO" && modalidadVenta !== "RETIRO_DUENO"
      ? roundCurrency(roundToNearestTen(totalFinal) - totalFinal)
      : 0;
  const totalCobrar = roundCurrency(totalFinal + redondeoVenta);
  const cashReceivedAmount = toAmount(cashReceived);
  const mixedTotal = mixedMethods.reduce((sum, method) => sum + toAmount(mixedAmounts[method]), 0);
  const cashSuggestions = createCashSuggestions(totalCobrar);
  const canConfirmSale =
    modalidadVenta === "RETIRO_DUENO"
        ? ownerWithdrawalCostBlockers.length === 0
        : metodoPago === "EFECTIVO"
          ? cashReceivedAmount >= totalCobrar
          : metodoPago === "MIXTO"
            ? mixedTotal >= totalFinal
            : true;

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (!cajaActual?.abierta) {
      setCenterAlert("Abre una caja antes de registrar ventas.");
      return;
    }
    const normalTotalFinal = total - descuentoOfertas;
    setMetodoPago("EFECTIVO");
    setModalidadVenta("NORMAL");
    setSalePasswordOpen(false);
    setCashReceived(toInputAmount(roundToNearestTen(normalTotalFinal)));
    setMixedMethods(["EFECTIVO", "TARJETA"]);
    setMixedAmounts(createMixedAmounts(["EFECTIVO", "TARJETA"], normalTotalFinal));
    setPaymentModalOpen(true);
  };

  const handlePaymentMethodChange = (method: MetodoPago) => {
    setMetodoPago(method);
    if (method === "EFECTIVO") {
      setCashReceived(toInputAmount(roundToNearestTen(totalFinal)));
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

  const handleFinishSale = async (adminPassword?: string) => {
    if (modalidadVenta === "RETIRO_DUENO" && ownerWithdrawalCostBlockers.length > 0) {
      setMessage("Completa el costo de los productos bloqueados antes de registrar el retiro.");
      return;
    }

    if (metodoPago === "EFECTIVO" && cashReceivedAmount < totalCobrar) {
      setMessage("El monto recibido no alcanza para pagar la venta.");
      return;
    }
    if (metodoPago === "MIXTO" && mixedTotal < totalFinal) {
      setMessage("La combinación de pagos no alcanza para pagar la venta.");
      return;
    }
    if (modalidadVenta !== "NORMAL" && !adminPassword) {
      setSalePasswordOpen(true);
      return;
    }

    try {
      await createVenta({
        metodo_pago: metodoPago,
        modalidad: modalidadVenta,
        master_password: modalidadVenta === "NORMAL" ? undefined : adminPassword,
        monto_recibido: metodoPago === "EFECTIVO" && modalidadVenta !== "RETIRO_DUENO" ? cashReceivedAmount : undefined,
        items: aggregateSaleItems(cart),
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["caja-actual"] });
      queryClient.invalidateQueries({ queryKey: ["reportes"] });
      setCart([]);
      setProductShelfFilter("featured");
      setPaymentModalOpen(false);
      setSalePasswordOpen(false);
      setCashReceived("");
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
    if (!product.activo) {
      setMessage("Este producto está deshabilitado y no se puede vender.");
      focusBarcodeInput();
      return;
    }

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
    if (!product.activo) {
      setMessage("Este producto está deshabilitado y no se puede vender.");
      focusBarcodeInput();
      return;
    }

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
    focusBarcodeInput();
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
    focusBarcodeInput();
  };

  const handleRemoveProduct = (cartItemId: string) => {
    setCart((prev) => prev.filter((p) => p.cartItemId !== cartItemId));
    focusBarcodeInput();
  };

  const handleCloseProductSearch = () => {
    setIsProductSearchOpen(false);
    setSearchTerm("");
    setSearchPage(1);
    focusBarcodeInput(true);
  };

  const handleOpenPriceLookup = () => {
    setIsPriceLookupOpen(true);
    setPriceLookupCode("");
    setPriceLookupProduct(null);
    setPriceLookupMessage("");
  };

  const handleClosePriceLookup = () => {
    setIsPriceLookupOpen(false);
    setPriceLookupCode("");
    setPriceLookupProduct(null);
    setPriceLookupMessage("");
    focusBarcodeInput(true);
  };

  const handlePriceLookup = async () => {
    const code = priceLookupCode.trim();

    if (!code) {
      setPriceLookupProduct(null);
      setPriceLookupMessage("Ingresa un código de barra.");
      return;
    }

    setIsPriceLookupLoading(true);
    setPriceLookupMessage("");

    try {
      const product = await getProductByBarcode(code);
      setPriceLookupProduct(product);
      setPriceLookupMessage(product ? "" : "No se encontró un producto activo con ese código.");
    } catch (error) {
      setPriceLookupProduct(null);
      setPriceLookupMessage(error instanceof Error ? error.message : "No se pudo consultar el precio");
    } finally {
      setIsPriceLookupLoading(false);
      setPriceLookupCode("");
      window.setTimeout(() => priceLookupInputRef.current?.focus(), 0);
    }
  };

  const handleClearBarcodeInput = () => {
    setBarcodeClearSignal((current) => current + 1);
    focusBarcodeInput();
  };

  const handleSearchProductSelect = (product: Producto) => {
    handleProductFound(product);
    setIsProductSearchOpen(false);
    setSearchTerm("");
    setSearchPage(1);
  };

  const handleModalidadChange = (modalidad: ModalidadVenta) => {
    const nextTotal =
      modalidad === "RETIRO_DUENO"
        ? 0
        : modalidad === "PRECIO_COSTO"
          ? totalCosto
          : total - descuentoOfertas;
    setModalidadVenta(modalidad);
    setSalePasswordOpen(false);
    setCashReceived(toInputAmount(metodoPago === "EFECTIVO" ? roundToNearestTen(nextTotal) : nextTotal));
    setMixedAmounts(createMixedAmounts(mixedMethods, nextTotal));
  };

  const handleEditCostFromWithdrawal = (productId: number) => {
    setPaymentModalOpen(false);
    setSalePasswordOpen(false);
    navigate(`/productos?editar=${productId}`);
  };

  const renderModalPagination = (
    pagination: { page: number; totalPages: number; total: number } | undefined,
    onPageChange: (page: number) => void,
  ) => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="pos-modal-pagination">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
        >
          Anterior
        </button>
        <span>
          Página {pagination.page} de {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
          disabled={pagination.page >= pagination.totalPages}
        >
          Siguiente
        </button>
      </div>
    );
  };

  return (
    <div
      className="pos-main-content"
      onPointerDown={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("button, a, input, textarea, select, [contenteditable='true'], .flow-modal-backdrop")) return;
        focusBarcodeInput();
      }}
    >
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
            onClick={() => {
              setIsProductSearchOpen(true);
              setSearchPage(1);
            }}
            className="pos-tool-btn"
            aria-label="Buscar producto"
            title="Buscar producto"
          >
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={handleOpenPriceLookup}
            className="pos-tool-btn"
            aria-label="Consultar precio"
            title="Consultar precio"
          >
            <CurrencyDollarIcon className="h-6 w-6" />
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
            <div className="pos-category-actions">
              <span className="pos-category-count">{allCategoryButtons.length} categorías</span>
            </div>
          </div>

          <div className="pos-category-strip">
            {categorySlots.map((category, index) => (
              category ? (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setQuickProductsModal(`categoria-${category.id}`);
                  }}
                  className={`pos-category-card ${quickCategoryId === category.id ? "active" : ""}`}
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
              ) : (
                <button
                  key={`empty-category-${index}`}
                  type="button"
                  onClick={() => setCategoryModalOpen(true)}
                  className="pos-category-card pos-category-empty"
                  aria-label={`Seleccionar categoría ${index + 1}`}
                  title="Seleccionar categoría"
                >
                  <span className="pos-category-visual">
                    <span>{index + 1}</span>
                  </span>
                  <span className="pos-category-label">Vacío</span>
                </button>
              )
            ))}
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="pos-category-card pos-category-add"
              aria-label="Elegir categorías favoritas"
              title="Elegir categorías favoritas"
            >
              <span className="pos-category-visual">
                <PlusIcon className="h-8 w-8 text-[#6fab89]" />
              </span>
              <span className="pos-category-label">Más</span>
            </button>
          </div>
        </section>

        <SideList
          searchTerm={searchTerm}
          onProductClick={handleProductFound}
          featuredProductIds={featuredProductIds}
          onToggleFeatured={toggleFeaturedProduct}
          productsOverride={listedProducts}
          isLoadingOverride={!productos || (productShelfFilter === "offers" && isLoadingOffers)}
          kicker="Vista rápida"
          title={listedProductsTitle}
          actions={
            <div className="pos-list-toggle">
              <button
                type="button"
                onClick={() => {
                  setProductShelfFilter("featured");
                  focusBarcodeInput();
                }}
                className={productShelfFilter === "featured" ? "active" : ""}
              >
                Favoritos
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductShelfFilter("offers");
                  focusBarcodeInput();
                }}
                className={productShelfFilter === "offers" ? "active" : ""}
              >
                Ofertas
              </button>
            </div>
          }
        />
      </section>

      <aside className="pos-checkout-panel">
        <div className="pos-cart-head">
          <div>
            <span className="pos-kicker">Pedido</span>
            <h2 className="pos-subtitle">Carrito de compras</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setCart([]);
              focusBarcodeInput();
            }}
            className="border-0 bg-transparent px-2 py-1 text-xs text-[#8b8e97] hover:text-[#494b53]"
          >
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
      {isProductSearchOpen && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleCloseProductSearch();
          }}
        >
          <div className="flow-modal pos-search-modal">
            <div className="pos-section-row">
              <div>
                <span className="pos-kicker">Buscar</span>
                <h2 className="flow-modal-title">Buscar producto</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseProductSearch}
                className="rounded-xl border border-[#ececf0] bg-white px-4 py-3 text-sm font-bold text-[#5f626b] hover:bg-[#f7f7f9]"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-5">
              <input
                ref={productSearchInputRef}
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") handleCloseProductSearch();
                }}
                className={`${inputClassName} h-14 text-lg font-bold`}
                placeholder="Nombre o código de barra"
              />
            </div>

            <div className="pos-search-results-head">
              <span>
                {normalizedSearchTerm
                  ? searchProductsPagination
                    ? `${searchProductsPagination.total} resultados`
                    : "Buscando productos..."
                  : "Ingresa un texto para buscar"}
              </span>
              {isSearchFetching && <span>Actualizando...</span>}
            </div>

            <div className="category-products-grid pos-search-results-grid">
              {normalizedSearchTerm && searchProductsItems.map((product) => {
                const isFeatured = featuredProductIds.includes(product.id);

                return (
                  <ProductTile
                    key={product.id}
                    product={product}
                    isFeatured={isFeatured}
                    onClick={() => handleSearchProductSelect(product)}
                    onToggleFeatured={() => toggleFeaturedProduct(product.id)}
                  />
                );
              })}
              {normalizedSearchTerm && !isSearchFetching && searchProductsItems.length === 0 && (
                <div className="category-products-empty">
                  No hay productos para esta búsqueda.
                </div>
              )}
              {!normalizedSearchTerm && (
                <div className="category-products-empty">
                  Escribe el nombre o código para ver resultados.
                </div>
              )}
            </div>

            {renderModalPagination(searchProductsPagination, setSearchPage)}
          </div>
        </div>
      )}
      {isPriceLookupOpen && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleClosePriceLookup();
          }}
        >
          <div className="flow-modal price-lookup-modal max-w-md">
            <div className="pos-section-row">
              <div>
                <span className="pos-kicker">Consulta</span>
                <h2 className="flow-modal-title">Buscar precio</h2>
              </div>
              <button
                type="button"
                onClick={handleClosePriceLookup}
                className="rounded-xl border border-[#ececf0] bg-white px-4 py-3 text-sm font-bold text-[#5f626b] hover:bg-[#f7f7f9]"
              >
                Cerrar
              </button>
            </div>

            <FormField label="Código de barra" className="mt-5">
              <input
                ref={priceLookupInputRef}
                autoFocus
                type="text"
                inputMode="numeric"
                value={priceLookupCode}
                onChange={(event) => {
                  setPriceLookupCode(event.target.value);
                  setPriceLookupProduct(null);
                  setPriceLookupMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handlePriceLookup();
                  if (event.key === "Escape") handleClosePriceLookup();
                }}
                className={`${inputClassName} h-14 text-lg font-bold`}
                placeholder="Escanea o ingresa el código"
              />
            </FormField>

            {priceLookupMessage && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                {priceLookupMessage}
              </p>
            )}

            {priceLookupProduct && (
              <div className="price-lookup-result">
                <div className="min-w-0">
                  <span className="pos-kicker">Producto</span>
                  <h3>{priceLookupProduct.nombre}</h3>
                  <p>
                    {priceLookupProduct.codigo_barras ?? "Sin código"} · Stock {priceLookupProduct.stock}{" "}
                    {isWeighableProduct(priceLookupProduct) ? "kg" : "un."}
                  </p>
                </div>
                <strong>
                  ${priceLookupProduct.precio_venta.toLocaleString()}
                  {isWeighableProduct(priceLookupProduct) ? "/kg" : ""}
                </strong>
              </div>
            )}

            <FormActions className="pt-5">
              <Button variant="ghost" onClick={handleClosePriceLookup}>
                Cancelar
              </Button>
              <Button onClick={handlePriceLookup} disabled={isPriceLookupLoading || !priceLookupCode.trim()}>
                {isPriceLookupLoading ? "Consultando..." : "Consultar"}
              </Button>
            </FormActions>
          </div>
        </div>
      )}
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
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setWeighableProduct(null);
              focusBarcodeInput();
            }
          }}
        >
          <div className="flow-modal weight-modal max-w-md p-0">
            <div className="p-6 pb-4">
              <span className="pos-kicker">Producto por peso</span>
              <div className="weight-modal-heading">
                <h2 className="flow-modal-title">{weighableProduct.nombre}</h2>
                <strong>${weighableProduct.precio_venta.toLocaleString()}/kg</strong>
              </div>
              <p className="mt-2 text-sm text-[#8b8e98]">
                Stock {weighableProduct.stock} kg
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
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setQuickProductsModal(null);
              setQuickProductsPage(1);
              focusBarcodeInput();
            }
          }}
        >
          <div className="flow-modal category-products-modal">
            <div className="pos-section-row">
              <div>
                <span className="pos-kicker">Categoría</span>
                <h2 className="flow-modal-title">{quickProductsTitle}</h2>
              </div>
              <span className="pos-status-pill">
                {quickProductsPagination ? quickProductsPagination.total : quickProducts.length} productos
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuickProductsModal(null);
                  setQuickProductsPage(1);
                  focusBarcodeInput();
                }}
                className="rounded-xl border border-[#ececf0] bg-white px-4 py-3 text-sm font-bold text-[#5f626b] hover:bg-[#f7f7f9]"
              >
                Cerrar
              </button>
            </div>

            <div className="category-products-grid">
              {quickProducts.map((product) => {
                const isFeatured = featuredProductIds.includes(product.id);

                return (
                  <ProductTile
                    key={product.id}
                    product={product}
                    isFeatured={isFeatured}
                    density="compact"
                    onClick={() => {
                      handleProductFound(product);
                      setQuickProductsModal(null);
                      setQuickProductsPage(1);
                    }}
                    onToggleFeatured={() => toggleFeaturedProduct(product.id)}
                  />
                );
              })}
              {isCategoryProductsFetching && quickProducts.length === 0 && (
                <div className="category-products-empty">
                  Cargando productos...
                </div>
              )}
              {!isCategoryProductsFetching && quickProducts.length === 0 && (
                <div className="category-products-empty">
                  No hay productos en esta categoría.
                </div>
              )}
            </div>
            {renderModalPagination(quickProductsPagination, setQuickProductsPage)}
          </div>
        </div>
      )}
      {categoryModalOpen && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCategoryModalOpen(false);
              focusBarcodeInput();
            }
          }}
        >
          <div className="flow-modal max-w-3xl">
            <div className="pos-section-row">
              <div>
                <span className="pos-kicker">Categorías</span>
                <h2 className="flow-modal-title">Elegir favoritos</h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedFeaturedCategoryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFeaturedCategoryIds([])}
                    className="rounded-xl border border-[#ececf0] bg-white px-3 py-2 text-sm font-bold text-[#5f626b] hover:bg-[#f7f7f9]"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryModalOpen(false);
                    focusBarcodeInput();
                  }}
                  className="rounded-xl border border-[#ececf0] bg-white px-3 py-2 text-sm font-bold text-[#5f626b] hover:bg-[#f7f7f9]"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="category-favorite-summary">
              <span>{selectedFeaturedCategoryIds.length}/{categoryFavoriteSlots} seleccionadas</span>
              <small>Toca las categorías en el orden que quieres dejarlas.</small>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {allCategoryButtons.map((category) => {
                const selectionOrder = selectedFeaturedCategoryIds.indexOf(category.id) + 1;
                const isSelected = selectionOrder > 0;
                const isDisabled = !isSelected && selectedFeaturedCategoryIds.length >= categoryFavoriteSlots;

                return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleFeaturedCategory(category.id)}
                  disabled={isDisabled}
                  className={`pos-category-card category-picker-card ${isSelected ? "selected" : ""}`}
                >
                  <span className="pos-category-visual">
                    {categoryImagesBySlug[slugifyAssetName(category.name)] ? (
                      <img src={categoryImagesBySlug[slugifyAssetName(category.name)]} alt="" />
                    ) : (
                      getCategoryVisual(category.name)
                    )}
                    {isSelected && <span className="category-picker-order">{selectionOrder}</span>}
                  </span>
                  <span className="pos-category-label">{category.name}</span>
                </button>
                );
              })}
              {allCategoryButtons.length === 0 && (
                <p className="col-span-full rounded-2xl border border-[#ececf0] bg-[#fafafa] p-6 text-center text-sm text-[#8b8e98]">
                  No hay categorías disponibles.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {paymentModalOpen && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPaymentModalOpen(false);
              focusBarcodeInput();
            }
          }}
        >
          <div className="flow-modal payment-modal max-w-4xl">
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
                  <div className="mt-2 flex justify-between text-sm font-semibold text-[#5f626b]">
                    <span>Total real</span>
                    <span>{formatMoney(totalFinal)}</span>
                  </div>
                  {metodoPago === "EFECTIVO" && modalidadVenta !== "RETIRO_DUENO" && (
                    <div className={`mt-1 flex justify-between text-sm font-semibold ${redondeoVenta < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      <span>Redondeo</span>
                      <span>{formatSignedMoney(redondeoVenta)}</span>
                    </div>
                  )}
                  <div className="pos-grand-total">
                    <span>Total a pagar</span>
                    <strong>${totalCobrar.toLocaleString()}</strong>
                  </div>
                </div>

                <label className="mt-5 block text-sm font-bold text-[#5f626b]">Método de pago</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"] as MetodoPago[]).map((method) => {
                    const MethodIcon = paymentMethodIcons[method];

                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => handlePaymentMethodChange(method)}
                        className={`flow-payment-option payment-method-option payment-method-${method.toLowerCase()} ${metodoPago === method ? "active" : ""}`}
                      >
                        <MethodIcon className="h-6 w-6" />
                        <span>
                          <strong>{paymentMethodLabels[method]}</strong>
                          <small>{paymentMethodHints[method]}</small>
                        </span>
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
                        ${Math.max(0, cashReceivedAmount - totalCobrar).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-[16px] border border-[#ececf0] bg-[#fafafa] p-3">
                        <p className="font-bold text-[#8b8e98]">Efectivo recibido</p>
                        <p className="mt-1 text-lg font-black text-[#25262c]">{formatMoney(cashReceivedAmount)}</p>
                      </div>
                      <div className="rounded-[16px] border border-[#ececf0] bg-[#fafafa] p-3">
                        <p className="font-bold text-[#8b8e98]">Total cobrado</p>
                        <p className="mt-1 text-lg font-black text-[#25262c]">{formatMoney(totalCobrar)}</p>
                      </div>
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
                  <div className="owner-withdrawal-info">
                    <p>
                      Este registro descontará stock y quedará marcado como retiro de dueño. No suma efectivo al cierre de caja.
                    </p>
                    {ownerWithdrawalCostBlockers.length > 0 && (
                      <div className="owner-withdrawal-blockers">
                        <strong>Productos sin costo registrado</strong>
                        <div>
                          {ownerWithdrawalCostBlockers.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleEditCostFromWithdrawal(product.id)}
                            >
                              <span>{product.nombre}</span>
                              <small>{product.costo_actual === null ? "Sin costo" : "Costo $0"}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                onClick={() => handleFinishSale()}
                disabled={!canConfirmSale}
              >
                {modalidadVenta === "RETIRO_DUENO" ? "Registrar retiro" : "Confirmar venta"}
              </Button>
            </FormActions>
          </div>
        </div>
      )}
      {salePasswordOpen && (
        <AdminPasswordModal
          title="Confirmar venta administrativa"
          description={
            modalidadVenta === "RETIRO_DUENO"
              ? "Ingresa la contraseña de administrador para registrar el retiro."
              : "Ingresa la contraseña de administrador para vender a precio costo."
          }
          onClose={() => setSalePasswordOpen(false)}
          onConfirm={(password) => handleFinishSale(password)}
        />
      )}
    </div>
  );
}
