import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import InputForm from "../components/InputForm";
import MainList from "../components/MainList";
import SideList from "../components/SideList";
import StatsPanel from "../components/StatsPanel";
import { Button, FormActions, FormField, inputClassName } from "../components/FormControls";
import AdminPasswordModal from "../components/AdminPasswordModal";
import type { MetodoPago, MetodoPagoReal, ModalidadVenta, Oferta, Producto } from "../types/api";
import { createVenta } from "../services/transactionService";
import { getCajaActual } from "../services/cajaService";
import { getAllProducts } from "../services/productService";
import { getAllOfertasActivas } from "../services/catalogService";
import {
  getStoredFavoriteProductIds,
  getStoredPosShortcuts,
  POS_SHORTCUTS_CHANGED_EVENT,
  setStoredFavoriteProductIds,
  type PosShortcuts,
} from "../services/posPreferencesService";

type CartProduct = Producto & { quantity: number; cartItemId: string };
type CartSession = { id: string; name: string; items: CartProduct[] };
type MixedPaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
type PaymentAmounts = Record<MixedPaymentMethod, string>;
type KeyboardMode = "products" | "cart";
type CheckoutOption = MetodoPago | "RETIRO_DUENO" | "PRECIO_COSTO";
type PaymentStep = "options" | "cost-payment" | "details";

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

const paymentLabels: Record<MixedPaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Débito / tarjeta",
  TRANSFERENCIA: "Transferencia",
};

const checkoutOptions: Array<{
  id: CheckoutOption;
  label: string;
  hint: string;
  icon: typeof BanknotesIcon;
}> = [
  { id: "EFECTIVO", label: "Efectivo", hint: "Ingresa el monto recibido", icon: BanknotesIcon },
  { id: "TARJETA", label: "Débito / tarjeta", hint: "Confirma el cobro del terminal", icon: CreditCardIcon },
  { id: "TRANSFERENCIA", label: "Transferencia", hint: "Confirma la transferencia recibida", icon: ArrowsRightLeftIcon },
  { id: "MIXTO", label: "Pago mixto", hint: "Divide entre efectivo y débito", icon: WalletIcon },
  { id: "RETIRO_DUENO", label: "Retiro de dueño", hint: "Descuenta stock sin sumar a caja", icon: ArrowUpTrayIcon },
  { id: "PRECIO_COSTO", label: "Vender a precio costo", hint: "Luego selecciona cómo recibes el pago", icon: CurrencyDollarIcon },
];

const costPaymentOptions: Array<{
  id: MetodoPagoReal;
  label: string;
  hint: string;
  icon: typeof BanknotesIcon;
}> = [
  { id: "EFECTIVO", label: "Efectivo", hint: "Aplica redondeo y calcula vuelto", icon: BanknotesIcon },
  { id: "TARJETA", label: "Débito / tarjeta", hint: "Confirma el cobro del terminal", icon: CreditCardIcon },
  { id: "TRANSFERENCIA", label: "Transferencia", hint: "Confirma la transferencia recibida", icon: ArrowsRightLeftIcon },
];

const saleCartsStorageKey = "pos-sale-carts";
const visibleProductLimit = 15;

