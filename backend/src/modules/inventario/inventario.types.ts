export type TipoMovimientoInventario =
  | 'VENTA'
  | 'COMPRA'
  | 'AJUSTE'
  | 'MERMA'
  | 'DEVOLUCION'
  | 'ANULACION';

export interface MovimientoInventarioRow {
  readonly id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly usuario_id: number | null;
  readonly usuario_nombre: string | null;
  readonly tipo: TipoMovimientoInventario;
  readonly cantidad: string;
  readonly stock_anterior: string | null;
  readonly stock_nuevo: string | null;
  readonly venta_id: number | null;
  readonly compra_id: number | null;
  readonly venta_metodo_pago: string | null;
  readonly venta_total: string | null;
  readonly venta_modalidad: string | null;
  readonly venta_estado: string | null;
  readonly venta_sesion_caja_id: number | null;
  readonly venta_precio_unitario: string | null;
  readonly venta_descuento: string | null;
  readonly venta_total_final: string | null;
  readonly compra_total_costo: string | null;
  readonly compra_estado: string | null;
  readonly compra_costo_unitario: string | null;
  readonly compra_precio_anterior: string | null;
  readonly compra_precio_final: string | null;
  readonly compra_subtotal_costo: string | null;
  readonly motivo: string | null;
  readonly creado_en: Date;
  readonly total_count: string;
}

export interface MovimientoInventario {
  readonly id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly usuario_id: number | null;
  readonly usuario_nombre: string | null;
  readonly tipo: TipoMovimientoInventario;
  readonly cantidad: number;
  readonly stock_anterior: number | null;
  readonly stock_nuevo: number | null;
  readonly venta_id: number | null;
  readonly compra_id: number | null;
  readonly venta_metodo_pago: string | null;
  readonly venta_total: number | null;
  readonly venta_modalidad: string | null;
  readonly venta_estado: string | null;
  readonly venta_sesion_caja_id: number | null;
  readonly venta_precio_unitario: number | null;
  readonly venta_descuento: number | null;
  readonly venta_total_final: number | null;
  readonly compra_total_costo: number | null;
  readonly compra_estado: string | null;
  readonly compra_costo_unitario: number | null;
  readonly compra_precio_anterior: number | null;
  readonly compra_precio_final: number | null;
  readonly compra_subtotal_costo: number | null;
  readonly motivo: string | null;
  readonly creado_en: string;
}

export interface MovimientosQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly producto_id?: number;
  readonly tipo?: TipoMovimientoInventario;
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
