export type { Producto as Product, Producto } from "./api";

export interface CreateProductInput {
  nombre: string;
  codigo_barras?: string | null;
  categoria_id: number;
  tipo_propiedad?: "PROPIO" | "CONSIGNACION";
  proveedor_id?: number | null;
  costo_actual?: number | null;
  precio_venta: number;
  stock?: number;
  activo?: boolean;
}