const toInputAmount = (value: number) => (value > 0 ? String(value) : "");
const toAmount = (value: string) => Number(value) || 0;
const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundToNearestTen = (value: number) => Math.round(value / 10) * 10;
const formatMoney = (value: number) => `$${value.toLocaleString()}`;
const formatSignedMoney = (value: number) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString()}`;

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

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const paymentOptionsRef = useRef<HTMLDivElement>(null);
  const paymentDetailsRef = useRef<HTMLDivElement>(null);
  const cashReceivedInputRef = useRef<HTMLInputElement>(null);
  const mixedCashInputRef = useRef<HTMLInputElement>(null);
  const saleSubmittingRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeClearSignal, setBarcodeClearSignal] = useState(0);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [favoriteProductIds, setFavoriteProductIds] = useState<number[]>(getStoredFavoriteProductIds);
  const [posShortcuts, setPosShortcuts] = useState<PosShortcuts>(getStoredPosShortcuts);
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("products");
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const [cartQuantityProduct, setCartQuantityProduct] = useState<CartProduct | null>(null);
  const [cartQuantityValue, setCartQuantityValue] = useState("");
  const [carts, setCarts] = useState<CartSession[]>(readSaleCarts);
  const [activeCartId] = useState(() => "");
  const [message, setMessage] = useState("");
  const [centerAlert, setCenterAlert] = useState("");
  const [weighableProduct, setWeighableProduct] = useState<Producto | null>(null);
  const [grams, setGrams] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("options");
  const [selectedCheckoutOptionIndex, setSelectedCheckoutOptionIndex] = useState(0);
  const [selectedCostPaymentIndex, setSelectedCostPaymentIndex] = useState(0);
  const [selectedCheckoutOption, setSelectedCheckoutOption] = useState<CheckoutOption>("EFECTIVO");
  const [paymentConfirmationArmed, setPaymentConfirmationArmed] = useState(false);
  const [isFinishingSale, setIsFinishingSale] = useState(false);
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
  const { data: productos, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "all-active"],
    queryFn: () => getAllProducts({ activo: true }),
  });
  const { data: ofertasActivas } = useQuery({
    queryKey: ["ofertas", "activas"],
    queryFn: () => getAllOfertasActivas(),
  });
  const normalizedSearchTerm = searchTerm.trim();
  const normalizedProductSearch = normalizeText(normalizedSearchTerm);
  const matchingProducts = useMemo(() => {
    const activeProducts = productos ?? [];
    const filteredProducts = normalizedProductSearch
      ? activeProducts.filter((product) =>
          normalizeText(product.nombre).includes(normalizedProductSearch) ||
          normalizeText(product.categoria_nombre).includes(normalizedProductSearch) ||
          (product.codigo_barras ?? "").includes(normalizedSearchTerm),
        )
      : activeProducts;
    const favoriteIds = new Set(favoriteProductIds);

    return filteredProducts
      .map((product, index) => ({ product, index }))
      .sort((first, second) => {
        const exactBarcodeDifference =
          Number(second.product.codigo_barras === normalizedSearchTerm) -
          Number(first.product.codigo_barras === normalizedSearchTerm);
        const favoriteDifference = Number(favoriteIds.has(second.product.id)) - Number(favoriteIds.has(first.product.id));
        return exactBarcodeDifference || favoriteDifference || first.index - second.index;
      })
      .map(({ product }) => product);
  }, [favoriteProductIds, normalizedProductSearch, normalizedSearchTerm, productos]);
  const visibleProducts = matchingProducts.slice(0, visibleProductLimit);

  const activeOffers = ofertasActivas ?? [];
  const activeOffersByProductId = new Map(activeOffers.map((offer) => [offer.producto_id, offer]));
  const resolvedActiveCartId = activeCartId || carts[0]?.id || "";
  const activeCart = carts.find((cartSession) => cartSession.id === resolvedActiveCartId) ?? carts[0];
  const cart = activeCart?.items ?? [];
  const isBarcodeFocusBlocked = Boolean(
    paymentModalOpen ||
    salePasswordOpen ||
    weighableProduct ||
    centerAlert ||
    cartQuantityProduct,
  );

  const focusBarcodeInput = (force = false) => {
    setKeyboardMode("products");
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
    if (!paymentModalOpen || salePasswordOpen) return;

    const focusTimer = window.setTimeout(() => {
      if (paymentStep === "options" || paymentStep === "cost-payment") {
        paymentOptionsRef.current?.focus();
      } else if (metodoPago === "EFECTIVO") {
        cashReceivedInputRef.current?.focus();
        cashReceivedInputRef.current?.select();
      } else if (metodoPago === "MIXTO") {
        mixedCashInputRef.current?.focus();
      } else {
        paymentDetailsRef.current?.focus();
      }
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [metodoPago, paymentModalOpen, paymentStep, salePasswordOpen]);

  useEffect(() => {
    const handleShortcutsChanged = (event: Event) => {
      setPosShortcuts((event as CustomEvent<PosShortcuts>).detail ?? getStoredPosShortcuts());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "pos_keyboard_shortcuts") setPosShortcuts(getStoredPosShortcuts());
    };

    window.addEventListener(POS_SHORTCUTS_CHANGED_EVENT, handleShortcutsChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(POS_SHORTCUTS_CHANGED_EVENT, handleShortcutsChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    setSelectedProductIndex(0);
  }, [normalizedSearchTerm]);

  useEffect(() => {
    window.sessionStorage.setItem(saleCartsStorageKey, JSON.stringify(carts));
  }, [carts]);

  useEffect(() => {
    setSelectedProductIndex((current) => Math.min(current, Math.max(0, visibleProducts.length - 1)));
  }, [visibleProducts.length]);

  const toggleFavoriteProduct = (productId: number) => {
    setFavoriteProductIds((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      setStoredFavoriteProductIds(next);
      return next;
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
  const mixedPaymentsAreValid =
    Math.abs(mixedTotal - totalFinal) < 0.01 &&
    mixedMethods.every((method) => toAmount(mixedAmounts[method]) > 0);
  const canConfirmSale =
    isFinishingSale
      ? false
      : modalidadVenta === "RETIRO_DUENO"
        ? ownerWithdrawalCostBlockers.length === 0
        : metodoPago === "EFECTIVO"
          ? cashReceivedAmount >= totalCobrar
          : metodoPago === "MIXTO"
            ? mixedPaymentsAreValid
            : true;
  const selectedCheckoutOptionMeta = checkoutOptions.find((option) => option.id === selectedCheckoutOption) ?? checkoutOptions[0];
  const paymentDialogTitle = paymentStep === "options"
    ? "Selecciona una opción"
    : paymentStep === "cost-payment"
      ? "¿Cómo pagará la venta a costo?"
      : modalidadVenta === "PRECIO_COSTO"
        ? `Precio costo · ${paymentLabels[metodoPago as MixedPaymentMethod]}`
        : selectedCheckoutOptionMeta.label;

  const handleOpenPayment = () => {
    if (cart.length === 0) {
      setMessage("El carrito está vacío.");
      return;
    }
    if (!cajaActual?.abierta) {
      setCenterAlert("Abre una caja antes de registrar ventas.");
      return;
    }
    const normalDiscount = cart.reduce((acc, product) => {
      const offer = activeOffersByProductId.get(product.id);
      return acc + calculateOfferLine(product, product.quantity ?? 0, offer).discount;
    }, 0);
    const normalTotalFinal = total - normalDiscount;
    setMetodoPago("EFECTIVO");
    setModalidadVenta("NORMAL");
    setSalePasswordOpen(false);
    setPaymentStep("options");
    setSelectedCheckoutOptionIndex(0);
    setSelectedCostPaymentIndex(0);
    setSelectedCheckoutOption("EFECTIVO");
    setPaymentConfirmationArmed(false);
    setCashReceived(toInputAmount(roundToNearestTen(normalTotalFinal)));
    setMixedMethods(["EFECTIVO", "TARJETA"]);
    const cashPart = roundCurrency(Math.floor(normalTotalFinal / 2));
    setMixedAmounts({
      EFECTIVO: toInputAmount(cashPart),
      TARJETA: toInputAmount(roundCurrency(normalTotalFinal - cashPart)),
      TRANSFERENCIA: "",
    });
    setMessage("");
    setPaymentModalOpen(true);
  };

  const handleCheckoutOptionSelect = (option: CheckoutOption) => {
    setSelectedCheckoutOption(option);
    setPaymentConfirmationArmed(false);
    setMessage("");

    if (option === "RETIRO_DUENO") {
      setModalidadVenta("RETIRO_DUENO");
      setMetodoPago("EFECTIVO");
    } else if (option === "PRECIO_COSTO") {
      setModalidadVenta("PRECIO_COSTO");
      setMetodoPago("EFECTIVO");
      setSelectedCostPaymentIndex(0);
      setCashReceived(toInputAmount(roundToNearestTen(totalCosto)));
      setPaymentStep("cost-payment");
      return;
    } else {
      setModalidadVenta("NORMAL");
      setMetodoPago(option);
      if (option === "EFECTIVO") setCashReceived(toInputAmount(roundToNearestTen(total - descuentoOfertas)));
      if (option === "MIXTO") {
        const normalTotal = total - descuentoOfertas;
        const cashPart = roundCurrency(Math.floor(normalTotal / 2));
        setMixedMethods(["EFECTIVO", "TARJETA"]);
        setMixedAmounts({
          EFECTIVO: toInputAmount(cashPart),
          TARJETA: toInputAmount(roundCurrency(normalTotal - cashPart)),
          TRANSFERENCIA: "",
        });
      }
    }

    setPaymentStep("details");
  };

  const handleCostPaymentSelect = (method: MetodoPagoReal) => {
    setMetodoPago(method);
    setPaymentConfirmationArmed(false);
    setMessage("");
    setCashReceived(method === "EFECTIVO" ? toInputAmount(roundToNearestTen(totalCosto)) : "");
    setPaymentStep("details");
  };

  const returnToPreviousPaymentStep = () => {
    setPaymentStep(modalidadVenta === "PRECIO_COSTO" ? "cost-payment" : "options");
    setPaymentConfirmationArmed(false);
    setMessage("");
  };

  const handleMixedAmountChange = (method: MixedPaymentMethod, value: string) => {
    if (value !== "" && !Number.isFinite(Number(value))) return;
    setPaymentConfirmationArmed(false);

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
    if (saleSubmittingRef.current) return;

    if (modalidadVenta === "RETIRO_DUENO" && ownerWithdrawalCostBlockers.length > 0) {
      setMessage("Completa el costo de los productos bloqueados antes de registrar el retiro.");
      return;
    }

    if (metodoPago === "EFECTIVO" && cashReceivedAmount < totalCobrar) {
      setMessage("El monto recibido no alcanza para pagar la venta.");
      return;
    }
    if (metodoPago === "MIXTO" && !mixedPaymentsAreValid) {
      setMessage("Los montos del pago mixto deben ser mayores a 0 y sumar exactamente el total.");
      return;
    }
    if (modalidadVenta !== "NORMAL" && !adminPassword) {
      setSalePasswordOpen(true);
      return;
    }

    saleSubmittingRef.current = true;
    setIsFinishingSale(true);

    try {
      await createVenta({
        pagos: modalidadVenta === "RETIRO_DUENO"
          ? [{ metodo_pago: "EFECTIVO", monto: 0 }]
          : metodoPago === "MIXTO"
            ? mixedMethods.map((method) => ({
                metodo_pago: method,
                monto: roundCurrency(toAmount(mixedAmounts[method])),
              }))
            : [{
                metodo_pago: metodoPago as MetodoPagoReal,
                monto: totalCobrar,
              }],
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
      setPaymentModalOpen(false);
      setSalePasswordOpen(false);
      setCashReceived("");
      setModalidadVenta("NORMAL");
      setPaymentStep("options");
      setPaymentConfirmationArmed(false);
      setMixedAmounts({ EFECTIVO: "", TARJETA: "", TRANSFERENCIA: "" });
      setMessage("Venta registrada correctamente.");
      focusBarcodeInput();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hubo un error al registrar la venta");
      setPaymentConfirmationArmed(false);
    } finally {
      saleSubmittingRef.current = false;
      setIsFinishingSale(false);
    }
  };

  const handlePaymentDetailsConfirm = () => {
    if (modalidadVenta === "RETIRO_DUENO" && ownerWithdrawalCostBlockers.length > 0) {
      setMessage("Completa el costo de los productos bloqueados antes de registrar el retiro.");
      return;
    }
    if (metodoPago === "EFECTIVO" && modalidadVenta !== "RETIRO_DUENO" && cashReceivedAmount < totalCobrar) {
      setMessage("El monto recibido no alcanza para pagar la venta.");
      setPaymentConfirmationArmed(false);
      return;
    }
    if (metodoPago === "MIXTO" && !mixedPaymentsAreValid) {
      setMessage("El pago mixto debe tener dos montos mayores a 0 que sumen exactamente el total.");
      setPaymentConfirmationArmed(false);
      return;
    }

    setMessage("");
    if (!paymentConfirmationArmed) {
      setPaymentConfirmationArmed(true);
      return;
    }

    void handleFinishSale();
  };

  const handlePaymentKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (paymentStep === "details") {
        returnToPreviousPaymentStep();
      } else if (paymentStep === "cost-payment") {
        setPaymentStep("options");
        setModalidadVenta("NORMAL");
        setMessage("");
      } else {
        setPaymentModalOpen(false);
        focusBarcodeInput();
      }
      return;
    }

    if (event.target instanceof HTMLButtonElement) return;

    if (paymentStep === "options") {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSelectedCheckoutOptionIndex((current) =>
          (current + direction + checkoutOptions.length) % checkoutOptions.length,
        );
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const option = checkoutOptions[selectedCheckoutOptionIndex];
        if (option) handleCheckoutOptionSelect(option.id);
      }
      return;
    }

    if (paymentStep === "cost-payment") {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSelectedCostPaymentIndex((current) =>
          (current + direction + costPaymentOptions.length) % costPaymentOptions.length,
        );
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const option = costPaymentOptions[selectedCostPaymentIndex];
        if (option) handleCostPaymentSelect(option.id);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handlePaymentDetailsConfirm();
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

  const handleClearBarcodeInput = () => {
    setBarcodeClearSignal((current) => current + 1);
    setSearchTerm("");
    setSelectedProductIndex(0);
    focusBarcodeInput();
  };

  const handleProductSelect = (product: Producto, index = selectedProductIndex) => {
    setSelectedProductIndex(index);
    setBarcodeClearSignal((current) => current + 1);
    setSearchTerm("");
    handleProductFound(product);
  };

  const enterCartMode = () => {
    if (cart.length === 0) {
      setMessage("El carrito está vacío.");
      focusBarcodeInput();
      return;
    }

    setMessage("");
    setKeyboardMode("cart");
    setSelectedCartIndex((current) => Math.min(current, cart.length - 1));
    setBarcodeClearSignal((current) => current + 1);
    setSearchTerm("");
    barcodeInputRef.current?.blur();
  };

  const leaveCartMode = () => {
    setKeyboardMode("products");
    focusBarcodeInput(true);
  };

  const openCartQuantityEditor = (product: CartProduct) => {
    setCartQuantityProduct(product);
    setCartQuantityValue(
      isWeighableProduct(product)
        ? String(Math.round(product.quantity * 1000))
        : String(product.quantity),
    );
  };

  const confirmCartQuantity = () => {
    if (!cartQuantityProduct) return;
    const rawQuantity = Number(cartQuantityValue);
    const requestedQuantity = isWeighableProduct(cartQuantityProduct)
      ? Number((rawQuantity / 1000).toFixed(3))
      : Math.floor(rawQuantity);
    const maxQuantity = blocksSalesByStock(cartQuantityProduct)
      ? cartQuantityProduct.stock
      : requestedQuantity;
    const nextQuantity = Math.min(requestedQuantity, maxQuantity);

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      setMessage("Ingresa una cantidad mayor a 0.");
      return;
    }

    setCart((items) => items.map((item) =>
      item.cartItemId === cartQuantityProduct.cartItemId
        ? { ...item, quantity: nextQuantity }
        : item,
    ));
    setCartQuantityProduct(null);
    setCartQuantityValue("");
    window.setTimeout(() => barcodeInputRef.current?.blur(), 0);
  };

  useEffect(() => {
    if (isBarcodeFocusBlocked) return;

    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      const eventTarget = event.target;
      if (eventTarget instanceof HTMLInputElement && eventTarget.dataset.posShortcutInput === "true") return;

      if (event.key === posShortcuts.checkout) {
        event.preventDefault();
        handleOpenPayment();
        return;
      }

      if (event.key === posShortcuts.cart) {
        event.preventDefault();
        if (keyboardMode === "cart") leaveCartMode();
        else enterCartMode();
        return;
      }

      if (keyboardMode === "products") {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (visibleProducts.length === 0) return;
          const direction = event.key === "ArrowDown" ? 1 : -1;
          setSelectedProductIndex((current) =>
            (current + direction + visibleProducts.length) % visibleProducts.length,
          );
          return;
        }

        if (event.key === "Enter") {
          const target = event.target;
          if (target instanceof HTMLButtonElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
          event.preventDefault();
          const selectedProduct = visibleProducts[selectedProductIndex];
          if (selectedProduct) handleProductSelect(selectedProduct, selectedProductIndex);
          else setMessage("No hay un producto seleccionado.");
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          handleClearBarcodeInput();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        leaveCartMode();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (cart.length === 0) return;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSelectedCartIndex((current) => (current + direction + cart.length) % cart.length);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        const selectedItem = cart[selectedCartIndex];
        if (!selectedItem) return;

        setCart((items) => items.flatMap((item) => {
          if (item.cartItemId !== selectedItem.cartItemId) return [item];
          if (isWeighableProduct(item) || item.quantity <= 1) return [];
          return [{ ...item, quantity: item.quantity - 1 }];
        }));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selectedItem = cart[selectedCartIndex];
        if (selectedItem) openCartQuantityEditor(selectedItem);
      }
    };

    window.addEventListener("keydown", handleKeyboardNavigation, true);
    return () => window.removeEventListener("keydown", handleKeyboardNavigation, true);
  });

  useEffect(() => {
    if (cart.length === 0 && keyboardMode === "cart") {
      setKeyboardMode("products");
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
      return;
    }

    setSelectedCartIndex((current) => Math.min(current, Math.max(0, cart.length - 1)));
  }, [cart.length, keyboardMode]);

  const handleEditCostFromWithdrawal = (productId: number) => {
    setPaymentModalOpen(false);
    setSalePasswordOpen(false);
    navigate(`/productos?editar=${productId}`);
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
            title="Escanea un código o escribe el nombre del producto"
            onSearchChange={(value) => {
              setKeyboardMode("products");
              setSearchTerm(value);
            }}
            onFocus={() => setKeyboardMode("products")}
            clearSignal={barcodeClearSignal}
            showClearButton
            size="large"
          />
        </div>

        <SideList
          searchTerm={searchTerm}
          products={visibleProducts}
          totalProducts={matchingProducts.length}
          selectedIndex={selectedProductIndex}
          keyboardActive={keyboardMode === "products"}
          favoriteProductIds={favoriteProductIds}
          cartShortcut={posShortcuts.cart}
          checkoutShortcut={posShortcuts.checkout}
          isLoading={isLoadingProducts}
          onProductClick={handleProductSelect}
          onToggleFavorite={toggleFavoriteProduct}
        />
      </section>

      <aside className="pos-checkout-panel">
        <div className="pos-cart-head">
          <div>
            <span className="pos-kicker">Pedido</span>
            <h2 className="pos-subtitle">Carrito de compras</h2>
          </div>
          <div className="pos-cart-head-actions">
            <span className={`pos-cart-mode-key ${keyboardMode === "cart" ? "active" : ""}`} title={`Presiona ${posShortcuts.cart} para entrar o salir del carrito`}>{posShortcuts.cart}</span>
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
        </div>
        {keyboardMode === "cart" && (
          <div className="pos-cart-keyboard-banner">
            <strong>Carrito activo</strong>
            <span>↑ ↓ navegar · Enter editar cantidad · Supr/Retroceso disminuir · {posShortcuts.cart} volver · {posShortcuts.checkout} finalizar</span>
          </div>
        )}
        <MainList
          products={cart}
          onDecrease={handleDecreaseQuantity}
          onIncrease={handleIncreaseQuantity}
          onRemove={handleRemoveProduct}
          selectedIndex={selectedCartIndex}
          keyboardActive={keyboardMode === "cart"}
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
      {cartQuantityProduct && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCartQuantityProduct(null);
              setCartQuantityValue("");
            }
          }}
        >
          <div className="flow-modal pos-cart-quantity-modal max-w-md" role="dialog" aria-modal="true" aria-labelledby="cart-quantity-title">
            <span className="pos-kicker">Carrito</span>
            <h2 id="cart-quantity-title" className="flow-modal-title">Editar cantidad</h2>
            <p className="mt-2 text-sm font-semibold text-[#5f626b]">{cartQuantityProduct.nombre}</p>

            <FormField label={isWeighableProduct(cartQuantityProduct) ? "Peso en gramos" : "Cantidad"} className="mt-5">
              <input
                autoFocus
                type="number"
                min={1}
                step={1}
                value={cartQuantityValue}
                onChange={(event) => setCartQuantityValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                    const direction = event.key === "ArrowUp" ? 1 : -1;
                    setCartQuantityValue((current) => String(Math.max(1, (Number(current) || 1) + direction)));
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    confirmCartQuantity();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setCartQuantityProduct(null);
                    setCartQuantityValue("");
                  }
                }}
                className={`${inputClassName} text-center text-3xl font-black`}
              />
            </FormField>
            <p className="pos-cart-quantity-hint">↑ aumenta · ↓ disminuye · Enter confirma · Esc cancela</p>

            <FormActions className="pt-5">
              <Button
                variant="ghost"
                onClick={() => {
                  setCartQuantityProduct(null);
                  setCartQuantityValue("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={confirmCartQuantity}>Guardar</Button>
            </FormActions>
          </div>
        </div>
      )}
      {paymentModalOpen && (
        <div
          className="flow-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isFinishingSale) {
              setPaymentModalOpen(false);
              focusBarcodeInput();
            }
          }}
        >
          <div
            ref={paymentStep === "details" ? paymentDetailsRef : paymentOptionsRef}
            className="flow-modal payment-modal pos-keyboard-payment-modal"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={handlePaymentKeyDown}
          >
            <div className="pos-section-row">
              <div>
                <span className="pos-kicker">Finalizar venta</span>
                <h2 className="flow-modal-title">{paymentDialogTitle}</h2>
              </div>
              <div className="pos-payment-total-pill">
                <small>Total</small>
                <strong>{formatMoney(paymentStep === "details" ? totalCobrar : paymentStep === "cost-payment" ? totalCosto : total - descuentoOfertas)}</strong>
              </div>
            </div>

            {paymentStep === "options" ? (
              <>
                <p className="pos-payment-instructions">Usa ↑ y ↓ para navegar. Presiona Enter para seleccionar.</p>
                <div className="pos-payment-keyboard-list" role="listbox" aria-label="Método o modalidad de venta">
                  {checkoutOptions.map((option, index) => {
                    const OptionIcon = option.icon;
                    const selected = index === selectedCheckoutOptionIndex;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`pos-payment-keyboard-option ${selected ? "selected" : ""}`}
                        onMouseEnter={() => setSelectedCheckoutOptionIndex(index)}
                        onClick={() => {
                          setSelectedCheckoutOptionIndex(index);
                          handleCheckoutOptionSelect(option.id);
                        }}
                      >
                        <span className="pos-payment-option-icon"><OptionIcon className="h-6 w-6" /></span>
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.hint}</small>
                        </span>
                        <span className="pos-payment-option-enter">Enter</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="pos-payment-cancel-link"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    focusBarcodeInput();
                  }}
                >
                  Esc · Volver al POS
                </button>
              </>
            ) : paymentStep === "cost-payment" ? (
              <>
                <p className="pos-payment-instructions">Selecciona cómo recibes el pago. Usa ↑, ↓ y Enter.</p>
                <div className="pos-payment-keyboard-list" role="listbox" aria-label="Forma de pago de venta a precio costo">
                  {costPaymentOptions.map((option, index) => {
                    const OptionIcon = option.icon;
                    const selected = index === selectedCostPaymentIndex;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`pos-payment-keyboard-option ${selected ? "selected" : ""}`}
                        onMouseEnter={() => setSelectedCostPaymentIndex(index)}
                        onClick={() => {
                          setSelectedCostPaymentIndex(index);
                          handleCostPaymentSelect(option.id);
                        }}
                      >
                        <span className="pos-payment-option-icon"><OptionIcon className="h-6 w-6" /></span>
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.hint}</small>
                        </span>
                        <span className="pos-payment-option-enter">Enter</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="pos-payment-cancel-link"
                  onClick={() => {
                    setPaymentStep("options");
                    setModalidadVenta("NORMAL");
                  }}
                >
                  Esc · Volver a las opciones
                </button>
              </>
            ) : (
              <>
                <div className="pos-payment-detail-summary">
                  <span><small>Subtotal</small><strong>{formatMoney(total)}</strong></span>
                  {modalidadVenta === "NORMAL" && descuentoOfertas > 0 && (
                    <span><small>Descuento</small><strong>-{formatMoney(descuentoOfertas)}</strong></span>
                  )}
                  {modalidadVenta === "PRECIO_COSTO" && (
                    <span><small>Precio costo</small><strong>{formatMoney(totalCosto)}</strong></span>
                  )}
                  {metodoPago === "EFECTIVO" && modalidadVenta !== "RETIRO_DUENO" && (
                    <span><small>Redondeo</small><strong>{formatSignedMoney(redondeoVenta)}</strong></span>
                  )}
                </div>

                {metodoPago === "EFECTIVO" && modalidadVenta !== "RETIRO_DUENO" && (
                  <div className="pos-payment-cash-step">
                    <FormField label="Monto con que paga">
                      <input
                        ref={cashReceivedInputRef}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={cashReceived}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => {
                          setCashReceived(event.target.value);
                          setPaymentConfirmationArmed(false);
                          setMessage("");
                        }}
                        className={`${inputClassName} pos-payment-main-input`}
                        placeholder="0"
                      />
                    </FormField>
                    <div className="pos-payment-change-card">
                      <span>Vuelto</span>
                      <strong>{formatMoney(Math.max(0, cashReceivedAmount - totalCobrar))}</strong>
                    </div>
                  </div>
                )}

                {(metodoPago === "TARJETA" || metodoPago === "TRANSFERENCIA") && (
                  <div className="pos-payment-simple-confirmation">
                    <span className="pos-payment-option-icon">
                      {metodoPago === "TARJETA"
                        ? <CreditCardIcon className="h-8 w-8" />
                        : <ArrowsRightLeftIcon className="h-8 w-8" />}
                    </span>
                    <strong>{metodoPago === "TARJETA" ? "Confirma el pago en el terminal" : "Confirma que recibiste la transferencia"}</strong>
                    <p>No necesitas ingresar ningún monto adicional.</p>
                  </div>
                )}

                {metodoPago === "MIXTO" && (
                  <div className="pos-payment-mixed-step">
                    <p>Divide el total entre efectivo y débito. Al cambiar uno, el otro se calcula automáticamente.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {mixedMethods.map((method, index) => (
                        <FormField key={method} label={paymentLabels[method]}>
                          <input
                            ref={index === 0 ? mixedCashInputRef : undefined}
                            type="number"
                            min={0}
                            value={mixedAmounts[method]}
                            onChange={(event) => handleMixedAmountChange(method, event.target.value)}
                            className={`${inputClassName} pos-payment-mixed-input`}
                          />
                        </FormField>
                      ))}
                    </div>
                    <div className="pos-payment-mixed-total">
                      <span>Pagado {formatMoney(mixedTotal)}</span>
                      <strong>Falta {formatMoney(Math.max(0, totalFinal - mixedTotal))}</strong>
                    </div>
                  </div>
                )}

                {selectedCheckoutOption === "RETIRO_DUENO" && (
                  <div className="owner-withdrawal-info">
                    <p>Este registro descontará stock y quedará marcado como retiro de dueño. No suma efectivo al cierre de caja.</p>
                    {ownerWithdrawalCostBlockers.length > 0 && (
                      <div className="owner-withdrawal-blockers">
                        <strong>Productos sin costo registrado</strong>
                        <div>
                          {ownerWithdrawalCostBlockers.map((product) => (
                            <button key={product.id} type="button" onClick={() => handleEditCostFromWithdrawal(product.id)}>
                              <span>{product.nombre}</span>
                              <small>{product.costo_actual === null ? "Sin costo" : "Costo $0"}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {message && <p className="pos-payment-message">{message}</p>}

                <div className={`pos-payment-enter-confirm ${paymentConfirmationArmed ? "armed" : ""}`} aria-live="polite">
                  <kbd>Enter</kbd>
                  <span>
                    <strong>{paymentConfirmationArmed ? "Presiona Enter nuevamente para confirmar" : "Presiona Enter para preparar la confirmación"}</strong>
                    <small>{modalidadVenta === "NORMAL" ? "La venta se registrará en la caja actual" : "Después se solicitará la contraseña de administrador"}</small>
                  </span>
                </div>

                <FormActions className="pt-4">
                  <Button
                    variant="ghost"
                    disabled={isFinishingSale}
                    onClick={returnToPreviousPaymentStep}
                  >
                    Volver
                  </Button>
                  <Button onClick={handlePaymentDetailsConfirm} disabled={!canConfirmSale}>
                    {isFinishingSale ? "Registrando..." : paymentConfirmationArmed ? "Confirmar ahora" : "Preparar confirmación"}
                  </Button>
                </FormActions>
              </>
            )}
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
