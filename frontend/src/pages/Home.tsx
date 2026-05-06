import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import InputForm from "../components/InputForm";
import MainList from "../components/MainList";
import SideList from "../components/SideList";
import StatsPanel from "../components/StatsPanel";
import type { MetodoPago, Producto } from "../types/api";
import { createVenta } from "../services/transactionService";
import { getCajaActual } from "../services/cajaService";

type CartProduct = Producto & { quantity: number };

export default function Home() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartProduct[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [descuento, setDescuento] = useState(0);
  const [message, setMessage] = useState("");

  const { data: cajaActual } = useQuery({
    queryKey: ["caja-actual"],
    queryFn: getCajaActual,
  });

  const total = cart.reduce((acc, p) => {
    const quantity = p.quantity ?? 0;
    return acc + p.precio_venta * quantity;
  }, 0);
  const totalFinal = Math.max(0, total - descuento);

  const handleFinishSale = async () => {
    if (cart.length === 0) return;
    if (!cajaActual?.abierta) {
      setMessage("Abre una caja antes de registrar ventas.");
      return;
    }
    try {
      await createVenta({
        metodo_pago: metodoPago,
        descuento,
        items: cart.map((item) => ({ producto_id: item.id, cantidad: item.quantity })),
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["caja-actual"] });
      queryClient.invalidateQueries({ queryKey: ["reportes"] });
      setCart([]);
      setDescuento(0);
      setMessage("Venta registrada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hubo un error al registrar la venta");
    }
  };

  const handleProductFound = (product: Producto) => {
  setMessage("");
  setCart((prev) => {
    const idx = prev.findIndex((p) => String(p.id) === String(product.id));
    const stock = product.stock;

    if (idx !== -1) {
      const currentQty = prev[idx].quantity;
      if (currentQty >= stock) {
        // ya no se puede agregar más
        return prev;
      }
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        quantity: updated[idx].quantity + 1,
      };
      return updated;
    }

    if (stock <= 0) return prev;

    return [...prev, { ...product, quantity: 1 }];
  });
};


  const handleDecreaseQuantity = (productId: string) => {
    setCart((prev) =>
      prev.flatMap((p) => {
        if (String(p.id) === productId) {
          if (p.quantity > 1) {
            return [{ ...p, quantity: p.quantity - 1 }];
          }
          return [];
        }
        return [p];
      })
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setCart((prev) => prev.filter((p) => String(p.id) !== productId));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div className="bg-white rounded-lg border p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Punto de venta</h1>
            <p className="text-sm text-gray-500">
              Caja: {cajaActual?.abierta ? `abierta #${cajaActual.id}` : "sin caja abierta"}
            </p>
          </div>
          <div className="flex gap-3">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)} className="border rounded px-3 py-2">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="MIXTO">Mixto</option>
            </select>
            <input
              type="number"
              min={0}
              value={descuento}
              onChange={(e) => setDescuento(Number(e.target.value))}
              className="border rounded px-3 py-2 w-32"
              placeholder="Descuento"
            />
          </div>
        </div>
        <InputForm
          title="Código de barra..."
          onProductFound={handleProductFound}
        />
        <MainList
          products={cart}
          onDecrease={handleDecreaseQuantity}
          onRemove={handleRemoveProduct}
        />
      </div>

      <div className="md:col-span-1 space-y-4">
        <InputForm
          title="Buscar producto"
          onSearchChange={setSearchTerm}
        />
        <SideList
          searchTerm={searchTerm}
          onProductClick={handleProductFound}
        />
        <StatsPanel total={totalFinal} onFinish={handleFinishSale} disabled={cart.length === 0} />
        {message && <p className="text-sm bg-white rounded border p-3">{message}</p>}
      </div>
    </div>
  );
}
