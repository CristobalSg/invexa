import type { Pool } from 'pg';

import type {
  CategoriaListRow,
  CategoriaRow,
  CreateCategoriaBody,
  PaginationQuery,
  UpdateCategoriaBody,
} from './categorias.types.js';

export class CategoriasRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<CategoriaListRow[]> {
    const offset = (query.page - 1) * query.limit;
    const search = query.search ? `%${query.search}%` : null;

    const result = await this.pool.query<CategoriaListRow>(
      `
        SELECT
          id,
          nombre,
          multiplicador_ganancia,
          variacion_maxima_precio,
          creado_en,
          COUNT(*) OVER() AS total_count
        FROM categorias_producto
        WHERE ($1::text IS NULL OR nombre ILIKE $1)
        ORDER BY nombre ASC
        LIMIT $2 OFFSET $3
      `,
      [search, query.limit, offset],
    );

    return result.rows;
  }

  async findById(id: number): Promise<CategoriaRow | null> {
    const result = await this.pool.query<CategoriaRow>(
      `
        SELECT
          id,
          nombre,
          multiplicador_ganancia,
          variacion_maxima_precio,
          creado_en
        FROM categorias_producto
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByNombre(nombre: string, ignoredId?: number): Promise<CategoriaRow | null> {
    const values: Array<string | number> = [nombre];
    const ignoredIdClause = ignoredId ? 'AND id <> $2' : '';

    if (ignoredId) {
      values.push(ignoredId);
    }

    const result = await this.pool.query<CategoriaRow>(
      `
        SELECT
          id,
          nombre,
          multiplicador_ganancia,
          variacion_maxima_precio,
          creado_en
        FROM categorias_producto
        WHERE LOWER(nombre) = LOWER($1)
        ${ignoredIdClause}
        LIMIT 1
      `,
      values,
    );

    return result.rows[0] ?? null;
  }

  async create(data: CreateCategoriaBody): Promise<CategoriaRow> {
    const result = await this.pool.query<CategoriaRow>(
      `
        INSERT INTO categorias_producto (
          nombre,
          multiplicador_ganancia,
          variacion_maxima_precio
        )
        VALUES (
          $1,
          COALESCE($2, 1.50),
          COALESCE($3, 0.25)
        )
        RETURNING
          id,
          nombre,
          multiplicador_ganancia,
          variacion_maxima_precio,
          creado_en
      `,
      [data.nombre, data.multiplicador_ganancia ?? null, data.variacion_maxima_precio ?? null],
    );

    return result.rows[0] as CategoriaRow;
  }

  async update(id: number, data: UpdateCategoriaBody): Promise<CategoriaRow | null> {
    const result = await this.pool.query<CategoriaRow>(
      `
        UPDATE categorias_producto
        SET
          nombre = COALESCE($2, nombre),
          multiplicador_ganancia = COALESCE($3, multiplicador_ganancia),
          variacion_maxima_precio = COALESCE($4, variacion_maxima_precio)
        WHERE id = $1
        RETURNING
          id,
          nombre,
          multiplicador_ganancia,
          variacion_maxima_precio,
          creado_en
      `,
      [
        id,
        data.nombre ?? null,
        data.multiplicador_ganancia ?? null,
        data.variacion_maxima_precio ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }
}
