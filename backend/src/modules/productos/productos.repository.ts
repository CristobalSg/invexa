import type { Pool } from 'pg';

import type {
  CreateProductoBody,
  PaginationQuery,
  ProductoListRow,
  ProductoRow,
  ResetProduceProductInput,
  ResetProduceProductsResult,
  UpdateProductoBody,
} from './productos.types.js';

export class ProductosRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<ProductoListRow[]> {
    const offset = (query.page - 1) * query.limit;
    const search = query.search ? `%${query.search}%` : null;
    const codigo = query.codigo ? `%${query.codigo}%` : null;
    const nombre = query.nombre ? `%${query.nombre}%` : null;

    const result = await this.pool.query<ProductoListRow>(
      `
        SELECT
          p.id,
          p.nombre,
          p.codigo_barras,
          p.categoria_id,
          c.nombre AS categoria_nombre,
          p.tipo_propiedad,
          p.unidad_venta,
          p.modo_inventario,
          p.proveedor_id,
          pr.nombre AS proveedor_nombre,
          p.costo_actual,
          p.precio_venta,
          p.stock,
          p.activo,
          p.creado_en,
          p.actualizado_en,
          COUNT(*) OVER() AS total_count
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE ($1::text IS NULL OR p.nombre ILIKE $1 OR p.codigo_barras ILIKE $1)
          AND ($2::text IS NULL OR p.codigo_barras ILIKE $2)
          AND ($3::text IS NULL OR p.nombre ILIKE $3)
          AND ($4::boolean IS NULL OR p.activo = $4)
          AND ($5::integer IS NULL OR p.categoria_id = $5)
          AND ($6::integer IS NULL OR p.proveedor_id = $6)
          AND ($7::tipo_propiedad_producto IS NULL OR p.tipo_propiedad = $7)
          AND ($8::modo_inventario_producto IS NULL OR p.modo_inventario = $8)
        ORDER BY p.nombre ASC
        LIMIT $9 OFFSET $10
      `,
      [
        search,
        codigo,
        nombre,
        query.activo ?? null,
        query.categoria_id ?? null,
        query.proveedor_id ?? null,
        query.tipo_propiedad ?? null,
        query.modo_inventario ?? null,
        query.limit,
        offset,
      ],
    );

