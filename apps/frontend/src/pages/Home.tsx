// Home.tsx - Finalizar venta actualiza inventario y registra transacción
import { useState } from "react";
import InputForm from "../components/InputForm";
import MainList from "../components/MainList";
import SideList from "../components/SideList";
import StatsPanel from "../components/StatsPanel";
import type { Product } from "../types/product";
import { registerSale } from "../services/inventoryService";
import { useQueryClient } from "@tanstack/react-query";

// Define tipo con cantidad para el carro
type CartProduct = Product & { quantity: number };

export default function Home() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartProduct[]>([]);

  const total = cart.reduce((acc, p) => {
    const price = p.presentations?.[0]?.price ?? 0;
    const quantity = p.quantity ?? 0;
    return acc + price * quantity;
  }, 0);

  const handleFinishSale = async () => {
    try {
    console.log(cart)
      await registerSale(cart);
      queryClient.invalidateQueries({ queryKey: ["products"] }); // 🔁 fuerza refetch
      setCart([]);
    } catch (error) {
      console.error("Error al finalizar venta:", error);
      alert("Hubo un error al registrar la venta");
    }
  };

  const handleProductFound = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(product.id));
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + 1,
        };
        return updated;
      }
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Columna principal (2/3) */}
      <div className="md:col-span-2 space-y-4">
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

      {/* Columna lateral (1/3) */}
      <div className="md:col-span-1 space-y-4">
        <InputForm
          title="Buscar producto"
          onSearchChange={setSearchTerm}
        />
        <SideList
          searchTerm={searchTerm}
          onProductClick={handleProductFound}
        />
        <StatsPanel total={total} onFinish={handleFinishSale} />
      </div>
    </div>
  );
}
