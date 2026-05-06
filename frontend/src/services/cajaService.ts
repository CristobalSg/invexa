import api from "../lib/axios";
import type { CajaSession, PaginatedResult } from "../types/api";

export async function getCajaActual() {
  const { data } = await api.get<CajaSession | null>("/caja/actual");
  return data;
}

export async function abrirCaja(monto_apertura: number) {
  const { data } = await api.post<CajaSession>("/caja/abrir", { monto_apertura });
  return data;
}

export async function cerrarCaja() {
  const { data } = await api.post<CajaSession>("/caja/cerrar");
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
