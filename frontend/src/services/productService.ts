import api from "../lib/axios";
import type { ModoInventarioProducto, PaginatedResult, Producto, TipoPropiedadProducto } from "../types/api";
import type { CreateProductInput } from "../types/product";

const ENDPOINT = "/productos";

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  categoria_id?: number;
  proveedor_id?: number;
  tipo_propiedad?: TipoPropiedadProducto;
  modo_inventario?: ModoInventarioProducto;
}

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedResult<Producto>> {
  const { data } = await api.get<PaginatedResult<Producto>>(ENDPOINT, { params: { limit: 100, ...filters } });
  return data;
}

export async function createProduct(input: CreateProductInput): Promise<Producto> {
  const { data } = await api.post<Producto>(ENDPOINT, input);
  return data;
}

export async function updateProduct(id: number, product: Partial<CreateProductInput>): Promise<Producto> {
  const { data } = await api.patch<Producto>(`${ENDPOINT}/${id}`, product);
  return data;
}

export async function deleteProduct(id: string | number): Promise<Producto> {
  const { data } = await api.patch<Producto>(`${ENDPOINT}/${id}/desactivar`);
  return data;
}

export async function reactivateProduct(id: string | number): Promise<Producto> {
  const { data } = await api.patch<Producto>(`${ENDPOINT}/${id}`, { activo: true });
  return data;
}

export async function getProductByBarcode(barcode: string): Promise<Producto | null> {
  try {
    const { data } = await api.get<Producto>(`${ENDPOINT}/codigo/${encodeURIComponent(barcode)}`);
    return data;
  } catch {
    return null;
  }
}
