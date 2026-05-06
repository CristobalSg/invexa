import api from "../lib/axios";
import type { MovimientoInventario, PaginatedResult, TipoMovimientoInventario } from "../types/api";

export async function getMovimientos(params: {
  page?: number;
  limit?: number;
  producto_id?: number;
  tipo?: TipoMovimientoInventario;
  fecha_desde?: string;
  fecha_hasta?: string;
} = {}) {
  const { data } = await api.get<PaginatedResult<MovimientoInventario>>("/inventario/movimientos", {
    params: { page: 1, limit: 50, ...params },
  });
  return data;
}
