import api from "../lib/axios";
import type {
  CierreCajaDiario,
  ConsignacionItem,
  InventarioItem,
  PaginatedResult,
  ProductoTop,
  VentasMensual,
  VentasResumen,
} from "../types/api";

type DateRange = { fecha_desde?: string; fecha_hasta?: string };
type PageRange = DateRange & { page?: number; limit?: number };

export async function getVentasResumen(params: DateRange = {}) {
  const { data } = await api.get<VentasResumen>("/reportes/ventas/resumen", { params });
  return data;
}

export async function getVentasMensual(params: DateRange = {}) {
  const { data } = await api.get<VentasMensual[]>("/reportes/ventas/mensual", { params });
  return data;
}

export async function getCierreCajaDiario(params: Pick<DateRange, "fecha_desde"> = {}) {
  const { data } = await api.get<CierreCajaDiario>("/reportes/caja/cierre-diario", { params });
  return data;
}

export async function getProductosTop(params: PageRange = {}) {
  const { data } = await api.get<PaginatedResult<ProductoTop>>("/reportes/productos/top", { params: { page: 1, limit: 10, ...params } });
  return data;
}

export async function getReporteInventario(params: PageRange = {}) {
  const { data } = await api.get<PaginatedResult<InventarioItem>>("/reportes/inventario", { params: { page: 1, limit: 50, ...params } });
  return data;
}

export async function getBajoStock(params: PageRange & { umbral?: number } = {}) {
  const { data } = await api.get<PaginatedResult<InventarioItem>>("/reportes/bajo-stock", { params: { page: 1, limit: 20, umbral: 5, ...params } });
  return data;
}

export async function getConsignacion(params: PageRange = {}) {
  const { data } = await api.get<PaginatedResult<ConsignacionItem>>("/reportes/consignacion", { params: { page: 1, limit: 20, ...params } });
  return data;
}
