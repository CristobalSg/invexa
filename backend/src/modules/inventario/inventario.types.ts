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
