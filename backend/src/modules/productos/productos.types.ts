export type TipoPropiedadProducto = 'PROPIO' | 'CONSIGNACION';
export type UnidadVentaProducto = 'UNIDAD' | 'PESO';
export type ModoInventarioProducto = 'SIN_INVENTARIO' | 'FLEXIBLE' | 'ESTRICTO';

export interface ProductoRow {
  readonly id: number;
  readonly nombre: string;
  readonly codigo_barras: string | null;
  readonly categoria_id: number;
  readonly categoria_nombre: string;
  readonly tipo_propiedad: TipoPropiedadProducto;
  readonly unidad_venta: UnidadVentaProducto;
  readonly modo_inventario: ModoInventarioProducto;
  readonly proveedor_id: number | null;
  readonly proveedor_nombre: string | null;
  readonly costo_actual: string | null;
  readonly precio_venta: string;
  readonly stock: string;
  readonly activo: boolean;
  readonly creado_en: Date;
  readonly actualizado_en: Date;
}

export interface ProductoListRow extends ProductoRow {
  readonly total_count: string;
}

export interface Producto {
  readonly id: number;
  readonly nombre: string;
  readonly codigo_barras: string | null;
  readonly categoria_id: number;
  readonly categoria_nombre: string;
  readonly tipo_propiedad: TipoPropiedadProducto;
  readonly unidad_venta: UnidadVentaProducto;
  readonly modo_inventario: ModoInventarioProducto;
  readonly proveedor_id: number | null;
  readonly proveedor_nombre: string | null;
  readonly costo_actual: number | null;
  readonly precio_venta: number;
  readonly stock: number;
  readonly activo: boolean;
  readonly creado_en: string;
  readonly actualizado_en: string;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly codigo?: string;
  readonly nombre?: string;
  readonly activo?: boolean;
  readonly categoria_id?: number;
  readonly proveedor_id?: number;
  readonly tipo_propiedad?: TipoPropiedadProducto;
  readonly modo_inventario?: ModoInventarioProducto;
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

export interface ProductoParams {
  readonly id: number;
}

export interface ProductoCodigoParams {
  readonly codigo: string;
}

export interface CreateProductoBody {
  readonly nombre: string;
  readonly codigo_barras?: string | null;
  readonly categoria_id: number;
  readonly tipo_propiedad?: TipoPropiedadProducto;
  readonly unidad_venta?: UnidadVentaProducto;
  readonly modo_inventario?: ModoInventarioProducto;
  readonly proveedor_id?: number | null;
  readonly costo_actual?: number | null;
  readonly precio_venta: number;
  readonly stock?: number;
  readonly activo?: boolean;
}

export interface UpdateProductoBody {
  readonly nombre?: string;
  readonly codigo_barras?: string | null;
  readonly categoria_id?: number;
  readonly tipo_propiedad?: TipoPropiedadProducto;
  readonly unidad_venta?: UnidadVentaProducto;
  readonly modo_inventario?: ModoInventarioProducto;
  readonly proveedor_id?: number | null;
  readonly costo_actual?: number | null;
  readonly precio_venta?: number;
  readonly stock?: number;
  readonly activo?: boolean;
}
