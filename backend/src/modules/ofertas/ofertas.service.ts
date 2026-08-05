import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import type { OfertasRepository } from './ofertas.repository.js';
import type {
  CreateOfertaBody,
  Oferta,
  OfertaListRow,
  OfertaRow,
  PaginatedResult,
  PaginationQuery,
  UpdateOfertaBody,
} from './ofertas.types.js';

export class OfertasService {
  constructor(private readonly repository: OfertasRepository) {}

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Oferta>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findAll({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapOferta(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findActive(query: PaginationQuery): Promise<PaginatedResult<Oferta>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findActive({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapOferta(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: CreateOfertaBody): Promise<Oferta> {
    await this.ensureProductExists(data.producto_id);
    this.validateDates(data.inicia_en, data.termina_en ?? null);
    await this.ensureSingleActiveOffer(data.producto_id, data.activa ?? true);

    const oferta = await this.repository.create(data);
    return this.mapOferta(oferta);
  }

  async update(id: number, data: UpdateOfertaBody): Promise<Oferta> {
    const current = await this.repository.findById(id);

    if (!current) {
      throw new NotFoundError('Oferta no encontrada');
    }

    if (data.producto_id !== undefined) {
      await this.ensureProductExists(data.producto_id);
    }

    const iniciaEn = data.inicia_en ?? current.inicia_en.toISOString();
    const terminaEn = Object.hasOwn(data, 'termina_en')
      ? (data.termina_en ?? null)
      : (current.termina_en?.toISOString() ?? null);

    this.validateDates(iniciaEn, terminaEn);
    await this.ensureSingleActiveOffer(
      data.producto_id ?? current.producto_id,
      data.activa ?? current.activa,
      id,
    );

    const oferta = await this.repository.update(id, data);

    if (!oferta) {
      throw new NotFoundError('Oferta no encontrada');
    }

    return this.mapOferta(oferta);
  }

  async deactivate(id: number): Promise<Oferta> {
    const oferta = await this.repository.deactivate(id);

    if (!oferta) {
      throw new NotFoundError('Oferta no encontrada');
    }

    return this.mapOferta(oferta);
  }

  private async ensureProductExists(productId: number): Promise<void> {
    const exists = await this.repository.productExists(productId);

    if (!exists) {
      throw new BadRequestError('El producto de la oferta debe existir');
    }
  }

  private async ensureSingleActiveOffer(
    productId: number,
    active: boolean,
    ignoredId?: number,
  ): Promise<void> {
    if (!active) {
      return;
    }

    const existing = await this.repository.findActiveByProductId(productId, ignoredId);

    if (existing) {
      throw new BadRequestError('El producto ya tiene una oferta activa');
    }
  }

  private validateDates(iniciaEn?: string, terminaEn?: string | null): void {
    if (!terminaEn) {
      return;
    }

    const startsAt = iniciaEn ? new Date(iniciaEn) : new Date();
    const endsAt = new Date(terminaEn);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestError('Las fechas de la oferta no son validas');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestError('La fecha de termino debe ser posterior a la fecha de inicio');
    }
  }

  private mapOferta(row: OfertaRow | OfertaListRow): Oferta {
    return {
      id: row.id,
      producto_id: row.producto_id,
      producto_nombre: row.producto_nombre,
      producto_unidad_venta: row.producto_unidad_venta,
      nombre: row.nombre,
      cantidad_oferta: Number(row.cantidad_oferta),
      precio_oferta: Number(row.precio_oferta),
      activa: row.activa,
      inicia_en: row.inicia_en.toISOString(),
      termina_en: row.termina_en?.toISOString() ?? null,
      motivo: row.motivo,
      creado_en: row.creado_en.toISOString(),
      esta_vigente: row.esta_vigente,
    };
  }
}
