export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
export type EstadoVenta = 'COMPLETADA' | 'ANULADA';
export type TipoPropiedadProducto = 'PROPIO' | 'CONSIGNACION';
export type ModalidadVenta = 'NORMAL' | 'PRECIO_COSTO' | 'RETIRO_DUENO';
export type ModoInventarioProducto = 'SIN_INVENTARIO' | 'FLEXIBLE' | 'ESTRICTO';

export interface SesionCajaAbiertaRow {
  readonly id: number;
  readonly usuario_id: number;
}

export interface VentaProductoRow {
  readonly id: number;
  readonly nombre: string;
  readonly precio_venta: string;
  readonly costo_actual: string | null;
  readonly stock: string;
  readonly activo: boolean;
  readonly tipo_propiedad: TipoPropiedadProducto;
  readonly modo_inventario: ModoInventarioProducto;
  readonly proveedor_id: number | null;
}

export interface OfertaActivaRow {
  readonly id: number;
  readonly cantidad_oferta: string;
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
  readonly total_sin_redondeo: string;
  readonly redondeo: string;
  readonly total: string;
  readonly monto_recibido: string | null;
  readonly vuelto: string | null;
  readonly modalidad: ModalidadVenta;
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
  readonly precio_normal: string;
  readonly descuento: string;
  readonly total_final: string;
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
  readonly total_sin_redondeo: number;
  readonly redondeo: number;
  readonly total: number;
  readonly monto_recibido: number | null;
  readonly vuelto: number | null;
  readonly modalidad: ModalidadVenta;
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
  readonly precio_normal: number;
  readonly descuento: number;
  readonly total_final: number;
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
  readonly modalidad?: ModalidadVenta;
  readonly master_password?: string;
  readonly monto_recibido?: number;
  readonly items: CreateVentaItemBody[];
}

export interface AnularVentaBody {
  readonly motivo: string;
  readonly master_password: string;
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
