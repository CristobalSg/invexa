// src/services/productService.ts
import type { Product } from "../types/product";
import api from "../lib/axios";

const ENDPOINT = "/api/products";

export async function getProducts(): Promise<Product[]> {
  const { data } = await api.get<Product[]>(ENDPOINT);
  return data;
}

export async function createProduct(product: Omit<Product, "id">): Promise<Product> {
  const { data } = await api.post<Product>(ENDPOINT, product);
  return data;
}

export async function updateProduct(id: string, product: Partial<Omit<Product, "id">>): Promise<Product> {
  const { data } = await api.put<Product>(`${ENDPOINT}/${id}`, product);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`${ENDPOINT}/${id}`);
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    const { data } = await api.get<Product>(`${ENDPOINT}?barcode=${encodeURIComponent(barcode)}`);
    return data;
  } catch (err) {
    return null; // o puedes personalizar el manejo de errores aquí
  }
}
