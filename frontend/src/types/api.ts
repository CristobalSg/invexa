export type UserRole = "OWNER" | "CASHIER";
export type TipoPropiedadProducto = "PROPIO" | "CONSIGNACION";
export type UnidadVentaProducto = "UNIDAD" | "PESO";
export type ModoInventarioProducto = "SIN_INVENTARIO" | "FLEXIBLE" | "ESTRICTO";
export type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "MIXTO";
export type EstadoVenta = "COMPLETADA" | "ANULADA";
export type ModalidadVenta = "NORMAL" | "PRECIO_COSTO" | "RETIRO_DUENO";
export type TipoMovimientoCaja = "INGRESO" | "EGRESO";
export type CategoriaMovimientoCaja =
  | "PAGO_PROVEEDOR"
  | "COMPRA_MENOR"
  | "RETIRO_PROPIETARIO"
  | "DEPOSITO"
  | "REPOSICION"
  | "OTRO";
export type TipoMovimientoInventario =
  | "VENTA"
  | "COMPRA"
  | "AJUSTE"
  | "MERMA"
  | "DEVOLUCION"
  | "ANULACION";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface BackupFileInfo {
  filename: string;
  size_bytes: number;
  created_at: string;
}

export interface AuthUser {
  id: number;
  nombre_usuario: string;
  nombre: string;
  email: string | null;
  rol: UserRole;
}

export interface LoginResult {
  token: string;
  usuario: AuthUser;
}

export interface DeviceAuthResult {
  device_token: string;
  dispositivo: {
    id: string;
    nombre: string;
  };
}

export interface SetupStatusResult {
  requiere_setup: boolean;
}

export interface SetupAdminResult extends LoginResult, DeviceAuthResult {}

export interface DeviceProfile extends AuthUser {
  activo: boolean;
}

export interface ProfileLoginResult extends LoginResult {
  requiere_apertura_turno: boolean;
  turno_abierto: {
    id: number;
    usuario_id: number;
    usuario_nombre: string;
  } | null;
}

export interface Usuario extends AuthUser {
  activo: boolean;
  creado_en: string;
}

export interface Producto {
  id: number;
  nombre: string;
  codigo_barras: string | null;
  categoria_id: number;
  categoria_nombre: string;
  tipo_propiedad: TipoPropiedadProducto;
  unidad_venta: UnidadVentaProducto;
  modo_inventario: ModoInventarioProducto;
  proveedor_id: number | null;
  proveedor_nombre: string | null;
  costo_actual: number | null;
  precio_venta: number;
  stock: number;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  multiplicador_ganancia: number;
  variacion_maxima_precio: number;
  creado_en: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  telefono: string | null;
  porcentaje_comision: number;
  activo: boolean;
  creado_en: string;
}

export interface CajaResumen {
  cantidad_ventas: number;
  subtotal: number;
  descuento: number;
  total_ventas: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  mixto: number;
  ventas_propias: number;
  ventas_consignacion: number;
  consignacion_proveedores: Array<{
    proveedor_id: number | null;
    proveedor_nombre: string;
    total: number;
  }>;
  ingresos: number;
  egresos: number;
  monto_esperado_cierre: number;
  diferencia_cierre: number | null;
}

export interface CajaMovimiento {
  id: number;
  sesion_caja_id: number;
  usuario_id: number;
  usuario_nombre: string;
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimientoCaja;
  monto: number;
  descripcion: string | null;
  creado_en: string;
}

export interface CajaSession {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  dispositivo_id: string | null;
  monto_apertura: number;
  monto_cierre: number | null;
  monto_esperado: number | null;
  diferencia_cierre: number | null;
  abierta_en: string;
  cerrada_en: string | null;
  abierta: boolean;
  resumen: CajaResumen;
  movimientos: CajaMovimiento[];
  notificacion_correos?: {
    sistema_enviado: boolean;
    proveedores_enviados: number;
    proveedores_omitidos: number;
    proveedores_fallidos: number;
  };
}