    return result.rows;
  }

  async findById(id: number): Promise<ProductoRow | null> {
    const result = await this.pool.query<ProductoRow>(
      `
        SELECT
          p.id,
          p.nombre,
          p.codigo_barras,
          p.categoria_id,
          c.nombre AS categoria_nombre,
          p.tipo_propiedad,
          p.unidad_venta,
          p.modo_inventario,
          p.proveedor_id,
          pr.nombre AS proveedor_nombre,
          p.costo_actual,
          p.precio_venta,
          p.stock,
          p.activo,
          p.creado_en,
          p.actualizado_en
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE p.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByCodigo(codigo: string): Promise<ProductoRow | null> {
    const result = await this.pool.query<ProductoRow>(
      `
        SELECT
          p.id,
          p.nombre,
          p.codigo_barras,
          p.categoria_id,
          c.nombre AS categoria_nombre,
          p.tipo_propiedad,
          p.unidad_venta,
          p.modo_inventario,
          p.proveedor_id,
          pr.nombre AS proveedor_nombre,
          p.costo_actual,
          p.precio_venta,
          p.stock,
          p.activo,
          p.creado_en,
          p.actualizado_en
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE p.codigo_barras = $1
          AND p.activo = TRUE
        LIMIT 1
      `,
      [codigo],
    );

    return result.rows[0] ?? null;
  }

  async findCategoriaById(id: number): Promise<{ readonly id: number } | null> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        SELECT id
        FROM categorias_producto
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findActiveProveedorById(id: number): Promise<{ readonly id: number } | null> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        SELECT id
        FROM proveedores
        WHERE id = $1
          AND activo = TRUE
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findDuplicateCodigo(codigo: string, ignoredId?: number): Promise<ProductoRow | null> {
    const values: Array<string | number> = [codigo];
    const ignoredIdClause = ignoredId ? 'AND p.id <> $2' : '';

    if (ignoredId) {
      values.push(ignoredId);
    }

    const result = await this.pool.query<ProductoRow>(
      `
        SELECT
          p.id,
          p.nombre,
          p.codigo_barras,
          p.categoria_id,
          c.nombre AS categoria_nombre,
          p.tipo_propiedad,
          p.unidad_venta,
          p.modo_inventario,
          p.proveedor_id,
          pr.nombre AS proveedor_nombre,
          p.costo_actual,
          p.precio_venta,
          p.stock,
          p.activo,
          p.creado_en,
          p.actualizado_en
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE p.codigo_barras = $1
        ${ignoredIdClause}
        LIMIT 1
      `,
      values,
    );

    return result.rows[0] ?? null;
  }

  async create(data: CreateProductoBody): Promise<ProductoRow> {
    const result = await this.pool.query<ProductoRow>(
      `
        INSERT INTO productos (
          nombre,
          codigo_barras,
          categoria_id,
          tipo_propiedad,
          unidad_venta,
          modo_inventario,
          proveedor_id,
          costo_actual,
          precio_venta,
          stock,
          activo
        )
        VALUES (
          $1,
          $2,
          $3,
          COALESCE($4::tipo_propiedad_producto, 'PROPIO'),
          COALESCE($5::unidad_venta_producto, 'UNIDAD'),
          COALESCE($6::modo_inventario_producto, 'FLEXIBLE'),
          $7,
          $8::numeric,
          $9::numeric,
          COALESCE($10::numeric, 0),
          COALESCE($11, TRUE)
        )
        RETURNING id
      `,
      [
        data.nombre,
        data.codigo_barras ?? null,
        data.categoria_id,
        data.tipo_propiedad ?? null,
        data.unidad_venta ?? null,
        data.modo_inventario ?? null,
        data.proveedor_id ?? null,
        data.costo_actual ?? null,
        data.precio_venta,
        data.stock ?? null,
        data.activo ?? null,
      ],
    );

    return (await this.findById((result.rows[0] as { readonly id: number }).id)) as ProductoRow;
  }

  async update(id: number, data: UpdateProductoBody): Promise<ProductoRow | null> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        UPDATE productos
        SET
          nombre = COALESCE($2, nombre),
          codigo_barras = CASE
            WHEN $3::boolean THEN $4::varchar
            ELSE codigo_barras
          END,
          categoria_id = COALESCE($5, categoria_id),
          tipo_propiedad = COALESCE($6::tipo_propiedad_producto, tipo_propiedad),
          unidad_venta = COALESCE($7::unidad_venta_producto, unidad_venta),
          proveedor_id = CASE
            WHEN $8::boolean THEN $9::integer
            ELSE proveedor_id
          END,
          modo_inventario = COALESCE($10::modo_inventario_producto, modo_inventario),
          costo_actual = CASE
            WHEN $11::boolean THEN $12::numeric
            ELSE costo_actual
          END,
          precio_venta = COALESCE($13, precio_venta),
          stock = COALESCE($14, stock),
          activo = COALESCE($15, activo),
          actualizado_en = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [
        id,
        data.nombre ?? null,
        Object.hasOwn(data, 'codigo_barras'),
        data.codigo_barras ?? null,
        data.categoria_id ?? null,
        data.tipo_propiedad ?? null,
        data.unidad_venta ?? null,
        Object.hasOwn(data, 'proveedor_id'),
        data.proveedor_id ?? null,
        data.modo_inventario ?? null,
        Object.hasOwn(data, 'costo_actual'),
        data.costo_actual ?? null,
        data.precio_venta ?? null,
        data.stock ?? null,
        data.activo ?? null,
      ],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.findById(result.rows[0].id);
  }

  async deactivate(id: number): Promise<ProductoRow | null> {
    const result = await this.pool.query<{ readonly id: number }>(
      `
        UPDATE productos
        SET
          activo = FALSE,
          actualizado_en = NOW()
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

  async resetProduceProducts(
    products: readonly ResetProduceProductInput[],
  ): Promise<ResetProduceProductsResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const categoryResult = await client.query<{ readonly id: number }>(
        `
          SELECT id
          FROM categorias_producto
          WHERE LOWER(nombre) LIKE '%fruta%'
            AND LOWER(nombre) LIKE '%verdura%'
          ORDER BY id ASC
          LIMIT 1
        `,
      );

      let categoryId = categoryResult.rows[0]?.id;

      if (!categoryId) {
        const insertedCategory = await client.query<{ readonly id: number }>(
          `
            INSERT INTO categorias_producto (nombre, multiplicador_ganancia, variacion_maxima_precio)
            VALUES ('Frutas y verduras', 1.50, 0.25)
            RETURNING id
          `,
        );

        categoryId = insertedCategory.rows[0]?.id;
      }

      if (!categoryId) {
        throw new Error('No se pudo preparar la categoria Frutas y verduras');
      }

      const deactivateResult = await client.query(
        `
          UPDATE productos p
          SET
            activo = FALSE,
            actualizado_en = NOW()
          FROM categorias_producto c
          WHERE p.categoria_id = c.id
            AND p.activo = TRUE
            AND (
              LOWER(c.nombre) LIKE '%fruta%'
              OR LOWER(c.nombre) LIKE '%verdura%'
            )
        `,
      );

      for (const product of products) {
        await client.query(
          `
            INSERT INTO productos (
              nombre,
              codigo_barras,
              categoria_id,
              tipo_propiedad,
              unidad_venta,
              modo_inventario,
              proveedor_id,
              costo_actual,
              precio_venta,
              stock,
              activo
            )
            VALUES (
              $1,
              NULL,
              $2,
              'PROPIO',
              'PESO',
              'FLEXIBLE',
              NULL,
              NULL,
              1,
              0,
              TRUE
            )
          `,
          [product.nombre, categoryId],
        );
      }

      await client.query('COMMIT');

      return {
        categoria_id: categoryId,
        desactivados: deactivateResult.rowCount ?? 0,
        creados: products.length,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
