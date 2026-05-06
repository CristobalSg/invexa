import type { Pool } from 'pg';

import type { MovimientoInventarioRow, MovimientosQuery } from './inventario.types.js';

export class InventarioRepository {
  constructor(private readonly pool: Pool) {}

  async findMovimientos(
    query: Required<Pick<MovimientosQuery, 'page' | 'limit'>> & MovimientosQuery,
  ): Promise<MovimientoInventarioRow[]> {
    const offset = (query.page - 1) * query.limit;
    const result = await this.pool.query<MovimientoInventarioRow>(
      `
        SELECT
          mi.id,
          mi.producto_id,
          p.nombre AS producto_nombre,
          mi.usuario_id,
          u.nombre AS usuario_nombre,
          mi.tipo,
          mi.cantidad,
          mi.stock_anterior,
          mi.stock_nuevo,
          mi.venta_id,
          mi.compra_id,
          mi.motivo,
          mi.creado_en,
          COUNT(*) OVER() AS total_count
        FROM movimientos_inventario mi
        INNER JOIN productos p ON p.id = mi.producto_id
        LEFT JOIN usuarios u ON u.id = mi.usuario_id
        WHERE ($1::integer IS NULL OR mi.producto_id = $1)
          AND ($2::tipo_movimiento_inventario IS NULL OR mi.tipo = $2)
          AND ($3::date IS NULL OR mi.creado_en::date >= $3)
          AND ($4::date IS NULL OR mi.creado_en::date <= $4)
        ORDER BY mi.creado_en DESC, mi.id DESC
        LIMIT $5 OFFSET $6
      `,
      [
        query.producto_id ?? null,
        query.tipo ?? null,
        query.fecha_desde ?? null,
        query.fecha_hasta ?? null,
        query.limit,
        offset,
      ],
    );

    return result.rows;
  }
}
