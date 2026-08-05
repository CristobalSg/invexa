import type { Pool } from 'pg';

import type {
  CreateOfertaBody,
  OfertaListRow,
  OfertaRow,
  PaginationQuery,
  UpdateOfertaBody,
} from './ofertas.types.js';

export class OfertasRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<OfertaListRow[]> {
    const offset = (query.page - 1) * query.limit;
    const search = query.search ? `%${query.search}%` : null;

    const result = await this.pool.query<OfertaListRow>(
      `
        SELECT
          o.id,
          o.producto_id,
          p.nombre AS producto_nombre,
          p.unidad_venta AS producto_unidad_venta,
          o.nombre,
          o.cantidad_oferta,
          o.precio_oferta,
          o.activa,
          o.inicia_en,
          o.termina_en,
          o.motivo,
          o.creado_en,
          (
            o.activa = TRUE
            AND o.inicia_en <= NOW()
            AND (o.termina_en IS NULL OR o.termina_en >= NOW())
          ) AS esta_vigente,
          COUNT(*) OVER() AS total_count
        FROM ofertas_producto o
        INNER JOIN productos p ON p.id = o.producto_id
        WHERE ($1::integer IS NULL OR o.producto_id = $1)
          AND ($2::boolean IS NULL OR o.activa = $2)
          AND ($3::text IS NULL OR o.nombre ILIKE $3 OR p.nombre ILIKE $3)
        ORDER BY o.creado_en DESC, o.id DESC
        LIMIT $4 OFFSET $5
      `,
      [query.producto_id ?? null, query.activa ?? null, search, query.limit, offset],
    );

    return result.rows;
  }

  async findActive(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<OfertaListRow[]> {
    const offset = (query.page - 1) * query.limit;
    const search = query.search ? `%${query.search}%` : null;

    const result = await this.pool.query<OfertaListRow>(
      `
        SELECT
          o.id,
          o.producto_id,
          p.nombre AS producto_nombre,
          p.unidad_venta AS producto_unidad_venta,
          o.nombre,
          o.cantidad_oferta,
          o.precio_oferta,
          o.activa,
          o.inicia_en,
          o.termina_en,
          o.motivo,
          o.creado_en,
          TRUE AS esta_vigente,
          COUNT(*) OVER() AS total_count
        FROM ofertas_producto o
        INNER JOIN productos p ON p.id = o.producto_id
        WHERE o.activa = TRUE
          AND o.inicia_en <= NOW()
          AND (o.termina_en IS NULL OR o.termina_en >= NOW())
          AND ($1::integer IS NULL OR o.producto_id = $1)
          AND ($2::text IS NULL OR o.nombre ILIKE $2 OR p.nombre ILIKE $2)
        ORDER BY o.termina_en ASC NULLS LAST, o.precio_oferta ASC, o.id DESC
        LIMIT $3 OFFSET $4
      `,
      [query.producto_id ?? null, search, query.limit, offset],
    );

    return result.rows;
  }

  async findById(id: number): Promise<OfertaRow | null> {
    const result = await this.pool.query<OfertaRow>(
      `
        SELECT
          o.id,
          o.producto_id,
          p.nombre AS producto_nombre,
          p.unidad_venta AS producto_unidad_venta,
          o.nombre,
          o.cantidad_oferta,
          o.precio_oferta,
          o.activa,
          o.inicia_en,
          o.termina_en,
          o.motivo,
          o.creado_en,
          (
            o.activa = TRUE
            AND o.inicia_en <= NOW()
            AND (o.termina_en IS NULL OR o.termina_en >= NOW())
          ) AS esta_vigente
        FROM ofertas_producto o
        INNER JOIN productos p ON p.id = o.producto_id
        WHERE o.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async productExists(productId: number): Promise<boolean> {
    const result = await this.pool.query<{ readonly exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM productos
          WHERE id = $1
        ) AS exists
      `,
      [productId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async findActiveByProductId(
    productId: number,
    ignoredId?: number,
  ): Promise<{ readonly id: number } | null> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        SELECT id
        FROM ofertas_producto
        WHERE producto_id = $1
          AND activa = TRUE
          AND ($2::integer IS NULL OR id <> $2)
        LIMIT 1
      `,
      [productId, ignoredId ?? null],
    );

    return result.rows[0] ?? null;
  }

  async create(data: CreateOfertaBody): Promise<OfertaRow> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        INSERT INTO ofertas_producto (
          producto_id,
          nombre,
          cantidad_oferta,
          precio_oferta,
          activa,
          inicia_en,
          termina_en,
          motivo
        )
        VALUES (
          $1,
          $2,
          COALESCE($3::numeric, 1),
          $4,
          COALESCE($5, TRUE),
          COALESCE($6, NOW()),
          $7,
          $8
        )
        RETURNING id
      `,
      [
        data.producto_id,
        data.nombre,
        data.cantidad_oferta ?? null,
        data.precio_oferta,
        data.activa ?? null,
        data.inicia_en ?? null,
        data.termina_en ?? null,
        data.motivo ?? null,
      ],
    );

    return (await this.findById((result.rows[0] as { readonly id: number }).id)) as OfertaRow;
  }

  async update(id: number, data: UpdateOfertaBody): Promise<OfertaRow | null> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        UPDATE ofertas_producto
        SET
          producto_id = COALESCE($2, producto_id),
          nombre = COALESCE($3, nombre),
          cantidad_oferta = COALESCE($4::numeric, cantidad_oferta),
          precio_oferta = COALESCE($5, precio_oferta),
          activa = COALESCE($6, activa),
          inicia_en = COALESCE($7, inicia_en),
          termina_en = CASE
            WHEN $8::boolean THEN $9::timestamp
            ELSE termina_en
          END,
          motivo = CASE
            WHEN $10::boolean THEN $11::text
            ELSE motivo
          END
        WHERE id = $1
        RETURNING id
      `,
      [
        id,
        data.producto_id ?? null,
        data.nombre ?? null,
        data.cantidad_oferta ?? null,
        data.precio_oferta ?? null,
        data.activa ?? null,
        data.inicia_en ?? null,
        Object.hasOwn(data, 'termina_en'),
        data.termina_en ?? null,
        Object.hasOwn(data, 'motivo'),
        data.motivo ?? null,
      ],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.findById(result.rows[0].id);
  }

  async deactivate(id: number): Promise<OfertaRow | null> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        UPDATE ofertas_producto
        SET activa = FALSE
        WHERE id = $1
        RETURNING id
      `,
      [id],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.findById(result.rows[0].id);
  }
}
