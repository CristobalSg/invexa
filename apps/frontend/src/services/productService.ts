import type { Product } from "../types/product";

const mockProducts: Product[] = [
  { id: "1", name: "Pan", quantity: 20, cost: 500, price: 700 },
  { id: "2", name: "Leche", quantity: 15, cost: 800, price: 1000 },
];

// GET
export async function getProducts(): Promise<Product[]> {
  return new Promise((res) => {
    setTimeout(() => res(mockProducts), 500);
  });
}