import type { UserRole } from '../../plugins/jwt.plugin.js';

export interface CajaSessionRow {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly monto_apertura: string;
  readonly monto_cierre: string | null;
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
}

export interface CajaSession {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre: string;
  readonly monto_apertura: number;
  readonly monto_cierre: number | null;
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
  readonly monto_esperado_cierre: number;
}

export interface CajaSessionDetalle extends CajaSession {
  readonly resumen: CajaResumenFinanciero;
}

export interface AbrirCajaBody {
  readonly monto_apertura: number;
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
