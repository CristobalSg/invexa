import type { UserRole } from '../../plugins/jwt.plugin.js';

export interface CajaSessionRow {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly dispositivo_id: string | null;
  readonly monto_apertura: string;
  readonly monto_cierre: string | null;
  readonly monto_esperado: string | null;
  readonly diferencia_cierre: string | null;
  readonly abierta_en: Date;
  readonly cerrada_en: Date | null;
  readonly abierta: boolean;
}

export interface CajaSessionListRow extends CajaSessionRow {
  readonly total_count: string;
}

export interface CajaResumenRow {
  readonly cantidad_ventas: string;
  readonly subtotal: string;
  readonly descuento: string;
  readonly total_ventas: string;
  readonly efectivo: string;
  readonly tarjeta: string;
  readonly transferencia: string;
  readonly mixto: string;
  readonly ventas_propias: string;
  readonly ventas_consignacion: string;
  readonly consignacion_proveedores: string | null;
  readonly ingresos: string;
  readonly egresos: string;
}

export interface CajaSession {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly dispositivo_id: string | null;
  readonly monto_apertura: number;
  readonly monto_cierre: number | null;
  readonly monto_esperado: number | null;
  readonly diferencia_cierre: number | null;
  readonly abierta_en: string;
  readonly cerrada_en: string | null;
  readonly abierta: boolean;
}

export interface CajaResumenFinanciero {
  readonly cantidad_ventas: number;
  readonly subtotal: number;
  readonly descuento: number;
  readonly total_ventas: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly transferencia: number;
  readonly mixto: number;
  readonly ventas_propias: number;
  readonly ventas_consignacion: number;
  readonly consignacion_proveedores: CajaResumenConsignacionProveedor[];
  readonly ingresos: number;
  readonly egresos: number;
  readonly monto_esperado_cierre: number;
  readonly diferencia_cierre: number | null;
}

export interface CajaResumenConsignacionProveedor {
  readonly proveedor_id: number | null;
  readonly proveedor_nombre: string;
  readonly total: number;
}

export interface CajaSessionDetalle extends CajaSession {
  readonly resumen: CajaResumenFinanciero;
  readonly movimientos?: CajaMovimiento[];
}

export interface AbrirCajaBody {
  readonly monto_apertura: number;
}

export interface CerrarCajaBody {
  readonly efectivo_contado: number;
}

export interface ForzarCerrarCajaBody extends CerrarCajaBody {
  readonly master_password: string;
}

export interface CajaSessionParams {
  readonly id: number;
}

export interface CajaSessionsQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly usuario_id?: number;
  readonly abierta?: boolean;
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

export interface CajaUserContext {
  readonly id: number;
  readonly rol: UserRole;
}

export type TipoMovimientoCaja = 'INGRESO' | 'EGRESO';
export type CategoriaMovimientoCaja =
  | 'PAGO_PROVEEDOR'
  | 'COMPRA_MENOR'
  | 'RETIRO_PROPIETARIO'
  | 'DEPOSITO'
  | 'REPOSICION'
  | 'OTRO';

export interface CajaMovimientoRow {
  readonly id: number;
  readonly sesion_caja_id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly tipo: TipoMovimientoCaja;
  readonly categoria: CategoriaMovimientoCaja;
  readonly monto: string;
  readonly descripcion: string | null;
  readonly creado_en: Date;
}

export interface CajaMovimiento {
  readonly id: number;
  readonly sesion_caja_id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly tipo: TipoMovimientoCaja;
  readonly categoria: CategoriaMovimientoCaja;
  readonly monto: number;
  readonly descripcion: string | null;
  readonly creado_en: string;
}

export interface CrearMovimientoCajaBody {
  readonly tipo: TipoMovimientoCaja;
  readonly categoria: CategoriaMovimientoCaja;
  readonly monto: number;
  readonly descripcion?: string | null;
  readonly master_password: string;
}

export interface EditarMovimientoCajaBody {
  readonly tipo: TipoMovimientoCaja;
  readonly categoria: CategoriaMovimientoCaja;
  readonly monto: number;
  readonly descripcion?: string | null;
  readonly master_password: string;
}

export interface EliminarMovimientoCajaBody {
  readonly master_password: string;
}
