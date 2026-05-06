import api from "../lib/axios";
import type { Compra, CompraDetalle, PaginatedResult } from "../types/api";

export async function getCompras(params: { page?: number; limit?: number; fecha_desde?: string; fecha_hasta?: string } = {}) {
  const { data } = await api.get<PaginatedResult<Compra>>("/compras", { params: { page: 1, limit: 50, ...params } });
  return data;
}

export async function createCompra(input: {
  items: {
    producto_id: number;
    cantidad: number;
    costo_unitario: number;
    precio_final?: number;
    actualizar_precio_venta?: boolean;
  }[];
}) {
  const { data } = await api.post<CompraDetalle>("/compras", input);
  return data;
}

export async function getCompra(id: number) {
  const { data } = await api.get<CompraDetalle>(`/compras/${id}`);
  return data;
}
