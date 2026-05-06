export interface CompraProductoRow {
  readonly id: number;
  readonly nombre: string;
  readonly stock: string;
  readonly costo_actual: string | null;
  readonly precio_venta: string;
  readonly activo: boolean;
  readonly multiplicador_ganancia: string;
  readonly variacion_maxima_precio: string;
}

export interface CompraRow {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly total_costo: string;
  readonly creado_en: Date;
}

export interface CompraListRow extends CompraRow {
  readonly total_count: string;
}

export interface DetalleCompraRow {
  readonly id: number;
  readonly compra_id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly cantidad: string;
  readonly costo_unitario: string;
  readonly costo_anterior: string | null;
  readonly precio_anterior: string | null;
  readonly precio_sugerido: string;
  readonly precio_final: string;
  readonly variacion_precio: string | null;
  readonly tiene_alerta_precio: boolean;
  readonly subtotal_costo: string;
}

export interface MovimientoCompraRow {
  readonly id: number;
  readonly producto_id: number;
  readonly tipo: 'COMPRA';
  readonly cantidad: string;
  readonly stock_anterior: string | null;
  readonly stock_nuevo: string | null;
  readonly compra_id: number;
  readonly creado_en: Date;
}

export interface Compra {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly total_costo: number;
  readonly creado_en: string;
}

export interface DetalleCompra {
  readonly id: number;
  readonly compra_id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly cantidad: number;
  readonly costo_unitario: number;
  readonly costo_anterior: number | null;
  readonly precio_anterior: number | null;
  readonly precio_sugerido: number;
  readonly precio_final: number;
  readonly variacion_precio: number | null;
  readonly tiene_alerta_precio: boolean;
  readonly subtotal_costo: number;
}

export interface MovimientoCompra {
  readonly id: number;
  readonly producto_id: number;
  readonly tipo: 'COMPRA';
  readonly cantidad: number;
  readonly stock_anterior: number | null;
  readonly stock_nuevo: number | null;
  readonly compra_id: number;
  readonly creado_en: string;
}

export interface CompraDetalle extends Compra {
  readonly detalles: DetalleCompra[];
  readonly movimientos: MovimientoCompra[];
}

export interface CreateCompraItemBody {
  readonly producto_id: number;
  readonly cantidad: number;
  readonly costo_unitario: number;
  readonly precio_final?: number;
  readonly actualizar_precio_venta?: boolean;
}

export interface CreateCompraBody {
  readonly items: CreateCompraItemBody[];
}

export interface CompraParams {
  readonly id: number;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly usuario_id?: number;
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