export interface CierreCajaDiarioItem {
  sesion_caja_id: number;
  usuario_id: number;
  usuario_nombre: string;
  dispositivo_nombre: string | null;
  abierta_en: string;
  cerrada_en: string;
  monto_apertura: number;
  monto_cierre: number | null;
  monto_esperado: number | null;
  diferencia_cierre: number | null;
  cantidad_ventas: number;
  total_vendido: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  mixto: number;
  ingresos: number;
  egresos: number;
}

export interface CierreCajaDiario {
  fecha: string;
  cajas_cerradas: number;
  total_vendido: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  mixto: number;
  ingresos: number;
  egresos: number;
  diferencia_total: number;
  sesiones: CierreCajaDiarioItem[];
}

export interface Venta {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  sesion_caja_id: number | null;
  metodo_pago: MetodoPago;
  subtotal: number;
  descuento: number;
  total_sin_redondeo: number;
  redondeo: number;
  total: number;
  monto_recibido: number | null;
  vuelto: number | null;
  modalidad: ModalidadVenta;
  estado: EstadoVenta;
  anulada_en: string | null;
  anulada_por: number | null;
  motivo_anulacion: string | null;
  creado_en: string;
}

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  producto_nombre: string;
  oferta_id: number | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  precio_normal: number;
  descuento: number;
  total_final: number;
  tipo_propiedad: TipoPropiedadProducto;
  proveedor_id: number | null;
  proveedor_nombre: string | null;
}

export interface VentaDetalle extends Venta {
  detalles: DetalleVenta[];
}

export interface Compra {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  total_costo: number;
  estado: "COMPLETADA" | "ANULADA";
  creado_en: string;
}

export interface DetalleCompra {
  id: number;
  compra_id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  costo_unitario: number;
  precio_sugerido: number;
  precio_final: number;
  tiene_alerta_precio: boolean;
  subtotal_costo: number;
}

export interface CompraDetalle extends Compra {
  detalles: DetalleCompra[];
}

export interface Oferta {
  id: number;
  producto_id: number;
  producto_nombre: string;
  producto_unidad_venta: UnidadVentaProducto;
  nombre: string;
  cantidad_oferta: number;
  precio_oferta: number;
  activa: boolean;
  inicia_en: string;
  termina_en: string | null;
  motivo: string | null;
  creado_en: string;
  esta_vigente: boolean;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  producto_nombre: string;
  usuario_nombre: string | null;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  stock_anterior: number | null;
  stock_nuevo: number | null;
  venta_id: number | null;
  compra_id: number | null;
  motivo: string | null;
  creado_en: string;
}

export interface VentasResumen {
  cantidad_ventas: number;
  subtotal: number;
  descuento: number;
  total: number;
  ticket_promedio: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  mixto: number;
}

export interface VentasMensual {
  mes: string;
  cantidad_ventas: number;
  total: number;
  subtotal: number;
  descuento: number;
}

export interface ProductoTop {
  producto_id: number;
  producto_nombre: string;
  cantidad_vendida: number;
  total_vendido: number;
}

export interface InventarioItem {
  producto_id: number;
  producto_nombre: string;
  codigo_barras: string | null;
  categoria_nombre: string;
  tipo_propiedad: string;
  proveedor_nombre: string | null;
  stock: number;
  costo_actual: number | null;
  precio_venta: number;
  valor_costo: number;
  valor_venta: number;
  activo: boolean;
}

export interface InventarioReporte extends PaginatedResult<InventarioItem> {
  resumen: {
    valor_costo_total: number;
    valor_venta_total: number;
  };
}

export interface ConsignacionItem {
  proveedor_id: number;
  proveedor_nombre: string;
  productos: number;
  stock_total: number;
  valor_venta: number;
  porcentaje_comision: number;
  comision_estimada: number;
}
