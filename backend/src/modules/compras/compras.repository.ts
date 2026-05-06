import type { Pool, PoolClient } from 'pg';

import type {
  CompraListRow,
  CompraProductoRow,
  CompraRow,
  DetalleCompraRow,
  MovimientoCompraRow,
  PaginationQuery,
} from './compras.types.js';

export class ComprasRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<CompraListRow[]> {
    const offset = (query.page - 1) * query.limit;

    const result = await this.pool.query<CompraListRow>(
      `
        SELECT
          c.id,
          c.usuario_id,
          u.nombre AS usuario_nombre,
          c.total_costo,
          c.creado_en,
          COUNT(*) OVER() AS total_count
        FROM compras c
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE ($1::integer IS NULL OR c.usuario_id = $1)
          AND ($2::date IS NULL OR c.creado_en::date >= $2)
          AND ($3::date IS NULL OR c.creado_en::date <= $3)
        ORDER BY c.creado_en DESC, c.id DESC
        LIMIT $4 OFFSET $5
      `,
      [
        query.usuario_id ?? null,
        query.fecha_desde ?? null,
        query.fecha_hasta ?? null,
        query.limit,
        offset,
      ],
    );

    return result.rows;
  }

  async findById(id: number): Promise<CompraRow | null> {
    const result = await this.pool.query<CompraRow>(
      `
        SELECT
          c.id,
          c.usuario_id,
          u.nombre AS usuario_nombre,
          c.total_costo,
          c.creado_en
        FROM compras c
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findDetallesByCompraId(compraId: number): Promise<DetalleCompraRow[]> {
    const result = await this.pool.query<DetalleCompraRow>(
      `
        SELECT
          dc.id,
          dc.compra_id,
          dc.producto_id,
          p.nombre AS producto_nombre,
          dc.cantidad,
          dc.costo_unitario,
          dc.costo_anterior,
          dc.precio_anterior,
          dc.precio_sugerido,
          dc.precio_final,
          dc.variacion_precio,
          dc.tiene_alerta_precio,
          dc.subtotal_costo
        FROM detalle_compras dc
        INNER JOIN productos p ON p.id = dc.producto_id
        WHERE dc.compra_id = $1
        ORDER BY dc.id ASC
      `,
      [compraId],
    );

    return result.rows;
  }

  async findMovimientosByCompraId(compraId: number): Promise<MovimientoCompraRow[]> {
    const result = await this.pool.query<MovimientoCompraRow>(
      `
        SELECT
          id,
          producto_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          compra_id,
          creado_en
        FROM movimientos_inventario
        WHERE compra_id = $1
          AND tipo = 'COMPRA'
        ORDER BY id ASC
      `,
      [compraId],
    );

    return result.rows;
  }

  async createCompra(client: PoolClient, usuarioId: number): Promise<CompraRow> {
    const result = await client.query<CompraRow>(
      `
        INSERT INTO compras (
          usuario_id,
          total_costo
        )
        VALUES ($1, 0)
        RETURNING
          id,
          usuario_id,
          '' AS usuario_nombre,
          total_costo,
          creado_en
      `,
      [usuarioId],
    );

    return result.rows[0] as CompraRow;
  }

  async findProductoForUpdate(
    client: PoolClient,
    productoId: number,
  ): Promise<CompraProductoRow | null> {
    const result = await client.query<CompraProductoRow>(
      `
        SELECT
          p.id,
          p.nombre,
          p.stock,
          p.costo_actual,
          p.precio_venta,
          p.activo,
          c.multiplicador_ganancia,
          c.variacion_maxima_precio
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        WHERE p.id = $1
        FOR UPDATE OF p
      `,
      [productoId],
    );

    return result.rows[0] ?? null;
  }

  async createDetalle(
    client: PoolClient,
    data: {
      readonly compraId: number;
      readonly productoId: number;
      readonly cantidad: number;
      readonly costoUnitario: number;
      readonly costoAnterior: number | null;
      readonly precioAnterior: number;
      readonly precioSugerido: number;
      readonly precioFinal: number;
      readonly variacionPrecio: number | null;
      readonly tieneAlertaPrecio: boolean;
      readonly subtotalCosto: number;
    },
  ): Promise<DetalleCompraRow> {
    const result = await client.query<DetalleCompraRow>(
      `
        INSERT INTO detalle_compras (
          compra_id,
          producto_id,
          cantidad,
          costo_unitario,
          costo_anterior,
          precio_anterior,
          precio_sugerido,
          precio_final,
          variacion_precio,
          tiene_alerta_precio,
          subtotal_costo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          compra_id,
          producto_id,
          '' AS producto_nombre,
          cantidad,
          costo_unitario,
          costo_anterior,
          precio_anterior,
          precio_sugerido,
          precio_final,
          variacion_precio,
          tiene_alerta_precio,
          subtotal_costo
      `,
      [
        data.compraId,
        data.productoId,
        data.cantidad,
        data.costoUnitario,
        data.costoAnterior,
        data.precioAnterior,
        data.precioSugerido,
        data.precioFinal,
        data.variacionPrecio,
        data.tieneAlertaPrecio,
        data.subtotalCosto,
      ],
    );

    return result.rows[0] as DetalleCompraRow;
  }

  async updateProductoAfterPurchase(
    client: PoolClient,
    data: {
      readonly productoId: number;
      readonly stockNuevo: number;
      readonly costoActual: number;
      readonly precioVenta: number;
      readonly shouldUpdatePrecioVenta: boolean;
    },
  ): Promise<void> {
    await client.query(
      `
        UPDATE productos
        SET
          stock = $2,
          costo_actual = $3,
          precio_venta = CASE
            WHEN $5 THEN $4
            ELSE precio_venta
          END,
          actualizado_en = NOW()
        WHERE id = $1
      `,
      [
        data.productoId,
        data.stockNuevo,
        data.costoActual,
        data.precioVenta,
        data.shouldUpdatePrecioVenta,
      ],
    );
  }

  async createMovimientoCompra(
    client: PoolClient,
    data: {
      readonly productoId: number;
      readonly usuarioId: number;
      readonly cantidad: number;
      readonly stockAnterior: number;
      readonly stockNuevo: number;
      readonly compraId: number;
      readonly motivo: string;
    },
  ): Promise<MovimientoCompraRow> {
    const result = await client.query<MovimientoCompraRow>(
      `
        INSERT INTO movimientos_inventario (
          producto_id,
          usuario_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          compra_id,
          motivo
        )
        VALUES ($1, $2, 'COMPRA', $3, $4, $5, $6, $7)
        RETURNING
          id,
          producto_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          compra_id,
          creado_en
      `,
      [
        data.productoId,
        data.usuarioId,
        data.cantidad,
        data.stockAnterior,
        data.stockNuevo,
        data.compraId,
        data.motivo,
      ],
    );

    return result.rows[0] as MovimientoCompraRow;
  }

  async updateCompraTotal(client: PoolClient, compraId: number, totalCosto: number): Promise<void> {
    await client.query(
      `
        UPDATE compras
        SET total_costo = $2
        WHERE id = $1
      `,
      [compraId, totalCosto],
    );
  }

  async findByIdWithClient(client: PoolClient, id: number): Promise<CompraRow | null> {
    const result = await client.query<CompraRow>(
      `
        SELECT
          c.id,
          c.usuario_id,
          u.nombre AS usuario_nombre,
          c.total_costo,
          c.creado_en
        FROM compras c
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findDetallesByCompraIdWithClient(
    client: PoolClient,
    compraId: number,
  ): Promise<DetalleCompraRow[]> {
    const result = await client.query<DetalleCompraRow>(
      `
        SELECT
          dc.id,
          dc.compra_id,
          dc.producto_id,
          p.nombre AS producto_nombre,
          dc.cantidad,
          dc.costo_unitario,
          dc.costo_anterior,
          dc.precio_anterior,
          dc.precio_sugerido,
          dc.precio_final,
          dc.variacion_precio,
          dc.tiene_alerta_precio,
          dc.subtotal_costo
        FROM detalle_compras dc
        INNER JOIN productos p ON p.id = dc.producto_id
        WHERE dc.compra_id = $1
        ORDER BY dc.id ASC
      `,
      [compraId],
    );

    return result.rows;
  }

  async findMovimientosByCompraIdWithClient(
    client: PoolClient,
    compraId: number,
  ): Promise<MovimientoCompraRow[]> {
    const result = await client.query<MovimientoCompraRow>(
      `
        SELECT
          id,
          producto_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          compra_id,
          creado_en
        FROM movimientos_inventario
        WHERE compra_id = $1
          AND tipo = 'COMPRA'
        ORDER BY id ASC
      `,
      [compraId],
    );

    return result.rows;
  }
}
