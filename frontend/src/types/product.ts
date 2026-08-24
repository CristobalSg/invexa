export type { Producto as Product, Producto } from "./api";

export interface CreateProductInput {
  nombre: string;
  codigo_barras?: string | null;
  categoria_id: number;
  tipo_propiedad?: "PROPIO" | "CONSIGNACION";
  unidad_venta?: "UNIDAD" | "PESO";
  modo_inventario?: "SIN_INVENTARIO" | "FLEXIBLE" | "ESTRICTO";
  proveedor_id?: number | null;
  costo_actual?: number | null;
  precio_venta: number;
  stock?: number;
  activo?: boolean;
  master_password?: string;
}
