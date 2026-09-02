export interface DateRangeQuery {
  readonly fecha_desde?: string;
  readonly fecha_hasta?: string;
}

export interface PaginationQuery extends DateRangeQuery {
  readonly page?: number;
  readonly limit?: number;
}

export interface BajoStockQuery extends PaginationQuery {
  readonly umbral?: number;
}

export interface ProductoParams {
  readonly id: number;
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

export interface VentasResumenRow {
  readonly cantidad_ventas: string;
  readonly subtotal: string;
  readonly descuento: string;
  readonly total: string;
  readonly ticket_promedio: string;
  readonly efectivo: string;
  readonly tarjeta: string;
  readonly transferencia: string;
  readonly mixto: string;
}

export interface VentasResumen {
  readonly cantidad_ventas: number;
  readonly subtotal: number;
  readonly descuento: number;
  readonly total: number;
  readonly ticket_promedio: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly transferencia: number;
  readonly mixto: number;
}

export interface CierreCajaDiarioRow {
  readonly sesion_caja_id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly dispositivo_nombre: string | null;
  readonly abierta_en: Date;
  readonly cerrada_en: Date;
  readonly monto_apertura: string;
  readonly monto_cierre: string | null;
  readonly monto_esperado: string | null;
  readonly diferencia_cierre: string | null;
  readonly cantidad_ventas: string;
  readonly total_vendido: string;
  readonly efectivo: string;
  readonly tarjeta: string;
  readonly transferencia: string;
  readonly mixto: string;
  readonly ingresos: string;
  readonly egresos: string;
}

export interface CierreCajaDiarioItem {
  readonly sesion_caja_id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly dispositivo_nombre: string | null;
  readonly abierta_en: string;
  readonly cerrada_en: string;
  readonly monto_apertura: number;
  readonly monto_cierre: number | null;
  readonly monto_esperado: number | null;
  readonly diferencia_cierre: number | null;
  readonly cantidad_ventas: number;
  readonly total_vendido: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly transferencia: number;
  readonly mixto: number;
  readonly ingresos: number;
  readonly egresos: number;
}

export interface CierreCajaDiario {
  readonly fecha: string;
  readonly cajas_cerradas: number;
  readonly total_vendido: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly transferencia: number;
  readonly mixto: number;
  readonly ingresos: number;
  readonly egresos: number;
  readonly diferencia_total: number;
  readonly sesiones: CierreCajaDiarioItem[];
}

export interface VentasMensualRow {
  readonly mes: string;
  readonly cantidad_ventas: string;
  readonly total: string;
  readonly subtotal: string;
  readonly descuento: string;
}

export interface VentasMensual {
  readonly mes: string;
  readonly cantidad_ventas: number;
  readonly total: number;
  readonly subtotal: number;
  readonly descuento: number;
}

export interface ProductoTopRow {
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly unidad_venta: 'UNIDAD' | 'PESO';
  readonly cantidad_vendida: string;
  readonly ingresos: string;
  readonly cantidad_rank: string;
  readonly ingresos_rank: string;
}

export interface ProductoTop {
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly unidad_venta: 'UNIDAD' | 'PESO';
  readonly cantidad_vendida: number;
  readonly ingresos: number;
}

export interface ProductosTop {
  readonly por_unidades: ProductoTop[];
  readonly por_peso: ProductoTop[];
  readonly por_ingresos: ProductoTop[];
}

export interface InventarioRow {
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly codigo_barras: string | null;
  readonly categoria_nombre: string;
  readonly tipo_propiedad: string;
  readonly proveedor_nombre: string | null;
  readonly stock: string;
  readonly costo_actual: string | null;
  readonly precio_venta: string;
  readonly valor_costo: string;
  readonly valor_venta: string;
  readonly activo: boolean;
  readonly total_count: string;
  readonly valor_costo_total: string;
  readonly valor_venta_total: string;
}

export interface InventarioItem {
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly codigo_barras: string | null;
  readonly categoria_nombre: string;
  readonly tipo_propiedad: string;
  readonly proveedor_nombre: string | null;
  readonly stock: number;
  readonly costo_actual: number | null;
  readonly precio_venta: number;
  readonly valor_costo: number;
  readonly valor_venta: number;
  readonly activo: boolean;
}

export interface InventarioResumen {
  readonly valor_costo_total: number;
  readonly valor_venta_total: number;
}

export interface InventarioPaginatedResult extends PaginatedResult<InventarioItem> {
  readonly resumen: InventarioResumen;
}

export interface ConsignacionRow {
  readonly proveedor_id: number;
  readonly proveedor_nombre: string;
  readonly productos: string;
  readonly stock_total: string;
  readonly valor_venta: string;
  readonly porcentaje_comision: string;
  readonly comision_estimada: string;
  readonly total_count: string;
}

export interface ConsignacionItem {
  readonly proveedor_id: number;
  readonly proveedor_nombre: string;
  readonly productos: number;
  readonly stock_total: number;
  readonly valor_venta: number;
  readonly porcentaje_comision: number;
  readonly comision_estimada: number;
}

export interface ProductoReporteRow {
  readonly id: number;
  readonly nombre: string;
  readonly codigo_barras: string | null;
  readonly categoria_nombre: string;
  readonly proveedor_nombre: string | null;
  readonly tipo_propiedad: string;
  readonly stock: string;
  readonly costo_actual: string | null;
  readonly precio_venta: string;
  readonly activo: boolean;
}

export interface ProductoReporteMetricasRow {
  readonly cantidad_vendida: string;
  readonly total_vendido: string;
  readonly cantidad_comprada: string;
  readonly total_comprado: string;
  readonly movimientos: string;
}

export interface ProductoReporte {
  readonly producto: InventarioItem;
  readonly metricas: {
    readonly cantidad_vendida: number;
    readonly total_vendido: number;
    readonly cantidad_comprada: number;
    readonly total_comprado: number;
    readonly movimientos: number;
  };
}
