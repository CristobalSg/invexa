export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
export type EstadoVenta = 'COMPLETADA' | 'ANULADA';
export type TipoPropiedadProducto = 'PROPIO' | 'CONSIGNACION';

export interface SesionCajaAbiertaRow {
  readonly id: number;
  readonly usuario_id: number;
}

export interface VentaProductoRow {
  readonly id: number;
  readonly nombre: string;
  readonly precio_venta: string;
  readonly stock: string;
  readonly activo: boolean;
  readonly tipo_propiedad: TipoPropiedadProducto;
  readonly proveedor_id: number | null;
}

export interface OfertaActivaRow {
  readonly id: number;
  readonly precio_oferta: string;
}

export interface VentaRow {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly sesion_caja_id: number | null;
  readonly metodo_pago: MetodoPago;
  readonly subtotal: string;
  readonly descuento: string;
  readonly total: string;
  readonly estado: EstadoVenta;
  readonly anulada_en: Date | null;
  readonly anulada_por: number | null;
  readonly motivo_anulacion: string | null;
  readonly creado_en: Date;
}

export interface VentaListRow extends VentaRow {
  readonly total_count: string;
}

export interface DetalleVentaRow {
  readonly id: number;
  readonly venta_id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly oferta_id: number | null;
  readonly cantidad: string;
  readonly precio_unitario: string;
  readonly subtotal: string;
  readonly tipo_propiedad: TipoPropiedadProducto;
  readonly proveedor_id: number | null;
  readonly proveedor_nombre: string | null;
}

export interface MovimientoVentaRow {
  readonly id: number;
  readonly producto_id: number;
  readonly tipo: 'VENTA' | 'ANULACION';
  readonly cantidad: string;
  readonly stock_anterior: string | null;
  readonly stock_nuevo: string | null;
  readonly venta_id: number;
  readonly creado_en: Date;
}

export interface Venta {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly sesion_caja_id: number | null;
  readonly metodo_pago: MetodoPago;
  readonly subtotal: number;
  readonly descuento: number;
  readonly total: number;
  readonly estado: EstadoVenta;
  readonly anulada_en: string | null;
  readonly anulada_por: number | null;
  readonly motivo_anulacion: string | null;
  readonly creado_en: string;
}

export interface DetalleVenta {
  readonly id: number;
  readonly venta_id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly oferta_id: number | null;
  readonly cantidad: number;
  readonly precio_unitario: number;
  readonly subtotal: number;
  readonly tipo_propiedad: TipoPropiedadProducto;
  readonly proveedor_id: number | null;
  readonly proveedor_nombre: string | null;
}

export interface MovimientoVenta {
  readonly id: number;
  readonly producto_id: number;
  readonly tipo: 'VENTA' | 'ANULACION';
  readonly cantidad: number;
  readonly stock_anterior: number | null;
  readonly stock_nuevo: number | null;
  readonly venta_id: number;
  readonly creado_en: string;
}

export interface VentaDetalle extends Venta {
  readonly detalles: DetalleVenta[];
  readonly movimientos: MovimientoVenta[];
}

export interface CreateVentaItemBody {
  readonly producto_id: number;
  readonly cantidad: number;
}

export interface CreateVentaBody {
  readonly metodo_pago: MetodoPago;
  readonly descuento?: number;
  readonly items: CreateVentaItemBody[];
}

export interface AnularVentaBody {
  readonly motivo: string;
}

export interface VentaParams {
  readonly id: number;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly usuario_id?: number;
  readonly estado?: EstadoVenta;
  readonly metodo_pago?: MetodoPago;
  readonly fecha_desde?: string;
  readonly fecha_hasta?: string;
}

export interface PaginatedResult<T> {
  readonly items: T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
