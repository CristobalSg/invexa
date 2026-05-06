import type { Pool } from 'pg';

import type {
  CreateProveedorBody,
  PaginationQuery,
  ProveedorListRow,
  ProveedorRow,
  UpdateProveedorBody,
} from './proveedores.types.js';

export class ProveedoresRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<ProveedorListRow[]> {
    const offset = (query.page - 1) * query.limit;
    const search = query.search ? `%${query.search}%` : null;

    const result = await this.pool.query<ProveedorListRow>(
      `
        SELECT
          id,
          nombre,
          telefono,
          porcentaje_comision,
          activo,
          creado_en,
          COUNT(*) OVER() AS total_count
        FROM proveedores
        WHERE ($1::text IS NULL OR nombre ILIKE $1 OR telefono ILIKE $1)
          AND ($2::boolean IS NULL OR activo = $2)
        ORDER BY nombre ASC
        LIMIT $3 OFFSET $4
      `,
      [search, query.activo ?? null, query.limit, offset],
    );

    return result.rows;
  }

  async findById(id: number): Promise<ProveedorRow | null> {
    const result = await this.pool.query<ProveedorRow>(
      `
        SELECT
          id,
          nombre,
          telefono,
          porcentaje_comision,
          activo,
          creado_en
        FROM proveedores
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByNombre(nombre: string, ignoredId?: number): Promise<ProveedorRow | null> {
    const values: Array<string | number> = [nombre];
    const ignoredIdClause = ignoredId ? 'AND id <> $2' : '';

    if (ignoredId) {
      values.push(ignoredId);
    }

    const result = await this.pool.query<ProveedorRow>(
      `
        SELECT
          id,
          nombre,
          telefono,
          porcentaje_comision,
          activo,
          creado_en
        FROM proveedores
        WHERE LOWER(nombre) = LOWER($1)
        ${ignoredIdClause}
        LIMIT 1
      `,
      values,
    );

    return result.rows[0] ?? null;
  }

  async create(data: CreateProveedorBody): Promise<ProveedorRow> {
    const result = await this.pool.query<ProveedorRow>(
      `
        INSERT INTO proveedores (
          nombre,
          telefono,
          porcentaje_comision,
          activo
        )
        VALUES (
          $1,
          $2,
          COALESCE($3, 0),
          COALESCE($4, TRUE)
        )
        RETURNING
          id,
          nombre,
          telefono,
          porcentaje_comision,
          activo,
          creado_en
      `,
      [data.nombre, data.telefono ?? null, data.porcentaje_comision ?? null, data.activo ?? null],
    );

    return result.rows[0] as ProveedorRow;
  }

  async update(id: number, data: UpdateProveedorBody): Promise<ProveedorRow | null> {
    const result = await this.pool.query<ProveedorRow>(
      `
        UPDATE proveedores
        SET
          nombre = COALESCE($2, nombre),
          telefono = CASE
            WHEN $3::boolean THEN $4::varchar
            ELSE telefono
          END,
          porcentaje_comision = COALESCE($5, porcentaje_comision),
          activo = COALESCE($6, activo)
        WHERE id = $1
        RETURNING
          id,
          nombre,
          telefono,
          porcentaje_comision,
          activo,
          creado_en
      `,
      [
        id,
        data.nombre ?? null,
        Object.hasOwn(data, 'telefono'),
        data.telefono ?? null,
        data.porcentaje_comision ?? null,
        data.activo ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }
}
