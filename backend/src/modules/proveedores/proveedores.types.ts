export interface ProveedorRow {
  readonly id: number;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly porcentaje_comision: string;
  readonly activo: boolean;
  readonly creado_en: Date;
}

export interface ProveedorListRow extends ProveedorRow {
  readonly total_count: string;
}

export interface Proveedor {
  readonly id: number;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly porcentaje_comision: number;
  readonly activo: boolean;
  readonly creado_en: string;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly activo?: boolean;
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

export interface ProveedorParams {
  readonly id: number;
}

export interface CreateProveedorBody {
  readonly nombre: string;
  readonly telefono?: string | null;
  readonly porcentaje_comision?: number;
  readonly activo?: boolean;
}

export interface UpdateProveedorBody {
  readonly nombre?: string;
  readonly telefono?: string | null;
  readonly porcentaje_comision?: number;
  readonly activo?: boolean;
}
