// src/services/productService.ts
import type { Product, CreateProductInput } from "../types/product";
import api from "../lib/axios";

const ENDPOINT = "/products";

export async function getProducts(): Promise<Product[]> {
  const { data } = await api.get<Product[]>(ENDPOINT);
  return data;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await api.post<Product>(ENDPOINT, input);
  return data;
}

export async function updateProduct(id: number, product: Partial<CreateProductInput>): Promise<Product> {
  const { data } = await api.put<Product>(`${ENDPOINT}/${id}`, product);
  return data;
}

export async function deleteProduct(id: string | number): Promise<void> {
  await api.delete(`${ENDPOINT}/${id}`);
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    const { data } = await api.get<Product>(`${ENDPOINT}?barcode=${encodeURIComponent(barcode)}`);
    return data;
  } catch {
    return null;
  }
}
