export interface OfertaRow {
  readonly id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly nombre: string;
  readonly precio_oferta: string;
  readonly activa: boolean;
  readonly inicia_en: Date;
  readonly termina_en: Date | null;
  readonly motivo: string | null;
  readonly creado_en: Date;
  readonly esta_vigente: boolean;
}

export interface OfertaListRow extends OfertaRow {
  readonly total_count: string;
}

export interface Oferta {
  readonly id: number;
  readonly producto_id: number;
  readonly producto_nombre: string;
  readonly nombre: string;
  readonly precio_oferta: number;
  readonly activa: boolean;
  readonly inicia_en: string;
  readonly termina_en: string | null;
  readonly motivo: string | null;
  readonly creado_en: string;
  readonly esta_vigente: boolean;
}

export interface OfertaParams {
  readonly id: number;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly producto_id?: number;
  readonly activa?: boolean;
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

export interface CreateOfertaBody {
  readonly producto_id: number;
  readonly nombre: string;
  readonly precio_oferta: number;
  readonly activa?: boolean;
  readonly inicia_en?: string;
  readonly termina_en?: string | null;
  readonly motivo?: string | null;
}

export interface UpdateOfertaBody {
  readonly producto_id?: number;
  readonly nombre?: string;
  readonly precio_oferta?: number;
  readonly activa?: boolean;
  readonly inicia_en?: string;
  readonly termina_en?: string | null;
  readonly motivo?: string | null;
}
