import api from "../lib/axios";
import type {
  CajaMovimiento,
  CajaSession,
  CategoriaMovimientoCaja,
  PaginatedResult,
  TipoMovimientoCaja,
} from "../types/api";

export async function getCajaActual() {
  const { data } = await api.get<CajaSession | null>("/caja/actual");
  return data;
}

export async function abrirCaja(monto_apertura: number) {
  const { data } = await api.post<CajaSession>("/caja/abrir", { monto_apertura });
  return data;
}

export async function cerrarCaja(efectivo_contado: number) {
  const { data } = await api.post<CajaSession>("/caja/cerrar", { efectivo_contado });
  return data;
}

export async function forzarCerrarCaja(efectivo_contado: number, master_password: string) {
  const { data } = await api.post<CajaSession>("/caja/cerrar/forzar", { efectivo_contado, master_password });
  return data;
}

export async function crearMovimientoCaja(input: {
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimientoCaja;
  monto: number;
  descripcion?: string | null;
  master_password: string;
}) {
  const { data } = await api.post<CajaMovimiento>("/caja/movimientos", input);
  return data;
}

export async function editarMovimientoCaja(id: number, input: {
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimientoCaja;
  monto: number;
  descripcion?: string | null;
  master_password: string;
}) {
  const { data } = await api.patch<CajaMovimiento>(`/caja/movimientos/${id}`, input);
  return data;
}

export async function eliminarMovimientoCaja(id: number, master_password: string) {
  const { data } = await api.delete<CajaMovimiento>(`/caja/movimientos/${id}`, {
    data: { master_password },
  });
  return data;
}

export async function getMovimientosCajaActual() {
  const { data } = await api.get<CajaMovimiento[]>("/caja/movimientos/actual");
  return data;
}

export async function getCajaSesiones(params: {
  page?: number;
  limit?: number;
  abierta?: boolean;
  usuario_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
} = {}) {
  const { data } = await api.get<PaginatedResult<CajaSession>>("/caja/sesiones", {
    params: { page: 1, limit: 50, ...params },
  });
  return data;
}
