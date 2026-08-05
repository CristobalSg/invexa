import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { StarIcon as StarIconOutline, TagIcon, WalletIcon } from "@heroicons/react/24/outline";
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
import { getOfertasActivas } from "../services/catalogService";

type CartProduct = Producto & { quantity: number; cartItemId: string };
type CartSession = { id: string; name: string; items: CartProduct[] };
type MixedPaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
type PaymentAmounts = Record<MixedPaymentMethod, string>;
type QuickProductsModal = "frutas-verduras" | "destacados" | "ofertas";

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

const paymentMethodClasses: Record<MetodoPago, { selected: string; idle: string }> = {
  EFECTIVO: {
    selected: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
    idle: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  TARJETA: {
    selected: "border-sky-600 bg-sky-600 text-white shadow-sm",
    idle: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  },
  TRANSFERENCIA: {
    selected: "border-indigo-600 bg-indigo-600 text-white shadow-sm",
    idle: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
  },
  MIXTO: {
    selected: "border-amber-500 bg-amber-500 text-white shadow-sm",
    idle: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
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
  const [searchTerm, setSearchTerm] = useState("");
  const [carts, setCarts] = useState<CartSession[]>(() => [createCartSession(1)]);
  const [activeCartId] = useState(() => "");
  const [message, setMessage] = useState("");
  const [centerAlert, setCenterAlert] = useState("");
  const [weighableProduct, setWeighableProduct] = useState<Producto | null>(null);
  const [grams, setGrams] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
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
  const { data: ofertasActivas } = useQuery({
    queryKey: ["ofertas", "activas"],
    queryFn: () => getOfertasActivas(),
  });

  const activeOffers = ofertasActivas?.items ?? [];
  const activeOffersByProductId = new Map(activeOffers.map((offer) => [offer.producto_id, offer]));

  const produceProducts = (productos?.items ?? []).filter(
    (product) =>
      matchesCategory(product, "frutas") ||
      matchesCategory(product, "verduras") ||
      matchesAnyTerm(product, fruitTerms) ||
      matchesAnyTerm(product, vegetableTerms),
  );
  const featuredProducts = (productos?.items ?? []).filter((product) => featuredProductIds.includes(product.id));
  const offerProducts = (productos?.items ?? []).filter((product) => activeOffersByProductId.has(product.id));
  const quickProducts =
    quickProductsModal === "destacados"
      ? featuredProducts
      : quickProductsModal === "ofertas"
        ? offerProducts
        : produceProducts;
  const quickProductsTitle =
    quickProductsModal === "destacados"
      ? "Productos destacados"
      : quickProductsModal === "ofertas"
        ? "Productos en oferta"
        : "Frutas y verduras";
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
    <div className="grid grid-cols-1 gap-6 pb-28 lg:grid-cols-3 lg:pb-6">
      <div className="md:col-span-2 space-y-4">
        <InputForm
          ref={barcodeInputRef}
          title="Código de barra..."
          onProductFound={handleProductFound}
          size="large"
        />
        <MainList
          products={cart}
          onDecrease={handleDecreaseQuantity}
          onIncrease={handleIncreaseQuantity}
          onRemove={handleRemoveProduct}
        />
      </div>

      <div className="md:col-span-1 space-y-4">
        <InputForm
          title="Buscar producto"
          onSearchChange={setSearchTerm}
        />
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            type="button"
            onClick={() => setQuickProductsModal("frutas-verduras")}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Frutas y verduras
          </button>
          <button
            type="button"
            onClick={() => setQuickProductsModal("destacados")}
            className="flex h-full min-w-14 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-amber-700 hover:bg-amber-100"
            aria-label="Productos destacados"
            title="Productos destacados"
          >
            <StarIconSolid className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setQuickProductsModal("ofertas")}
            className="flex h-full min-w-14 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-4 text-sky-700 hover:bg-sky-100"
            aria-label="Productos en oferta"
            title="Productos en oferta"
          >
            <TagIcon className="h-5 w-5" />
          </button>
        </div>
        <SideList
          searchTerm={searchTerm}
          onProductClick={handleProductFound}
          featuredProductIds={featuredProductIds}
          onToggleFeatured={toggleFeaturedProduct}
        />
        {!cajaActual?.abierta && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
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
        {message && <p className="text-sm bg-white rounded border p-3">{message}</p>}
        <div className="sticky bottom-4 z-10">
          <StatsPanel total={totalFinal} onFinish={handleOpenPayment} disabled={cart.length === 0 || !cajaActual?.abierta} />
        </div>
      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">{weighableProduct.nombre}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Precio por kilo: ${weighableProduct.precio_venta.toLocaleString()} · Stock: {weighableProduct.stock} kg
            </p>
            <FormField label="Peso en gramos" className="mt-5">
            <input
              autoFocus
              type="number"
              min={1}
              step={1}
              value={grams}
              onChange={(event) => setGrams(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleConfirmWeight();
                if (event.key === "Escape") {
                  setWeighableProduct(null);
                  focusBarcodeInput();
                }
              }}
              className={`${inputClassName} text-lg`}
            />
            </FormField>
            <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {(Number(grams) / 1000).toFixed(3)} kg · Total ${Math.max(0, (Number(grams) / 1000) * weighableProduct.precio_venta).toLocaleString()}
            </div>
            <FormActions className="mt-1">
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
            </FormActions>
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
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Finalizar venta</h2>
            <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="rounded-md bg-gray-50 p-4">
                  <div className="flex justify-between text-sm text-gray-500">
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
                    <div className="mt-1 flex justify-between text-sm text-gray-500">
                      <span>Venta precio costo</span>
                      <span>{formatMoney(totalCosto)}</span>
                    </div>
                  )}
                  {modalidadVenta === "RETIRO_DUENO" && (
                    <div className="mt-1 flex justify-between text-sm text-gray-500">
                      <span>Retiro dueño</span>
                      <span>Costo ref. {formatMoney(totalCosto)}</span>
                    </div>
                  )}
                  <p className="mt-3 text-sm text-gray-500">Total a pagar</p>
                  <p className="text-3xl font-bold text-gray-900">${totalFinal.toLocaleString()}</p>
                </div>

                <label className="mt-5 block text-sm font-medium text-gray-700">Método de pago</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MIXTO"] as MetodoPago[]).map((method) => {
                    const colorClass = metodoPago === method
                      ? paymentMethodClasses[method].selected
                      : paymentMethodClasses[method].idle;

                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => handlePaymentMethodChange(method)}
                        className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${colorClass}`}
                      >
                        {paymentMethodLabels[method]}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium text-gray-700">Administrador</p>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleModalidadChange(modalidadVenta === "RETIRO_DUENO" ? "NORMAL" : "RETIRO_DUENO")}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                        modalidadVenta === "RETIRO_DUENO"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Retiro de dueño
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModalidadChange(modalidadVenta === "PRECIO_COSTO" ? "NORMAL" : "PRECIO_COSTO")}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                        modalidadVenta === "PRECIO_COSTO"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="text-sm font-semibold uppercase text-emerald-700">Vuelto</p>
                      <p className="mt-1 text-4xl font-bold leading-tight text-emerald-800">
                        ${Math.max(0, cashReceivedAmount - totalFinal).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Sugeridos</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {cashSuggestions.map((amount, index) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setCashReceived(toInputAmount(amount))}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
                      <p className="text-sm font-medium text-gray-700">Combinación de pagos</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {mixedPaymentOptions.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => handleMixedOptionChange(option.methods)}
                            className={`rounded-lg border px-3 py-2 text-left text-sm font-medium ${
                              option.methods.join("-") === mixedMethods.join("-")
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
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

                    <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                      Pagado: ${mixedTotal.toLocaleString()} · Falta: ${Math.max(0, totalFinal - mixedTotal).toLocaleString()}
                    </div>
                  </div>
                )}
                {modalidadVenta === "RETIRO_DUENO" && (
                  <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">
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
