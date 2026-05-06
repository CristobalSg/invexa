import api from "../lib/axios";
import type { EstadoVenta, MetodoPago, PaginatedResult, Venta, VentaDetalle } from "../types/api";

const ENDPOINT = "/ventas";

export async function getTransactions(fecha_desde?: string, fecha_hasta?: string) {
  return getVentas({ fecha_desde, fecha_hasta });
}

export async function getVentas(params: {
  page?: number;
  limit?: number;
  usuario_id?: number;
  estado?: EstadoVenta;
  metodo_pago?: MetodoPago;
  fecha_desde?: string;
  fecha_hasta?: string;
} = {}) {
  const { data } = await api.get<PaginatedResult<Venta>>(ENDPOINT, { params: { page: 1, limit: 50, ...params } });
  return data;
}

export async function createVenta(input: {
  metodo_pago: MetodoPago;
  descuento?: number;
  items: { producto_id: number; cantidad: number }[];
}) {
  const { data } = await api.post<VentaDetalle>(ENDPOINT, input);
  return data;
}

export async function getVenta(id: number) {
  const { data } = await api.get<VentaDetalle>(`${ENDPOINT}/${id}`);
  return data;
}

export async function anularVenta(id: number, motivo: string) {
  const { data } = await api.patch<VentaDetalle>(`${ENDPOINT}/${id}/anular`, { motivo });
  return data;
}
