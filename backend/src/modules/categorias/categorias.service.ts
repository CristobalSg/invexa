import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type { CategoriasRepository } from './categorias.repository.js';
import type {
  Categoria,
  CategoriaListRow,
  CategoriaRow,
  CreateCategoriaBody,
  PaginatedResult,
  PaginationQuery,
  UpdateCategoriaBody,
} from './categorias.types.js';

export class CategoriasService {
  constructor(private readonly repository: CategoriasRepository) {}

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Categoria>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findAll({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapCategoria(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: CreateCategoriaBody): Promise<Categoria> {
    await this.ensureNombreAvailable(data.nombre);
    const categoria = await this.repository.create(data);
    return this.mapCategoria(categoria);
  }

  async update(id: number, data: UpdateCategoriaBody): Promise<Categoria> {
    await this.ensureExists(id);

    if (data.nombre !== undefined) {
      await this.ensureNombreAvailable(data.nombre, id);
    }

    const categoria = await this.repository.update(id, data);

    if (!categoria) {
      throw new NotFoundError('Categoria no encontrada');
    }

    return this.mapCategoria(categoria);
  }

  private async ensureExists(id: number): Promise<void> {
    const categoria = await this.repository.findById(id);

    if (!categoria) {
      throw new NotFoundError('Categoria no encontrada');
    }
  }

  private async ensureNombreAvailable(nombre: string, ignoredId?: number): Promise<void> {
    const categoria = await this.repository.findByNombre(nombre, ignoredId);

    if (categoria) {
      throw new ConflictError('La categoria ya existe');
    }
  }

  private mapCategoria(row: CategoriaRow | CategoriaListRow): Categoria {
    return {
      id: row.id,
      nombre: row.nombre,
      multiplicador_ganancia: Number(row.multiplicador_ganancia),
      variacion_maxima_precio: Number(row.variacion_maxima_precio),
      creado_en: row.creado_en.toISOString(),
    };
  }
}
