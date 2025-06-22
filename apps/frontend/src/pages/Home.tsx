// src/pages/Home.tsx
import { useState } from "react";
import InputForm from "../components/InputForm";
import MainList from "../components/MainList";
import SideList from "../components/SideList";
import StatsPanel from "../components/StatsPanel";
import type { Product } from "../types/product";


export default function Home() {
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<Product[]>([]);
    
    // Total calculado dinámicamente sumando (precio * cantidad) por producto
    const total = cart.reduce((acc, p) => acc + p.price * p.quantity, 0);

    const handleFinishSale = () => {
        console.log("Venta finalizada");
        setCart([]); // ← limpia el carrito
        // Posteriormente vamos a gestionar la cantidad de productos en el inventario

    };

    const handleProductFound = (product: Product) => {
        setCart((prev) => {
            // Si ya está en el carrito, suma cantidad
            const idx = prev.findIndex(p => p.id === product.id);
            if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
                return updated;
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    // Si hay más de 1 unidad, resta una. Si solo queda una, elimina el producto.
    const handleDecreaseQuantity = (productId: string) => {
        setCart((prev) => {
            return prev.flatMap(p => {
                if (p.id === productId) {
                    if (p.quantity > 1) {
                        return [{ ...p, quantity: p.quantity - 1 }];
                    } else {
                        return []; // eliminar si llega a 0
                    }
                }
                return [p];
            });
        });
    };

    // Elimina completamente el producto del carrito
    const handleRemoveProduct = (productId: string) => {
        setCart((prev) => prev.filter(p => p.id !== productId));
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Columna principal (2/3) */}
            <div className="md:col-span-2 space-y-4">
                <InputForm title="Codigo de barra....." onProductFound={handleProductFound}/>
                <MainList 
                    products={cart} 
                    onDecrease={handleDecreaseQuantity}
                    onRemove={handleRemoveProduct}
                />
            </div>

            {/* Columna secundaria (1/3) */}
            <div className="md:col-span-1 space-y-4">
                <InputForm title="Buscar producto" onSearchChange={setSearchTerm}/>
                <SideList 
                    searchTerm={searchTerm}
                    onProductClick={handleProductFound}/>
                <StatsPanel total={total} onFinish={handleFinishSale}/>
            </div>
        </div>
    )
}

