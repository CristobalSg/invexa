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

export interface ResetProduceProductInput {
  nombre: string;
  tipo: "FRUTA" | "VERDURA";
}

export interface ResetProduceProductsInput {
  master_password: string;
  productos: ResetProduceProductInput[];
}

export interface ResetProduceProductsResult {
  categoria_id: number;
  desactivados: number;
  creados: number;
}

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedResult<Producto>> {
  const { data } = await api.get<PaginatedResult<Producto>>(ENDPOINT, { params: { limit: 100, ...filters } });
  return data;
}

export async function getAllProducts(filters: ProductFilters = {}): Promise<Producto[]> {
  const firstPage = await getProducts({ ...filters, page: 1, limit: 100 });
  const totalPages = firstPage.pagination.totalPages;

  if (totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getProducts({ ...filters, page: index + 2, limit: 100 }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

export async function createProduct(input: CreateProductInput): Promise<Producto> {
  const { data } = await api.post<Producto>(ENDPOINT, input);
  return data;
}

export async function updateProduct(id: number, product: Partial<CreateProductInput>): Promise<Producto> {
  const { data } = await api.patch<Producto>(`${ENDPOINT}/${id}`, product);
  return data;
}

export async function deleteProduct(id: string | number, master_password?: string): Promise<Producto> {
  const { data } = await api.patch<Producto>(
    `${ENDPOINT}/${id}/desactivar`,
    master_password ? { master_password } : {},
  );
  return data;
}

export async function reactivateProduct(id: string | number, master_password?: string): Promise<Producto> {
  const { data } = await api.patch<Producto>(
    `${ENDPOINT}/${id}`,
    { activo: true, ...(master_password ? { master_password } : {}) },
  );
  return data;
}

export async function resetProduceProducts(input: ResetProduceProductsInput): Promise<ResetProduceProductsResult> {
  const { data } = await api.post<ResetProduceProductsResult>(`${ENDPOINT}/frutas-verduras/reset`, input);
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
