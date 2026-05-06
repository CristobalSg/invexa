export interface CategoriaRow {
  readonly id: number;
  readonly nombre: string;
  readonly multiplicador_ganancia: string;
  readonly variacion_maxima_precio: string;
  readonly creado_en: Date;
}

export interface CategoriaListRow extends CategoriaRow {
  readonly total_count: string;
}

export interface Categoria {
  readonly id: number;
  readonly nombre: string;
  readonly multiplicador_ganancia: number;
  readonly variacion_maxima_precio: number;
  readonly creado_en: string;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
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

export interface CategoriaParams {
  readonly id: number;
}

export interface CreateCategoriaBody {
  readonly nombre: string;
  readonly multiplicador_ganancia?: number;
  readonly variacion_maxima_precio?: number;
}

export interface UpdateCategoriaBody {
  readonly nombre?: string;
  readonly multiplicador_ganancia?: number;
  readonly variacion_maxima_precio?: number;
}
