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
          v.metodo_pago AS venta_metodo_pago,
          v.total AS venta_total,
          v.modalidad AS venta_modalidad,
          v.estado AS venta_estado,
          v.sesion_caja_id AS venta_sesion_caja_id,
          dv.precio_unitario AS venta_precio_unitario,
          dv.descuento AS venta_descuento,
          dv.total_final AS venta_total_final,
          c.total_costo AS compra_total_costo,
          CASE
            WHEN c.id IS NULL THEN NULL
            WHEN EXISTS (
              SELECT 1
              FROM movimientos_inventario mia
              WHERE mia.compra_id = c.id
                AND mia.tipo = 'ANULACION'
            )
            THEN 'ANULADA'
            ELSE 'COMPLETADA'
          END AS compra_estado,
          dc.costo_unitario AS compra_costo_unitario,
          dc.precio_anterior AS compra_precio_anterior,
          dc.precio_final AS compra_precio_final,
          dc.subtotal_costo AS compra_subtotal_costo,
          mi.motivo,
          mi.creado_en,
          COUNT(*) OVER() AS total_count
        FROM movimientos_inventario mi
        INNER JOIN productos p ON p.id = mi.producto_id
        LEFT JOIN usuarios u ON u.id = mi.usuario_id
        LEFT JOIN ventas v ON v.id = mi.venta_id
        LEFT JOIN detalle_ventas dv ON dv.venta_id = mi.venta_id
          AND dv.producto_id = mi.producto_id
        LEFT JOIN compras c ON c.id = mi.compra_id
        LEFT JOIN detalle_compras dc ON dc.compra_id = mi.compra_id
          AND dc.producto_id = mi.producto_id
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
