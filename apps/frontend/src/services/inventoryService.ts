// src/services/inventoryService.ts
import api from "../lib/axios";
import type { Product } from "../types/product";

type CartProduct = Product & { quantity: number };

export async function registerSale(cart: CartProduct[]) {
  const body = cart.map((item) => ({
    productId: Number(item.id),
    quantity: item.quantity,
  }));

  await api.post("/inventories/sale", { items: body });
}
